'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'learnswarm.db');
let db;

function getDb() {
  if (!db) {
    // Ensure data directory exists
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id              TEXT PRIMARY KEY,
      topic           TEXT NOT NULL,
      level           TEXT NOT NULL,   -- beginner | intermediate | advanced
      hours_per_week  INTEGER NOT NULL,
      duration_weeks  INTEGER NOT NULL,
      formats         TEXT NOT NULL,   -- JSON string[]
      status          TEXT DEFAULT 'processing',  -- processing | completed | failed
      created_at      TEXT NOT NULL
    );

    -- Sub-topics are written by the Scoper agent and read by all downstream agents.
    -- prerequisites lists names of other sub_topics that must come first.
    CREATE TABLE IF NOT EXISTS sub_topics (
      id              TEXT PRIMARY KEY,
      goal_id         TEXT NOT NULL,
      name            TEXT NOT NULL,
      objectives      TEXT NOT NULL,   -- JSON string[]
      prerequisites   TEXT NOT NULL,   -- JSON string[] of sub_topic names
      estimated_hours REAL DEFAULT 0,
      order_index     INTEGER DEFAULT 0,
      created_at      TEXT NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    -- Raw sources found by the Source-Finder agent, one row per source per sub-topic.
    CREATE TABLE IF NOT EXISTS sources (
      id            TEXT PRIMARY KEY,
      goal_id       TEXT NOT NULL,
      sub_topic_id  TEXT NOT NULL,
      title         TEXT NOT NULL,
      url           TEXT NOT NULL,
      type          TEXT NOT NULL,   -- video | article | course | book | documentation
      author        TEXT,
      platform      TEXT,
      description   TEXT,
      created_at    TEXT NOT NULL,
      FOREIGN KEY (sub_topic_id) REFERENCES sub_topics(id)
    );

    -- Quality scores written by the Quality-Rater agent, one row per source.
    CREATE TABLE IF NOT EXISTS rated_sources (
      id            TEXT PRIMARY KEY,
      source_id     TEXT NOT NULL UNIQUE,
      goal_id       TEXT NOT NULL,
      credibility   REAL NOT NULL,   -- 0-10: author/platform trustworthiness
      clarity       REAL NOT NULL,   -- 0-10: well-explained, appropriate pacing
      level_fit     REAL NOT NULL,   -- 0-10: matches learner's stated level
      overall_score REAL NOT NULL,   -- weighted average
      rationale     TEXT NOT NULL,
      keep          INTEGER NOT NULL, -- 1 = include in path, 0 = discard
      created_at    TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources(id)
    );

    -- Final assembled learning path written by the Sequencer agent.
    CREATE TABLE IF NOT EXISTS learning_paths (
      id                    TEXT PRIMARY KEY,
      goal_id               TEXT NOT NULL UNIQUE,
      modules               TEXT NOT NULL,   -- JSON ordered LearningModule[]
      gaps                  TEXT NOT NULL,   -- JSON string[]
      total_estimated_hours REAL NOT NULL,
      fits_timeline         INTEGER NOT NULL, -- 1 = fits, 0 = exceeds goal duration
      created_at            TEXT NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS dags (
      id         TEXT PRIMARY KEY,
      goal_id    TEXT NOT NULL,
      nodes      TEXT NOT NULL,
      status     TEXT DEFAULT 'running',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS findings (
      id         TEXT PRIMARY KEY,
      dag_id     TEXT NOT NULL,
      goal_id    TEXT NOT NULL,
      node_id    TEXT NOT NULL,
      capability TEXT NOT NULL,
      summary    TEXT NOT NULL,
      details    TEXT NOT NULL,
      confidence REAL DEFAULT 0,
      verdict    TEXT DEFAULT 'neutral',
      provenance TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

// ── Goals ─────────────────────────────────────────────────────────────────────
function saveGoal(g) {
  getDb().prepare(`
    INSERT OR REPLACE INTO goals (id, topic, level, hours_per_week, duration_weeks, formats, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(g.id, g.topic, g.level, g.hours_per_week, g.duration_weeks, JSON.stringify(g.formats), g.status ?? 'processing', g.created_at);
}

function updateGoalStatus(id, status) {
  getDb().prepare('UPDATE goals SET status = ? WHERE id = ?').run(status, id);
}

function getGoals() {
  return getDb().prepare('SELECT * FROM goals ORDER BY created_at DESC').all()
    .map(r => ({ ...r, formats: JSON.parse(r.formats) }));
}

function getGoalById(id) {
  const r = getDb().prepare('SELECT * FROM goals WHERE id = ?').get(id);
  return r ? { ...r, formats: JSON.parse(r.formats) } : null;
}

// ── Sub-topics ────────────────────────────────────────────────────────────────
function saveSubTopic(st) {
  getDb().prepare(`
    INSERT OR REPLACE INTO sub_topics (id, goal_id, name, objectives, prerequisites, estimated_hours, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(st.id, st.goal_id, st.name, JSON.stringify(st.objectives), JSON.stringify(st.prerequisites ?? []), st.estimated_hours ?? 0, st.order_index ?? 0, st.created_at ?? new Date().toISOString());
}

function saveSubTopics(subTopics) {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO sub_topics (id, goal_id, name, objectives, prerequisites, estimated_hours, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  getDb().transaction(sts => {
    for (const st of sts) stmt.run(st.id, st.goal_id, st.name, JSON.stringify(st.objectives), JSON.stringify(st.prerequisites ?? []), st.estimated_hours ?? 0, st.order_index ?? 0, st.created_at ?? new Date().toISOString());
  })(subTopics);
}

function getSubTopicsByGoal(goal_id) {
  return getDb().prepare('SELECT * FROM sub_topics WHERE goal_id = ? ORDER BY order_index ASC').all(goal_id)
    .map(r => ({ ...r, objectives: JSON.parse(r.objectives), prerequisites: JSON.parse(r.prerequisites) }));
}

// ── Sources ───────────────────────────────────────────────────────────────────
function saveSource(s) {
  getDb().prepare(`
    INSERT OR REPLACE INTO sources (id, goal_id, sub_topic_id, title, url, type, author, platform, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(s.id, s.goal_id, s.sub_topic_id, s.title, s.url, s.type, s.author ?? null, s.platform ?? null, s.description ?? null, s.created_at ?? new Date().toISOString());
}

function saveSources(sources) {
  const stmt = getDb().prepare(`INSERT OR REPLACE INTO sources (id, goal_id, sub_topic_id, title, url, type, author, platform, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  getDb().transaction(ss => { for (const s of ss) stmt.run(s.id, s.goal_id, s.sub_topic_id, s.title, s.url, s.type, s.author ?? null, s.platform ?? null, s.description ?? null, s.created_at ?? new Date().toISOString()); })(sources);
}

function getSourcesByGoal(goal_id) {
  return getDb().prepare('SELECT * FROM sources WHERE goal_id = ?').all(goal_id);
}

function getSourcesBySubTopic(sub_topic_id) {
  return getDb().prepare('SELECT * FROM sources WHERE sub_topic_id = ?').all(sub_topic_id);
}

// ── Rated Sources ─────────────────────────────────────────────────────────────
function saveRatedSource(rs) {
  getDb().prepare(`
    INSERT OR REPLACE INTO rated_sources (id, source_id, goal_id, credibility, clarity, level_fit, overall_score, rationale, keep, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(rs.id, rs.source_id, rs.goal_id, rs.credibility, rs.clarity, rs.level_fit, rs.overall_score, rs.rationale, rs.keep ? 1 : 0, rs.created_at ?? new Date().toISOString());
}

function getRatedSourcesByGoal(goal_id) {
  return getDb().prepare('SELECT * FROM rated_sources WHERE goal_id = ?').all(goal_id)
    .map(r => ({ ...r, keep: r.keep === 1 }));
}

function getRatedSourcesBySubTopic(goal_id, sub_topic_id) {
  return getDb().prepare(`
    SELECT rs.* FROM rated_sources rs
    JOIN sources s ON rs.source_id = s.id
    WHERE rs.goal_id = ? AND s.sub_topic_id = ? AND rs.keep = 1
    ORDER BY rs.overall_score DESC
  `).all(goal_id, sub_topic_id).map(r => ({ ...r, keep: r.keep === 1 }));
}

// ── Learning Paths ────────────────────────────────────────────────────────────
function saveLearningPath(lp) {
  getDb().prepare(`
    INSERT OR REPLACE INTO learning_paths (id, goal_id, modules, gaps, total_estimated_hours, fits_timeline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(lp.id, lp.goal_id, JSON.stringify(lp.modules), JSON.stringify(lp.gaps), lp.total_estimated_hours, lp.fits_timeline ? 1 : 0, lp.created_at ?? new Date().toISOString());
}

function getLearningPath(goal_id) {
  const r = getDb().prepare('SELECT * FROM learning_paths WHERE goal_id = ?').get(goal_id);
  return r ? { ...r, modules: JSON.parse(r.modules), gaps: JSON.parse(r.gaps), fits_timeline: r.fits_timeline === 1 } : null;
}

// ── DAGs ──────────────────────────────────────────────────────────────────────
function saveDAG(dag) {
  getDb().prepare(`INSERT OR REPLACE INTO dags (id, goal_id, nodes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(dag.id, dag.goal_id, JSON.stringify(dag.nodes), dag.status, dag.created_at ?? new Date().toISOString(), new Date().toISOString());
}

function getDAGByGoalId(goal_id) {
  const r = getDb().prepare('SELECT * FROM dags WHERE goal_id = ? ORDER BY created_at DESC LIMIT 1').get(goal_id);
  return r ? { ...r, nodes: JSON.parse(r.nodes) } : null;
}

function getDAGById(id) {
  const r = getDb().prepare('SELECT * FROM dags WHERE id = ?').get(id);
  return r ? { ...r, nodes: JSON.parse(r.nodes) } : null;
}

// ── Findings ─────────────────────────────────────────────────────────────────
function saveFinding(f) {
  getDb().prepare(`
    INSERT OR REPLACE INTO findings (id, dag_id, goal_id, node_id, capability, summary, details, confidence, verdict, provenance, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(f.id, f.dag_id, f.goal_id, f.node_id, f.capability, f.summary, JSON.stringify(f.details), f.confidence, f.verdict, JSON.stringify(f.provenance), f.created_at ?? new Date().toISOString());
}

function getFindingsByDagId(dag_id) {
  return getDb().prepare('SELECT * FROM findings WHERE dag_id = ? ORDER BY created_at ASC').all(dag_id)
    .map(r => ({ ...r, details: JSON.parse(r.details), provenance: JSON.parse(r.provenance) }));
}

module.exports = {
  getDb,
  saveGoal, updateGoalStatus, getGoals, getGoalById,
  saveSubTopic, saveSubTopics, getSubTopicsByGoal,
  saveSource, saveSources, getSourcesByGoal, getSourcesBySubTopic,
  saveRatedSource, getRatedSourcesByGoal, getRatedSourcesBySubTopic,
  saveLearningPath, getLearningPath,
  saveDAG, getDAGByGoalId, getDAGById,
  saveFinding, getFindingsByDagId,
};
