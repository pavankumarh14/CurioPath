## **CurioPath** 

## _→ Hours of scattered curation a sequenced, quality-checked path in minutes_ 

Theme: Theme 05 — Agent Swarms  ·  Function: AI-Powered Learning & Education 

Suggested stack: Node.js 22 · Groq (Llama 3.1) · SQLite · React 18 + D3.js force graph · WebSocket 

## **Problem Statement** 

## **Problem Background** 

The hardest part of learning a new topic comes before any learning starts: figuring out what to learn, in what order, from which sources, at what depth. The internet's unlimited material is itself the problem — dozens of overlapping courses, videos, and articles of varying quality, none sequenced for a specific level and timeframe. Building a good path is multi-dimensional work: scope the topic into sub-topics, find quality sources for each, judge credibility and level-fit, sequence by prerequisite. A learner does this one browser tab at a time and usually ends with a disorganised bookmark folder instead of a plan. 

## **Why It Matters** 

Most self-directed learning fails at the starting line, not the finish — the curation burden is where motivation leaks away. Judging whether a source is worth your time before you have the knowledge to judge it is a bootstrapping problem. Compressing hours of scattered curation into a sequenced, quality-checked path means people actually start, and start with a plan. The bottleneck is the parallel scoping, evaluation, and sequencing — exactly what a swarm of specialists provides. 

## **Solution Summary** 

## **Why This Problem Was Chosen** 

Curation is naturally parallel and quality-driven: sub-topics scoped and sourced simultaneously, sources evaluated for quality and level-fit, the whole set sequenced by prerequisite — a swarm of specialists beats a single pass from a generalist. No single LLM prompt can do all four jobs well simultaneously. 

## **Proposed Solution** 

A user submits a learning goal: topic, level, hours per week, duration, and preferred formats. A Scoper agent decomposes the topic into 5-7 sub-topics with objectives, prerequisite relationships, and time estimates. A Source-Finder agent finds candidate materials per 

sub-topic from a curated pool (with live HN search for unknown topics). A Quality-Rater agent scores each source on credibility, clarity, and level-fit, discarding low-quality material before it reaches the learner. A Sequencer agent runs a topological sort on the prerequisite graph and assembles an ordered learning path with gap detection and timeline-fit analysis. 

## **Expected Impact** 

- Compress hours of scattered curation into a sequenced, quality-checked path in minutes 

- Quality-rated sources — every source scored on credibility, clarity, and level-fit 

- Prerequisite-respecting order — each step builds on the last, no silent assumptions 

- Honest gap reporting — the system admits where it could not find good material 

- Full provenance — why each source was selected and how it scored 

## **Technical Approach & Implementation** 

## **Solution Workflow** 

- User submits a learning goal via the React form — topic, level, hours/week, duration, formats 

- Phase 1: Scoper calls LLM to decompose topic into 5-7 sub-topics with objectives and prerequisite relationships 

- Phase 2: Source-Finder matches curated source pool to each sub-topic by keyword relevance; HN search fallback for unknown topics 

- Phase 3: Quality-Rater calls LLM to score each source — credibility, clarity, level-fit. Sources below threshold are discarded 

- Phase 4: Sequencer runs Kahn's topological sort on the prerequisite graph, assigns top-rated sources to each module, detects gaps, and checks timeline fit 

- Learning path saved to SQLite and streamed to React dashboard via WebSocket 

- D3 force-directed graph builds live as the Scoper completes, showing prerequisite relationships 

## **Key Features** 

- Prerequisite-respecting sequencing — topological sort ensures no sub-topic appears before its dependencies 

- Quality-gated sources — credibility × clarity × level-fit scoring removes low-quality material before it reaches the learner 

- Honest gap reporting — sub-topics with no quality sources are flagged with suggested search actions 

- Live D3 curriculum graph — prerequisite relationships visualised as a force-directed graph, updating in real time 

- Timeline-fit analysis — total estimated hours vs available time surfaced as a compatibility check 

## **Technology Stack** 

Frontend: React 18 + plain JS, D3.js force-directed graph (prerequisite DAG), WebSocket Backend: Node.js 22 + Express, Groq (Llama 3.1) for Scoper and Quality-Rater, WebSocket (ws) 

AI/ML: Llama 3.1-8b-instant via Groq. Sequencer is pure algorithm (no LLM). Mock fallback for offline dev 

Data: SQLite with WAL mode (goals, sub_topics, sources, rated_sources, learning_paths, dags, findings) 

## **Models & Algorithms** 

Sequencer: Kahn's algorithm (BFS topological sort) over the prerequisite graph. O(V+E), cycle-safe (breaks cycles gracefully without throwing). Quality scoring: overall = credibility×0.40 + clarity×0.35 + level_fit×0.25. Threshold: 5.0. Source relevance 

(Source-Finder): keyword overlap between source.keywords[] and 

extractKeywords(subTopic) — score = overlap / source_keyword_count. Threshold: 0.2. Gap detection: sub-topics with 0 kept sources (coverage gap) or max overall_score < GAP_SCORE_THRESHOLD (quality gap). 

## **Innovation** 

- Parallel curation — four specialist agents replace one-tab-at-a-time manual research 

- Prerequisite-aware sequencing — a flat resource list becomes a followable, structured path 

- Quality-rated sources — not the first ten results, but the best-fit ones for the learner's level 

- Honest gap reporting — the system tells the learner where it fell short rather than surfacing low-quality material 

## **Future Scope** 

## **Near-term** 

- Topic templates for common learning goals (frontend development, ML, system design) 

- Import a job description or syllabus and build a matching path 

- Time estimator and calendar scheduling integration 

## **Medium-term** 

- Deeper sub-topic agents spawned when the Sequencer flags gaps 

- Cross-learner path reuse — popular paths shared and rated 

- Progress tracking that re-curates the path as the learner advances 

## **Long-term** 

- Practice-question and assessment agents adding full tutor mode 

- Federated paths blending course catalogues with open material 

- Refresh missions that update a saved path when better sources appear 

## **Scalability & Larger Vision** 

## **How It Scales** 

The pipeline is sequential and stateless per goal: each agent writes its output to SQLite so the next agent reads a clean query result rather than passing large objects in memory. This means agents are independently restartable and inspectable. The source pool is the only bounded component — extending it is a matter of adding entries to mock-sources.js, and the HN fallback already handles topics outside the pool. The Sequencer is a pure algorithm with no external dependencies. 

## **How It Expands** 

Near term: topic templates and job-description import. Medium term: sub-topic deepening agents and cross-learner path reuse. Long term: assessment agents for full tutor mode and refresh missions that update saved paths when better sources appear. 

## **The Larger Vision** 

Learning anything new stops starting with hours of bookmark-folder curation and starts with a structured, quality-checked, sequenced path generated in minutes. The system is honest about what it does not know — gaps are flagged, not papered over with low-quality links. Over time, as the path is followed and progress is tracked, the system re-curates based on what worked and what did not. 

## **Potential Impact** 

For an individual, CurioPath collapses the cold-start problem — the curation burden that kills motivation before learning begins. At organisation scale, onboarding paths and skill-gap training are generated on demand rather than maintained manually. The compounding effect is significant: every employee who starts with a quality-checked path learns faster and asks fewer repeated questions. 
