from datetime import datetime, timedelta, timezone
from re import escape

from flask import Blueprint, current_app, jsonify, request
from pymongo.errors import PyMongoError

from db import alerts_collection, predictions_collection

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api")
PERIOD_DAYS = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}
NORMAL_LABEL_PATTERN = {"$regex": "^(BENIGN|NORMAL)$", "$options": "i"}


def _attack_filter(attack_type):
    if not attack_type or attack_type.lower() == "all":
        return {}
    pattern = {"$regex": f"^{escape(attack_type)}$", "$options": "i"}
    # Analytics keeps normal traffic in the selected scope, matching the
    # previous client-side behavior, while selecting only the chosen attack.
    return {"$or": [
        {"predicted_label": NORMAL_LABEL_PATTERN},
        {"predicted_label": pattern},
        {"attack_type": pattern},
    ]}


def _base_filter(period, attack_type, now):
    filters = {}
    if period in PERIOD_DAYS:
        filters["created_at"] = {
            "$gte": now - timedelta(days=PERIOD_DAYS[period]),
            "$lte": now,
        }
    attack = _attack_filter(attack_type)
    if attack:
        filters.update(attack)
    return filters


def _attack_options(collection, label_field):
    pipeline = [
        {"$addFields": {
            "_analytics_name": {
                "$convert": {
                    "input": {"$ifNull": ["$attack_type", f"${label_field}"]},
                    "to": "string",
                    "onError": "",
                    "onNull": "",
                },
            },
            "_analytics_name_upper": {
                "$toUpper": {
                    "$convert": {
                        "input": {"$ifNull": ["$attack_type", f"${label_field}"]},
                        "to": "string",
                        "onError": "",
                        "onNull": "",
                    },
                },
            },
        }},
        {"$match": {
            "_analytics_name": {"$ne": ""},
            "_analytics_name_upper": {"$nin": ["BENIGN", "NORMAL"]},
        }},
        {"$group": {"_id": "$_analytics_name"}},
        {"$sort": {"_id": 1}},
    ]
    return [row["_id"] for row in collection.aggregate(pipeline) if row.get("_id")]


def _alerts_analytics(filters):
    pipeline = [
        {"$match": filters},
        {"$addFields": {
            "_analytics_source": {"$ifNull": ["$source_ip", "$src_ip"]},
            "_analytics_attack": {"$ifNull": ["$attack_type", "$predicted_label"]},
            "_analytics_protocol": {
                "$ifNull": ["$protocol", {"$ifNull": ["$protocol_type", "$transport_protocol"]}],
            },
        }},
        {"$facet": {
            "sources": [
                {"$match": {"_analytics_source": {"$nin": [None, ""]}}},
                {"$group": {
                    "_id": {
                        "source_ip": "$_analytics_source",
                        "attack_type": "$_analytics_attack",
                    },
                    "count": {"$sum": 1},
                }},
                {"$group": {
                    "_id": "$_id.source_ip",
                    "attack_count": {"$sum": "$count"},
                    "attack_types": {"$push": {
                        "name": "$_id.attack_type",
                        "count": "$count",
                    }},
                }},
                {"$sort": {"attack_count": -1, "_id": 1}},
                {"$limit": 8},
            ],
            "protocols": [
                {"$match": {"_analytics_protocol": {"$nin": [None, ""]}}},
                {"$group": {"_id": "$_analytics_protocol", "count": {"$sum": 1}}},
                {"$sort": {"count": -1, "_id": 1}},
                {"$project": {"_id": 0, "protocol": "$_id", "count": 1}},
            ],
        }},
    ]
    result = list(alerts_collection.aggregate(pipeline))
    if not result:
        return {"sources": [], "protocols": []}

    analytics = result[0]
    for source in analytics["sources"]:
        attacks = [entry for entry in source.pop("attack_types", []) if entry.get("name")]
        attacks.sort(key=lambda item: (-item["count"], str(item["name"]).casefold()))
        source["source_ip"] = source.pop("_id")
        source["dominant_attack_type"] = attacks[0]["name"] if attacks else None
    return analytics


@analytics_bp.route("/analytics", methods=["GET"])
def get_analytics():
    unknown_params = set(request.args) - {"period", "attack_type", "probe"}
    if unknown_params:
        return jsonify({"status": "error", "message": "Unsupported query parameter"}), 400

    if "probe" in request.args:
        if request.args.get("probe") != "1" or len(request.args) != 1:
            return jsonify({"status": "error", "message": "Invalid analytics probe"}), 400
        return jsonify({"status": "success", "data": {"available": True}}), 200

    period = request.args.get("period", "7d").strip().lower()
    if period not in {*PERIOD_DAYS, "all"}:
        return jsonify({
            "status": "error",
            "message": "period must be 24h, 7d, 30d, 90d, or all",
        }), 400

    attack_type = request.args.get("attack_type", "all").strip()
    if len(attack_type) > 200:
        return jsonify({"status": "error", "message": "attack_type is too long"}), 400
    if not attack_type:
        attack_type = "all"

    now = datetime.now(timezone.utc)
    prediction_filter = _base_filter(period, attack_type, now)
    alert_filter = _base_filter(period, attack_type, now)
    normal_expression = {"$in": ["$_analytics_label", ["BENIGN", "NORMAL"]]}
    has_attack_expression = {"$and": [
        {"$ne": ["$_analytics_attack", None]},
        {"$ne": ["$_analytics_attack", ""]},
    ]}

    prediction_pipeline = [
        {"$match": prediction_filter},
        {"$addFields": {
            "_analytics_label": {
                "$toUpper": {
                    "$convert": {
                        "input": {"$ifNull": ["$predicted_label", ""]},
                        "to": "string",
                        "onError": "",
                        "onNull": "",
                    },
                },
            },
            "_analytics_attack": {
                "$convert": {
                    "input": {"$ifNull": ["$attack_type", "$predicted_label"]},
                    "to": "string",
                    "onError": "",
                    "onNull": "",
                },
            },
            "_analytics_protocol": {
                "$ifNull": ["$protocol", {"$ifNull": ["$protocol_type", "$transport_protocol"]}],
            },
        }},
        {"$facet": {
            "summary": [
                {"$group": {
                    "_id": None,
                    "total_events": {"$sum": 1},
                    "malicious_events": {"$sum": {"$cond": [
                        {"$and": [{"$not": [normal_expression]}, has_attack_expression]},
                        1,
                        0,
                    ]}},
                }},
            ],
            "traffic": [
                {"$match": {"created_at": {"$type": "date"}}},
                {"$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%dT%H:00:00.000Z",
                            "date": "$created_at",
                            "timezone": "UTC",
                        },
                    },
                    "normal": {"$sum": {"$cond": [normal_expression, 1, 0]}},
                    "malicious": {"$sum": {"$cond": [
                        {"$and": [{"$not": [normal_expression]}, has_attack_expression]},
                        1,
                        0,
                    ]}},
                }},
                {"$sort": {"_id": 1}},
                {"$project": {"_id": 0, "timestamp": "$_id", "normal": 1, "malicious": 1}},
            ],
            "attacks": [
                {"$match": {"_analytics_attack": {"$nin": [None, ""]}}},
                {"$match": {"$expr": {"$not": [normal_expression]}}},
                {"$group": {"_id": "$_analytics_attack", "count": {"$sum": 1}}},
                {"$sort": {"count": -1, "_id": 1}},
                {"$project": {"_id": 0, "category": "$_id", "count": 1}},
            ],
            "protocols": [
                {"$match": {"_analytics_protocol": {"$nin": [None, ""]}}},
                {"$group": {"_id": "$_analytics_protocol", "count": {"$sum": 1}}},
                {"$sort": {"count": -1, "_id": 1}},
                {"$project": {"_id": 0, "protocol": "$_id", "count": 1}},
            ],
        }},
    ]

    try:
        result_list = list(predictions_collection.aggregate(prediction_pipeline))
        result = result_list[0] if result_list else {}
        summary_rows = result.get("summary", [])
        summary = summary_rows[0] if summary_rows else {"total_events": 0, "malicious_events": 0}
        alerts = _alerts_analytics(alert_filter)

        protocol_distribution = result.get("protocols", [])
        if not protocol_distribution:
            protocol_distribution = alerts["protocols"]

        prediction_options = _attack_options(predictions_collection, "predicted_label")
        alert_options = _attack_options(alerts_collection, "predicted_label")
        options = sorted(set(prediction_options + alert_options), key=str.casefold)
    except PyMongoError:
        current_app.logger.exception("Failed to aggregate analytics")
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve analytics",
        }), 500

    total_events = summary.get("total_events", 0)
    malicious_events = summary.get("malicious_events", 0)
    attack_distribution = result.get("attacks", [])
    data = {
        "summary": {
            "total_events": total_events,
            "attack_rate": malicious_events / total_events if total_events else None,
            "top_attack": attack_distribution[0]["category"] if attack_distribution else None,
        },
        "traffic": result.get("traffic", []),
        "attack_distribution": attack_distribution,
        "protocol_distribution": protocol_distribution,
        "top_sources": alerts["sources"],
        "options": {"attack_types": options},
    }
    return jsonify({"status": "success", "data": data}), 200
