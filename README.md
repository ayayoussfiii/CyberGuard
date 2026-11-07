\#  CyberGuard



\*\*Plateforme Big Data de détection des menaces de cybersécurité\*\*



Prototype académique qui exploite le dataset \*\*IDS-5-FCV\*\* : préparation des données avec PySpark, entraînement d'un modèle avec Scikit-learn, stockage des résultats dans MongoDB, exposition par une API Flask et visualisation dans une application React.



> \*\*Chaîne complète :\*\* IDS-5-FCV → PySpark → Scikit-learn → MongoDB → Flask → React



\*\*Équipe :\*\* Aya · Meriem · Zineb  |  \*\*Durée du projet :\*\* 7 jours



\---



\## 📌 Sommaire



1\. \[Objectifs et périmètre](#-objectifs-et-périmètre)

2\. \[Architecture](#-architecture)

3\. \[Fonctionnalités](#-fonctionnalités)

4\. \[Structure du dépôt](#-structure-du-dépôt)

5\. \[Prérequis](#-prérequis)

6\. \[Installation et lancement](#-installation-et-lancement)

7\. \[Modèle de données MongoDB](#-modèle-de-données-mongodb)

8\. \[API Flask](#-api-flask)

9\. \[Contrat d'échange entre les modules](#-contrat-déchange-entre-les-modules)

10\. \[Workflow GitHub](#-workflow-github)

11\. \[Tests et critères d'acceptation](#-tests-et-critères-dacceptation)

12\. \[Limites et précautions](#-limites-et-précautions)

13\. \[Évolutions possibles](#-évolutions-possibles)

14\. \[Équipe](#-équipe)



\---



\## 🎯 Objectifs et périmètre



\*\*Objectif :\*\* livrer en sept jours une chaîne complète, reproductible et démontrable :

données → traitement → modèle → MongoDB → API → interface.



\*\*Périmètre :\*\* analyse \*batch\* du dataset choisi. CyberGuard \*\*n'est pas\*\* un système de surveillance réseau en production et ne déclenche \*\*aucune réponse automatique\*\*.



\---



\## 🏗️ Architecture



| Couche | Technologie | Rôle |

|---|---|---|

| Source | IDS-5-FCV | Vérifier version, provenance, licence, fichiers et schéma |

| Traitement | Python, Pandas, PySpark | Profilage, nettoyage, transformations, export Parquet |

| Machine Learning | Scikit-learn | Entraînement, prédiction, évaluation, sauvegarde du modèle |

| Base de données | MongoDB + PyMongo | Stockage des prédictions, alertes, métriques et agrégats |

| Backend | Flask REST API + Flask-CORS | Accès MongoDB, endpoints JSON, validation, gestion des erreurs |

| Frontend | React + Plotly ou Recharts | Pages, filtres, graphiques, tableaux ; appels HTTP vers Flask |



\### Flux de fonctionnement



1\. \*\*Aya\*\* prépare les données avec PySpark et exporte en Parquet.

2\. \*\*Meriem\*\* entraîne et évalue le modèle, puis génère prédictions et métriques.

3\. Un \*\*script d'import\*\* insère les résultats utiles dans MongoDB.

4\. \*\*Flask\*\* interroge MongoDB et renvoie du JSON.

5\. \*\*React\*\* appelle Flask et affiche indicateurs, graphiques et alertes.



\### Rôle de MongoDB



MongoDB sert de stockage applicatif pour les résultats du modèle et les données utiles au dashboard. Il \*\*ne remplace pas PySpark\*\* et ne contient pas nécessairement tout le dataset brut : les gros volumes tabulaires restent en \*\*Parquet\*\*, et seuls les prédictions, alertes, métriques et agrégations utiles sont importés.



> 🔒 Le frontend React ne se connecte \*\*jamais\*\* directement à MongoDB. Seul Flask détient l'URI.



\---



\## ✨ Fonctionnalités



\- \*\*Overview\*\* : volume analysé, alertes détectées, répartition normal/attaque, types d'attaques les plus fréquents.

\- \*\*Threats / Alerts\*\* : tableau des événements suspects (type d'attaque, classe prédite, score éventuel, date) avec filtres.

\- \*\*Analytics\*\* : distributions par classe / type d'attaque et graphiques comparatifs.

\- \*\*Model Performance\*\* : accuracy, precision, recall, F1, macro-F1 et matrice de confusion.

\- \*\*Methodology\*\* : dataset, pipeline, modèle, protocole de test, limites et date d'analyse.

\- \*\*API status\*\* : état de Flask et de la connexion MongoDB.



\---



\## 📁 Structure du dépôt



```

cyberguard/

├── backend/

│   ├── app.py

│   ├── config.py

│   ├── db.py

│   ├── routes/                 # health, summary, metrics, predictions, alerts

│   ├── scripts/import\_results.py

│   └── requirements.txt

├── frontend/

│   ├── src/components/

│   ├── src/pages/

│   ├── src/services/api.js

│   └── package.json

├── src/

│   ├── processing/prepare\_data.py   # pipeline PySpark

│   └── detection/train.py           # entraînement et évaluation

├── notebooks/data\_profile.ipynb     # profilage du dataset

├── data/                            # local, ignoré par Git

├── models/  outputs/  docs/

├── .env.example

├── .gitignore

└── README.md

```



\---



\## 🧰 Prérequis



\- \*\*Python\*\* 3.x (avec `venv`)

\- \*\*Java\*\* (requis par PySpark)

\- \*\*Node.js\*\* et \*\*npm\*\*

\- \*\*MongoDB Community\*\* (local) ou \*\*MongoDB Atlas\*\*

\- \*\*Git\*\*



> 📝 Les versions exactes utilisées (Python, Node, MongoDB, Spark) sont à renseigner ici avant la livraison.



\---



\## 🚀 Installation et lancement



Respecter l'ordre ci-dessous.



\### 0. Cloner le dépôt



```bash

git clone https://github.com/ayayoussfiii/CyberGuard.git

cd CyberGuard

```



\### 1. MongoDB



Démarrer MongoDB Community localement \*\*ou\*\* configurer Atlas, créer la base `cyberguard` et autoriser l'utilisateur applicatif. Garder l'URI privée.



\### 2. Backend Flask



```bash

cd backend

python -m venv .venv

source .venv/bin/activate        # Windows : .venv\\Scripts\\activate

pip install -r requirements.txt

```



Créer un fichier `.env` à partir de `.env.example` :



```env

MONGO\_URI=mongodb://localhost:27017

MONGO\_DB\_NAME=cyberguard

```



Lancer l'API :



```bash

python app.py

```



\### 3. Traitement, entraînement et import



Depuis la racine du projet (dataset IDS-5-FCV placé dans `data/`) :



```bash

\# Préparation PySpark → processed.parquet

python src/processing/prepare\_data.py



\# Entraînement et évaluation → predictions.csv + metrics.json

python src/detection/train.py



\# Import des résultats dans MongoDB (sans doublons en cas de réimport)

python backend/scripts/import\_results.py

```



\### 4. Frontend React



```bash

cd frontend

npm install

```



Définir l'URL de l'API (exemple avec Vite) dans `frontend/.env` :



```env

VITE\_API\_BASE\_URL=http://localhost:5000

```



```bash

npm run dev

```



> 📝 Les commandes exactes (port Flask, scripts npm) sont à ajuster selon l'implémentation finale.



\---



\## 🗄️ Modèle de données MongoDB



Base : `cyberguard` — trois collections.



| Collection | Champs | Usage |

|---|---|---|

| `predictions` | `record\_id`, `true\_label`, `predicted\_label`, `attack\_type` (si dispo), `score` (facultatif), `created\_at` | Une ligne par prédiction utile |

| `metrics` | `run\_id`, `model\_name`, `accuracy`, `precision`, `recall`, `f1`, `macro\_f1`, `confusion\_matrix`, `test\_size`, `created\_at` | Un document par exécution |

| `alerts` | `record\_id`, `severity` (règle documentée), `attack\_type`, `predicted\_label`, `score`, `status`, `created\_at` | Dérivée des prédictions classées suspectes |



\*\*Index :\*\* `record\_id`, `created\_at`, ainsi que les champs fréquemment filtrés (`predicted\_label`, `severity`).



> Les champs définitifs sont validés au jour 2, après inspection du schéma réel du dataset. Les dates sont stockées en BSON Date / ISO 8601.



\---



\## 🔌 API Flask



| Méthode | Endpoint | Description |

|---|---|---|

| GET | `/api/health` | Statut de Flask et de la connexion MongoDB |

| GET | `/api/summary` | Volumes, alertes, répartition normal/attaque |

| GET | `/api/metrics` | Métriques et matrice de confusion |

| GET | `/api/alerts` | Alertes avec filtres et pagination |

| GET | `/api/predictions` | Prédictions avec filtres |

| GET | `/api/distribution` | Agrégations par classe / type d'attaque |



\*\*Règles :\*\* validation des paramètres, résultats toujours limités et paginés, gestion des erreurs de connexion MongoDB. React \*\*ne recalcule pas\*\* les métriques du modèle.



\---



\## 🤝 Contrat d'échange entre les modules



| Élément | Responsable | Contrat |

|---|---|---|

| Données préparées | Aya | `processed.parquet` : lignes nettoyées, variables et cible identifiée |

| Prédictions | Meriem | `predictions.csv` : identifiant stable, vraie classe, prédiction, score facultatif |

| Métriques | Meriem | `metrics.json` : accuracy, precision, recall, F1, macro-F1, taille du test, matrice |

| Import MongoDB | Zineb + Meriem | Import des prédictions et métriques, mapping documenté, pas de doublons |

| API et UI | Zineb | Flask renvoie du JSON ; React consomme uniquement les endpoints Flask |



\---



\## 🌿 Workflow GitHub



\- `main` : version stable — `develop` : intégration.

\- Branches de travail : `feature/aya-data-pipeline`, `feature/meriem-ml`, `feature/zineb-react-flask-mongodb`.

\- Commits fréquents, push de sa branche, \*\*Pull Request vers `develop`\*\*, relue/testée par une autre membre avant fusion.

\- Synchroniser les branches après chaque fusion ; prévenir l'équipe avant toute modification des contrats ou endpoints.



\*\*Exclus de Git\*\* (`.gitignore`) : `.venv/`, `node\_modules/`, `\_\_pycache\_\_/`, `.env`, `data/`, `\*.parquet`, `\*.csv`, `outputs/`, `models/`.



> Ne jamais versionner le dataset brut, les gros artefacts ou l'URI MongoDB. Utiliser `.env.example` avec des valeurs factices.



\---



\## ✅ Tests et critères d'acceptation



\- \[ ] Dépôt clonable et README compréhensible

\- \[ ] MongoDB accessible depuis Flask ; `/api/health` indique le statut

\- \[ ] PySpark produit un Parquet cohérent

\- \[ ] Split train/test sans fuite de cible ; modèle et métriques reproductibles

\- \[ ] Prédictions et métriques réelles importées dans MongoDB sans doublons involontaires

\- \[ ] Endpoints Flask : JSON correct, erreurs gérées, résultats limités

\- \[ ] React affiche les données issues de MongoDB via Flask, sans faux résultats résiduels

\- \[ ] Graphiques et filtres reflètent les résultats réels

\- \[ ] Aucun secret dans Git ; limites documentées



\---



\## ⚠️ Limites et précautions



\- Vérifier la provenance, la licence, la version et le schéma d'IDS-5-FCV : toutes les variantes n'ont pas forcément les mêmes colonnes.

\- Contrôler valeurs manquantes, doublons, valeurs infinies, déséquilibre des classes et biais.

\- \*\*Éviter la fuite de données\*\* : split avant tout ajustement appris ; transformations ajustées sur le train uniquement.

\- En cas de déséquilibre, publier precision, recall et F1 \*\*par classe\*\* ainsi que le macro-F1, pas uniquement l'accuracy.

\- Configurer CORS pour l'origine React et restreindre les origines en déploiement.

\- Prototype académique en analyse batch : pas de surveillance temps réel, pas de réponse automatique.

\- Kafka, HDFS et Elasticsearch sont facultatifs et ne sont pas utilisés dans le socle.



\---



\## 🔭 Évolutions possibles



Après livraison du socle : Kafka pour simuler l'arrivée d'événements, actualisation périodique, authentification, filtres plus avancés.



\---



\## 👩‍💻 Équipe



| Membre | Rôle | Livrables principaux |

|---|---|---|

| \*\*Aya\*\* | Data Engineering | Profilage, pipeline PySpark, Parquet, dictionnaire de données |

| \*\*Meriem\*\* | Data Science | Modèle, `predictions.csv`, `metrics.json`, note d'évaluation |

| \*\*Zineb\*\* | Backend, MongoDB \& Frontend | API Flask, import MongoDB, application React, documentation de lancement |



\*\*Travail commun :\*\* validation du contrat de données (jour 2), relecture des Pull Requests, tests du parcours complet, préparation de la présentation.



\---



\*Projet académique — CyberGuard, 2026.\*

