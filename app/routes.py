from __future__ import annotations
from flask import Blueprint, render_template, request, jsonify
from datetime import datetime
import sqlite3
import os

bp = Blueprint("routes", __name__)

DB_PATH = os.path.join(os.getcwd(), "instance", "app.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@bp.before_app_request
def ensure_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            value REAL,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    conn.close()

@bp.get("/")
def index():
    return render_template("dashboard.html")

@bp.get("/dashboard/data")
def dashboard_data():
    conn = get_db_connection()
    cur = conn.cursor()
    total_messages = cur.execute("SELECT COUNT(*) FROM chat_messages").fetchone()[0]
    last_24h_messages = cur.execute(
        "SELECT COUNT(*) FROM chat_messages WHERE datetime(created_at) >= datetime('now','-1 day')"
    ).fetchone()[0]
    recent_events = cur.execute(
        "SELECT name, value, created_at FROM events ORDER BY datetime(created_at) DESC LIMIT 20"
    ).fetchall()
    conn.close()

    return jsonify({
        "totals": {"messages": total_messages, "messages_24h": last_24h_messages},
        "recent_events": [dict(r) for r in recent_events],
    })

@bp.get("/chat")
def chat_page():
    return render_template("chat.html")

@bp.post("/api/chat")
def chat_api():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Message is required"}), 400

    # Save user message
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO chat_messages (role, content, created_at) VALUES (?, ?, ?)",
        ("user", message, datetime.utcnow().isoformat()),
    )

    # Basic AI fallback, can be replaced by OpenAI
    reply = generate_ai_reply(message)

    conn.execute(
        "INSERT INTO chat_messages (role, content, created_at) VALUES (?, ?, ?)",
        ("assistant", reply, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()

    return jsonify({"reply": reply})


def generate_ai_reply(prompt: str) -> str:
    # Local deterministic fallback; can be swapped for OpenAI
    lower = prompt.lower()
    if "hello" in lower or "hi" in lower:
        return "Hello! How can I help you today?"
    if lower.endswith("?"):
        return "That's a great question. I can look into it further!"
    if len(prompt.split()) <= 3:
        return "Could you share more details?"
    return "I understand. Let me think about that and assist you."
