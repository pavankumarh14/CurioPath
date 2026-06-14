import React from 'react';

const STATUS_COLOR = {
  processing: '#2563eb',
  completed:  '#16a34a',
  failed:     '#dc2626',
};

const LEVEL_BADGE = {
  beginner:     { label: 'Beginner',     color: '#16a34a' },
  intermediate: { label: 'Intermediate', color: '#ca8a04' },
  advanced:     { label: 'Advanced',     color: '#dc2626' },
};

export function PathList({ goals, activeGoal, onSelectGoal }) {
  if (!goals.length) {
    return (
      <div className="path-list empty">
        <p>No learning goals yet</p>
        <p className="hint">Submit a goal above to generate your first path.</p>
      </div>
    );
  }

  return (
    <div className="path-list">
      {goals.map(g => {
        const badge = LEVEL_BADGE[g.level] ?? LEVEL_BADGE.intermediate;
        return (
          <div
            key={g.id}
            className={`goal-card ${activeGoal?.id === g.id ? 'active' : ''}`}
            onClick={() => onSelectGoal?.(g)}
          >
            <div className="goal-header">
              <span className="goal-topic">{g.topic}</span>
              <span className="goal-status" style={{ color: STATUS_COLOR[g.status] ?? '#6b7280' }}>
                ● {g.status}
              </span>
            </div>
            <div className="goal-meta">
              <span className="level-badge" style={{ color: badge.color }}>{badge.label}</span>
              <span className="goal-detail">{g.hours_per_week}h/wk · {g.duration_weeks}wk</span>
            </div>
            <div className="goal-time">{formatTime(g.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
