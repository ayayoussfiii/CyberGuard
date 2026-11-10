import sys

import numpy as np
import pandas as pd

PATH = "data/processed.parquet"
FEATS = [f"f{i:02d}" for i in range(77)]

df = pd.read_parquet(PATH)
erreurs = []


def check(nom, ok, detail=""):
    print(("OK    " if ok else "ECHEC ") + nom + (f" : {detail}" if detail else ""))
    if not ok:
        erreurs.append(nom)


check("81 colonnes", df.shape[1] == 81, str(df.shape))
check("record_id uniques", df["record_id"].is_unique)
check("aucun manquant", int(df.isna().sum().sum()) == 0)
check("aucun infini", not np.isinf(df[FEATS].to_numpy()).any())
check("splits train/test seulement", set(df["split"]) == {"train", "test"})
check("13 classes", df["label"].nunique() == 13, str(df["label"].nunique()))
check("is_attack coherent",
      ((df["label"] != "BENIGN").astype(int) == df["is_attack"]).all())

train, test = df[df["split"] == "train"], df[df["split"] == "test"]
check("aucun record_id commun train/test",
      len(set(train["record_id"]) & set(test["record_id"])) == 0)

# Information : memes variables mais label different entre train et test
h_tr = set(pd.util.hash_pandas_object(train[FEATS], index=False))
h_te = pd.util.hash_pandas_object(test[FEATS], index=False)
print(f"INFO  lignes de test dont les variables existent dans le train "
      f"(label different) : {int(h_te.isin(h_tr).sum())}")

print(f"\nTrain : {len(train)} | Test : {len(test)}")
sys.exit(1 if erreurs else 0)