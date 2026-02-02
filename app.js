/* ==========================
   Study Session Tracker
   Covers: variables, objects/arrays, functions, loops, nested loops,
   conditionals, DOM, events, forms, query params, localStorage
   ========================== */

// ---------- Helpers ----------
const $ = (selector) => document.querySelector(selector);

const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const STORAGE_KEY = "study_tasks_v1";

// ---------- DOM elements ----------
const taskForm = $("#taskForm");
const topicInput = $("#topicInput");
const minutesInput = $("#minutesInput");
const difficultySelect = $("#difficultySelect");
const taskList = $("#taskList");

const statsEl = $("#stats");
const clearBtn = $("#clearBtn");

const filterInput = $("#filterInput");
const applyFilterBtn = $("#applyFilterBtn");
const resetFilterBtn = $("#resetFilterBtn");

const skillMapEl = $("#skillMap");

// ---------- State ----------
let tasks = []; // array of objects
let activeFilter = ""; // string

// ---------- Load initial state ----------
init();

function init() {
  tasks = loadTasks();
  activeFilter = loadFilterFromURL() || "";
  filterInput.value = activeFilter;

  render();
  syncURLFilter(activeFilter);
}

// ---------- Events ----------
taskForm.addEventListener("submit", (event) => {
  event.preventDefault(); // don't reload page

  const topicRaw = topicInput.value.trim();
  const minutes = safeNumber(minutesInput.value, 0);
  const difficulty = clamp(safeNumber(difficultySelect.value, 0), 1, 5);

  // Guard clause (conditionals)
  if (!topicRaw || minutes <= 0 || !difficulty) {
    alert("Please enter a topic, minutes > 0, and choose difficulty.");
    return;
  }

  const task = {
    id: crypto.randomUUID(), // unique id
    topic: normalizeTopic(topicRaw), // string methods
    minutes, // number
    difficulty, // number
    createdAt: new Date().toISOString(),
  };

  tasks.push(task); // array mutation
  saveTasks(tasks); // localStorage
  clearFormInputs(); // reset inputs
  render(); // update DOM
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Clear all tasks?")) return;
  tasks = [];
  saveTasks(tasks);
  render();
});

applyFilterBtn.addEventListener("click", () => {
  activeFilter = filterInput.value.trim().toLowerCase();
  syncURLFilter(activeFilter);
  render();
});

resetFilterBtn.addEventListener("click", () => {
  activeFilter = "";
  filterInput.value = "";
  syncURLFilter(activeFilter);
  render();
});

// Event delegation (one listener handles all delete buttons)
taskList.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "delete") {
    tasks = tasks.filter((t) => t.id !== id); // array filter
    saveTasks(tasks);
    render();
  }
});

// ---------- Pure functions ----------
function normalizeTopic(str) {
  // Make consistent: trim, collapse spaces, lowercase
  return str.trim().replace(/\s+/g, " ").toLowerCase();
}

function getFilteredTasks(allTasks, filterStr) {
  if (!filterStr) return allTasks;

  return allTasks.filter((t) => {
    return t.topic.includes(filterStr);
  });
}

function calcStats(taskArr) {
  // Looping + totals
  let totalMinutes = 0;
  let totalDifficulty = 0;

  for (let i = 0; i < taskArr.length; i++) {
    totalMinutes += taskArr[i].minutes;
    totalDifficulty += taskArr[i].difficulty;
  }

  const avgDifficulty = taskArr.length
    ? (totalDifficulty / taskArr.length).toFixed(2)
    : "0.00";

  return { totalMinutes, avgDifficulty, count: taskArr.length };
}

function buildSkillMap(taskArr) {
  // Nested loops demo:
  // We create "buckets" and count tasks that match each bucket label.
  const buckets = [
    { label: "basics", keywords: ["var", "let", "const", "types"] },
    { label: "arrays", keywords: ["array", "push", "filter", "map"] },
    { label: "objects", keywords: ["object", "key", "value"] },
    { label: "loops", keywords: ["loop", "for", "while", "nested"] },
    { label: "dom", keywords: ["dom", "queryselector", "event", "listener"] },
  ];

  const result = {}; // object to store counts

  // Outer loop: each bucket
  for (let b = 0; b < buckets.length; b++) {
    const bucket = buckets[b];
    result[bucket.label] = 0;

    // Inner loop: each task
    for (let t = 0; t < taskArr.length; t++) {
      const topic = taskArr[t].topic;

      // Another loop: keywords for this bucket
      for (let k = 0; k < bucket.keywords.length; k++) {
        const keyword = bucket.keywords[k];

        if (topic.includes(keyword)) {
          result[bucket.label] += 1;
          break; // stop counting more keywords for the same task
        }
      }
    }
  }

  return result;
}

// ---------- DOM rendering ----------
function render() {
  const visibleTasks = getFilteredTasks(tasks, activeFilter);

  // Clear list
  taskList.innerHTML = "";

  // Render tasks
  for (const task of visibleTasks) {
    const li = document.createElement("li");

    const prettyDate = new Date(task.createdAt).toLocaleString();

    li.innerHTML = `
      <div>
        <span class="pill">${escapeHTML(task.topic)}</span>
        <span class="muted">${task.minutes} min • difficulty ${task.difficulty} • ${prettyDate}</span>
      </div>
      <div style="margin-top: 6px;">
        <button data-action="delete" data-id="${task.id}">Delete</button>
      </div>
    `;

    taskList.appendChild(li);
  }

  // Stats
  const stats = calcStats(visibleTasks);
  statsEl.textContent = `Showing ${stats.count} task(s) • Total minutes: ${stats.totalMinutes} • Avg difficulty: ${stats.avgDifficulty}`;

  // Skill map
  const map = buildSkillMap(visibleTasks);
  skillMapEl.innerHTML = Object.entries(map)
    .map(([label, count]) => `<div><strong>${label}</strong>: ${count}</div>`)
    .join("");
}

function clearFormInputs() {
  topicInput.value = "";
  minutesInput.value = "";
  difficultySelect.value = "";
  topicInput.focus();
}

// ---------- Storage ----------
function saveTasks(taskArr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(taskArr));
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---------- URL Query Params (filter=...) ----------
function loadFilterFromURL() {
  const params = new URLSearchParams(window.location.search);
  const f = params.get("filter");
  return f ? f.toLowerCase() : "";
}

function syncURLFilter(filterStr) {
  const url = new URL(window.location.href);

  if (!filterStr) {
    url.searchParams.delete("filter");
  } else {
    url.searchParams.set("filter", filterStr);
  }

  // Change URL without reloading
  history.replaceState({}, "", url);
}

// ---------- Safety (basic XSS prevention) ----------
function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
