import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export function CurriculumDAG({ subTopics = [], dag }) {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!subTopics.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 700;
    const height = 500;

    // Build nodes and links
    const nodes = subTopics.map(st => ({
      ...st,
      radius: Math.min(24 + st.estimated_hours * 4, 40)
    }));

    const links = [];
    for (const st of subTopics) {
      for (const prereq of st.prerequisites) {
        const source = nodes.find(n => n.name === prereq);
        const target = nodes.find(n => n.id === st.id);
        if (source && target) {
          links.push({ source, target });
        }
      }
    }

    // Add arrowhead marker
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#6b7280');

    // Create link elements
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Create node groups
    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .on('mouseover', (event, d) => {
        setTooltip({
          x: event.pageX + 10,
          y: event.pageY + 10,
          name: d.name,
          objectives: d.objectives,
          estimated_hours: d.estimated_hours,
          prerequisites: d.prerequisites
        });
      })
      .on('mouseout', () => setTooltip(null))
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles
    nodeGroup.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        // Color based on pipeline stage (simulated here since we don't have real status)
        const idx = subTopics.findIndex(st => st.id === d.id);
        const progress = dag ? (dag.nodes.findIndex(n => n.status === 'completed') + 1) / dag.nodes.length : 0;
        if (idx < subTopics.length * progress * 0.75) return '#16a34a'; // Green
        if (idx < subTopics.length * progress) return '#ca8a04'; // Amber
        return '#2563eb'; // Blue
      });

    // Add labels
    nodeGroup.append('text')
      .text(d => {
        if (d.name.length <= 12) return d.name;
        return d.name.slice(0, 12) + '...';
      })
      .attr('x', 0)
      .attr('y', d => d.radius + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', 10);

    // Simulation setup
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).distance(120).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(d => d.radius + 20));

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [subTopics, dag]);

  if (!subTopics.length) {
    return (
      <div className="curriculum-dag empty" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No curriculum yet</p>
        <p className="hint">Submit a learning goal to see the prerequisite graph build in real-time.</p>
      </div>
    );
  }

  return (
    <div className="curriculum-dag" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="500"
        style={{ background: '#1f2937', borderRadius: '8px' }}
      />
      {tooltip && (
        <div style={{
          position: 'absolute',
          top: tooltip.y,
          left: tooltip.x,
          background: 'white',
          color: 'black',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          zIndex: 1000,
          maxWidth: '250px'
        }}>
          <strong>{tooltip.name}</strong>
          <p style={{ margin: '8px 0', fontSize: '12px' }}>
            ⏱ {tooltip.estimated_hours}h
          </p>
          {tooltip.objectives?.length > 0 && (
            <div>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>Objectives:</p>
              <ul style={{ fontSize: '11px', margin: '4px 0', paddingLeft: '16px' }}>
                {tooltip.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
              </ul>
            </div>
          )}
          {tooltip.prerequisites?.length > 0 && (
            <p style={{ margin: '8px 0', fontSize: '11px' }}>
              Prerequisites: {tooltip.prerequisites.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
