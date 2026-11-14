"""
Pipeline PySpark de préparation - CIC-IDS2017 / IDS-5-FCV (Aya - Data Engineering).

Deux modes :
  1) Train/test déjà séparés (recommandé pour les folds) :
     python src/processing/prepare_data.py --train data/CIC_IDS2017/fold_2_train.csv \
         --test data/CIC_IDS2017/fold_2_test.csv --output-dir data
     -> data/processed_train.parquet et data/processed_test.parquet
  2) Un seul jeu de données :
     python src/processing/prepare_data.py --input data/mon_dossier --output-dir data
     -> data/processed.parquet

Nettoyage SANS apprentissage (pas de fuite de données) :
  noms de colonnes normalisés, 'inf'/'Infinity'/'NaN' -> null, doublons supprimés,
  cible non nulle, colonnes vides/constantes supprimées, lignes avec nulls supprimées.
En mode train/test : les colonnes à supprimer sont décidées sur le TRAIN seulement puis
appliquées au test, et les lignes du test déjà présentes dans le train sont retirées.
Imputation, normalisation et encodage : laissés à Meriem (ajustement sur le train uniquement).
"""
import argparse
import glob
import json
import os
import re

from pyspark.sql import SparkSession, functions as F
from pyspark.sql.types import DoubleType, FloatType, IntegerType, LongType, ShortType, DecimalType

LABEL_CANDIDATES = ["label", "class", "attack_cat", "attack", "attack_type", "target", "category"]
NUMERIC = (DoubleType, FloatType, IntegerType, LongType, ShortType, DecimalType)
BAD_TOKENS = ["inf", "-inf", "+inf", "infinity", "-infinity", "+infinity", "nan", ""]


def norm(name):
    n = re.sub(r"[^0-9a-zA-Z]+", "_", name.strip()).strip("_").lower()
    return n or "col"


def unique_names(names):
    seen, out = {}, []
    for n in map(norm, names):
        seen[n] = seen.get(n, 0) + 1
        out.append(n if seen[n] == 1 else f"{n}_{seen[n]}")
    return out


def read_df(spark, path):
    if os.path.isdir(path):
        csvs = sorted(glob.glob(os.path.join(path, "**", "*.csv"), recursive=True))
        pqs = sorted(glob.glob(os.path.join(path, "**", "*.parquet"), recursive=True))
        paths, fmt = (csvs, "csv") if csvs else (pqs, "parquet")
    else:
        paths, fmt = [path], ("parquet" if path.endswith(".parquet") else "csv")
    if not paths:
        raise SystemExit(f"Aucun fichier CSV/Parquet trouvé dans {path}")
    print(f"{path} : {len(paths)} fichier(s) {fmt}")
    if fmt == "csv":
        df = spark.read.option("header", True).option("inferSchema", True).csv(paths)
    else:
        df = spark.read.parquet(*paths)
    return df.toDF(*unique_names(df.columns))


def fix_numeric(df, label, cols=None):
    """Colonnes lues en texte à cause de 'inf'/'NaN' : nettoyage puis retour en numérique.
    cols=None : détecte (jeu train). cols=liste : applique la même décision (jeu test)."""
    str_cols = [f.name for f in df.schema.fields if f.dataType.simpleString() == "string" and f.name != label]
    for c in str_cols:
        df = df.withColumn(c, F.when(F.lower(F.trim(F.col(c))).isin(BAD_TOKENS), None).otherwise(F.trim(F.col(c))))
    if cols is None:
        cols = []
        if str_cols:
            chk = df.agg(*[F.count(F.col(c)).alias(f"a_{c}") for c in str_cols],
                         *[F.count(F.col(c).cast("double")).alias(f"b_{c}") for c in str_cols]).first().asDict()
            cols = [c for c in str_cols if chk[f"a_{c}"] > 0 and chk[f"b_{c}"] >= 0.99 * chk[f"a_{c}"]]
    for c in cols:
        if c in df.columns:
            df = df.withColumn(c, F.col(c).cast("double"))
    return df, cols


def basic_clean(df, label, sample, num_cols_fixed=None):
    if sample:
        df = df.sample(fraction=sample, seed=42)
    df = df.withColumn(label, F.trim(F.col(label).cast("string")))
    df = df.filter(F.col(label).isNotNull() & (F.col(label) != ""))
    df, converted = fix_numeric(df, label, num_cols_fixed)
    num_cols = [f.name for f in df.schema.fields if isinstance(f.dataType, NUMERIC) and f.name != label]
    for c in num_cols:
        df = df.withColumn(c, F.when(F.col(c).isin(float("inf"), float("-inf")) | F.isnan(F.col(c)), None)
                           .otherwise(F.col(c)))
    n0 = df.count()
    df = df.dropDuplicates()
    return df, converted, n0 - df.count()


def finish(df, feats, label, normal, prefix):
    df = df.withColumn("is_attack", (~F.lower(F.col(label)).isin(normal)).cast("int"))
    df = df.withColumn("record_id", F.concat(F.lit(prefix), F.lpad(F.monotonically_increasing_id().cast("string"), 9, "0")))
    return df.select("record_id", *feats, label, "is_attack")


def write_and_describe(spark, df, path, label):
    df.write.mode("overwrite").parquet(path)
    out = spark.read.parquet(path)
    return {
        "fichier": path,
        "lignes": out.count(),
        "colonnes": len(out.columns),
        "distribution_cible": {r[label]: r["count"] for r in out.groupBy(label).count().collect()},
        "distribution_is_attack": {str(r["is_attack"]): r["count"] for r in out.groupBy("is_attack").count().collect()},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", help="Fichier/dossier d'entraînement (mode train/test)")
    ap.add_argument("--test", help="Fichier/dossier de test (mode train/test)")
    ap.add_argument("--input", help="Un seul jeu de données (mode simple)")
    ap.add_argument("--output-dir", default="data")
    ap.add_argument("--label", default=None, help="Colonne cible (sinon détection auto)")
    ap.add_argument("--normal-labels", default="benign,normal,0",
                    help="Valeurs de la cible = trafic normal (séparées par des virgules)")
    ap.add_argument("--sample", type=float, default=None, help="Fraction d'échantillon (ex. 0.05)")
    ap.add_argument("--max-null-col", type=float, default=0.5, help="Supprimer colonnes avec plus de x%% de nulls")
    ap.add_argument("--keep-na", action="store_true", help="Ne pas supprimer les lignes avec nulls")
    ap.add_argument("--report", default="outputs/prepare_report.json")
    args = ap.parse_args()

    split_mode = bool(args.train or args.test)
    if split_mode and not (args.train and args.test):
        raise SystemExit("Mode train/test : fournir --train ET --test")
    if not split_mode and not args.input:
        raise SystemExit("Fournir soit --train et --test, soit --input")

    spark = (SparkSession.builder.appName("CyberGuard-prepare")
             .config("spark.sql.shuffle.partitions", "64").getOrCreate())
    spark.sparkContext.setLogLevel("WARN")
    os.makedirs(args.output_dir, exist_ok=True)

    train = read_df(spark, args.train if split_mode else args.input)
    test = read_df(spark, args.test) if split_mode else None
    report = {"mode": "train_test" if split_mode else "simple",
              "lignes_lues_train": train.count(), "colonnes_lues": len(train.columns)}
    if split_mode:
        report["lignes_lues_test"] = test.count()

    # --- Cible ---
    if args.label:
        label = norm(args.label)
    else:
        label = next((c for c in train.columns if c in LABEL_CANDIDATES), None)
        if not label:
            raise SystemExit("Cible non détectée : relancer avec --label NOM_COLONNE")
    for name, d in (("train", train), ("test", test)):
        if d is not None and label not in d.columns:
            raise SystemExit(f"Cible '{label}' introuvable dans {name}. Colonnes : {d.columns[:30]}")
    print(f"Colonne cible : {label}")
    report["cible"] = label

    # --- Nettoyage de base ---
    train, converted, dup_tr = basic_clean(train, label, args.sample)
    report["colonnes_texte_converties_en_numerique"] = converted
    report["doublons_supprimes_train"] = dup_tr
    if split_mode:
        missing = [c for c in train.columns if c not in test.columns]
        if missing:
            raise SystemExit(f"Colonnes du train absentes du test : {missing[:10]}")
        test, _, dup_te = basic_clean(test, label, args.sample, converted)
        report["doublons_supprimes_test"] = dup_te

    # --- Colonnes à supprimer : décidées sur le TRAIN uniquement ---
    feats = [c for c in train.columns if c != label]
    n_tr = train.count()
    stats = train.agg(*[F.count(F.when(F.col(c).isNull(), 1)).alias(f"n_{c}") for c in feats],
                      *[F.countDistinct(c).alias(f"d_{c}") for c in feats]).first().asDict()
    drop = []
    for c in feats:
        if n_tr and stats[f"n_{c}"] / n_tr > args.max_null_col:
            drop.append((c, "trop de nulls"))
        elif stats[f"d_{c}"] <= 1:
            drop.append((c, "constante"))
    dropped = {c for c, _ in drop}
    report["colonnes_supprimees"] = [{"colonne": c, "raison": r} for c, r in drop]
    feats = [c for c in feats if c not in dropped]
    train = train.drop(*dropped)
    if split_mode:
        test = test.drop(*[c for c in dropped if c in test.columns])

    # --- Lignes avec nulls ---
    if not args.keep_na:
        n = train.count()
        train = train.dropna(subset=feats)
        report["lignes_avec_nulls_supprimees_train"] = n - train.count()
        if split_mode:
            n = test.count()
            test = test.dropna(subset=feats)
            report["lignes_avec_nulls_supprimees_test"] = n - test.count()

    # --- Fuite : retirer du test les lignes déjà présentes dans le train ---
    if split_mode:
        cols = feats + [label]
        h = lambda d: d.withColumn("_h", F.sha2(F.concat_ws("||", *[F.col(c).cast("string") for c in cols]), 256))
        train_h = h(train).select("_h").distinct()
        n = test.count()
        test = h(test).join(train_h, on="_h", how="left_anti").drop("_h")
        report["lignes_test_deja_dans_train_supprimees"] = n - test.count()

    # --- Cible binaire, identifiant, écriture ---
    normal = [v.strip().lower() for v in args.normal_labels.split(",")]
    if split_mode:
        out_tr = finish(train, feats, label, normal, "train_")
        out_te = finish(test, feats, label, normal, "test_")
        report["train"] = write_and_describe(spark, out_tr, os.path.join(args.output_dir, "processed_train.parquet"), label)
        report["test"] = write_and_describe(spark, out_te, os.path.join(args.output_dir, "processed_test.parquet"), label)
        classes_test_only = set(report["test"]["distribution_cible"]) - set(report["train"]["distribution_cible"])
        if classes_test_only:
            report["avertissement"] = f"Classes présentes dans le test mais pas dans le train : {sorted(classes_test_only)}"
    else:
        out = finish(train, feats, label, normal, "row_")
        report["resultat"] = write_and_describe(spark, out, os.path.join(args.output_dir, "processed.parquet"), label)

    os.makedirs(os.path.dirname(args.report) or ".", exist_ok=True)
    with open(args.report, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nRapport : {args.report}")
    spark.stop()


if __name__ == "__main__":
    main()
