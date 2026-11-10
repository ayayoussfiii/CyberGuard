import sys
import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

TRAIN = "data/CIC_IDS2017/fold_2_train.csv"
TEST = "data/CIC_IDS2017/fold_2_test.csv"


def charger(path, verbose=False):
    df = pd.read_csv(path, header=None, low_memory=False)
    df.columns = [f"f{i:02d}" for i in range(df.shape[1] - 1)] + ["label"]
    obj_cols = df.drop(columns="label").select_dtypes(include="object").columns
    if verbose:
        print("Variables de type texte :", list(obj_cols))
    for c in obj_cols:
        conv = pd.to_numeric(df[c], errors="coerce")
        bad = df.loc[conv.isna() & df[c].notna(), c]
        if verbose:
            print(f"\n--- {c} : {len(bad)} valeurs non numeriques ---")
            print(bad.value_counts().head(10).to_string())
        df[c] = conv
    return df


print("=== TRAIN ===")
df = charger(TRAIN, verbose=True)
print("\nDimensions :", df.shape)

feat = df.drop(columns="label")
feat_f = feat.replace([np.inf, -np.inf], np.nan)

print("\n=== Valeurs problematiques ===")
print("Infinis            :", int(np.isinf(feat.to_numpy(dtype='float64')).sum()))
print("Manquants/convertis:", int(feat.isna().sum().sum()))

print("\n=== Plage (valeurs finies) : normalise ou brut ? ===")
print("min global :", feat_f.min().min())
print("max global :", feat_f.max().max())
print("Colonnes avec valeurs negatives :", int((feat_f.min() < 0).sum()))

print("\n=== Doublons ===")
print("Doublons dans train :", int(df.duplicated().sum()))

print("\n=== Classes (label) ===")
print(df["label"].value_counts().to_string())
print((df["label"].value_counts(normalize=True) * 100).round(3).to_string())

print("\n=== TEST ===")
test = charger(TEST)
print("Dimensions :", test.shape)
print(test["label"].value_counts().to_string())

print("\n=== Fuite train/test ===")
h_tr = set(pd.util.hash_pandas_object(df, index=False))
h_te = pd.util.hash_pandas_object(test, index=False)
n = int(h_te.isin(h_tr).sum())
print(f"Lignes de test identiques a une ligne du train : {n} / {len(test)}")