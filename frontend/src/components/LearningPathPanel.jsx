import React, { useState } from 'react';

const TYPE_ICON = { video: '🎬', article: '📄', course: '🎓', documentation: '📖', book: '📚' };

export function LearningPathPanel({ path, goal }) {
  const [showGaps, setShowGaps] = useState(false);

  if (!path) {
    return (
      <div className="path-panel empty" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No learning path yet</p>
        <p className="hint">
          {goal
            ? `Processing "${goal.topic}"…`
            : 'Submit a learning goal to generate a path.'}
        </p>
      </div>
    );
  }

  const availableHours = goal ? goal.hours_per_week * goal.duration_weeks : 0;
  const usagePercent = availableHours ? Math.min((path.total_estimated_hours / availableHours) * 100, 150) : 100;

  return (
    <div className="path-panel" style={{ padding: '20px' }}>
      {/* Path Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #374151'
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>📚 {path.modules.length} modules</span>
          <span style={{ fontSize: '16px' }}>⏱ {path.total_estimated_hours}h total</span>
          <span style={{
            background: path.fits_timeline ? '#16a34a' : '#dc2626',
            color: 'white',
            padding: '4px 8px', borderRadius: '4px', fontSize: '14px'
          }}>
            {path.fits_timeline ? '✅ Fits timeline' : '⚠️ Exceeds timeline'}
          </span>
          {path.gaps.length > 0 && <span style={{ color: '#f59e0b', fontSize: '16px' }}>⚠️ {path.gaps.length} gaps</span>}
        </div>
      </div>

      {/* Timeline Widget */}
      <div style={{ marginBottom: '20px', padding: '12px', background: '#1f2937', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
          <span>0h</span>
          <span>{availableHours}h available</span>
        </div>
        <div style={{
          height: '24px',
          background: '#374151',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(usagePercent, 100)}%`,
            background: usagePercent > 100 ? '#dc2626' : '#16a34a',
            borderRadius: '12px',
            transition: 'width 0.5s ease'
          }} />
          {usagePercent > 100 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: '100%',
              height: '100%',
              width: `${usagePercent - 100}%`,
              background: '#dc2626',
              opacity: 0.7
            }} />
          )}
        </div>
      </div>

      {/* Module Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {path.modules.map(mod => (
          <div key={mod.sub_topic_id} style={{
            background: '#1f2937', padding: '16px', borderRadius: '8px', border: mod.is_gap ? '1px solid #dc2626' : '1px solid #374151'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  background: '#374151', padding: '4px 10px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold'
                }}>
                  #{mod.order}
                </span>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{mod.sub_topic_name}</h3>
                <span style={{ background: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                  {mod.estimated_hours}h
                </span>
                {mod.is_gap && (
                  <span style={{
                    background: '#dc2626', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px'
                  }}>
                    ⚠️ Gap
                  </span>
                )}
              </div>
            </div>

            {mod.is_gap ? (
              <p style={{ color: '#fca5a5', margin: 0 }}>
                No quality sources found — this topic needs manual research
              </p>
            ) : (
              <>
                {mod.objectives?.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9ca3af' }}>Objectives:</p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#e5e7eb' }}>
                      {mod.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                    </ul>
                  </div>
                )}

                {mod.sources?.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9ca3af' }}>Sources:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {mod.sources.map((s, i) => (
                        <div key={i} style={{ background: '#111827', padding: '10px', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '18px' }}>{TYPE_ICON[s.type] || '📋'}</span>
                            <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                              {s.title}
                            </a>
                            <span style={{
                              marginLeft: 'auto',
                              background: s.overall_score >= 7 ? '#16a34a' : s.overall_score >= 5 ? '#ca8a04' : '#dc2626',
                              padding: '2px 8px', borderRadius: '12px', fontSize: '12px'
                            }}>
                              {s.overall_score?.toFixed(1)}
                            </span>
                          </div>
                          <div style={{
                            height: '6px', background: '#374151', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${s.overall_score * 10}%`,
                              background: s.overall_score >=7 ? '#16a34a' : s.overall_score >=5 ? '#ca8a04' : '#dc2626'
                            }} />
                          </div>
                          {s.rationale && <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{s.rationale}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Gaps Summary */}
      {path.gaps.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => setShowGaps(!showGaps)}
            style={{
              background: '#374151', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
            }}
          >
            {showGaps ? '▼ Hide Gaps' : '▶ Show Gaps'} ({path.gaps.length})
          </button>
          {showGaps && (
            <div style={{ marginTop: '12px', padding: '12px', background: '#1f2937', borderRadius: '8px' }}>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                {path.gaps.map((gap, i) => <li key={i} style={{ color: '#fca5a5' }}>{gap}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
