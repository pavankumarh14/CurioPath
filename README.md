# CurioPath — Multi-Agent Personalised Learning Path & Curation Swarm

> Theme 05 — Agent Swarms

---

## Problem Statement

### The Cold-Start Problem: Why Learning Anything New Means Hours of Curating Before You Even Begin

**Problem Background**

The hardest part of learning a new topic comes before any learning starts: figuring out what to learn, in what order, from which sources, at what depth. The internet's unlimited material is itself the problem — dozens of overlapping courses, videos, and articles of varying quality, none sequenced for your specific level and timeframe. Building a good path is multi-dimensional work: scope the topic into sub-topics, find quality sources for each, judge credibility and level-fit, sequence by prerequisite. A learner does this one browser tab at a time and usually ends with a disorganised bookmark folder instead of a plan.

**Why It Matters**

Most self-directed learning fails at the starting line, not the finish — the curation burden is where motivation leaks away. Judging whether a source is worth your time before you have the knowledge to judge it is a bootstrapping problem. Compressing hours of scattered curation into a sequenced, quality-checked path means people actually start, and start with a plan. The bottleneck is the parallel scoping, evaluation, and sequencing — exactly what a swarm of specialists provides.

**Expected Impact**

- Compress hours of scattered curation into a **sequenced, quality-checked path in minutes**
- **Quality-rated sources** — every source scored on credibility, clarity, and level-fit before it reaches the learner
- **Prerequisite-respecting order** — each step builds on the last, no silent assumptions
- **Honest gap reporting** — the system admits where it couldn't find good material rather than surfacing low-quality sources just to look complete
- Full provenance — why each source was selected and how it scored

---

## What CurioPath Does

A user submits a learning goal: topic, current level, hours per week, and preferred formats. The Orchestrator fans it out to four specialist agents running in a pipeline — the Scoper decomposes the topic into sub-topics with learning objectives, the Source-Finder searches for candidate materials per sub-topic, the Quality-Rater scores each source, and the Sequencer assembles them into a prerequisite-respecting learning path with gap detection. The output is a complete, actionable curriculum with curated sources and a gap report for anything the swarm couldn't cover.

---

## What Is Built vs What Candidates Implement

### ✅ Built (infrastructure + Scoper reference agent)

| Component | Details |
|-----------|---------|
| Orchestrator + DAG runner | 4-phase sequential pipeline |
| **Scoper agent** | LLM topic decomposition — sub-topics, objectives, prerequisites, time estimates |
| SQLite storage layer | WAL mode, 7 tables covering the full pipeline state |
| Mock source pool | 3 topics × 12-13 realistic sources (ML, React, System Design) |
| Express REST API | All endpoints, envelope pattern |
| WebSocket server | Live events: `dag_update`, `finding`, `goal_complete` |
| React shell + CSS | App layout, pipeline status pills, tab navigation |
| **GoalBuilder component** | Goal submission form with examples + format selection |
| **PathList component** | Goals sidebar with status + level badges |

### ⬜ Candidate tasks

| File | What to build | Dimension tested |
|------|--------------|-----------------|
| `backend/src/agents/source-finder/index.js` | Keyword-relevance source selection from pool + HN fallback | AI Integration |
| `backend/src/agents/quality-rater/index.js` | LLM scoring: credibility × clarity × level-fit per source | AI Integration |
| `backend/src/agents/sequencer/index.js` | Topological sort + source selection + gap detection (no LLM) | System Architecture |
| `frontend/src/components/CurriculumDAG.jsx` | D3 force-directed prerequisite graph — live updates per agent phase | System Arch + UX |
| `frontend/src/components/LearningPathPanel.jsx` | Ordered module cards with sources, scores, timeline widget | UX |
| `frontend/src/components/GapReport.jsx` | Gap cards with coverage stats and suggested manual research actions | UX + Prototype Readiness |

Read the `// CANDIDATE TASK` block at the top of each stub before starting.

---

## ⚠️ Groq API Key Required

CurioPath has **no mock mode** — agents make real LLM calls.

1. Get your **free** key at [console.groq.com](https://console.groq.com)
2. Copy the example: `cp backend/.env.example backend/.env`
3. Paste your key in `backend/.env`
4. **Use your own key** — shared keys cause rate-limit collisions during demos

---

## Prerequisites

- **Node.js 22** — use nvm
- A free Groq API key

```bash
nvm install 22 && nvm use 22
node --version   # v22.x.x
```

---

## Quick Start

### 1. Install

```bash
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — paste GROQ_API_KEY=gsk_...
```

### 3. Run — two terminals

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
# → 📚 CurioPath backend → http://localhost:3001
# → Groq key → ✅ set
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
# → http://localhost:5173
```

### 4. Demo walkthrough

1. Open **http://localhost:5173**
2. Click **+ New Goal** and submit "Learn React" (intermediate, 10h/wk, 4 weeks)
3. Watch the pipeline status pills animate: `scoper → source-finder → quality-rater → sequencer`
4. **🕸 Curriculum Graph** — D3 prerequisite graph builds as Scoper completes
5. **📚 Learning Path** — ordered modules appear after Sequencer runs
6. **🔍 Gap Report** — any sub-topics without quality sources are flagged

### 5. Suggested test goals (use the mock source pool)

| Topic | Level | Expected |
|---|---|---|
| `Learn React` | intermediate | 6-7 sub-topics, rich source pool, likely 0 gaps |
| `Machine Learning` | beginner | 7 sub-topics, maths prerequisites visible in DAG |
| `System Design` | advanced | 7-8 sub-topics, some niche topics may show gaps |
| `Kubernetes` | intermediate | Forces HN fallback — tests your Source-Finder fallback path |

### 6. Reset

```bash
rm backend/data/learnswarm.db
# DB auto-recreates on next backend start
```

---

## API Reference

All responses: `{ success: boolean, data?: T, error?: string, timestamp: string }`

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Health — shows Groq key status |
| `GET`  | `/api/goals` | All goals |
| `POST` | `/api/goals` | Submit learning goal (202 — processes async) |
| `GET`  | `/api/goals/:id` | Single goal |
| `GET`  | `/api/goals/:id/sub-topics` | Sub-topics written by Scoper |
| `GET`  | `/api/goals/:id/sources` | Raw sources from Source-Finder |
| `GET`  | `/api/goals/:id/ratings` | Quality ratings from Quality-Rater |
| `GET`  | `/api/goals/:id/path` | Final learning path from Sequencer |
| `GET`  | `/api/goals/:id/dag` | Live DAG state |
| `GET`  | `/api/dags/:id/findings` | All agent findings for a DAG |

---

## WebSocket Events

Connect to `ws://localhost:3001/ws`

| Type | Payload | When |
|------|---------|------|
| `connected` | `{ message }` | On connect |
| `dag_update` | DAG object | Every node status change |
| `finding` | Finding object | When any agent completes |
| `agent_error` | `{ node_id, error }` | When an agent throws |
| `goal_complete` | `{ goal_id, dag, findings }` | Pipeline finished |

---

## Candidate Implementation Guide

### Before you start

1. **Read `docs/sample-output.txt` first** — shows the exact JSON output every agent should produce for a "Learn React" goal, including the prerequisite ordering, quality scores, and what a gap looks like. Use it as your target before writing a single line.
2. Run end-to-end: submit "Learn React", watch the pipeline, check SQLite
3. Read `backend/src/agents/scoper/index.js` completely — the reference implementation
4. Inspect what Scoper saves:
```bash
sqlite3 backend/data/learnswarm.db "SELECT name, prerequisites, estimated_hours FROM sub_topics"
```

### Source-Finder (`backend/src/agents/source-finder/index.js`)

Gets sub_topics from `context.scoperFinding.details.sub_topics`. Call `getSourcePool(goal.topic)` to get the mock pool, then score each source for relevance using `extractKeywords(subTopic)`. Keep sources with relevance_score >= 0.2. For sub-topics with < 2 matches, fall back to the HN Algolia API (spec in the stub). Call `saveSources()` and return a Finding with sources grouped by sub_topic.

### Quality-Rater (`backend/src/agents/quality-rater/index.js`)

Receives `context.sourceFinding.details.sources_by_subtopic`. For each source batch (4-5 at a time), call the LLM with source metadata + learner's level. Compute: `overall = credibility*0.4 + clarity*0.35 + level_fit*0.25`. Mark `keep = overall >= QUALITY_THRESHOLD`. Call `saveRatedSource()` per source.

### Sequencer (`backend/src/agents/sequencer/index.js`)

**No LLM** — pure algorithm. Call `getSubTopicsByGoal(goal_id)` and build the prerequisite graph. Run Kahn's algorithm (BFS topological sort) to order sub-topics. For each ordered sub-topic, call `getRatedSourcesBySubTopic()` and take top `MAX_SOURCES_PER_MODULE`. Flag gaps where rated sources are empty or all scored below threshold. Call `saveLearningPath()`. The `provenance.model` must be `'algorithm'`.

### CurriculumDAG (`frontend/src/components/CurriculumDAG.jsx`)

D3 force simulation. `subTopics` prop updates live via WebSocket — re-run simulation on each change. Nodes sized by estimated_hours, coloured by pipeline stage. Directed edges from prerequisite to dependent. Arrowhead via SVG `<defs><marker>`.

### LearningPathPanel (`frontend/src/components/LearningPathPanel.jsx`)

Ordered module cards from `path.modules[]`. Each card: sub-topic name, objectives, top sources with score bars. Timeline widget: `path.total_estimated_hours` vs `goal.hours_per_week × goal.duration_weeks`.

### GapReport (`frontend/src/components/GapReport.jsx`)

Coverage stats bar + gap cards. Each gap card: sub-topic name, gap type (coverage vs quality), and 3 suggested search actions. "Mark as found" button strikes through the card (UI-only state).
