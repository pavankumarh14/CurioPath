'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const http    = require('http');
const path    = require('path');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 }      = require('uuid');

const {
  getDb, saveGoal, getGoals, getGoalById,
  getSubTopicsByGoal, getSourcesByGoal, getRatedSourcesByGoal,
  getLearningPath, getDAGByGoalId, getDAGById, getFindingsByDagId,
} = require('./db');
const { processGoal, setBroadcast } = require('./orchestrator');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

const PORT            = process.env.PORT ?? 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

// Allow all origins in production, or specific origin if set
app.use(cors({ origin: FRONTEND_ORIGIN ?? true }));
app.use(express.json());

// Serve frontend static files
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// ── WebSocket ─────────────────────────────────────────────────────────────────

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'connected', data: { message: 'CurioPath live feed connected' } }));
  ws.on('error', () => {});
});

function broadcast(event) {
  const msg = JSON.stringify(event);
  wss.clients.forEach(ws => {
    if (ws.readyState !== ws.OPEN) return;
    try { ws.send(msg); } catch { /* client disconnected */ }
  });
}

setBroadcast(broadcast);

// ── Helpers ───────────────────────────────────────────────────────────────────

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  data, timestamp: new Date().toISOString() });
const err = (res, msg,  status = 500) => res.status(status).json({ success: false, error: msg,  timestamp: new Date().toISOString() });

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => ok(res, {
  status: 'ok',
  db:     !!getDb(),
  groq:   !!process.env.GROQ_API_KEY,
}));

// Goals
app.get('/api/goals', (_req, res) => ok(res, getGoals()));

app.get('/api/goals/:id', (req, res) => {
  const g = getGoalById(req.params.id);
  return g ? ok(res, g) : err(res, 'Goal not found', 404);
});

app.post('/api/goals', async (req, res) => {
  const { topic, level, hours_per_week, duration_weeks, formats } = req.body;

  if (!topic?.trim())           return err(res, 'topic is required', 400);
  if (!['beginner', 'intermediate', 'advanced'].includes(level))
                                return err(res, 'level must be beginner | intermediate | advanced', 400);
  if (!hours_per_week || hours_per_week < 1)  return err(res, 'hours_per_week must be >= 1', 400);
  if (!duration_weeks || duration_weeks < 1)  return err(res, 'duration_weeks must be >= 1', 400);
  if (!Array.isArray(formats) || !formats.length) return err(res, 'formats must be a non-empty array', 400);

  const goal = {
    id:             `goal-${uuidv4()}`,
    topic:          topic.trim(),
    level,
    hours_per_week: Number(hours_per_week),
    duration_weeks: Number(duration_weeks),
    formats,
    status:         'processing',
    created_at:     new Date().toISOString(),
  };

  saveGoal(goal);

  // Respond immediately — pipeline runs async and broadcasts via WebSocket
  res.status(202).json({ success: true, data: goal, timestamp: new Date().toISOString() });

  processGoal(goal).catch(e => console.error('[goal processing]', e.message));
});

// Goal sub-resources
app.get('/api/goals/:id/sub-topics', (req, res) => ok(res, getSubTopicsByGoal(req.params.id)));
app.get('/api/goals/:id/sources',    (req, res) => ok(res, getSourcesByGoal(req.params.id)));
app.get('/api/goals/:id/ratings',    (req, res) => ok(res, getRatedSourcesByGoal(req.params.id)));
app.get('/api/goals/:id/path',       (req, res) => {
  const path = getLearningPath(req.params.id);
  return path ? ok(res, path) : ok(res, null);
});
app.get('/api/goals/:id/dag',        (req, res) => {
  const dag = getDAGByGoalId(req.params.id);
  return dag ? ok(res, dag) : ok(res, null);
});

// DAGs
app.get('/api/dags/:id',          (req, res) => {
  const d = getDAGById(req.params.id);
  return d ? ok(res, d) : err(res, 'DAG not found', 404);
});
app.get('/api/dags/:id/findings', (req, res) => ok(res, getFindingsByDagId(req.params.id)));

// Catch-all for SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ── Boot ──────────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  const hasKey = !!process.env.GROQ_API_KEY;
  console.log(`\n📚 CurioPath backend → http://0.0.0.0:${PORT}`);
  console.log(`   WebSocket        → ws://0.0.0.0:${PORT}/ws`);
  console.log(`   Groq key         → ${hasKey ? '✅ set' : '❌ NOT SET — add GROQ_API_KEY to backend/.env'}\n`);
  if (!hasKey) console.warn('   ⚠️  Get a free key at https://console.groq.com\n');
});
