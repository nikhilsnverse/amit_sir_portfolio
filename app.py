import os
import csv
import io
import json
from datetime import datetime, date
from functools import wraps
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify, make_response, redirect, url_for, session
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "vision-teleradiology-secret-key-2026")
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db():
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    return conn


def init_db():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                email VARCHAR(200),
                phone VARCHAR(50),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB init error: {e}")


init_db()


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/sitemap.xml")
def sitemap():
    resp = make_response(render_template("sitemap.xml"))
    resp.headers["Content-Type"] = "application/xml"
    return resp


@app.route("/robots.txt")
def robots():
    resp = make_response(render_template("robots.txt"))
    resp.headers["Content-Type"] = "text/plain"
    return resp


# ---- CONTACT API ----

@app.route("/api/contact", methods=["POST"])
def contact():
    data = request.get_json()
    if not data or not data.get("name") or not data.get("message"):
        return jsonify({"error": "Name and message are required"}), 400
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO contacts (name, email, phone, message) VALUES (%s, %s, %s, %s)",
            (data["name"], data.get("email", ""), data.get("phone", ""), data["message"]),
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": "Thank you! We will get back to you soon."})
    except Exception as e:
        print(f"Contact save error: {e}")
        return jsonify({"error": "Service unavailable. Please try again later."}), 503


@app.route("/api/contacts", methods=["GET"])
def get_contacts():
    if request.args.get("key") != os.getenv("API_KEY", "vision-secret-key"):
        return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM contacts ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "name": r["name"],
                "email": r["email"] or "",
                "phone": r["phone"] or "",
                "message": r["message"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else "",
            })
        return jsonify(result)
    except Exception as e:
        print(f"API contacts error: {e}")
        return jsonify([])


# ---- ADMIN PANEL ----

@app.route("/admin/export-csv/")
@login_required
def admin_export_csv():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM contacts ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"CSV export error: {e}")
        return "Export failed", 500

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Phone", "Message", "Date"])
    for r in rows:
        writer.writerow([
            r["id"],
            r["name"],
            r.get("email", "") or "",
            r.get("phone", "") or "",
            r["message"],
            r["created_at"].strftime("%Y-%m-%d %H:%M:%S") if r["created_at"] else "",
        ])
    resp = make_response(output.getvalue())
    resp.headers["Content-Type"] = "text/csv; charset=utf-8"
    resp.headers["Content-Disposition"] = 'attachment; filename="contacts-export.csv"'
    return resp


@app.route("/admin/", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_logged_in"):
        return redirect(url_for("admin_dashboard"))
    error = ""
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if username == os.getenv("ADMIN_USERNAME", "admin") and password == os.getenv("ADMIN_PASSWORD", "vision@2024"):
            session["admin_logged_in"] = True
            return redirect(url_for("admin_dashboard"))
        error = "Invalid username or password"
    return render_template("admin_login.html", error=error)


@app.route("/admin/dashboard/")
@login_required
def admin_dashboard():
    page = request.args.get("page", 1, type=int)
    if page < 1:
        page = 1
    per_page = 20
    offset = (page - 1) * per_page
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT COUNT(*) AS cnt FROM contacts")
        total = cur.fetchone()["cnt"]

        cur.execute(
            "SELECT * FROM contacts ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (per_page, offset),
        )
        contacts = cur.fetchall()

        today_count = 0
        for c in contacts:
            if c["created_at"] and c["created_at"].date() == date.today():
                today_count += 1

        cur.close()
        conn.close()
        total_pages = max(1, (total + per_page - 1) // per_page)
    except Exception as e:
        print(f"Dashboard error: {e}")
        contacts = []
        total = 0
        today_count = 0
        total_pages = 1
    return render_template(
        "admin_dashboard.html",
        contacts=contacts,
        total=total,
        today=today_count,
        page=page,
        total_pages=total_pages,
        per_page=per_page,
    )


@app.route("/admin/contact/<int:contact_id>/")
@login_required
def admin_contact_detail(contact_id):
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM contacts WHERE id = %s", (contact_id,))
        contact = cur.fetchone()
        cur.close()
        conn.close()
        if not contact:
            return "Contact not found", 404
    except Exception as e:
        print(f"Contact detail error: {e}")
        return "Error loading contact", 500
    return render_template("admin_contact_detail.html", contact=contact)


@app.route("/admin/contact/<int:contact_id>/delete/", methods=["POST"])
@login_required
def admin_delete_contact(contact_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("DELETE FROM contacts WHERE id = %s", (contact_id,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({"error": "Delete failed"}), 500
    return jsonify({"success": True})


@app.route("/admin/logout/")
def admin_logout():
    session.pop("admin_logged_in", None)
    return redirect(url_for("admin_login"))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
