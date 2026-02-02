// =====================================================
// LingPath Dictation MVP - Frontend Logic (app.js)
// Goal: keep logic unchanged, only reorder for readability
// =====================================================

/**
 * [0] Config / Constants
 * - STATIC_BASE comes from index.html:
 *   window.STATIC_BASE = "{{ url_for('static', filename='') }}"
 * - Fallback to "/static/" for safety.
 */
const STATIC_BASE = window.STATIC_BASE || "/static/";

// =====================================================
// [1] DOM References (all getElementById in one place)
// =====================================================
const referenceTextEl = document.getElementById("referenceText");
const levelSelect      = document.getElementById("levelSelect");
const levelMeta        = document.getElementById("levelMeta");

const letterGrid       = document.getElementById("letterGrid");
const hiddenInput      = document.getElementById("hiddenInput");

const audio            = document.getElementById("audio");

const resultSummary    = document.getElementById("resultSummary");
const resultTokens     = document.getElementById("resultTokens");
const refTokensView    = document.getElementById("refTokensView");
const userTokensView   = document.getElementById("userTokensView");

const btnPlay          = document.getElementById("btnPlay");
const btnCheck         = document.getElementById("btnCheck");
const btnClear         = document.getElementById("btnClear");
const btnToggleRef     = document.getElementById("btnToggleRef");
const btnReset         = document.getElementById("btnReset");

// =====================================================
// [2] App State (runtime variables)
// =====================================================
let levels = [];
let currentLevelId = null;

// typedChars stores ONLY characters for 'input' slots (letters/numbers)
let typedChars = [];

// =====================================================
// [3] Utility Functions (small helpers / pure functions)
// =====================================================

/** Find level object by id (not mandatory for core flow, but useful) */
function getLevelById(id) {
  return levels.find(lv => lv.id === id);
}

/** Identify punctuation char (used to build template grid) */
function isPunctuation(ch) {
  return !(/\p{L}|\p{N}/u.test(ch)) && !(/\s/u.test(ch));
}

/** Convert reference sentence into a template: input cells + spaces + punctuation placeholders */
function buildTemplateFromReference(refRaw) {
  const chars = Array.from(refRaw);
  const tpl = [];
  for (const ch of chars) {
    if (ch === " ") tpl.push({ type: "space" });
    else if (isPunctuation(ch)) tpl.push({ type: "punc", ch });
    else tpl.push({ type: "input" });
  }
  return tpl;
}

/** Get reference sentence currently displayed */
function getReferenceRaw() {
  return (referenceTextEl.textContent || "").trim();
}

/** Count how many input slots exist in the template */
function countInputSlots(template) {
  return template.reduce((acc, t) => acc + (t.type === "input" ? 1 : 0), 0);
}

/** Merge typedChars back into a full user string, keeping ref spaces/punctuation */
function buildUserRawFromTyped(template, refRaw) {
  const refChars = Array.from(refRaw);
  let k = 0;
  const out = [];

  for (let i = 0; i < template.length; i++) {
    const t = template[i];
    if (t.type === "space") out.push(" ");
    else if (t.type === "punc") out.push(refChars[i] || t.ch || "");
    else {
      out.push(typedChars[k] || "");
      k++;
    }
  }
  return out.join("");
}

/** Allowed typed chars = letters or numbers (unicode aware) */
function isAllowedInputChar(ch) {
  return /\p{L}|\p{N}/u.test(ch);
}

// =====================================================
// [4] Audio Handling
// =====================================================

/**
 * Dynamically set audio source for the current level.
 * DB stores: "audio/l1.mp3"
 * Final URL: STATIC_BASE + path -> "/static/audio/l1.mp3"
 */
function setAudio(path) {
  audio.innerHTML = "";
  if (!path) return;

  const src = document.createElement("source");
  src.src = STATIC_BASE + path;
  src.type = "audio/mpeg";

  audio.appendChild(src);
  audio.load();
}

// =====================================================
// [5] UI Rendering (grid / level select / page updates)
// =====================================================

/** Render grid with caret at next input cell */
function renderGrid() {
  const refRaw = getReferenceRaw();
  const template = buildTemplateFromReference(refRaw);

  letterGrid.innerHTML = "";

  const totalInputs = countInputSlots(template);
  const caretInputIndex = Math.min(typedChars.length, totalInputs);

  let inputSlotIndex = 0;

  for (const t of template) {
    if (t.type === "space") {
      const s = document.createElement("span");
      s.className = "cell space";
      letterGrid.appendChild(s);
      continue;
    }

    const cell = document.createElement("span");
    cell.className = "cell";

    if (t.type === "punc") {
      cell.classList.add("punc");
      cell.textContent = t.ch || "";
    } else {
      const v = typedChars[inputSlotIndex] || "";
      if (!v) cell.classList.add("empty");
      cell.textContent = v;

      if (inputSlotIndex === caretInputIndex) cell.classList.add("caret");
      inputSlotIndex++;
    }

    letterGrid.appendChild(cell);
  }
}

/** Focus the hidden input so user can type immediately */
function focusTyping() {
  hiddenInput.focus();
}

/** Get current level object */
function currentLevel() {
  return levels.find(l => l.id === currentLevelId);
}

/** Locking rule: Level 1 unlocked; others require previous level passed */
function isUnlocked(levelId) {
  const idx = levels.findIndex(l => l.id === levelId);
  if (idx <= 0) return true;
  return levels[idx - 1].passed;
}

/** Render dropdown options based on lock/passed/best */
function renderLevelSelect() {
  levelSelect.innerHTML = "";
  for (const lv of levels) {
    const opt = document.createElement("option");
    const unlocked = isUnlocked(lv.id);
    opt.value = String(lv.id);
    opt.disabled = !unlocked;

    const best = (lv.best_accuracy === null || lv.best_accuracy === undefined) ? "-" : lv.best_accuracy + "%";
    const status = lv.passed ? "✅" : (unlocked ? "🔓" : "🔒");
    opt.textContent = `${status} ${lv.title} (best: ${best})`;
    levelSelect.appendChild(opt);
  }
}

/** Switch current level and refresh UI (text/audio/meta/grid/results) */
function setCurrentLevel(levelId) {
  currentLevelId = levelId;
  levelSelect.value = String(levelId);

  const lv = currentLevel();
  if (!lv) return;

  // Level text + audio
  referenceTextEl.textContent = lv.text;
  setAudio(lv.audio);

  // Meta info
  const best = (lv.best_accuracy === null || lv.best_accuracy === undefined) ? "-" : lv.best_accuracy + "%";
  levelMeta.textContent = `aktuell:${lv.title} | Durch die Linie hindurch:${lv.pass_score}% | Am besten:${best} Status:${lv.passed ? "Bestanden" : "Nicht bestanden"}`;

  // Reset input and result views
  typedChars = [];
  resultSummary.textContent = "";
  resultTokens.innerHTML = "";
  refTokensView.textContent = "";
  userTokensView.textContent = "";

  renderGrid();
  focusTyping();
}

// =====================================================
// [6] Evaluation Logic (normalize / tokenize / alignment)
// =====================================================

function normalizeToken(token) {
  return token
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenizeSentence(sentence) {
  return sentence
    .trim()
    .split(/\s+/)
    .map(normalizeToken)
    .filter(t => t.length > 0);
}

/** LCS alignment at token-level */
function alignTokens(ref, user) {
  const n = ref.length, m = user.length;
  const dp = Array.from({length: n+1}, () => Array(m+1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (ref[i] === user[j]) dp[i][j] = 1 + dp[i+1][j+1];
      else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
    }
  }

  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (ref[i] === user[j]) {
      ops.push({ type: "ok", ref: ref[i], user: user[j] });
      i++; j++;
    } else {
      if (dp[i+1][j] >= dp[i][j+1]) {
        ops.push({ type: "missing", ref: ref[i] });
        i++;
      } else {
        ops.push({ type: "extra", user: user[j] });
        j++;
      }
    }
  }
  while (i < n) ops.push({ type: "missing", ref: ref[i++] });
  while (j < m) ops.push({ type: "extra", user: user[j++] });
  return ops;
}

/** Convert missing+extra into wrong where possible */
function postProcessWrong(ops) {
  const out = [];
  let pendingMissing = null;

  for (const op of ops) {
    if (op.type === "missing") {
      if (pendingMissing) out.push(pendingMissing);
      pendingMissing = op;
    } else if (op.type === "extra") {
      if (pendingMissing) {
        out.push({ type: "wrong", ref: pendingMissing.ref, user: op.user });
        pendingMissing = null;
      } else {
        out.push(op);
      }
    } else {
      if (pendingMissing) { out.push(pendingMissing); pendingMissing = null; }
      out.push(op);
    }
  }
  if (pendingMissing) out.push(pendingMissing);
  return out;
}

// =====================================================
// [7] API calls (fetch)
// =====================================================

async function postAttempt(payload) {
  const res = await fetch("/api/attempt", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("POST /api/attempt failed:", t);
  }
}

async function loadLevelsAndRender() {
  const res = await fetch("/api/levels");
  levels = await res.json();

  // First load: default to first level
  if (!currentLevelId) currentLevelId = levels[0]?.id ?? null;

  renderLevelSelect();

  // If current becomes locked, fallback to first unlocked
  if (currentLevelId && !isUnlocked(currentLevelId)) {
    const firstUnlocked = levels.find(l => isUnlocked(l.id));
    currentLevelId = firstUnlocked ? firstUnlocked.id : levels[0]?.id;
  }

  if (currentLevelId) setCurrentLevel(currentLevelId);
}

// =====================================================
// [8] Event Binding (buttons / inputs / dropdown)
// =====================================================

function attachTypingHandlers() {
  letterGrid.addEventListener("click", focusTyping);
  letterGrid.addEventListener("keydown", () => focusTyping());

  hiddenInput.addEventListener("keydown", (e) => {
    const refRaw = getReferenceRaw();
    const template = buildTemplateFromReference(refRaw);
    const maxLen = countInputSlots(template);

    if (e.key === "Backspace") {
      e.preventDefault();
      typedChars.pop();
      renderGrid();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      btnCheck.click();
      return;
    }

    // Ignore spaces
    if (e.key === " ") {
      e.preventDefault();
      return;
    }

    if (e.key.length === 1) {
      if (!isAllowedInputChar(e.key)) {
        e.preventDefault();
        return;
      }
      if (typedChars.length >= maxLen) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      typedChars.push(e.key);
      renderGrid();
    }
  });
}

// --- Button: play audio
btnPlay.addEventListener("click", () => {
  audio.currentTime = 0;
  audio.play().catch(() => {
    alert("音频无法播放：请确认 static/audio/ 下有对应 mp3，且 levels.audio 路径正确。");
  });
});

// --- Button: clear typing
btnClear.addEventListener("click", () => {
  typedChars = [];
  renderGrid();
  focusTyping();
});

// --- Button: toggle reference visibility
btnToggleRef.addEventListener("click", () => {
  const hidden = referenceTextEl.classList.toggle("hidden");
  btnToggleRef.textContent = hidden ? "👁 Standardantwort anzeigen" : "🙈 Versteckte Standardantwort";
});

// --- Button: reset progress (API)
btnReset.addEventListener("click", async () => {
  const ok = confirm("Möchtest du wirklich alle deine Level-Ergebnisse löschen?");
  if (!ok) return;

  await fetch("/api/reset", { method: "POST" });

  alert("Der Spielfortschritt wurde gelöscht; starte das Spiel erneut.！");
  await loadLevelsAndRender();
});

// --- Dropdown: change level
levelSelect.addEventListener("change", (e) => {
  const id = parseInt(e.target.value, 10);
  setCurrentLevel(id);
});

// --- Button: check / evaluate + submit attempt
btnCheck.addEventListener("click", async () => {
  const lv = currentLevel();
  if (!lv) return;

  const referenceRaw = getReferenceRaw();
  const template = buildTemplateFromReference(referenceRaw);
  const userRaw = buildUserRawFromTyped(template, referenceRaw);

  const refTokens = tokenizeSentence(referenceRaw);
  const usrTokens = tokenizeSentence(userRaw);

  refTokensView.textContent = refTokens.join(" | ");
  userTokensView.textContent = usrTokens.join(" | ");

  const ops = alignTokens(refTokens, usrTokens);
  const ops2 = postProcessWrong(ops);

  let ok = 0, wrong = 0, missing = 0, extra = 0;
  for (const op of ops2) {
    if (op.type === "ok") ok++;
    else if (op.type === "wrong") wrong++;
    else if (op.type === "missing") missing++;
    else if (op.type === "extra") extra++;
  }

  const totalRef = refTokens.length;
  const accuracy = totalRef === 0 ? 0 : Math.round((ok / totalRef) * 100);

  resultSummary.innerHTML =
    `Accuracy(Basierend auf Referenzen): <b>${accuracy}%</b> ｜ ` +
    `correct: <b>${ok}</b> ｜ wrong: <b>${wrong}</b> ｜ missing: <b>${missing}</b> ｜ extra: <b>${extra}</b> ｜ ` +
    `Pass score: <b>${lv.pass_score}%</b>`;

  resultTokens.innerHTML = "";
  for (const op of ops2) {
    const span = document.createElement("span");
    span.className = "tok " + op.type;

    if (op.type === "ok") {
      span.textContent = op.user;
      span.title = "correct";
    } else if (op.type === "wrong") {
      span.textContent = `${op.user} → (${op.ref})`;
      span.title = `wrong (your: ${op.user}, ref: ${op.ref})`;
    } else if (op.type === "missing") {
      span.textContent = `(${op.ref})`;
      span.title = "missing";
    } else if (op.type === "extra") {
      span.textContent = op.user;
      span.title = "extra";
    }
    resultTokens.appendChild(span);
  }

  // Persist attempt to DB
  await postAttempt({
    level_id: lv.id,
    accuracy,
    ok, wrong, missing, extra
  });

  // Pass/fail message
  const passedNow = accuracy >= lv.pass_score;
  if (passedNow) {
    alert(`🎉bestanden  ${lv.title}!(${accuracy}% >= ${lv.pass_score}%)`);
  } else {
    alert(`Versuchen Sie es erneut: ${accuracy}% / erfordert ${lv.pass_score}%`);
  }

  // Refresh levels + unlock status
  await loadLevelsAndRender();

  // Auto-switch to next level if passed
  if (passedNow) {
    const idx = levels.findIndex(x => x.id === lv.id);
    const next = levels[idx + 1];
    if (next) {
      const nextUnlocked = levels[idx].passed;
      if (nextUnlocked) {
        setCurrentLevel(next.id);
      }
    }
  }
});

// =====================================================
// [9] Init (startup order)
// =====================================================

attachTypingHandlers();
loadLevelsAndRender().then(() => {
  // Reference hidden by default
  referenceTextEl.classList.add("hidden");
  renderGrid();
  focusTyping();
});
