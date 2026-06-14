'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Scoper agent — reference implementation.
//
// This is the fully-built agent. Read every line before implementing
// Source-Finder, Quality-Rater, or Sequencer.
//
// What it does:
//   Calls the LLM with the user's learning goal and gets back a structured
//   curriculum decomposition: 5-7 sub-topics, learning objectives per sub-topic,
//   prerequisite relationships, and time estimates.
//   Saves sub-topics to SQLite so downstream agents can query them.
// ─────────────────────────────────────────────────────────────────────────────

const { v4: uuidv4 }    = require('uuid');
const { reasonWithLLM } = require('../../shared/llm');
const { saveFinding, saveSubTopics } = require('../../db');

async function runScoper(task) {
  const startTime = Date.now();
  const { dagId, goalId, goal } = task;

  const systemPrompt = `You are an expert curriculum designer and learning architect.
A learner has submitted a learning goal. Decompose it into a well-structured curriculum.

Rules:
- 5-7 sub-topics appropriate for the stated level (not too granular, not too broad)
- prerequisites must reference names from YOUR OWN sub_topics list only
- estimated_hours should be realistic per sub-topic (1–6 hours)
- objectives must be specific and measurable ("build X", "explain Y", not "understand Z")
- The first sub-topic must have no prerequisites

Respond ONLY in valid JSON:
{
  "sub_topics": [
    {
      "name": "string",
      "objectives": ["string", "string"],
      "estimated_hours": number,
      "prerequisites": ["name of another sub-topic in this list or empty"]
    }
  ],
  "total_estimated_hours": number,
  "recommendation": "one sentence about the best approach for this learner"
}`;

  const userPrompt = JSON.stringify({
    topic:          goal.topic,
    level:          goal.level,
    hours_per_week: goal.hours_per_week,
    duration_weeks: goal.duration_weeks,
    formats:        goal.formats,
  });

  let parsed = {};
  try {
    const raw = await reasonWithLLM(systemPrompt, userPrompt, true);
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('[scoper] LLM parse failed:', e.message);
    // Hard dependency — if LLM fails, surface the error rather than silently degrade
    throw new Error(`[scoper] Failed to decompose topic "${goal.topic}": ${e.message}`);
  }

  // Stamp sub-topics with IDs and persist them so downstream agents can access them
  const now = new Date().toISOString();
  const subTopics = (parsed.sub_topics ?? []).map((st, i) => ({
    id:              `subtopic-${uuidv4()}`,
    goal_id:         goalId,
    name:            st.name,
    objectives:      st.objectives ?? [],
    prerequisites:   st.prerequisites ?? [],
    estimated_hours: st.estimated_hours ?? 2,
    order_index:     i,
    created_at:      now,
  }));

  saveSubTopics(subTopics);

  const summary = `Decomposed "${goal.topic}" into ${subTopics.length} sub-topics (${parsed.total_estimated_hours ?? '?'} hrs total)`;

  const finding = {
    id:         `finding-${uuidv4()}`,
    dag_id:     dagId,
    goal_id:    goalId,
    node_id:    'scoper',
    capability: 'scoper',
    summary,
    details: {
      sub_topics:             subTopics,
      total_estimated_hours:  parsed.total_estimated_hours ?? subTopics.reduce((s, st) => s + st.estimated_hours, 0),
      recommendation:         parsed.recommendation ?? '',
    },
    confidence: 0.88,
    verdict:    'significant',
    provenance: { agentId: 'scoper-01', model: 'llama-3.1-8b-instant', durationMs: Date.now() - startTime },
    created_at: now,
  };

  saveFinding(finding);
  return finding;
}

module.exports = { runScoper };
