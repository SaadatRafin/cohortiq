import os
from pathlib import Path
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool

# Load backend/.env
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_PATH)

conninfo = os.getenv("DATABASE_URL")
if not conninfo:
    raise RuntimeError("DATABASE_URL not set")

# ensure sslmode=require and connect_timeout=3
params = []
if "sslmode=" not in conninfo:
    params.append("sslmode=" + os.getenv("PGSSLMODE", "require"))
if "connect_timeout=" not in conninfo:
    params.append("connect_timeout=3")

if params:
    sep = "&" if "?" in conninfo else "?"
    conninfo = f"{conninfo}{sep}{'&'.join(params)}"

# Lazy pool: don't open a connection at startup; short pool timeout
pool = ConnectionPool(conninfo, min_size=0, max_size=5, timeout=5)
