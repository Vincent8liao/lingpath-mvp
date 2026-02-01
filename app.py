from flask import Flask, jsonify, request, render_template
import sqlite3

app = Flask(__name__)
DB = "dictation.db"

def get_conn():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/levels")
def api_levels():
    con = get_conn()
    levels = con.execute(
        "SELECT id, title, text, audio, pass_score FROM levels ORDER BY id"
    ).fetchall()

    out = []
    for lv in levels:
        best = con.execute(
            "SELECT MAX(accuracy) AS best FROM attempts WHERE level_id=?",
            (lv["id"],)
        ).fetchone()["best"]

        passed_row = con.execute(
            "SELECT 1 FROM attempts WHERE level_id=? AND accuracy >= ? LIMIT 1",
            (lv["id"], lv["pass_score"])
        ).fetchone()

        out.append({
            "id": lv["id"],
            "title": lv["title"],
            "text": lv["text"],
            "audio": lv["audio"],
            "pass_score": lv["pass_score"],
            "best_accuracy": best,                 # None or int
            "passed": bool(passed_row),
        })

    con.close()
    return jsonify(out)

@app.post("/api/attempt")
def api_attempt():
    data = request.get_json(force=True)

    required = ["level_id", "accuracy", "ok", "wrong", "missing", "extra"]
    for k in required:
        if k not in data:
            return jsonify({"error": f"missing field: {k}"}), 400

    level_id = int(data["level_id"])
    accuracy = int(data["accuracy"])
    ok = int(data["ok"])
    wrong = int(data["wrong"])
    missing = int(data["missing"])
    extra = int(data["extra"])

    con = get_conn()
    con.execute(
        "INSERT INTO attempts(level_id, accuracy, ok, wrong, missing, extra) VALUES(?,?,?,?,?,?)",
        (level_id, accuracy, ok, wrong, missing, extra)
    )
    con.commit()
    con.close()

    return jsonify({"status": "ok"})

# （可选）拉取最近 N 次尝试
@app.get("/api/level/<int:level_id>/attempts")
def api_level_attempts(level_id):
    con = get_conn()
    rows = con.execute(
        "SELECT accuracy, ok, wrong, missing, extra, created_at "
        "FROM attempts WHERE level_id=? ORDER BY id DESC LIMIT 20",
        (level_id,)
    ).fetchall()
    con.close()
    return jsonify([dict(r) for r in rows])
@app.post("/api/reset")
def api_reset():
    con = get_conn()
    con.execute("DELETE FROM attempts")
    con.execute("DELETE FROM sqlite_sequence WHERE name='attempts'")
    con.commit()
    con.close()
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(debug=True)
