import math
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from .db import pool

# --- create the FastAPI app first ---
app = FastAPI(title="CohortIQ API", version="0.1.0")

# CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root -> Swagger docs (optional convenience)
@app.get("/")
def index():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    with pool.connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1;")
        return {"ok": True}

@app.get("/metrics/funnel")
def funnel(days: int = Query(30, ge=1, le=365)):
    sql = """
      SELECT date(event_ts) AS d,
             SUM((event_name='view')::int),
             SUM((event_name='add_to_cart')::int),
             SUM((event_name='purchase')::int)
      FROM fct_events
      WHERE event_ts >= now() - (%s::text || ' days')::interval
      GROUP BY 1 ORDER BY 1;
    """
    with pool.connection() as c, c.cursor() as cur:
        cur.execute(sql, (days,))
        rows = cur.fetchall()
    total_v = sum(r[1] for r in rows)
    total_a = sum(r[2] for r in rows)
    total_p = sum(r[3] for r in rows)
    v_to_a = round(total_a/total_v, 3) if total_v else None
    a_to_p = round(total_p/total_a, 3) if total_a else None
    return {
        "days": days,
        "daily": [{"date": str(d), "views": v, "adds": a, "purchases": p} for d, v, a, p in rows],
        "totals": {"views": total_v, "adds": total_a, "purchases": total_p},
        "rates": {"view_to_add": v_to_a, "add_to_purchase": a_to_p},
    }

@app.get("/metrics/traffic-source")
def traffic_source(days: int = Query(30, ge=1, le=365)):
    sql = """
    WITH s AS (
      SELECT u.traffic_source, e.user_id, e.session_id,
             MAX((e.event_name='view')::int) v,
             MAX((e.event_name='add_to_cart')::int) a,
             MAX((e.event_name='purchase')::int) p
      FROM fct_events e
      JOIN dim_user u USING (user_id)
      WHERE e.event_ts >= now() - (%s::text || ' days')::interval
      GROUP BY 1,2,3
    )
    SELECT traffic_source, SUM(v), SUM(a), SUM(p),
           ROUND(SUM(a)::numeric/NULLIF(SUM(v),0),3),
           ROUND(SUM(p)::numeric/NULLIF(SUM(a),0),3)
    FROM s
    GROUP BY 1
    ORDER BY 3 DESC, 4 DESC;
    """
    with pool.connection() as c, c.cursor() as cur:
        cur.execute(sql, (days,))
        rows = cur.fetchall()
    return [
        {
            "traffic_source": r[0],
            "views": r[1],
            "adds": r[2],
            "purchases": r[3],
            "view_to_add": float(r[4]) if r[4] is not None else None,
            "add_to_purchase": float(r[5]) if r[5] is not None else None,
        }
        for r in rows
    ]

@app.get("/experiments/checkout_button")
def experiment_checkout(days: int = Query(30, ge=1, le=365)):
    sql = """
    WITH conv AS (
      SELECT variant,
             COUNT(DISTINCT user_id) AS n,
             COUNT(DISTINCT CASE WHEN event_name='purchase' THEN user_id END) AS x
      FROM fct_events
      WHERE experiment_key='checkout_button'
        AND event_ts >= now() - (%s::text || ' days')::interval
      GROUP BY 1
    )
    SELECT
      (SELECT n FROM conv WHERE variant='A') AS n_a,
      (SELECT x FROM conv WHERE variant='A') AS x_a,
      (SELECT n FROM conv WHERE variant='B') AS n_b,
      (SELECT x FROM conv WHERE variant='B') AS x_b;
    """
    with pool.connection() as c, c.cursor() as cur:
        cur.execute(sql, (days,))
        row = cur.fetchone()
    if not row or any(v is None for v in row):
        raise HTTPException(status_code=404, detail="Missing variant data")
    n_a, x_a, n_b, x_b = row
    p_a = x_a / n_a if n_a else 0.0
    p_b = x_b / n_b if n_b else 0.0
    lift_abs = p_b - p_a
    se = math.sqrt(p_a*(1-p_a)/n_a + p_b*(1-p_b)/n_b) if (n_a and n_b) else None
    z = (lift_abs / se) if se else None
    return {
        "days": days,
        "variant": {
            "A": {"n": n_a, "buyers": x_a, "cr": round(p_a, 4)},
            "B": {"n": n_b, "buyers": x_b, "cr": round(p_b, 4)},
        },
        "lift_abs": round(lift_abs, 5),
        "z_score": round(z, 3) if z is not None else None,
    }
