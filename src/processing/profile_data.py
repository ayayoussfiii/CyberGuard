"""
Profilage du dataset IDS-5-FCV (Aya - Data Engineering).

Usage :
    python src/processing/profile_data.py --input data/ [--label Label] [--nrows 200000]

--input : un fichier CSV/Parquet ou un dossier contenant plusieurs CSV/Parquet.
Sorties : docs/profile_report.md et docs/data_dictionary.csv
"""
import argparse
import glob
import os
import numpy as np
import pandas as pd

LABEL_CANDIDATES = ["label", "class", "attack_cat", "attack", "attack_type", "target", "category"]


def load(path, nrows=None, no_header=False, columns=None):
    if os.path.isdir(path):
        files = sorted(glob.glob(os.path.join(path, "**", "*.csv"), recursive=True)
                       + glob.glob(os.path.join(path, "**", "*.parquet"), recursive=True))
    else:
        files = [path]
    if not files:
        raise SystemExit(f"Aucun fichier CSV/Parquet trouvé dans {path}")
    frames = []
    for f in files:
        print(f"Lecture : {f}")
        if f.endswith(".parquet"):
            df = pd.read_parquet(f)
        else:
            df = pd.read_csv(f, nrows=nrows, low_memory=False, na_values=["?"],
                             header=None if no_header else "infer")
            if no_header:
                n = df.shape[1]
                if columns:
                    if len(columns) != n:
                        raise SystemExit("--columns-file contient %d noms mais le CSV a %d colonnes" % (len(columns), n))
                    df.columns = columns
                else:
                    df.columns = [f"f{i + 1:02d}" for i in range(n - 1)] + ["label"]
        df["_source_file"] = os.path.basename(f)
        frames.append(df)
    return pd.concat(frames, ignore_index=True), files


def detect_label(columns, forced=None):
    if forced:
        if forced not in columns:
            raise SystemExit(f"Colonne cible '{forced}' introuvable. Colonnes : {list(columns)[:30]}...")
        return forced
    for c in columns:
        if c.strip().lower() in LABEL_CANDIDATES:
            return c
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--label", default=None, help="Nom de la colonne cible (sinon détection auto)")
    ap.add_argument("--nrows", type=int, default=None, help="Limiter les lignes lues par fichier CSV")
    ap.add_argument("--out-dir", default="docs")
    ap.add_argument("--no-header", action="store_true", help="CSV sans ligne d'en-tete (derniere colonne = cible)")
    ap.add_argument("--columns-file", default=None, help="Fichier texte : un nom de colonne par ligne")
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    col_names = None
    if args.columns_file:
        with open(args.columns_file, encoding="utf-8") as fh:
            col_names = [ln.strip() for ln in fh if ln.strip()]
    df, files = load(args.input, args.nrows, args.no_header, col_names)
    df.columns = [c.strip() for c in df.columns]
    feature_cols = [c for c in df.columns if c != "_source_file"]
    label = detect_label(feature_cols, args.label)

    num = df[feature_cols].select_dtypes(include=[np.number])
    n_inf = np.isinf(num).sum()
    n_missing = df[feature_cols].isna().sum()
    n_unique = df[feature_cols].nunique(dropna=True)

    dico = pd.DataFrame({
        "colonne": feature_cols,
        "type": [str(df[c].dtype) for c in feature_cols],
        "manquants": [int(n_missing[c]) for c in feature_cols],
        "manquants_pct": [round(100 * n_missing[c] / len(df), 3) for c in feature_cols],
        "infinis": [int(n_inf.get(c, 0)) for c in feature_cols],
        "valeurs_uniques": [int(n_unique[c]) for c in feature_cols],
        "constante": [bool(n_unique[c] <= 1) for c in feature_cols],
        "exemple": [str(df[c].dropna().iloc[0]) if df[c].notna().any() else "" for c in feature_cols],
    })
    dico.to_csv(os.path.join(args.out_dir, "data_dictionary.csv"), index=False)

    n_dup = int(df[feature_cols].duplicated().sum())
    lines = [
        "# Rapport de profilage - IDS-5-FCV", "",
        f"- Fichiers lus : {len(files)}",
        f"- Lignes : {len(df):,}  |  Colonnes : {len(feature_cols)}",
        f"- Lignes dupliquées : {n_dup:,} ({100 * n_dup / len(df):.2f} %)",
        f"- Colonnes avec valeurs manquantes : {int((n_missing > 0).sum())}",
        f"- Colonnes avec valeurs infinies : {int((n_inf > 0).sum())}",
        f"- Colonnes constantes : {int(dico['constante'].sum())}",
        f"- Colonne cible détectée : {label if label else 'AUCUNE - à préciser avec --label'}", "",
    ]
    if label:
        dist = df[label].value_counts(dropna=False)
        pct = (100 * dist / len(df)).round(3)
        lines += ["## Distribution de la cible", "", "| Classe | Lignes | % |", "|---|---|---|"]
        lines += [f"| {k} | {v:,} | {pct[k]} |" for k, v in dist.items()]
        ratio = dist.max() / max(dist.min(), 1)
        lines += ["", f"Ratio de déséquilibre (max/min) : {ratio:.1f}"]
        if ratio > 10:
            lines.append("Déséquilibre fort : publier precision/recall/F1 par classe + macro-F1.")
    if "_source_file" in df.columns and df["_source_file"].nunique() > 1:
        lines += ["", "## Lignes par fichier", ""]
        lines += [f"- {k} : {v:,}" for k, v in df["_source_file"].value_counts().items()]
    with open(os.path.join(args.out_dir, "profile_report.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")

    print("\n".join(lines))
    print(f"\nÉcrit : {args.out_dir}/profile_report.md et {args.out_dir}/data_dictionary.csv")


if __name__ == "__main__":
    main()
