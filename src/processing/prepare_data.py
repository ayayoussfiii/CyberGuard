from functools import reduce
from operator import and_
from pathlib import Path

import pandas as pd
from pyspark.sql import SparkSession, functions as F
from pyspark.sql.types import StringType, StructField, StructType

TRAIN_CSV = "data/CIC_IDS2017/fold_2_train.csv"
TEST_CSV = "data/CIC_IDS2017/fold_2_test.csv"
OUTPUT = "data/processed.parquet"

# Décisions à valider avec Meriem
DEDUP = True              # supprime les doublons dans train et test
REMOVE_TEST_LEAK = True   # retire du test les lignes présentes dans le train

FEATS = [f"f{i:02d}" for i in range(77)]
COLS = FEATS + ["label"]
SCHEMA = StructType([StructField(c, StringType(), True) for c in COLS])

spark = (SparkSession.builder.appName("cyberguard-prepare")
         .master("local[*]")
         .config("spark.sql.ansi.enabled", "false")   # "?" -> null au lieu d'une erreur
         .config("spark.driver.memory", "4g")
         .config("spark.sql.shuffle.partitions", "16")
         .config("spark.sql.execution.arrow.pyspark.enabled", "true")
         .getOrCreate())
spark.sparkContext.setLogLevel("ERROR")


def uri(path):
    return Path(path).resolve().as_uri()


def lire(path):
    raw = spark.read.csv(uri(path), header=False, schema=SCHEMA)
    lab = F.regexp_replace(F.trim(F.col("label")), "^'|'$", "")
    lab = F.regexp_replace(lab, "^Web Attack[^A-Za-z]+", "Web Attack - ")
    return raw.select(*[F.col(c).cast("double").alias(c) for c in FEATS],
                      lab.alias("label"))


def valide(c):
    col = F.col(c)
    return col.isNotNull() & ~F.isnan(col) & ~col.isin(float("inf"), float("-inf"))


def hashes(df):
    feats = F.concat_ws("|", *[F.col(c).cast("string") for c in FEATS])
    return (df.withColumn("fid", F.sha2(feats, 256))
              .withColumn("rid", F.sha2(F.concat_ws("|", feats, F.col("label")), 256)))


def resume(df, titre):
    print(f"\n--- {titre} : {df.count()} lignes ---")
    df.groupBy("label").count().orderBy(F.desc("count")).show(20, truncate=False)


train, test = lire(TRAIN_CSV), lire(TEST_CSV)
resume(train, "TRAIN brut")
resume(test, "TEST brut")

ok = reduce(and_, [valide(c) for c in FEATS])
train, test = train.filter(ok), test.filter(ok)
resume(train, "TRAIN sans valeurs invalides")
resume(test, "TEST sans valeurs invalides")

train, test = hashes(train), hashes(test)
if DEDUP:
    train, test = train.dropDuplicates(["rid"]), test.dropDuplicates(["rid"])
if REMOVE_TEST_LEAK:
    test = test.join(train.select("rid"), "rid", "left_anti")
train, test = train.cache(), test.cache()
resume(train, "TRAIN final")
resume(test, "TEST final")

tous = train.withColumn("split", F.lit("train")).unionByName(
    test.withColumn("split", F.lit("test")))
conflits = (tous.groupBy("fid").agg(F.countDistinct("label").alias("n"))
                .filter("n > 1").count())
print(f"\nVecteurs de variables avec plusieurs labels differents : {conflits}")

final = (tous
         .withColumn("record_id", F.concat(F.lit("row_"), F.substring("rid", 1, 16)))
         .withColumn("is_attack", (F.col("label") != "BENIGN").cast("int"))
         .select("record_id", "split", *FEATS, "label", "is_attack"))

# Export : Spark -> pandas -> Parquet (évite Hadoop/winutils sous Windows)
pdf = final.toPandas()
print("\nDonnees recuperees :", pdf.shape)

Path(OUTPUT).parent.mkdir(exist_ok=True)
pdf.to_parquet(OUTPUT, index=False)
print("Parquet ecrit dans", OUTPUT)

check = pd.read_parquet(OUTPUT)
print("Relecture :", check.shape)
print("record_id uniques :", check["record_id"].nunique(), "/", len(check))
print(check.groupby(["split", "label"]).size().to_string())

spark.stop()