from flask import Blueprint, current_app, jsonify
from pymongo.errors import PyMongoError

from db import alerts_collection, metrics_collection, predictions_collection

summary_bp = Blueprint("summary", __name__, url_prefix="/api")


@summary_bp.route("/summary", methods=["GET"])
def get_summary():
    try:
        summary = {
            "predictions": predictions_collection.count_documents({}),
            "alerts": alerts_collection.count_documents({}),
            "metrics": metrics_collection.count_documents({}),
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
