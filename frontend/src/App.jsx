import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { getGoals, getSubTopics, getLearningPath, getGoalDAG } from './services/api';
import { GoalBuilder }        from './components/GoalBuilder';
import { PathList }           from './components/PathList';
import { CurriculumDAG }      from './components/CurriculumDAG';
import { LearningPathPanel }  from './components/LearningPathPanel';
import { GapReport }          from './components/GapReport';

export default function App() {
  const [goals, setGoals]           = useState([]);
  const [activeGoal, setActiveGoal] = useState(null);
  const [subTopics, setSubTopics]   = useState([]);
  const [path, setPath]             = useState(null);
  const [activeDAG, setActiveDAG]   = useState(null);
  const [view, setView]             = useState('dag');
  const [eventCount, setEventCount] = useState(0);
  const [showBuilder, setShowBuilder] = useState(true);

  const { lastMessage, isConnected } = useWebSocket();

  useEffect(() => {
    getGoals().then(gs => {
      setGoals(gs);
      if (gs.length > 0 && !activeGoal) setActiveGoal(gs[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeGoal) return;
    Promise.all([
      getSubTopics(activeGoal.id),
      getLearningPath(activeGoal.id),
      getGoalDAG(activeGoal.id),
    ]).then(([sts, p, dag]) => {
      setSubTopics(sts);
      setPath(p);
      setActiveDAG(dag);
    }).catch(console.error);
  }, [activeGoal?.id]);

  useEffect(() => {
    if (!lastMessage || !activeGoal) return;
    setEventCount(c => c + 1);
    const { type, data } = lastMessage;

    if (type === 'dag_update' && data.goal_id === activeGoal.id) {
      setActiveDAG(data);
    }

    if (type === 'finding' && data.goal_id === activeGoal.id) {
      // Refresh sub-topics when scoper completes
      if (data.capability === 'scoper') {
        getSubTopics(activeGoal.id).then(setSubTopics).catch(console.error);
      }
    }

    if (type === 'goal_complete' && data.goal_id === activeGoal.id) {
      setGoals(prev => prev.map(g => g.id === data.goal_id ? { ...g, status: data.dag.status === 'completed' ? 'completed' : 'failed' } : g));
      Promise.all([
        getSubTopics(activeGoal.id),
        getLearningPath(activeGoal.id),
      ]).then(([sts, p]) => { setSubTopics(sts); setPath(p); }).catch(console.error);
    }
  }, [lastMessage]);

  function handleGoalCreated(goal) {
    setGoals(prev => [goal, ...prev]);
    setActiveGoal(goal);
    setSubTopics([]);
    setPath(null);
    setActiveDAG(null);
    setShowBuilder(false);
    setView('dag');
  }

  function handleSelectGoal(goal) {
    setActiveGoal(goal);
    setShowBuilder(false);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo">📚 CurioPath</span>
          <span className={`ws-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span className="event-count">{eventCount} events</span>
        </div>
        <div className="header-right">
          <button className="btn-ghost" onClick={() => setShowBuilder(v => !v)}>
            {showBuilder ? '✕ Close' : '+ New Goal'}
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          {showBuilder && <GoalBuilder onGoalCreated={handleGoalCreated} />}
          <div className="sidebar-section-header">Learning Goals</div>
          <PathList goals={goals} activeGoal={activeGoal} onSelectGoal={handleSelectGoal} />
        </aside>

        <main className="main-panel">
          {activeGoal ? (
            <>
              <div className="goal-title">
                <h2>{activeGoal.topic}</h2>
                <span className="goal-level">{activeGoal.level}</span>
                {activeDAG && (
                  <div className="pipeline-status">
                    {activeDAG.nodes.map(n => (
                      <span key={n.id} className={`node-pill status-${n.status}`} title={n.id}>
                        {n.id.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="view-tabs">
                {[
                  { id: 'dag',  label: '🕸 Curriculum Graph' },
                  { id: 'path', label: '📚 Learning Path'    },
                  { id: 'gaps', label: '🔍 Gap Report'       },
                ].map(tab => (
                  <button key={tab.id} className={`tab ${view === tab.id ? 'active' : ''}`} onClick={() => setView(tab.id)}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {view === 'dag'  && <CurriculumDAG subTopics={subTopics} dag={activeDAG} />}
              {view === 'path' && <LearningPathPanel path={path} goal={activeGoal} />}
              {view === 'gaps' && <GapReport path={path} subTopics={subTopics} goal={activeGoal} />}
            </>
          ) : (
            <div className="welcome">
              <h2>Build your learning path</h2>
              <p>Submit a learning goal to generate a personalised, sequenced curriculum with curated sources.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
