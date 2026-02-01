## Implementation Details

This section explains **how** the Dictation MVP works internally: data flow, algorithms, state handling, and design decisions behind the system.

---

### 1. Overall Architecture

The application follows a simple but powerful structure:

* **Flask (Backend)** — provides APIs and stores progress
* **SQLite (Database)** — stores levels and attempts
* **Vanilla JavaScript (Frontend)** — renders UI, manages state, evaluates input
* **Static audio files** — dynamically loaded per level

The frontend behaves like a small SPA: it loads all level data once and manages the rest locally.

---

### 2. Database Design

#### `levels` table — defines content

| field        | purpose                   |
| ------------ | ------------------------- |
| `title`      | Level name                |
| `text`       | Reference sentence        |
| `audio`      | Path like `audio/l1.mp3`  |
| `pass_score` | Required accuracy to pass |

This table **never stores user results**.

#### `attempts` table — stores progress

| field                          | purpose          |
| ------------------------------ | ---------------- |
| `level_id`                     | Which level      |
| `accuracy`                     | Score (0–100)    |
| `ok / wrong / missing / extra` | Word-level stats |
| `created_at`                   | Timestamp        |

This enables:

* best score calculation
* pass detection
* progress persistence

---

### 3. Backend APIs

#### `GET /api/levels`

Returns all levels with computed status:

* `best_accuracy` → `MAX(accuracy)` from attempts
* `passed` → exists attempt where `accuracy >= pass_score`

This removes all historical logic from the frontend.

#### `POST /api/attempt`

Stores one submission into `attempts`.

#### `POST /api/reset`

Deletes all attempts to reset progress.

---

### 4. Frontend State Management

Two core variables drive the app:

```js
let levels = [];
let currentLevelId = null;
```

* `levels` caches `/api/levels` response
* `currentLevelId` tracks the active level

Switching levels triggers a full UI update without reloading the page.

---

### 5. Dynamic Audio Loading

Audio is **not hardcoded** in HTML.

Each time a level changes:

```js
function setAudio(path) {
  audio.innerHTML = "";
  const src = document.createElement("source");
  src.src = "/static/" + path;
  src.type = "audio/mpeg";
  audio.appendChild(src);
  audio.load();
}
```

Why `audio.load()` is required: browsers do not reload media when `<source>` changes.

---

### 6. Letter Grid Input System

The reference sentence is converted into a **template** of cells:

| type    | meaning                       |
| ------- | ----------------------------- |
| `input` | user must type this character |
| `space` | auto-skipped                  |
| `punc`  | shown but not typed           |

`typedChars` only stores input characters.
Rendering reconstructs the full sentence visually.

This design:

* avoids space/punctuation typing
* keeps UI aligned with the sentence
* simplifies validation logic

---

### 7. Token Normalization

Before scoring:

```js
token
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, "");
```

This implements:

* ignore case
* ignore punctuation

---

### 8. Word-level Alignment (LCS Algorithm)

The app uses **Longest Common Subsequence (LCS)** on tokens:

* reference tokens vs user tokens
* produces operations: `ok`, `missing`, `extra`

Then a post-process merges:

```
missing + extra → wrong
```

This matches human understanding of dictation errors.

---

### 9. Accuracy Calculation

```
accuracy = ok / total_reference_words * 100
```

Reference-based scoring is standard for dictation tasks.

---

### 10. Level Unlocking Logic

A level is unlocked only if the previous one is passed:

```js
function isUnlocked(id) {
  return id === 1 || previousLevel.passed;
}
```

The `<select>` options are disabled for locked levels.

---

### 11. Progress Reset

A button triggers:

```
POST /api/reset
```

Then levels are reloaded, restoring the initial state.

---

### 12. Why This Design Works

This design achieves:

* Full separation of content and progress
* SPA-like behavior without frameworks
* Clear algorithmic feedback
* Extensibility toward multi-user, admin panel, uploads, etc.

The result is not just a webpage, but a **stateful learning application MVP**.
