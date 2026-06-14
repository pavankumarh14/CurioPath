import React, { useState } from 'react';

export function GapReport({ path, subTopics = [], goal }) {
  const [markedFound, setMarkedFound] = useState(new Set());

  if (!path) {
    return (
      <div className="gap-report empty" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No gap analysis yet</p>
        <p className="hint">Gap analysis runs after the Sequencer agent completes.</p>
      </div>
    );
  }

  const gaps = path.gaps ?? [];
  const totalSubTopics = subTopics.length;
  const coveredCount = totalSubTopics - gaps.length;
  const coveragePercent = totalSubTopics ? (coveredCount / totalSubTopics) * 100 : 0;

  if (!gaps.length) {
    return (
      <div className="gap-report no-gaps" style={{ padding: '20px', textAlign: 'center', background: '#16a34a20', borderRadius: '8px' }}>
        <p className="no-gaps-msg" style={{ margin: 0, fontSize: '18px', color: '#16a34a' }}>
          ✅ Full coverage — all sub-topics have quality sources.
        </p>
        <p className="hint" style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
          The swarm found rated materials for every module in your path.
        </p>
      </div>
    );
  }

  const toggleMarkFound = (index) => {
    const newSet = new Set(markedFound);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setMarkedFound(newSet);
  };

  return (
    <div className="gap-report" style={{ padding: '20px' }}>
      {/* Header Stats */}
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
          <span>📊 {coveredCount}/{totalSubTopics} sub-topics covered</span>
          <span style={{ fontWeight: 'bold' }}>{coveragePercent.toFixed(0)}% coverage</span>
        </div>
        <div style={{
          height: '12px',
          background: '#374151',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${coveragePercent}%`,
            background: coveragePercent === 100 ? '#16a34a' : '#ca8a04',
            borderRadius: '6px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Gap Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {gaps.map((gap, index) => {
          // Extract sub-topic name from gap string
          const match = gap.match(/"([^"]+)"/);
          const subTopicName = match ? match[1] : 'this topic';
          const gapType = gap.startsWith('Coverage') ? 'Coverage gap' : 'Quality gap';
          const isMarkedFound = markedFound.has(index);

          return (
            <div key={index} style={{
              background: '#1f2937',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #dc2626',
              opacity: isMarkedFound ? 0.5 : 1,
              textDecoration: isMarkedFound ? 'line-through' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    background: '#dc2626',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {gapType}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{subTopicName}</h3>
                </div>
                <button
                  onClick={() => toggleMarkFound(index)}
                  style={{
                    background: isMarkedFound ? '#16a34a' : '#374151',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {isMarkedFound ? '✅ Found' : 'Mark as found'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>Suggested actions:</p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#e5e7eb' }}>
                  <li>Search YouTube for: {`${subTopicName} ${goal?.topic || ''}`}</li>
                  <li>Search Coursera/Udemy for: {subTopicName}</li>
                  <li>Check official documentation for: {subTopicName}</li>
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
