
from flask import Flask, jsonify
from flask_cors import CORS
from db import client
from routes import summary_bp

# Création de l'application Flask
app = Flask(__name__)

# Autoriser les requêtes du Frontend React
CORS(app)

# Enregistrer les routes du résumé
app.register_blueprint(summary_bp)

# Premier endpoint : vérifier le fonctionnement du Backend
@app.route("/api/health", methods=["GET"])
def health():
    try:
        # Vérifier la connexion MongoDB
        client.admin.command("ping")

        return jsonify({
            "status": "success",
            "message": "Backend Flask et MongoDB fonctionnent correctement"
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Erreur de connexion MongoDB",
            "details": str(e)
        }), 500


# Démarrer le serveur Flask
if __name__ == "__main__":
    app.run(debug=True, port=5000)
