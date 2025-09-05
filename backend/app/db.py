import os
from pathlib import Path
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool

# Load backend/.env explicitly
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_PATH)

conninfo = os.getenv("DATABASE_URL")
if not conninfo:
    raise RuntimeError("DATABASE_URL not set")

# Ensure sslmode=require for RDS unless explicitly provided
if "sslmode=" not in conninfo:
    conninfo += "?sslmode=" + os.getenv("PGSSLMODE", "require")

pool = ConnectionPool(conninfo, min_size=1, max_size=5, timeout=30)
