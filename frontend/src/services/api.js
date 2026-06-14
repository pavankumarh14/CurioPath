const BASE = '/api';

async function request(method, path, body) {
  const res  = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body:    body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data;
}

export const getGoals         = ()     => request('GET',  '/goals');
export const getGoal          = id     => request('GET',  `/goals/${id}`);
export const createGoal       = body   => request('POST', '/goals', body);

export const getSubTopics     = id     => request('GET',  `/goals/${id}/sub-topics`);
export const getSources       = id     => request('GET',  `/goals/${id}/sources`);
export const getRatings       = id     => request('GET',  `/goals/${id}/ratings`);
export const getLearningPath  = id     => request('GET',  `/goals/${id}/path`);
export const getGoalDAG       = id     => request('GET',  `/goals/${id}/dag`);
export const getDAGFindings   = dagId  => request('GET',  `/dags/${dagId}/findings`);
