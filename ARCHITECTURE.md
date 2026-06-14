# CurioPath — Architecture Document
---

## 1. System Overview

```
User submits learning goal (topic, level, hours/wk, duration, formats)
                │
                ▼
      POST /api/goals
                │
                ▼
  ┌─────────────────────────────────────────────────────────┐
  │                     Orchestrator                        │
  │  Runs 4 agents sequentially — each feeds the next      │
  └──────┬──────────────────────────────────────────────────┘
         │
         ▼ Phase 1
    [Scoper]                   ✅ BUILT — reference implementation
    Decomposes topic into
    5-7 sub-topics with
    objectives + prerequisites
         │
         ▼ Phase 2
    [Source-Finder]            ⬜ CANDIDATE
    Matches mock source pool
    to sub-topics by keyword
    relevance; HN fallback
         │
         ▼ Phase 3
    [Quality-Rater]            ⬜ CANDIDATE
    Scores each source:
    credibility × clarity
    × level_fit → keep/discard
         │
         ▼ Phase 4
    [Sequencer]                ⬜ CANDIDATE (no LLM — algorithm)
    Topological sort of
    sub-topics → ordered path
    Gap detection + timeline fit
         │
         ▼
    React Learning Dashboard
    (CurriculumDAG + PathPanel + GapReport)
```

---

## 2. What Is Built vs What Candidates Complete

| Component | Status | Location |
|-----------|--------|----------|
| Orchestrator + DAG runner | ✅ | `backend/src/orchestrator/` |
| **Scoper agent** | ✅ Reference | `backend/src/agents/scoper/index.js` |
| SQLite storage (7 tables) | ✅ | `backend/src/db/index.js` |
| Mock source pool (3 topics) | ✅ | `backend/src/data/mock-sources.js` |
| Express REST API + WebSocket | ✅ | `backend/src/server.js` |
| Groq LLM client (hard dep) | ✅ | `backend/src/shared/llm.js` |
| React app shell + CSS | ✅ | `frontend/src/App.jsx`, `App.css` |
| WebSocket hook | ✅ | `frontend/src/hooks/useWebSocket.js` |
| API service layer | ✅ | `frontend/src/services/api.js` |
| GoalBuilder component | ✅ | `frontend/src/components/GoalBuilder.jsx` |
| PathList component | ✅ | `frontend/src/components/PathList.jsx` |


| Component | Status | Location |
|-----------|--------|----------|
| Source-Finder agent | ⬜ Stub | `backend/src/agents/source-finder/index.js` |
| Quality-Rater agent | ⬜ Stub | `backend/src/agents/quality-rater/index.js` |
| Sequencer agent | ⬜ Stub | `backend/src/agents/sequencer/index.js` |
| CurriculumDAG (D3) | ⬜ Stub | `frontend/src/components/CurriculumDAG.jsx` |
| LearningPathPanel | ⬜ Stub | `frontend/src/components/LearningPathPanel.jsx` |
| GapReport | ⬜ Stub | `frontend/src/components/GapReport.jsx` |

---

## 3. Directory Layout

```
CurioPath/
├── backend/
│   ├── src/
│   │   ├── server.js                     ← Express + WebSocket entry point
│   │   ├── db/index.js                   ← SQLite: 7 tables, full query layer
│   │   ├── shared/llm.js                 ← Groq client (hard dep, no mock)
│   │   ├── data/mock-sources.js          ← Source pool: ML, React, System Design
│   │   ├── orchestrator/
│   │   │   ├── index.js                  ← processGoal() — sequential pipeline
│   │   │   ├── dag-runner.js             ← State machine
│   │   │   └── dag-builder.js            ← 4-node linear DAG
│   │   └── agents/
│   │       ├── scoper/index.js           ← ✅ REFERENCE
│   │       ├── source-finder/index.js    ← ⬜ CANDIDATE
│   │       ├── quality-rater/index.js    ← ⬜ CANDIDATE
│   │       └── sequencer/index.js        ← ⬜ CANDIDATE (algorithm, no LLM)
│   ├── data/learnswarm.db                ← SQLite (auto-created)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                       ← App shell + state
│   │   ├── App.css                       ← Dark learning-console theme
│   │   ├── hooks/useWebSocket.js         ← Auto-reconnect WS hook
│   │   ├── services/api.js               ← REST client
│   │   └── components/
│   │       ├── GoalBuilder.jsx           ← ✅ Goal submission form
│   │       ├── PathList.jsx              ← ✅ Goals sidebar
│   │       ├── CurriculumDAG.jsx         ← ⬜ D3 force graph
│   │       ├── LearningPathPanel.jsx     ← ⬜ Ordered module cards
│   │       └── GapReport.jsx             ← ⬜ Gap analysis + suggestions
│   ├── vite.config.js
│   └── package.json
├── README.md
├── ARCHITECTURE.md
├── .nvmrc                                ← Node 22
└── .gitignore
```

---

## 4. Data Model (SQLite)

**Why SQLite:** Each agent writes its output to SQLite so the next agent can read it via a clean query API — no in-memory passing of large objects through the context chain. This also means agents can resume from stored state if the pipeline is interrupted, and the full pipeline history is inspectable with sqlite3.

### Schema

```sql
-- User's learning goal — the root entity.
goals (
  id              TEXT PK,
  topic           TEXT,
  level           TEXT,          -- beginner | intermediate | advanced
  hours_per_week  INTEGER,
  duration_weeks  INTEGER,
  formats         TEXT,          -- JSON string[]
  status          TEXT,          -- processing | completed | failed
  created_at      TEXT
)

-- Written by the Scoper. One row per sub-topic.
-- prerequisites[] holds names (not IDs) of other sub-topics.
sub_topics (
  id              TEXT PK,
  goal_id         TEXT FK → goals,
  name            TEXT,
  objectives      TEXT,          -- JSON string[]
  prerequisites   TEXT,          -- JSON string[] of sub_topic names
  estimated_hours REAL,
  order_index     INTEGER,       -- 0-based insertion order; Sequencer uses topo sort
  created_at      TEXT
)

-- Written by Source-Finder. Raw candidate materials, unrated.
sources (
  id           TEXT PK,
  goal_id      TEXT,
  sub_topic_id TEXT FK → sub_topics,
  title        TEXT,
  url          TEXT,
  type         TEXT,             -- video | article | course | book | documentation
  author       TEXT,
  platform     TEXT,
  description  TEXT,
  created_at   TEXT
)

-- Written by Quality-Rater. One row per source.
-- UNIQUE on source_id so re-runs don't duplicate ratings.
rated_sources (
  id            TEXT PK,
  source_id     TEXT FK UNIQUE → sources,
  goal_id       TEXT,
  credibility   REAL,            -- 0-10
  clarity       REAL,            -- 0-10
  level_fit     REAL,            -- 0-10
  overall_score REAL,            -- weighted: credibility*0.4 + clarity*0.35 + level_fit*0.25
  rationale     TEXT,
  keep          INTEGER,         -- 1 = passes threshold, 0 = discard
  created_at    TEXT
)

-- Written by Sequencer. One row per goal.
-- modules JSON contains the fully assembled, ordered learning path.
learning_paths (
  id                    TEXT PK,
  goal_id               TEXT UNIQUE FK → goals,
  modules               TEXT,    -- JSON LearningModule[]
  gaps                  TEXT,    -- JSON string[]
  total_estimated_hours REAL,
  fits_timeline         INTEGER,
  created_at            TEXT
)

-- One DAG per goal.
dags (
  id, goal_id, nodes (JSON), status, created_at, updated_at
)

-- One finding per agent per goal.
findings (
  id, dag_id, goal_id, node_id, capability,
  summary, details (JSON), confidence, verdict,
  provenance (JSON), created_at
)
```

---

## 5. DAG Structure

```
Nodes (all sequential — each phase depends on the previous):

  scoper        phase=1  deps=[]
  source-finder phase=2  deps=['scoper']
  quality-rater phase=3  deps=['source-finder']
  sequencer     phase=4  deps=['quality-rater']
```

**Why sequential (not parallel)?**

Each agent's output is the next agent's primary input:
- Source-Finder needs sub-topics (Scoper output) to know what to search for
- Quality-Rater needs sources (Source-Finder output) to rate
- Sequencer needs rated sources (Quality-Rater output) to build the path

There is no independent work that can run in parallel. A force-parallel design here would require the Orchestrator to invent inputs, which produces worse results. Sequential is the correct model.

---

## 6. Agent Contracts

### TaskPayload (all agents)
```javascript
{
  taskId:  string,
  dagId:   string,
  goalId:  string,
  nodeId:  'scoper' | 'source-finder' | 'quality-rater' | 'sequencer',
  goal:    Goal,
  context: {
    scoperFinding:   Finding | null,   // available to source-finder onwards
    sourcefinderFinding: Finding | null, // available to quality-rater onwards
    qualityRating:   Finding | null,   // available to sequencer
  }
}
```

Note: context keys use camelCase with 'Finding' suffix, derived from `nodeId.replace('-','') + 'Finding'`.

### Finding (shared shape)
```javascript
{
  id, dag_id, goal_id, node_id, capability,
  summary,          // one sentence
  details,          // agent-specific — see each stub's contract
  confidence,       // 0.0–1.0
  verdict,          // 'significant' | 'minor' | 'noise' | 'neutral'
  provenance: { agentId, model, durationMs },
  created_at,
}
```

---

## 7. Scoper Agent — Reference Implementation

Read `agents/scoper/index.js` before implementing any candidate agent.

**Key patterns:**

1. **Single LLM call** — sends the full goal in one prompt, gets back a structured JSON curriculum. No iterative calls.

2. **Strict JSON mode** — `reasonWithLLM(..., ..., true)` forces `response_format: { type: 'json_object' }`. The model cannot return prose.

3. **Error surface, not silently degrade** — if the LLM fails, `runScoper` throws. CurioPath has no mock fallback; surfacing errors immediately is correct here.

4. **Saves to SQLite before returning** — `saveSubTopics()` persists the sub-topics so Source-Finder can call `getSubTopicsByGoal()` rather than extracting from the Finding's details.

5. **Agent owns persistence** — `saveFinding()` is called inside the agent, not by the orchestrator.

---

## 8. Sequencer — Why No LLM

The Sequencer is deliberately algorithmic (no LLM). This tests the **System Architecture** scoring dimension.

Topological sort is the correct algorithm for "order these items by dependency". It is:
- Deterministic: same sub-topics + prerequisites → same order, every time
- Well-understood: Kahn's algorithm (BFS) is O(V + E) and handles cycles gracefully
- Verifiable: candidates can check their output against the prerequisite constraints manually

An LLM would produce plausible-sounding orderings that may silently violate prerequisites. A sorting algorithm is provably correct or provably wrong.

**The Sequencer is the hardest candidate task** — it requires understanding both the data model (querying across 4 tables: goals, sub_topics, sources, rated_sources) and an algorithmic approach. `provenance.model` must be `'algorithm'` to make this explicit.

---

## 9. Source-Finder — Mock Pool + Live Fallback

`backend/src/data/mock-sources.js` contains 3 curated topic pools:
- **Machine Learning** — 13 sources (Coursera, fast.ai, 3Blue1Brown, StatQuest, etc.)
- **React** — 12 sources (react.dev, Scrimba, Kent C. Dodds, Epic React, etc.)
- **System Design** — 12 sources (ByteByteGo, DDIA, System Design Primer, etc.)

`getSourcePool(topic)` does a fuzzy match so "Learn React" and "ReactJS" both hit the React pool.

For topics outside the pool, Source-Finder should fall back to the **HN Algolia API** — free, no key, returns real articles. This tests whether candidates can integrate a live data source, not just query mock fixtures.

---

## 10. Quality-Rater — Scoring Formula

```
overall_score = (credibility × 0.40) + (clarity × 0.35) + (level_fit × 0.25)
keep          = overall_score >= 5.0
```

Weights are exported as named constants from `quality-rater/index.js` so tests can import and verify them.

The LLM has strong priors about educational platforms — "Coursera-Andrew Ng", "fast.ai", "react.dev", "3Blue1Brown" are known-quality sources the model will score highly without needing explicit rules. Candidates should lean into this rather than building a manual reputation table.

---

## 11. Frontend Architecture

### Component Tree
```
App.jsx                      (all state — goals, subTopics, path, dag)
├── Header                   (status dot, new goal button)
├── Sidebar
│   ├── GoalBuilder.jsx      ✅ — goal form, example chips
│   └── PathList.jsx         ✅ — goal cards with status + level
└── Main Panel (tabbed)
    ├── CurriculumDAG.jsx    ⬜ — D3 force-directed prerequisite graph
    ├── LearningPathPanel.jsx ⬜ — ordered module cards
    └── GapReport.jsx        ⬜ — gap analysis + search suggestions
```

### Live Updates
The App's `useEffect([lastMessage])` handler:
- `dag_update` → updates `activeDAG` → `CurriculumDAG` re-renders
- `finding` where `capability === 'scoper'` → re-fetches sub_topics → graph updates
- `goal_complete` → re-fetches sub_topics + learning path → all panels update

### D3 CurriculumDAG
Force-directed graph (d3-force). Nodes = sub-topics, directed edges = prerequisite relationships. Node radius scales with estimated_hours. Colours indicate pipeline stage (no sources → grey, sources found → blue, rated → amber, in path → green, gap → red). `subTopics` prop updates on every `finding` WebSocket event after the Scoper runs, so the graph builds progressively as the pipeline advances.

---

## 12. Key Design Decisions

| Decision | Reason |
|----------|--------|
| Sequential pipeline (not parallel) | Each agent needs the previous agent's output — forced serial dependency |
| Hard Groq dependency (no mock) | AI Integration is scored — candidates must write real prompts |
| Sequencer uses no LLM | System Architecture is scored — topological sort is correct, not probabilistic |
| Source-Finder uses keyword matching | Tests algorithmic thinking before the LLM call, not just prompt engineering |
| Agents save to SQLite (not in-memory context) | Downstream agents query clean SQL — inspectable, resumable, testable |
| D3 force simulation for DAG | Natural layout for arbitrary prerequisite graphs — force handles variable node counts |
| HN Algolia fallback in Source-Finder | Shows real external data flowing in for topics outside the mock pool |
| `node --watch` (no nodemon) | Node 22 built-in — zero extra dependency |
