from flask import Blueprint, current_app, jsonify, request
from pymongo.errors import PyMongoError

from db import metrics_collection

metrics_bp = Blueprint("metrics", __name__, url_prefix="/api")


@metrics_bp.route("/metrics", methods=["GET"])
def get_metrics():
    if set(request.args.keys()) - {"limit"}:
        return jsonify({
            "status": "error",
            "message": "Unsupported query parameter",
        }), 400

    try:
        limit = int(request.args.get("limit", "100"))
    except ValueError:
        return jsonify({
            "status": "error",
            "message": "limit must be an integer between 1 and 500",
        }), 400

    if limit < 1 or limit > 500:
        return jsonify({
            "status": "error",
            "message": "limit must be an integer between 1 and 500",
        }), 400

    try:
        metrics = []
        cursor = metrics_collection.find().sort("created_at", -1).limit(limit)
        for metric in cursor:
            metric["id"] = str(metric.pop("_id"))
            metrics.append(metric)
    except PyMongoError:
        current_app.logger.exception("Failed to retrieve model metrics")
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve model metrics",
        }), 500

    return jsonify({
        "status": "success",
        "data": metrics,
    }), 200
