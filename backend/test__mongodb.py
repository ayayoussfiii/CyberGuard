
from db import client

try:
    client.admin.command("ping")
    print("Connexion MongoDB réussie !")
except Exception as e:
    print("Erreur de connexion :", e)
