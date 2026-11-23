from flask import Blueprint, current_app, jsonify, request
from pymongo.errors import PyMongoError

from db import alerts_collection, metrics_collection, predictions_collection

summary_bp = Blueprint("summary", __name__, url_prefix="/api")


@summary_bp.route("/summary", methods=["GET"])
def get_summary():
    if request.args:
        return jsonify({
            "status": "error",
            "message": "This endpoint does not accept query parameters",
        }), 400

    try:
        summary = {
            "predictions": predictions_collection.count_documents({}),
            "alerts": alerts_collection.count_documents({}),
            "metrics": metrics_collection.count_documents({}),
            "normal_predictions": predictions_collection.count_documents({
                "predicted_label": "BENIGN",
            }),
            "attack_predictions": predictions_collection.count_documents({
                "predicted_label": {
                    "$exists": True,
                    "$nin": ["BENIGN", None, ""],
                },
            }),
        }
    except PyMongoError:
        current_app.logger.exception("Failed to retrieve dashboard summary")
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve dashboard summary",
        }), 500

    return jsonify({
        "status": "success",
        "data": summary,
    }), 200
