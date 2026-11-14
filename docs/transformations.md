# Transformations appliquées (pipeline PySpark)

Script : `src/processing/prepare_data.py`. Entrées : `fold_2_train.csv`, `fold_2_test.csv`.
Sorties (hors Git) : `data/processed_train.parquet`, `data/processed_test.parquet`.

## Étapes (dans l'ordre)

1. **Noms de colonnes** : espaces et caractères spéciaux remplacés par `_`, minuscules
   (ex. ` Flow Duration` -> `flow_duration`).
2. **Cible** : colonne `label` nettoyée (espaces supprimés), lignes sans cible supprimées.
3. **Valeurs `inf` / `Infinity` / `NaN`** : converties en valeurs manquantes ; les colonnes lues en texte à
   cause de ces valeurs sont reconverties en numérique.
4. **Doublons** : supprimés séparément dans le train et dans le test.
5. **Colonnes supprimées** : constantes ou avec plus de 50 % de valeurs manquantes. La décision est prise
   sur le **train uniquement**, puis appliquée au test (mêmes colonnes dans les deux fichiers).
6. **Lignes avec valeurs manquantes** : supprimées.
7. **Anti-fuite** : les lignes du test identiques à une ligne du train sont retirées du test.
8. **Colonnes ajoutées** : `record_id` (`train_...` / `test_...`) et `is_attack` (0 = BENIGN, 1 = attaque).

## Ce qui n'est PAS fait ici (volontairement)

Imputation, normalisation, encodage : ces transformations apprennent des statistiques et doivent être
ajustées sur le train uniquement. Elles sont laissées à Meriem (`src/detection/train.py`).

## Chiffres du traitement complet

**À COMPLÉTER** à partir de `outputs/prepare_report.json` : lignes avant/après, doublons supprimés,
colonnes supprimées (liste et raison), lignes du test retirées pour fuite, distribution finale des classes.

## Contrat avec Meriem

| Fichier | Contenu |
|---|---|
| `processed_train.parquet` | lignes de train nettoyées, `record_id`, variables, `label`, `is_attack` |
| `processed_test.parquet` | idem pour le test, mêmes colonnes |

Remarque : `record_id` est stable tant que les fichiers d'entrée et leur partitionnement ne changent pas.
Ne pas relancer le pipeline après livraison sans prévenir Meriem et Zineb.
