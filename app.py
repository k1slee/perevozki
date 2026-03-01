from flask import Flask, send_from_directory, jsonify, request, session
from pathlib import Path
import json
import os
import werkzeug
import hashlib

BASE = Path(__file__).parent
DATA_DIR = BASE / "data"
IMAGES_DIR = BASE / "images" / "vehicles"
VEHICLES_FILE = DATA_DIR / "vehicles.json"
GALLERY_FILE = DATA_DIR / "gallery.json"
CLASSES_FILE = DATA_DIR / "classes.json"

app = Flask(__name__, static_folder=str(BASE), static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")

def is_admin():
    return bool(session.get("admin"))

def require_admin():
    # Session check
    if not is_admin():
        return jsonify({"error": "unauthorized"}), 401
    # Optional IP whitelist
    ips = os.environ.get("ADMIN_IPS", "").strip()
    if ips:
        allowed = {ip.strip() for ip in ips.split(",") if ip.strip()}
        ra = request.remote_addr or ""
        if ra not in allowed and ra not in {"127.0.0.1", "::1"}:
            return jsonify({"error": "ip_forbidden"}), 403
    return None

def read_vehicles():
    if not VEHICLES_FILE.exists():
        return []
    with open(VEHICLES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_vehicles(items):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(VEHICLES_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

def read_gallery():
    if not GALLERY_FILE.exists():
        return []
    with open(GALLERY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_gallery(items):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(GALLERY_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

def read_classes():
    # Defaults if file missing
    defaults = [
        {"key": "sedan", "title": "Седан"},
        {"key": "minivan", "title": "Минивэн"},
        {"key": "minibus", "title": "Микроавтобус"},
    ]
    if not CLASSES_FILE.exists():
        return defaults
    try:
        with open(CLASSES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list) and data:
                return data
            return defaults
    except Exception:
        return defaults

def write_classes(items):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CLASSES_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

@app.route("/")
def root():
    return send_from_directory(str(BASE), "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory(str(BASE), path)

@app.get("/admin.html")
def guard_admin():
    if not is_admin():
        return send_from_directory(str(BASE), "login.html")
    return send_from_directory(str(BASE), "admin.html")

@app.post("/admin/login")
def admin_login():
    data = request.get_json(force=True, silent=True) or {}
    user = (data.get("username") or "").strip()
    passwd = data.get("password", "")
    expected_user = os.environ.get("ADMIN_USER", "").strip()
    # If ADMIN_PASSWORD_HASH is set (sha256 hex), prefer it
    expected_hash = os.environ.get("ADMIN_PASSWORD_HASH", "").strip().lower()
    if expected_hash:
        digest = hashlib.sha256(passwd.encode("utf-8")).hexdigest().lower()
        ok_pw = digest == expected_hash
    else:
        expected = os.environ.get("ADMIN_PASSWORD", "admin")
        ok_pw = passwd == expected
    ok_user = True if not expected_user else (user == expected_user)
    if not (ok_pw and ok_user):
        return jsonify({"ok": False, "error": "wrong_password"}), 401
    session["admin"] = True
    return jsonify({"ok": True})

@app.post("/admin/logout")
def admin_logout():
    session.pop("admin", None)
    return jsonify({"ok": True})

@app.get("/api/vehicles")
def api_list():
    return jsonify(read_vehicles())

@app.get("/api/vehicles/<slug>")
def api_one(slug):
    items = read_vehicles()
    for it in items:
        if it.get("slug") == slug:
            return jsonify(it)
    return jsonify({"error": "not_found"}), 404

@app.post("/api/vehicles")
def api_add():
    guard = require_admin()
    if guard:
        return guard
    data = request.get_json(force=True, silent=True) or {}
    required = ["slug","name","class","seats"]
    if any(k not in data for k in required):
        return jsonify({"error":"bad_request"}), 400
    items = read_vehicles()
    if any(it.get("slug")==data["slug"] for it in items):
        return jsonify({"error":"slug_exists"}), 409
    # optional fields
    if "pricePerHour" in data:
        try:
            data["pricePerHour"] = float(data["pricePerHour"])
        except Exception:
            data.pop("pricePerHour", None)
    if "minHours" in data:
        try:
            data["minHours"] = int(data["minHours"])
        except Exception:
            data.pop("minHours", None)
    data.setdefault("images", [])
    items.append(data)
    write_vehicles(items)
    return jsonify({"ok":True}), 201

@app.put("/api/vehicles/<slug>")
def api_update(slug):
    guard = require_admin()
    if guard:
        return guard
    patch = request.get_json(force=True, silent=True) or {}
    items = read_vehicles()
    for i, it in enumerate(items):
        if it.get("slug") == slug:
            it.update({k: v for k, v in patch.items() if k != "slug"})
            items[i] = it
            write_vehicles(items)
            return jsonify({"ok": True})
    return jsonify({"error": "not_found"}), 404

@app.delete("/api/vehicles/<slug>")
def api_delete(slug):
    guard = require_admin()
    if guard:
        return guard
    items = read_vehicles()
    new_items = [it for it in items if it.get("slug") != slug]
    if len(new_items) == len(items):
        return jsonify({"error": "not_found"}), 404
    write_vehicles(new_items)
    return jsonify({"ok": True})

@app.post("/api/upload")
def api_upload():
    guard = require_admin()
    if guard:
        return guard
    slug = request.form.get("slug","")
    if not slug:
        return jsonify({"error":"no_slug"}), 400
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error":"no_files"}), 400
    target_dir = IMAGES_DIR / slug
    target_dir.mkdir(parents=True, exist_ok=True)
    saved = []
    for f in files:
        filename = werkzeug.utils.secure_filename(f.filename)
        path = target_dir / filename
        f.save(str(path))
        web_path = f"images/vehicles/{slug}/{filename}"
        saved.append(web_path)
    return jsonify({"ok":True, "paths": saved})

@app.get("/api/gallery")
def api_gallery_list():
    return jsonify(read_gallery())

@app.post("/api/gallery")
def api_gallery_save():
    guard = require_admin()
    if guard:
        return guard
    data = request.get_json(force=True, silent=True) or {}
    images = data.get("images")
    if not isinstance(images, list):
        return jsonify({"error": "bad_request"}), 400
    write_gallery(images)
    return jsonify({"ok": True})

@app.post("/api/upload-gallery")
def api_upload_gallery():
    guard = require_admin()
    if guard:
        return guard
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error":"no_files"}), 400
    target_dir = BASE / "images" / "gallery"
    target_dir.mkdir(parents=True, exist_ok=True)
    saved = []
    for f in files:
        filename = werkzeug.utils.secure_filename(f.filename)
        path = target_dir / filename
        f.save(str(path))
        saved.append(f"images/gallery/{filename}")
    return jsonify({"ok": True, "paths": saved})

@app.get("/api/classes")
def api_classes_list():
    return jsonify(read_classes())

@app.post("/api/classes")
def api_classes_add():
    guard = require_admin()
    if guard:
        return guard
    data = request.get_json(force=True, silent=True) or {}
    key = (data.get("key") or "").strip()
    title = (data.get("title") or "").strip() or key
    if not key or not all(ch.isalnum() or ch in "-_." for ch in key):
        return jsonify({"error": "bad_key"}), 400
    items = read_classes()
    if any(it.get("key") == key for it in items):
        return jsonify({"error": "exists"}), 409
    items.append({"key": key, "title": title})
    write_classes(items)
    return jsonify({"ok": True})

@app.delete("/api/classes/<key>")
def api_classes_delete(key):
    guard = require_admin()
    if guard:
        return guard
    items = read_classes()
    new_items = [it for it in items if it.get("key") != key]
    if len(new_items) == len(items):
        return jsonify({"error": "not_found"}), 404
    write_classes(new_items)
    return jsonify({"ok": True})

if __name__ == "__main__":
    port = int(os.environ.get("PORT","8000"))
    app.run(host="0.0.0.0", port=port, debug=True)
