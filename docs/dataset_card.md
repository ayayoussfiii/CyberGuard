# Fiche dataset - CyberGuard

> Rédigée par Aya (Data Engineering). Les champs marqués **À COMPLÉTER** sont à remplir
> après vérification de la source ; ne rien inventer.

## Identification

| Élément | Valeur |
|---|---|
| Nom | CIC-IDS2017, découpage en 5 folds (IDS-5-FCV) |
| Origine du trafic | Canadian Institute for Cybersecurity (Université du Nouveau-Brunswick) |
| Lien de téléchargement utilisé | **À COMPLÉTER** (URL exacte de la source du zip) |
| Date de téléchargement | **À COMPLÉTER** |
| Licence / conditions d'usage | **À COMPLÉTER** (vérifier la page officielle ; citation de la publication demandée en général) |
| Publication à citer | **À COMPLÉTER** (référence officielle de CIC-IDS2017) |
| Fichiers utilisés | `fold_2_train.csv`, `fold_2_test.csv` |

> Vérifier que la variante téléchargée correspond bien à « IDS-5-FCV » du cahier des charges
> et le confirmer avec Meriem et Zineb.

## Structure

Le zip contient des fichiers `fold_k_train.csv` / `fold_k_test.csv` (validation croisée en 5 plis).
Un même enregistrement peut apparaître dans le train de plusieurs folds et dans le test d'un seul.
Le projet utilise **un seul fold (fold 2)** : train et test sont déjà séparés, sans mélange.

## Volumes bruts (fold 2)

| Jeu | Lignes |
|---|---|
| Train | 1 187 138 |
| Test | 296 786 |

## Classes (cible : colonne `label`, 13 classes)

| Classe | Train | Test |
|---|---|---|
| BENIGN | 839 412 | 209 853 |
| DoS Hulk | 147 887 | 36 971 |
| PortScan | 101 507 | 25 376 |
| DDoS | 81 838 | 20 461 |
| DoS GoldenEye | 6 587 | 1 647 |
| DoS slowloris | 3 709 | 927 |
| DoS Slowhttptest | 3 519 | 880 |
| Bot | 1 257 | 315 |
| Web Attack - Brute Force | 964 | 241 |
| Web Attack - XSS | 417 | 104 |
| Infiltration | 22 | 6 |
| Web Attack - Sql Injection | 13 | 3 |
| Heartbleed | 6 | 2 |

## Points d'attention

- **Fort déséquilibre** : BENIGN représente environ 70 % des lignes ; plusieurs classes ont moins de 30 lignes
  (Infiltration, Web Attack - Sql Injection, Heartbleed). Les métriques d'une classe de 2 à 6 lignes de test
  ne sont pas fiables : publier precision/recall/F1 par classe et macro-F1, pas seulement l'accuracy.
- Les CSV de ce type contiennent souvent des valeurs `Infinity` / `NaN` : elles sont traitées par le pipeline.
- Après nettoyage : nombre de colonnes, colonnes supprimées, lignes supprimées -> voir `docs/transformations.md`
  (**À COMPLÉTER** avec les chiffres de `outputs/prepare_report.json` après le traitement complet).

## Colonnes

Dictionnaire complet : `docs/data_dictionary.csv` (généré par `profile_data.py`).
