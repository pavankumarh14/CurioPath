'use strict';

const { v4: uuidv4 }        = require('uuid');
const { buildGoalDAG }      = require('./dag-builder');
const { DAGRunner }         = require('./dag-runner');
const { runScoper }         = require('../agents/scoper');
const { runSourceFinder }   = require('../agents/source-finder');
const { runQualityRater }   = require('../agents/quality-rater');
const { runSequencer }      = require('../agents/sequencer');
const { saveDAG, getFindingsByDagId, updateGoalStatus } = require('../db');

let broadcast = () => {};
function setBroadcast(fn) { broadcast = fn; }

const AGENT_MAP = {
  'scoper':        runScoper,
  'source-finder': runSourceFinder,
  'quality-rater': runQualityRater,
  'sequencer':     runSequencer,
};

/**
 * Process a learning goal through the full 4-phase pipeline.
 * Each phase runs after the previous completes — the DAG is linear.
 *
 * @param {object} goal  Full goal record from SQLite
 * @returns {Promise<{ dag, findings }>}
 */
async function processGoal(goal) {
  const dag    = buildGoalDAG(goal.id);
  const runner = new DAGRunner(dag);
  saveDAG(runner.getDAG());
  broadcast({ type: 'dag_update', data: runner.getDAG() });

  // Context accumulates as each phase completes — passed to the next agent
  const context = {};

  // Run phases sequentially — getReadyNodes() returns exactly one node per phase
  while (!runner.isDone()) {
    const [node] = runner.getReadyNodes();
    if (!node) break;  // shouldn't happen in a valid linear DAG

    runner.markNodeRunning(node.id);
    saveDAG(runner.getDAG());
    broadcast({ type: 'dag_update', data: runner.getDAG() });

    const runFn = AGENT_MAP[node.id];
    try {
      const finding = await runFn({
        taskId: `task-${uuidv4()}`,
        dagId:  dag.id,
        goalId: goal.id,
        nodeId: node.id,
        goal,
        context: { ...context },
      });

      // Store this finding in context so the next agent can read it
      const contextKey = node.id.replace('-', '') + 'Finding';
      context[contextKey] = finding;

      runner.markNodeCompleted(node.id, finding);
      broadcast({ type: 'finding', data: finding });
    } catch (err) {
      console.error(`[orchestrator] ${node.id} failed:`, err.message);
      runner.markNodeFailed(node.id, err);
      broadcast({ type: 'agent_error', data: { node_id: node.id, error: err.message } });
    }

    saveDAG(runner.getDAG());
    broadcast({ type: 'dag_update', data: runner.getDAG() });
  }

  runner.getDAG().status = runner.isSuccess() ? 'completed' : 'failed';
  saveDAG(runner.getDAG());
  updateGoalStatus(goal.id, runner.getDAG().status);

  const findings = getFindingsByDagId(dag.id);
  broadcast({ type: 'goal_complete', data: { goal_id: goal.id, dag: runner.getDAG(), findings } });

  console.log(`[orchestrator] Goal "${goal.topic}" complete — ${runner.getDAG().status}`);
  return { dag: runner.getDAG(), findings };
}

module.exports = { processGoal, setBroadcast };
