'use strict';

class DAGRunner {
  constructor(dag) { this._dag = JSON.parse(JSON.stringify(dag)); }

  getReadyNodes() {
    return this._dag.nodes.filter(n => {
      if (n.status !== 'pending') return false;
      return n.dependencies.every(depId => {
        const dep = this._dag.nodes.find(d => d.id === depId);
        return dep?.status === 'completed';
      });
    });
  }

  markNodeRunning(id)          { const n = this._node(id); n.status = 'running';    n.started_at   = new Date().toISOString(); this._touch(); }
  markNodeCompleted(id, finding){ const n = this._node(id); n.status = 'completed'; n.completed_at = new Date().toISOString(); n.finding_id = finding?.id ?? null; n.confidence = finding?.confidence ?? null; this._touch(); }
  markNodeFailed(id, err)      { const n = this._node(id); n.status = 'failed';     n.error        = err?.message ?? String(err); n.failed_at = new Date().toISOString(); this._touch(); }

  isDone()    { return this._dag.nodes.every(n => n.status === 'completed' || n.status === 'failed'); }
  isSuccess() { return this._dag.nodes.every(n => n.status === 'completed'); }
  getDAG()    { return this._dag; }

  _node(id)   { const n = this._dag.nodes.find(n => n.id === id); if (!n) throw new Error(`Node not found: ${id}`); return n; }
  _touch()    { this._dag.updated_at = new Date().toISOString(); }
}

module.exports = { DAGRunner };
