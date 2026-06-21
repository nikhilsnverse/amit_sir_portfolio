import os
import json
from datetime import date
from flask import Flask, render_template, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

CONTACT_FILE = os.path.join(os.path.dirname(__file__), "contacts.json")


def load_contacts():
    if os.path.exists(CONTACT_FILE):
        try:
            with open(CONTACT_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []


def save_contact(data):
    try:
        contacts = load_contacts()
        contacts.append(data)
        with open(CONTACT_FILE, "w") as f:
            json.dump(contacts, f, indent=2)
        return True
    except IOError:
        return False


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


@app.route("/api/contact", methods=["POST"])
def contact():
    data = request.get_json()
    if not data or not data.get("name") or not data.get("message"):
        return jsonify({"error": "Name and message are required"}), 400
    data["id"] = len(load_contacts()) + 1
    if not save_contact(data):
        return jsonify({"error": "Service unavailable. Please try again later."}), 503
    return jsonify({"success": True, "message": "Thank you! We will get back to you soon."})


@app.route("/api/contacts", methods=["GET"])
def get_contacts():
    if request.args.get("key") != os.getenv("API_KEY", "vision-secret-key"):
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(load_contacts())


if __name__ == "__main__":
    app.run(debug=True, port=5000)
