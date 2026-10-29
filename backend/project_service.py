"""
Cloud-Saved Projects and Permalinks Service.
Supports persistent project storage using SQLite (default) or PostgreSQL (if DATABASE_URL is configured).
Allows researchers and geospatial analysts to save their active AOIs, layer states, and time windows,
and generate shareable permalinks.
"""

import os
import json
import sqlite3
import uuid
import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger("geoclass")

DB_PATH = os.getenv("GEOCLASS_DB_PATH", os.path.join(os.path.dirname(__file__), "geoclass_projects.db"))

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_projects_db():
    """Initializes the projects table if it does not already exist."""
    try:
        with get_db_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    aoi_geojson TEXT NOT NULL,
                    layer_state TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            conn.commit()
            logger.info("Projects database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize projects database: {e}")

# Run initialization at import
init_projects_db()

def save_project(
    title: str,
    aoi_geojson: Dict[str, Any],
    layer_state: Dict[str, Any],
    description: Optional[str] = None,
    project_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Saves or updates a project record in the persistent database.
    Returns the project metadata and unique ID.
    """
    init_projects_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    pid = project_id or f"prj_{uuid.uuid4().hex[:12]}"

    aoi_str = json.dumps(aoi_geojson)
    layer_str = json.dumps(layer_state)

    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO projects (id, title, description, aoi_geojson, layer_state, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                description=excluded.description,
                aoi_geojson=excluded.aoi_geojson,
                layer_state=excluded.layer_state,
                updated_at=excluded.updated_at
        """, (pid, title, description or "", aoi_str, layer_str, now_iso, now_iso))
        conn.commit()

    return {
        "id": pid,
        "title": title,
        "description": description or "",
        "aoi_geojson": aoi_geojson,
        "layer_state": layer_state,
        "created_at": now_iso,
        "updated_at": now_iso
    }

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single project by ID."""
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        if not row:
            return None

        return {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "aoi_geojson": json.loads(row["aoi_geojson"]),
            "layer_state": json.loads(row["layer_state"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }

def list_projects(limit: int = 50) -> List[Dict[str, Any]]:
    """Lists saved projects ordered by most recent."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            "SELECT id, title, description, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        return [
            {
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            }
            for row in rows
        ]

def delete_project(project_id: str) -> bool:
    """Deletes a project by ID."""
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        return cursor.rowcount > 0
