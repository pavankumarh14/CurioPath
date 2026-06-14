'use strict';

const { v4: uuidv4 }  = require('uuid');
const { saveFinding, getSubTopicsByGoal, getRatedSourcesBySubTopic, saveLearningPath, getSourcesByGoal } = require('../../db');

const MAX_SOURCES_PER_MODULE = 3;
const GAP_SCORE_THRESHOLD    = 5.0;

async function runSequencer(task) {
  const startTime = Date.now();
  const { dagId, goalId, goal } = task;
  const subTopics = getSubTopicsByGoal(goalId);
  const allSourcesForGoal = getSourcesByGoal(goalId);
  const now = new Date().toISOString();

  // Step 1: Kahn's algorithm for topological sort
  const nameToNode = new Map();
  const inDegree = new Map();
  const adjList = new Map();

  for (const st of subTopics) {
    nameToNode.set(st.name, st);
    inDegree.set(st.name, 0);
    adjList.set(st.name, []);
  }

  for (const st of subTopics) {
    for (const prereqName of st.prerequisites) {
      if (nameToNode.has(prereqName)) {
        adjList.get(prereqName).push(st.name);
        inDegree.set(st.name, inDegree.get(st.name) + 1);
      }
    }
  }

  const queue = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const sortedNames = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sortedNames.push(current);
    for (const neighbor of adjList.get(current)) {
      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  const sortedSubTopics = sortedNames.map(name => nameToNode.get(name));

  const gaps = [];
  const modules = [];
  let totalHours = 0;

  for (let i = 0; i < sortedSubTopics.length; i++) {
    const st = sortedSubTopics[i];
    totalHours += st.estimated_hours;

    const ratedSources = getRatedSourcesBySubTopic(goalId, st.id);
    const topSources = ratedSources.slice(0, MAX_SOURCES_PER_MODULE);
    const bestScore = topSources[0]?.overall_score || 0;

    const isGap = topSources.length === 0 || bestScore < GAP_SCORE_THRESHOLD;

    if (isGap) {
      const gapType = topSources.length === 0 ? 'Coverage' : 'Quality';
      gaps.push(`${gapType} gap: "${st.name}" — no quality sources found.`);
    }

    const moduleSources = [];
    for (const rs of topSources) {
      const sourceInfo = allSourcesForGoal.find(s => s.id === rs.source_id);
      moduleSources.push({
        title: sourceInfo?.title || '',
        url: sourceInfo?.url || '',
        type: sourceInfo?.type || 'article',
        overall_score: rs.overall_score,
        rationale: rs.rationale || ''
      });
    }

    modules.push({
      order: i + 1,
      sub_topic_id: st.id,
      sub_topic_name: st.name,
      objectives: st.objectives,
      estimated_hours: st.estimated_hours,
      sources: moduleSources,
      is_gap: isGap
    });
  }

  const availableHours = goal.hours_per_week * goal.duration_weeks;
  const fitsTimeline = totalHours <= availableHours * 1.15;

  const learningPathId = `path-${uuidv4()}`;
  saveLearningPath({
    id: learningPathId,
    goal_id: goalId,
    modules,
    gaps,
    total_estimated_hours: totalHours,
    fits_timeline: fitsTimeline,
    created_at: now
  });

  const summary = `Sequenced ${modules.length} modules (${totalHours} hrs). ${fitsTimeline ? 'Fits timeline' : 'Exceeds timeline'}. ${gaps.length} gaps detected.`;

  const finding = {
    id: `finding-${uuidv4()}`,
    dag_id: dagId,
    goal_id: goalId,
    node_id: 'sequencer',
    capability: 'sequencer',
    summary,
    details: {
      learning_path_id: learningPathId,
      total_modules: modules.length,
      gaps,
      total_estimated_hours: totalHours,
      fits_timeline: fitsTimeline
    },
    confidence: 0.95,
    verdict: 'significant',
    provenance: { agentId: 'sequencer-01', model: 'algorithm', durationMs: Date.now() - startTime },
    created_at: now
  };

  saveFinding(finding);
  return finding;
}

module.exports = { runSequencer, MAX_SOURCES_PER_MODULE, GAP_SCORE_THRESHOLD };
