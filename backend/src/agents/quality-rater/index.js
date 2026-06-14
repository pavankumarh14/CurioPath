'use strict';

const { v4: uuidv4 }    = require('uuid');
const { reasonWithLLM } = require('../../shared/llm');
const { saveFinding, saveRatedSource } = require('../../db');

const CREDIBILITY_WEIGHT = 0.40;
const CLARITY_WEIGHT     = 0.35;
const LEVEL_FIT_WEIGHT   = 0.25;
const QUALITY_THRESHOLD  = 5.0;

async function runQualityRater(task) {
  const startTime = Date.now();
  const { dagId, goalId, goal, context } = task;
  const sourcesBySubtopic = context.sourcefinderFinding.details.sources_by_subtopic;
  const allSources = [];
  for (const sbst of sourcesBySubtopic) {
    for (const s of sbst.sources) {
      allSources.push({ ...s, sub_topic_name: sbst.sub_topic_name });
    }
  }
  const now = new Date().toISOString();
  const ratedSources = [];
  const topSourcesList = [];
  let ratedCount = 0;
  let keptCount = 0;
  let discardedCount = 0;

  const batchSize = 4;
  for (let i = 0; i < allSources.length; i += batchSize) {
    const batch = allSources.slice(i, i + batchSize);

    const systemPrompt = `You are an expert learning quality rater for a ${goal.level} level learner.
Your job is to evaluate each source on a scale of 0-10 on three dimensions:
- credibility: how authoritative is the author/platform (0-10)
- clarity: how well-explained, well-paced, and easy to understand is this source (0-10)
- level_fit: how well does this source match a ${goal.level} level learner (0-10)

Respond ONLY in valid JSON with this exact schema:
{
  "ratings": [
    {
      "source_id": "string",
      "credibility": number,
      "clarity": number,
      "level_fit": number,
      "rationale": "short explanation (max 100 chars)"
    }
  ]
}

Return exactly one rating per source. Use numbers only for scores.`;

    const userPrompt = JSON.stringify({
      sources: batch.map(s => ({
        id: s.id,
        title: s.title,
        author: s.author,
        platform: s.platform,
        type: s.type,
        description: s.description || '',
        sub_topic_name: s.sub_topic_name
      })),
      learner_level: goal.level
    });

    try {
      const rawResponse = await reasonWithLLM(systemPrompt, userPrompt, true);
      const parsed = JSON.parse(rawResponse);
      if (parsed.ratings && Array.isArray(parsed.ratings)) {
        for (const r of parsed.ratings) {
          const overallScore = (r.credibility * CREDIBILITY_WEIGHT) + (r.clarity * CLARITY_WEIGHT) + (r.level_fit * LEVEL_FIT_WEIGHT);
          const keep = overallScore >= QUALITY_THRESHOLD;
          const sourceMeta = allSources.find(s => s.id === r.source_id);

          const ratedSource = {
            id: `rated-${uuidv4()}`,
            source_id: r.source_id,
            goal_id: goalId,
            credibility: r.credibility,
            clarity: r.clarity,
            level_fit: r.level_fit,
            overall_score: overallScore,
            rationale: r.rationale,
            keep,
            created_at: now
          };

          saveRatedSource(ratedSource);
          ratedSources.push(ratedSource);
          ratedCount++;
          if (keep) {
            keptCount++;
            topSourcesList.push({ title: sourceMeta?.title, overall_score: overallScore, sub_topic_name: sourceMeta?.sub_topic_name });
          } else {
            discardedCount++;
          }
        }
      }
    } catch (e) {
      console.error('[quality-rater] LLM call failed for batch:', e.message);
    }
  }

  topSourcesList.sort((a, b) => b.overall_score - a.overall_score);
  const topSources = topSourcesList.slice(0, 5);

  const summary = `Rated ${ratedCount} sources — ${keptCount} kept, ${discardedCount} discarded for "${goal.topic}"`;

  const finding = {
    id: `finding-${uuidv4()}`,
    dag_id: dagId,
    goal_id: goalId,
    node_id: 'quality-rater',
    capability: 'quality-rater',
    summary,
    details: { rated: ratedCount, kept: keptCount, discarded: discardedCount, top_sources: topSources },
    confidence: 0.85,
    verdict: 'significant',
    provenance: { agentId: 'quality-rater-01', model: 'llama-3.1-8b-instant', durationMs: Date.now() - startTime },
    created_at: now
  };

  saveFinding(finding);
  return finding;
}

module.exports = { runQualityRater, CREDIBILITY_WEIGHT, CLARITY_WEIGHT, LEVEL_FIT_WEIGHT, QUALITY_THRESHOLD };
