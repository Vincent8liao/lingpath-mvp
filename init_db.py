import sqlite3

DB = "dictation.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  text  TEXT NOT NULL,
  audio TEXT,
  pass_score INTEGER DEFAULT 90
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  wrong INTEGER NOT NULL,
  missing INTEGER NOT NULL,
  extra INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(level_id) REFERENCES levels(id)
);
"""

SEED = [
  ("Level 1", "The quick brown fox jumps over the lazy dog.", "/static/audio/l1.mp3", 90),
  ("Level 2", "I enjoy learning English through daily dictation practice.", "/static/audio/l2.mp3", 90),
  ("Level 3", "Consistency beats intensity when building long-term skills.", "/static/audio/l3.mp3", 90),
]

def main():
    con = sqlite3.connect(DB)
    cur = con.cursor()
    cur.executescript(SCHEMA)

    cur.execute("SELECT COUNT(*) FROM levels")
    count = cur.fetchone()[0]
    if count == 0:
        cur.executemany(
            "INSERT INTO levels(title, text, audio, pass_score) VALUES(?,?,?,?)",
            SEED
        )
        print("Seeded 3 levels.")
    else:
        print(f"Levels already exist ({count}), skip seeding.")

    con.commit()
    con.close()
    print("DB ready:", DB)

if __name__ == "__main__":
    main()
