# Audit de préparation à l’intégration — CyberGuard

**Audit réalisé le 28 novembre 2026** à partir du code présent dans le workspace. Les vérifications HTTP ont été faites en lecture seule sur `http://127.0.0.1:5000`. Aucun document ni index MongoDB n’a été modifié.

## A. État général du projet

| Partie | État vérifié |
|---|---|
| Frontend | Six pages React sont routées. Les pages de données passent par `src/services/api.js`; les exemples sont isolés dans `mockData.js`. Le mode DEMO était codé en dur à `true`; il accepte maintenant `VITE_DEMO_MODE=false` tout en restant DEMO par défaut. |
| Flask | Application et blueprints enregistrés. Une route d’agrégation Analytics a été ajoutée; les routes existantes restent disponibles. CORS est activé sans restriction d’origine et Flask démarre avec `debug=True` : réglages de développement à revoir avant tout déploiement. |
| MongoDB | Le contrôle `/api/health` du client Flask de test a répondu `online` pour Flask et MongoDB. MongoDB **8.0.38**. Le résumé renvoie des compteurs à zéro; les listes et métriques sont vides. Les champs et index n’ont pas été inspectés directement. |
| PySpark | `src/processing/prepare_data.py` et `profile_data.py` existent. Le pipeline est un traitement batch local du CSV vers Parquet, pas un service permanent. PySpark n’est pas une dépendance du backend. Il n’est pas installé dans l’interpréteur Python vérifié. |
| Machine Learning | `src/detection/train.py` et `backend/scripts/import_results.py` existent mais font **0 octet**. Il n’y a donc actuellement ni entraînement, ni inférence, ni import des résultats. Aucun modèle n’est présent dans le workspace. |

Les dossiers locaux `data/` et `models/` sont absents du workspace inspecté. Le script PySpark attend `data/CIC_IDS2017/fold_2_train.csv` et `fold_2_test.csv`. Les résultats chiffrés décrits dans le README ne sont donc pas reproductibles à partir des fichiers actuellement présents.

### État des six pages

| Page | Avec DEMO | Avec données réelles | État / adaptation à prévoir |
|---|---|---|---|
| Overview | Oui, les valeurs proviennent de `mockData.js`. | Partiellement prête : résumé, métriques, activité, distribution et alertes sont déjà chargés via les fonctions API. | Le backend doit recevoir les champs réels convenus; les métriques restent indisponibles tant que `metrics` est vide. |
| Threat Intelligence (`/alerts`) | Oui. | Prête pour les champs d’alertes normalisés par `api.js`. | L’API ne calcule pas `severity`, IP, protocole ou score : ces champs sont facultatifs côté données et s’affichent comme absents si le producteur ne les fournit pas. Définir la règle de gravité avec l’équipe. |
| Analytics | Oui. | La page appelle maintenant une agrégation Flask/MongoDB; elle ne télécharge plus les prédictions en mode réel. | Les filtres existants sont conservés. Les agrégations utilisent `created_at`, `predicted_label`, `attack_type`, `protocol` et les champs d’alerte déjà consommés par le frontend. |
| Model Performance | Oui, via les valeurs illustratives de `mockData.js`. | Prête si un document métrique respecte le contrat décrit ci-dessous. | Fournir la liste ordonnée des classes de la matrice et préciser si les scores sont des fractions ou des pourcentages. La normalisation accepte les deux, mais `1` est ambigu. |
| Methodology | Oui, page documentaire statique. | Non alimentée par l’API; elle ne dépend pas encore des sorties réelles du modèle. | Mettre à jour les textes et statuts quand le pipeline réel de l’équipe sera connu. Aucun composant n’a besoin d’être reconstruit pour cette mise à jour. |
| API Status | Oui, mais cette page fait toujours de vraies requêtes HTTP. | Oui pour Flask, MongoDB et les routes HTTP. | PySpark et le modèle sont correctement affichés comme `unknown` : aucun contrôle de disponibilité léger n’existe encore pour eux. |

Les valeurs fictives numériques se trouvent dans `frontend/src/services/mockData.js`, pas dans les composants des pages. Le code garde `VITE_DEMO_MODE=true` par défaut. Pour tester les données live, mettre `VITE_DEMO_MODE=false` dans `frontend/.env` et redémarrer Vite.

## B. Architecture et fichiers vérifiés

```text
frontend/src/pages/             six pages
frontend/src/components/        graphiques et tableaux Overview
frontend/src/services/api.js    URL, modes DEMO/live, appels et normalisations
backend/app.py                 Flask, CORS, blueprints, health check
backend/routes/                summary, alerts, predictions, distribution, metrics, analytics
backend/db.py                  client PyMongo et collections
src/processing/                profilage et préparation batch PySpark
src/detection/train.py         présent mais vide
backend/scripts/import_results.py  présent mais vide
docs/                          documentation dataset et préparation
```

Les routes React constatées dans `App.jsx` sont `/`, `/alerts`, `/analytics`, `/performance`, `/methodology` et `/api-status`. Une route inconnue retombe sur Overview. Les chemins des pages sont donc cohérents avec la navigation observée.

## C. Routes et contrat frontend/backend

Les réponses Flask de données utilisent l’enveloppe `{ "status": "success", "data": ... }`. Les listes utilisent en plus `pagination` quand pertinent. `responseData()` retire l’enveloppe `data` avant normalisation.

| Endpoint et fonction frontend | Requête | Format réellement produit par Flask | Compatibilité / remarque |
|---|---|---|---|
| `GET /api/health` — `getHealth()`, `checkApiStatus()` | Aucun paramètre | `{status, checked_at, services: {flask, mongodb, pyspark, ml_model}}` | Compatible avec API Status. Les services PySpark et modèle sont `unknown`, ce qui est exact au vu du code. |
| `GET /api/summary` — `getSummary()` | Aucun paramètre accepté | `data: {predictions, alerts, metrics, normal_predictions, attack_predictions}` | Compatible : l’adaptateur expose aussi `total_predictions` et `total_alerts` pour Overview. Valeurs observées : tous les compteurs à `0`. |
| `GET /api/analytics` — `getAnalytics()` | `period` (`24h`, `7d`, `30d`, `90d`, `all`); `attack_type` (`all` ou type exact, sans casse) | `data: {summary, traffic, attack_distribution, protocol_distribution, top_sources, options}` | Nouvelle route agrégée côté MongoDB. Les composants et filtres Recharts ne changent pas. Les dates de filtre doivent être stockées comme dates MongoDB UTC dans `created_at`. API Status utilise `probe=1`, une sonde légère sans agrégations. |
| `GET /api/alerts` — `getAlerts()` | `page`, `limit` (1–500) et filtres exacts `record_id`, `severity`, `status`, `attack_type`, `predicted_label`. Le client demande `limit=500`. | `data: [...]`, `pagination: {page, limit, total, pages}` | Compatible avec pagination et normalisation de `attack_type/type`, IP, date, protocole, confiance et résultat. Les champs d’alerte ne sont pas validés par Flask et ne sont pas calculés automatiquement. |
| `GET /api/predictions` — `getPredictions()` | `page`, `limit` (1–500) et filtres exacts `record_id`, `true_label`, `predicted_label`, `attack_type`. Le client demande `limit=500`. | `data: [...]`, `pagination: {...}` | Compatible avec la pagination. L’adaptateur comprend label, date, type d’attaque, protocole et IP selon plusieurs alias. Flask transmet les documents tels quels après conversion de `_id`. |
| `GET /api/distribution` — `getDistribution()` | Aucun paramètre accepté | `data: {by_predicted_label: [{value, count}], by_attack_type: [{value, count}]}` | Compatible. L’adaptateur préfère les types d’attaque, puis utilise les labels prédits si aucune catégorie d’attaque n’est disponible. Les lignes dont `value` est `null` sont écartées. |
| `GET /api/metrics?limit=1` — `getMetrics()` | `limit` de 1 à 500 | `data: [...]`, trié par `created_at` décroissant | Compatible avec la normalisation des métriques. Le frontend prend le premier document. Une collection vide donne un objet d’affichage avec scores et matrice indisponibles, sans valeur fictive. |

Analytics ne télécharge plus `/api/predictions` et `/api/alerts` pour calculer ses graphiques en mode réel. `getAnalytics()` envoie les filtres à `/api/analytics`; MongoDB calcule les comptes, séries horaires, distributions, protocoles et principales sources. Les endpoints `/api/alerts` et `/api/predictions` continuent d’exposer `page` et `limit` côté serveur. `getPredictionsPage()` et `getAlertsPage()` permettent de récupérer une page à la fois. La page Threat Intelligence existante continue de charger toutes ses alertes afin de conserver ses statistiques, recherches et graphiques globaux; un passage complet de cette page à une pagination serveur nécessitera une route de statistiques compatible avec ses filtres.

### Contrat conseillé pour les pages

- **Overview** : `summary.total_predictions`, `summary.total_alerts`; les métriques sont `accuracy` et `recall` en fraction de 0 à 1; activité sous forme de lignes `{timestamp, normal, malicious}` (l’adaptateur accepte aussi `time` et `attacks`).
- **Threat Distribution** : `{name, value}` après normalisation, avec `value` numérique positif.
- **Threat Intelligence** : une alerte devrait avoir `record_id` stable, `created_at` UTC, `predicted_label` ou `attack_type`, et `severity` issue d’une règle explicitement décidée. `source_ip`, `destination_ip`, `protocol` et `confidence` sont facultatifs dans l’interface.
- **Analytics** : prédictions avec label et horodatage; alertes avec les IP/protocoles disponibles. Sans date valide, les lignes ne peuvent pas être placées dans les intervalles temporels.
- **Model Performance** : le normaliseur accepte des métriques au niveau racine ou sous `metrics`; matrice `{labels: [...], values: [[...], ...]}` carrée; lignes de classes `{class_name, precision, recall, f1_score, support}`. Les libellés doivent correspondre exactement à l’ordre des lignes et colonnes de la matrice.

## D. Backend, données et risques

### Comportement Flask constaté

- `app.py` crée Flask, active `CORS(app)`, enregistre les blueprints et expose `/api/health`.
- `config.py` charge le `.env` de la racine via `python-dotenv`, puis lit `MONGO_URI` et `MONGO_DB_NAME`. Les variables déjà présentes dans l’environnement gardent la priorité (`override=False`). Aucun vrai fichier `.env` n’était présent dans le workspace; les valeurs secrètes n’ont pas été lues ni modifiées. Le `.env.example` racine est réservé au backend; les variables Vite sont dans `frontend/.env.example` avec le suffixe `/api` correct.
- `db.py` crée les collections `alerts`, `metrics` et `predictions` via les handles PyMongo; le client utilise des timeouts. Les collections peuvent être créées implicitement par MongoDB au premier insert. Les réponses de liste vides ne prouvent donc pas, à elles seules, que ces collections sont physiquement créées.
- Les routes gèrent les erreurs PyMongo connues avec HTTP 500 et un message générique; elles les inscrivent dans les logs serveur. Les filtres de liste sont validés et plafonnés à 500 par page.
- Les routes changent le `_id` Mongo racine en champ `id` texte. Les dates `datetime` seront sérialisées par Flask (format HTTP-date), que le navigateur sait parser. Les ObjectId imbriqués dans un document ne sont pas convertis explicitement : un document ML contenant de tels objets peut faire échouer `jsonify`. Ce point devra être vérifié avec un vrai document et corrigé dans une sérialisation partagée si nécessaire.
- Aucun code du dépôt ne crée d’index ou de validation de schéma. Le README mentionne des index, mais leur existence réelle dans MongoDB n’a pas été vérifiée. Aucun index n’a été créé pendant cet audit.
- Le CORS ouvert et `debug=True` conviennent au développement local uniquement; restreindre les origines et désactiver le mode debug avant une mise en ligne.

### État des collections et schémas

Le propriétaire indique que `cyberguard` contient `predictions`, `alerts` et `metrics`. Les GET du serveur ont renvoyé des compteurs et listes à zéro. Aucun accès shell MongoDB n’a été fait; les champs et index réels n’ont donc pas pu être lus.

| Collection | Champs déjà lus ou filtrés par le code | Proposition minimale à convenir avec la collègue |
|---|---|---|
| `predictions` | Filtrage: `record_id`, `true_label`, `predicted_label`, `attack_type`; comptage sur `predicted_label`; tri `created_at`. Frontend sait aussi lire `timestamp`, `date`, `protocol`, `source_ip`. | `record_id` stable, `created_at` UTC, `predicted_label`; facultatifs: `true_label`, `attack_type`, confiance/probabilités, référence au dataset et version du modèle. Les colonnes CIC préparées sont `f00`–`f76`, `label`, `split`, `is_attack`; elles ne garantissent pas des IP ou protocoles réseau lisibles. |
| `alerts` | Filtrage: `record_id`, `severity`, `status`, `attack_type`, `predicted_label`; tri `created_at`. Le frontend lit aussi IP, protocole, confidence et model result. | `record_id`, `created_at`, `severity`, `status`, `predicted_label` ou `attack_type`. Ajouter les IP/protocoles/confiance uniquement s’ils proviennent réellement des données. La règle de gravité reste à décider. |
| `metrics` | Tri `created_at`; le frontend lit accuracy, precision, recall, F1, matrice, métriques par classe, modèle et évaluation. | Un document par évaluation, avec `run_id`, `created_at`, `model`, `evaluation`, `metrics`, `confusion_matrix.labels/values` et `per_class_metrics`. Garder les scores en fraction `[0,1]` et `support` en compte entier. |

Les champs proposés ne sont pas un schéma déjà appliqué : MongoDB n’a pas de validation dans le dépôt. Attendre les fichiers réels avant de fixer la liste des 77 variables, la sémantique des scores et la règle de création d’alertes. Ne pas stocker tout le dataset tabulaire dans MongoDB; le Parquet est mieux adapté à ces données de traitement.

### Configuration et pagination

`backend/config.py` charge maintenant le `.env` de la racine du projet via `python-dotenv`, sans écraser les variables déjà présentes dans l’environnement. Le `.env.example` racine contient uniquement les réglages backend; les variables Vite restent dans `frontend/.env.example`. Le mode DEMO reste activé par défaut; le mode réel est opt-in avec `VITE_DEMO_MODE=false` et `VITE_API_BASE_URL=http://127.0.0.1:5000/api`.

La route Analytics s’appuie uniquement sur des champs déjà cités dans les routes ou les normaliseurs. Le type BSON de `created_at`, le mapping exact des champs et les classes du futur dataset devront être confirmés avec les échantillons réels. Aucun index ni donnée d’exemple n’a été créé.

### Préparation Machine Learning

Le dossier `src/detection/` est le point logique pour le code d’entraînement et le chargement d’un pipeline. Le dossier `models/` est déjà exclu de Git; il peut contenir localement un artefact versionné, un manifeste de features/classes et les objets de preprocessing approuvés. Le fichier `backend/scripts/import_results.py` est le point logique pour un import batch après accord sur le contrat, mais il est vide aujourd’hui. Une future inférence en ligne pourra vivre dans un module de service backend appelé par une route dédiée; aucune route de prédiction POST n’existe actuellement.

À demander avant de coder l’intégration :

1. Artefact modèle entraîné et méthode/versions compatibles pour le charger.
2. Pipeline de preprocessing complet; encodeurs, scaler/vectoriseur et ordre exact des 77 features.
3. Mapping exact des classes et convention pour BENIGN / labels d’attaque.
4. Résultats d’évaluation: métriques globales, moyennage (macro/weighted), matrice carrée avec ordre des classes, scores par classe et supports.
5. Quelques exemples de prédictions et alertes anonymisés, plus l’unité et l’échelle des scores de confiance.
6. Métadonnées: nom/version, date d’entraînement, dataset/fold/split, taille d’évaluation, protocole de validation et versions Python/scikit-learn.
7. Décision sur ce qui constitue une alerte et sur le lien éventuel entre alerte et prédiction.

Ne charger que des artefacts provenant d’une source de confiance : certains formats de sérialisation Python peuvent exécuter du code au chargement.

### Préparation PySpark

`src/processing/prepare_data.py` lit les deux CSV CIC-IDS2017 via des chemins relatifs au répertoire courant, nettoie et déduplique, écarte le chevauchement train/test, produit un Parquet et appelle `toPandas()` pour l’écriture. Le script ne reçoit pas de paramètres CLI/config et n’est pas appelé par Flask. Il doit rester un traitement batch. Son transfert intégral vers pandas consomme de la mémoire; vérifier la capacité de la machine avec le vrai dataset avant de le relancer. `docs/requirements_data.txt` porte les dépendances data/ Spark; `backend/requirements.txt` ne contient que Flask, Flask-Cors et PyMongo.

## E. Problèmes identifiés et corrections

### Priorité critique avant une vraie démonstration avec modèle

1. **Pas de chaîne ML/import exécutable** : `train.py` et `import_results.py` sont vides; les collections observées n’ont pas de résultats. L’interface peut afficher les états vides, mais elle ne peut pas recevoir les résultats sans ces fichiers ou un import défini.

### Priorité importante

1. Les contrats des documents alertes et métriques ne sont pas validés côté Flask. Une divergence de noms, d’échelle, de date ou d’ordre de classe produira des valeurs absentes ou trompeuses.
2. Le normaliseur racine ne sécurise pas les ObjectId BSON imbriqués; vérifier les vrais documents avant import en masse.
3. Le `.env.example` racine mélangeait backend et Vite et l’URL Vite omettait `/api`; les exemples sont maintenant séparés et `config.py` charge le `.env` racine. Aucun `.env` réel n’était présent dans le workspace.
4. Le README a été corrigé : il ne prétend plus que l’import est idempotent et indique 81 colonnes pour le `select` actuel.
5. La page Threat Intelligence charge encore toutes les alertes pour ses statistiques et graphiques globaux, même si l’endpoint et le service exposent la pagination. À grande échelle, ajouter une agrégation des statistiques qui suit ses filtres avant de la relier à la pagination visuelle.
6. Le résumé Flask classe les prédictions comme normales uniquement si `predicted_label` vaut exactement `BENIGN`, tandis que le frontend reconnaît aussi `NORMAL` et ignore la casse. Aligner les labels avant d’utiliser les compteurs de classes.
7. Les dépendances backend ne sont pas épinglées. CORS est permissif et le serveur tourne en debug : ne pas déployer tel quel.

### Priorité mineure

1. `backend/test_dependencies.py` et `backend/test__mongodb.py` sont des scripts de vérification manuelle, pas une suite de tests unitaires contrôlée.
2. Le frontend n’a pas de script `test`; seul lint/build sont définis. Les états d’erreur, chargement et vide sont généralement présents.
3. `Methodology` est une description statique; vérifier ses statuts avec le pipeline final.
4. Les rares champs de `normalizeModelPerformance` ne permettent pas de deviner la convention si un score vaut exactement `1`; définir et documenter une échelle unique côté producteur.

### Corrections apportées pendant cet audit

- `frontend/src/services/api.js` : le mode DEMO conserve `true` par défaut mais peut maintenant être désactivé avec `VITE_DEMO_MODE=false`. La distribution utilise `by_predicted_label` si `by_attack_type` est vide, évitant un graphique vide quand seuls les labels sont produits.
- `frontend/src/services/api.js` et `backend/routes/analytics.py` : la page Analytics utilise les agrégations MongoDB au lieu de télécharger les prédictions. L’activité Overview utilise aussi l’agrégation des dernières 24 heures. La lecture des prédictions brutes est désormais paginée par défaut.
- `backend/config.py`, `backend/requirements.txt`, `.env.example` : chargement du fichier d’environnement racine avec `python-dotenv`; le fichier racine est réservé au backend.
- `backend/app.py`, `backend/routes/__init__.py`, `backend/routes/analytics.py` : ajout et enregistrement du GET `/api/analytics`.
- `README.md` : correction du schéma Parquet, du statut de l’import et des commandes de configuration/lancement.
- `frontend/.env.example` : documente l’URL Flask avec `/api` et le réglage DEMO par défaut.
- `docs/INTEGRATION_READINESS.md` : présent audit, contrats et étapes de raccordement.

Le health check Flask avec statuts structurés et les délais PyMongo étaient déjà présents dans les fichiers audités; ils n’ont pas été modifiés pendant cette passe.

## F. Fichiers à recevoir de la collègue

- Dataset exact ou accès/source/licence, dictionnaire de colonnes, encodage, séparateur, en-têtes et split retenu.
- Scripts PySpark finaux et paramètres d’exécution, si traitement Spark prévu; schéma de sortie Parquet.
- Artefact(s) du modèle et pipeline de preprocessing/encodage complet.
- Liste ordonnée des features d’entrée et mapping des classes.
- Résultats d’évaluation exportés avec matrice et classes ordonnées, scores par classe, support, moyennage et version du modèle.
- Exemple(s) anonymisé(s) de prédiction et d’alerte au format JSON, avec dates, confiance, gravité et champs effectivement disponibles.
- Versions et commandes nécessaires pour Python, Java/JDK, PySpark, pandas, pyarrow et scikit-learn.
- Règle métier validée pour convertir une prédiction en alerte, si cette conversion est attendue.

## G. Plan d’intégration final

1. Examiner le dataset, sa licence et le dictionnaire; figer les noms/types/ordre des features et labels.
2. Reproduire le traitement batch PySpark et vérifier le schéma Parquet, les valeurs manquantes, doublons et séparation des splits.
3. Récupérer les artefacts réellement utilisés à l’évaluation; tester un petit lot connu, sans réentraîner par défaut.
4. Valider avec la collègue des exemples JSON de `predictions`, `alerts` et `metrics`; choisir UTC ISO-8601, scores `[0,1]`, classes ordonnées et règles de gravité.
5. Définir puis implémenter un import idempotent dans `backend/scripts/import_results.py` après validation du schéma; commencer sur un petit lot et vérifier les comptes via GET.
6. Vérifier l’agrégation Analytics sur un échantillon réel, notamment la date BSON `created_at`, les aliases et les champs de protocole/source; conserver les composants React.
7. Passer le frontend en live avec `frontend/.env` : `VITE_API_BASE_URL=http://127.0.0.1:5000/api` et `VITE_DEMO_MODE=false`; redémarrer Vite.
8. Vérifier les sept GET, les états non vides et vides, le tri/pagination, les graphiques et la matrice. N’ajouter des index qu’après analyse des requêtes et accord de l’équipe.
9. Mettre à jour Methodology/README, puis restreindre CORS, désactiver debug et configurer les variables secrètes hors du code avant déploiement.

### Checklist

- [ ] Dataset, source et licence confirmés.
- [ ] Schéma Parquet et ordre des features vérifiés.
- [ ] Preprocessing, encodeurs et modèle versionnés ensemble.
- [ ] Exemples de prédiction/alerte validés par la collègue.
- [ ] Contrat de métriques et ordre des classes validés.
- [ ] Règle de gravité documentée ou champs manquants acceptés par l’interface.
- [ ] Import batch idempotent implémenté et testé sur petit lot.
- [ ] Six routes de données plus health vérifiées avec données et collections vides.
- [ ] Agrégation Analytics testée avec le vrai schéma et dates BSON UTC.
- [ ] `VITE_API_BASE_URL` contient `/api`; `VITE_DEMO_MODE=false` testé.
- [ ] CORS/debug et configuration de déploiement revus.

## Vérifications exécutées

- Revue des routes Flask, pages, composants, services, mocks, configuration et scripts présents.
- Les six GET d’origine (`health`, `summary`, `alerts`, `predictions`, `distribution`, `metrics`) ont répondu **HTTP 200** sur le serveur local avant l’ajout d’Analytics. L’endpoint Analytics ajouté n’a pas encore été exercé en HTTP sur le serveur live; il faut redémarrer le backend pour le charger.
- Le client de test Flask a reçu HTTP 200 pour les sept routes (health, summary, analytics, alerts, predictions, distribution, metrics), dont `/api/analytics` sur `7d`, `all` et `probe=1`. Une période inconnue renvoie HTTP 400. Les collections observées sont vides : l’agrégation renvoie `total_events: 0`, `attack_rate: null`, `top_attack: null` et des tableaux vides sans erreur. La sonde API Status n’exécute pas les agrégations.
- `/api/health` a indiqué Flask et MongoDB `online`; PySpark et ML `unknown`.
- Compilation de syntaxe Python (`py_compile`) exécutée sur l’application, la configuration, `db.py` et toutes les routes : réussie.
- L’interpréteur Python 3.10.2 avait `pymongo` et `python-dotenv` absents. Ces deux dépendances légères ont été installées après autorisation pour exécuter les vérifications; PySpark reste absent. La priorité des variables de processus sur `Config` a été vérifiée sans afficher l’URI MongoDB. Le fichier `.env` réel était absent et n’a pas été créé.
- `npm run lint` et `npm run build` ont été exécutés avec DEMO activé et désactivé. Vite émet un avertissement de bundle supérieur à 500 kB.
- Les six routes React ont été confirmées dans `App.jsx` et incluses dans le build; aucun test navigateur/E2E n’est configuré dans le projet.

## Conclusion

CyberGuard est **partiellement pr?par?, mais pas encore pr?t ? recevoir directement les r?sultats r?els ML/PySpark sans validation**. La configuration Flask, les contrats de base ? vide, la pagination serveur des pr?dictions et l?agr?gation Analytics c?t? MongoDB sont en place. L?int?gration compl?te attend le dataset et les artefacts de la coll?gue, la validation des sch?mas r?els, et l?impl?mentation r?elle de `train.py` et `import_results.py`. La page Threat Intelligence r?cup?re encore toutes les alertes pour ses statistiques globales; il faudra une agr?gation serveur compatible avec ses filtres avant des volumes ?lev?s. Les tests de compilation/build ne remplacent pas un essai visuel dans un navigateur ni un test avec des documents ML r?els.
