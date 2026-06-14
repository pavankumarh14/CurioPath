'use strict';

const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────────────────────────────────────
// CurioPath DAG — 4 nodes, linear pipeline.
//
// Unlike MarketMind (parallel scouts) or CivicSwarm (parallel intake+clustering),
// CurioPath is intentionally sequential: each agent needs the previous
// agent's output as its primary input.
//
//   Phase 1: scoper        — decomposes topic into sub-topics + prerequisites
//   Phase 2: source-finder — finds candidate materials per sub-topic
//   Phase 3: quality-rater — scores each source: credibility, clarity, level-fit
//   Phase 4: sequencer     — topological sort → ordered path + gap detection
// ─────────────────────────────────────────────────────────────────────────────

function buildGoalDAG(goal_id) {
  const now = new Date().toISOString();
  return {
    id:         `dag-${uuidv4()}`,
    goal_id,
    nodes: [
      { id: 'scoper',        capability: 'scoper',        phase: 1, status: 'pending', dependencies: [],                started_at: null, completed_at: null, failed_at: null, finding_id: null, confidence: null, error: null },
      { id: 'source-finder', capability: 'source-finder', phase: 2, status: 'pending', dependencies: ['scoper'],        started_at: null, completed_at: null, failed_at: null, finding_id: null, confidence: null, error: null },
      { id: 'quality-rater', capability: 'quality-rater', phase: 3, status: 'pending', dependencies: ['source-finder'], started_at: null, completed_at: null, failed_at: null, finding_id: null, confidence: null, error: null },
      { id: 'sequencer',     capability: 'sequencer',     phase: 4, status: 'pending', dependencies: ['quality-rater'], started_at: null, completed_at: null, failed_at: null, finding_id: null, confidence: null, error: null },
    ],
    status:     'running',
    created_at: now,
    updated_at: now,
  };
}

module.exports = { buildGoalDAG };
