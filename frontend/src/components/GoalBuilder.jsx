import React, { useState } from 'react';
import { createGoal } from '../services/api';

const LEVELS   = ['beginner', 'intermediate', 'advanced'];
const FORMATS  = [
  { id: 'video',         label: '🎬 Video' },
  { id: 'article',       label: '📄 Article' },
  { id: 'course',        label: '🎓 Course' },
  { id: 'documentation', label: '📖 Docs' },
  { id: 'book',          label: '📚 Book' },
];
const EXAMPLES = ['Learn React', 'Machine Learning fundamentals', 'System Design'];

export function GoalBuilder({ onGoalCreated }) {
  const [topic, setTopic]       = useState('');
  const [level, setLevel]       = useState('intermediate');
  const [hours, setHours]       = useState(10);
  const [weeks, setWeeks]       = useState(4);
  const [formats, setFormats]   = useState(['video', 'article', 'course']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function toggleFormat(id) {
    setFormats(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!topic.trim()) return setError('Topic is required');
    if (!formats.length) return setError('Select at least one format');
    setLoading(true);
    try {
      const goal = await createGoal({ topic: topic.trim(), level, hours_per_week: hours, duration_weeks: weeks, formats });
      onGoalCreated?.(goal);
      setTopic('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="goal-builder" onSubmit={handleSubmit}>
      <h2>New Learning Goal</h2>

      <label className="field">
        <span>What do you want to learn?</span>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Learn React" autoFocus />
        <div className="examples">
          {EXAMPLES.map(ex => (
            <button key={ex} type="button" className="example-chip" onClick={() => setTopic(ex)}>{ex}</button>
          ))}
        </div>
      </label>

      <label className="field">
        <span>Your current level</span>
        <div className="level-row">
          {LEVELS.map(l => (
            <button key={l} type="button" className={`level-btn ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>
              {l}
            </button>
          ))}
        </div>
      </label>

      <div className="field two-col">
        <label>
          <span>Hours per week</span>
          <input type="number" min="1" max="40" value={hours} onChange={e => setHours(Number(e.target.value))} />
        </label>
        <label>
          <span>Duration (weeks)</span>
          <input type="number" min="1" max="52" value={weeks} onChange={e => setWeeks(Number(e.target.value))} />
        </label>
      </div>

      <div className="field">
        <span>Preferred formats</span>
        <div className="format-row">
          {FORMATS.map(f => (
            <button key={f.id} type="button" className={`format-btn ${formats.includes(f.id) ? 'active' : ''}`} onClick={() => toggleFormat(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? '⏳ Building path…' : '🚀 Generate Learning Path'}
      </button>
    </form>
  );
}
