"""
ml/src/data_loader.py
Real DB-backed Data Loader.
Queries PostgreSQL database for verified catalog records and returns structured feature vectors.
"""
from typing import List, Dict, Any, Tuple
try:
    from ml.src.db import get_db_connection
except ImportError:
    from .db import get_db_connection

def load_verified_careers() -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Loads verified careers from PostgreSQL database filtering to:
    verification_status = 'VERIFIED' AND official_url IS NOT NULL AND official_url != ''
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total career count query
    cursor.execute("SELECT COUNT(*) AS total FROM careers;")
    total_count = cursor.fetchone()["total"]

    # Verified query
    query = """
        SELECT id, title, category, official_url, source_id, verification_status, freshness_status,
               retrieved_at, last_verified_at, created_at
        FROM careers
        WHERE verification_status = 'VERIFIED'
          AND official_url IS NOT NULL
          AND official_url != ''
          AND official_url LIKE 'http%'
        ORDER BY title ASC;
    """
    cursor.execute(query)
    verified_careers = [dict(row) for row in cursor.fetchall()]

    # Query unverified / excluded count
    cursor.execute("""
        SELECT COUNT(*) AS excluded
        FROM careers
        WHERE verification_status != 'VERIFIED'
           OR official_url IS NULL
           OR official_url = '';
    """)
    excluded_count = cursor.fetchone()["excluded"]

    cursor.close()
    conn.close()

    counts_summary = {
        "totalCareers": total_count,
        "verifiedCareers": len(verified_careers),
        "excludedCareers": excluded_count,
    }

    return verified_careers, counts_summary

def load_verified_catalog_counts() -> Dict[str, Any]:
    """Queries verified counts across all catalog entities from PostgreSQL."""
    conn = get_db_connection()
    cursor = conn.cursor()

    tables = ["universities", "scholarships", "courses", "careers", "jobs"]
    summary = {}

    for table in tables:
        cursor.execute(f"SELECT COUNT(*) AS total FROM {table};")
        total = cursor.fetchone()["total"]

        cursor.execute(f"""
            SELECT COUNT(*) AS verified
            FROM {table}
            WHERE verification_status = 'VERIFIED'
              AND official_url IS NOT NULL
              AND official_url != ''
              AND official_url LIKE 'http%';
        """)
        verified = cursor.fetchone()["verified"]

        summary[table] = {
            "total": total,
            "verified": verified,
            "excluded": total - verified,
        }

    cursor.close()
    conn.close()
    return summary
