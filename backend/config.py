import os

class Config:
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://127.0.0.1:27017/"
    )

    MONGO_DB_NAME = os.getenv(
        "MONGO_DB_NAME",
        "cyberguard"
    )