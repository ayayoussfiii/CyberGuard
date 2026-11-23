from flask import Blueprint, current_app, jsonify, request
from pymongo.errors import PyMongoError

from db import alerts_collection

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api")
FILTER_FIELDS = frozenset({
    "record_id",
    "severity",
    "status",
    "attack_type",
    "predicted_label",
})


@alerts_bp.route("/alerts", methods=["GET"])
def get_alerts():
    allowed_params = FILTER_FIELDS | {"page", "limit"}
    if set(request.args.keys()) - allowed_params:
        return jsonify({
            "status": "error",
            "message": "Unsupported query parameter",
        }), 400

    try:
        page = int(request.args.get("page", "1"))
        limit = int(request.args.get("limit", "100"))
    except ValueError:
        return jsonify({
            "status": "error",
            "message": "page and limit must be positive integers; limit must not exceed 500",
        }), 400

    if page < 1 or limit < 1 or limit > 500:
        return jsonify({
            "status": "error",
            "message": "page and limit must be positive integers; limit must not exceed 500",
        }), 400

    filters = {}
    for field in FILTER_FIELDS:
        value = request.args.get(field)
        if value is not None:
            value = value.strip()
            if not value:
                return jsonify({
                    "status": "error",
                    "message": "Filter values must not be empty",
                }), 400
            filters[field] = value

    try:
        total = alerts_collection.count_documents(filters)
        pages = (total + limit - 1) // limit
        alerts = []
        if page <= pages:
            cursor = (alerts_collection.find(filters)
                      .sort("created_at", -1)
                      .skip((page - 1) * limit)
                      .limit(limit))
            for alert in cursor:
                alert["id"] = str(alert.pop("_id"))
                alerts.append(alert)
    except PyMongoError:
        current_app.logger.exception("Failed to retrieve alerts")
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve alerts",
        }), 500

    return jsonify({
        "status": "success",
        "data": alerts,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": pages,
        },
    }), 200
