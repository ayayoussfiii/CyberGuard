from flask import Blueprint, current_app, jsonify, request
from pymongo.errors import PyMongoError

from db import predictions_collection

distribution_bp = Blueprint("distribution", __name__, url_prefix="/api")


def _count_by(field):
    pipeline = [
        {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
    ]
    return [
        {"value": item["_id"], "count": item["count"]}
        for item in predictions_collection.aggregate(pipeline)
    ]


@distribution_bp.route("/distribution", methods=["GET"])
def get_distribution():
    if request.args:
        return jsonify({
            "status": "error",
            "message": "This endpoint does not accept query parameters",
        }), 400

    try:
        distribution = {
            "by_predicted_label": _count_by("predicted_label"),
            "by_attack_type": _count_by("attack_type"),
        }
    except PyMongoError:
        current_app.logger.exception("Failed to retrieve prediction distribution")
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve prediction distribution",
        }), 500

    return jsonify({
        "status": "success",
        "data": distribution,
    }), 200
