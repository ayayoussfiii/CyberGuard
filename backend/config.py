import os
from pathlib import Path

from dotenv import load_dotenv


# Load the project-level file regardless of the shell's current directory.
# Existing process environment variables take precedence over the file.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env", override=False)

class Config:
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://127.0.0.1:27017/"
    )

    MONGO_DB_NAME = os.getenv(
        "MONGO_DB_NAME",
        "cyberguard"
    )
