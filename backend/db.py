
from pymongo import MongoClient
from config import Config

# Création du client MongoDB
client = MongoClient(
    Config.MONGO_URI,
    serverSelectionTimeoutMS=2000,
    connectTimeoutMS=2000,
    socketTimeoutMS=2000,
)

# Sélection de la base de données
db = client[Config.MONGO_DB_NAME]

# Accès aux collections
alerts_collection = db["alerts"]
metrics_collection = db["metrics"]
predictions_collection = db["predictions"]
