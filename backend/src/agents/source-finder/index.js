'use strict';

const { v4: uuidv4 }    = require('uuid');
const { saveFinding, saveSources, getSubTopicsByGoal } = require('../../db');
const { getSourcePool, extractKeywords } = require('../../data/mock-sources');

async function runSourceFinder(task) {
  const startTime = Date.now();
  const { dagId, goalId, goal, context } = task;
  const subTopics = context.scoperFinding.details.sub_topics;
  const pool = getSourcePool(goal.topic);
  const sourcesBySubtopic = [];
  let totalSourcesCount = 0;
  const now = new Date().toISOString();
  const allSourcesToSave = [];

  for (const subTopic of subTopics) {
    const stKeywords = extractKeywords(subTopic);
    const scoredSources = pool.map(source => {
      const overlap = source.keywords.filter(k => stKeywords.includes(k.toLowerCase())).length;
      const score = source.keywords.length > 0 ? overlap / source.keywords.length : 0;
      return { ...source, score };
    }).filter(s => s.score >= 0.2).sort((a, b) => b.score - a.score).slice(0, 5);

    let sourcesForThisST = scoredSources;

    if (sourcesForThisST.length < 2) {
      try {
        const query = encodeURIComponent(`${subTopic.name} ${goal.topic}`);
        const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=5`;
        const res = await fetch(url);
        const data = await res.json();
        const hnSources = (data.hits || []).map(hit => ({
          id: `source-${uuidv4()}`,
          goal_id: goalId,
          sub_topic_id: subTopic.id,
          title: hit.title,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          type: 'article',
          author: hit.author,
          platform: 'Hacker News',
          description: hit._highlightResult?.title?.value || '',
          created_at: now
        }));
        sourcesForThisST = [...sourcesForThisST, ...hnSources].slice(0, 5);
      } catch (e) {
        console.error('[source-finder] HN search failed:', e.message);
      }
    }

    const sourcesWithIds = sourcesForThisST.map(s => ({
      id: s.id || `source-${uuidv4()}`,
      goal_id: goalId,
      sub_topic_id: subTopic.id,
      title: s.title,
      url: s.url,
      type: s.type,
      author: s.author,
      platform: s.platform,
      description: s.description,
      created_at: now
    }));

    allSourcesToSave.push(...sourcesWithIds);
    sourcesBySubtopic.push({
      sub_topic_id: subTopic.id,
      sub_topic_name: subTopic.name,
      sources: sourcesWithIds,
      source_count: sourcesWithIds.length
    });
    totalSourcesCount += sourcesWithIds.length;
  }

  saveSources(allSourcesToSave);

  const summary = `Found ${totalSourcesCount} sources across ${subTopics.length} sub-topics for "${goal.topic}"`;

  const finding = {
    id:         `finding-${uuidv4()}`,
    dag_id:     dagId,
    goal_id:    goalId,
    node_id:    'source-finder',
    capability: 'source-finder',
    summary,
    details: {
      sources_by_subtopic: sourcesBySubtopic,
      total_sources: totalSourcesCount,
    },
    confidence: 0.9,
    verdict:    'significant',
    provenance: { agentId: 'source-finder-01', model: 'mock-pool+hn-fallback', durationMs: Date.now() - startTime },
    created_at: now,
  };

  saveFinding(finding);
  return finding;
}

module.exports = { runSourceFinder };
