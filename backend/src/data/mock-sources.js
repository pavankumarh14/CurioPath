'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock source pool — 3 topics, each with 20-25 realistic sources across
// multiple types (video, article, course, documentation, book).
//
// The Source-Finder agent (candidate task) queries this pool, then maps
// sources to sub-topics based on keyword relevance.
//
// For topics not in this pool, the Source-Finder should fall back to a live
// HN Algolia search: https://hn.algolia.com/api/v1/search?query=<topic>
// ─────────────────────────────────────────────────────────────────────────────

const SOURCES = {
  'machine learning': [
    { title: 'Machine Learning Specialisation — Andrew Ng',    url: 'https://coursera.org/specializations/machine-learning-introduction', type: 'course',        author: 'Andrew Ng',       platform: 'Coursera',      keywords: ['fundamentals', 'supervised', 'unsupervised', 'neural networks', 'regression', 'classification'], description: 'The definitive ML course. Covers regression, classification, neural networks and best practices.' },
    { title: 'fast.ai Practical Deep Learning',               url: 'https://course.fast.ai',                                               type: 'course',        author: 'Jeremy Howard',   platform: 'fast.ai',       keywords: ['deep learning', 'neural networks', 'cnn', 'nlp', 'practical'], description: 'Top-down practical approach to deep learning. Build models before understanding theory.' },
    { title: 'Essence of Linear Algebra — 3Blue1Brown',       url: 'https://youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab', type: 'video',  author: '3Blue1Brown',     platform: 'YouTube',       keywords: ['linear algebra', 'mathematics', 'vectors', 'matrices', 'eigenvalues'], description: 'Visual, intuitive intro to linear algebra. Essential for ML math foundations.' },
    { title: 'StatQuest with Josh Starmer',                   url: 'https://youtube.com/@statquest',                                       type: 'video',        author: 'Josh Starmer',    platform: 'YouTube',       keywords: ['statistics', 'probability', 'hypothesis testing', 'distributions', 'regression'], description: 'Crystal-clear explanations of statistics and ML algorithms with minimal jargon.' },
    { title: 'Scikit-learn Documentation',                    url: 'https://scikit-learn.org/stable/user_guide.html',                       type: 'documentation', author: 'scikit-learn',   platform: 'scikit-learn',  keywords: ['python', 'sklearn', 'algorithms', 'preprocessing', 'model selection'], description: 'Comprehensive reference for sklearn — the standard Python ML library.' },
    { title: 'Hands-On Machine Learning with Scikit-Learn',   url: 'https://www.oreilly.com/library/view/hands-on-machine-learning',        type: 'book',          author: 'Aurélien Géron', platform: "O'Reilly",      keywords: ['fundamentals', 'algorithms', 'supervised', 'unsupervised', 'deep learning', 'tensorflow'], description: 'Comprehensive book covering the full ML pipeline from data prep to deployment.' },
    { title: 'Python for Data Analysis — Wes McKinney',       url: 'https://wesmckinney.com/book/',                                         type: 'book',          author: 'Wes McKinney',   platform: "O'Reilly",      keywords: ['python', 'pandas', 'numpy', 'data wrangling', 'preprocessing'], description: 'The definitive guide to pandas and NumPy for data manipulation.' },
    { title: 'Towards Data Science — ML fundamentals',        url: 'https://towardsdatascience.com',                                        type: 'article',       author: 'Various',        platform: 'Medium',        keywords: ['fundamentals', 'concepts', 'algorithms', 'best practices', 'feature engineering'], description: 'High-quality ML articles from practitioners. Excellent for concept reinforcement.' },
    { title: 'Google Machine Learning Crash Course',          url: 'https://developers.google.com/machine-learning/crash-course',           type: 'course',        author: 'Google',         platform: 'Google',        keywords: ['fundamentals', 'tensorflow', 'supervised', 'feature engineering', 'neural networks'], description: 'Free, fast-paced ML intro from Google. Good for getting up to speed quickly.' },
    { title: 'Kaggle Learn — ML Intro',                       url: 'https://kaggle.com/learn',                                              type: 'course',        author: 'Kaggle',         platform: 'Kaggle',        keywords: ['practical', 'pandas', 'supervised', 'feature engineering', 'data exploration'], description: 'Short, hands-on micro-courses. Includes competitions for practice.' },
    { title: 'Deep Learning Specialisation — Andrew Ng',      url: 'https://coursera.org/specializations/deep-learning',                    type: 'course',        author: 'Andrew Ng',      platform: 'Coursera',      keywords: ['neural networks', 'deep learning', 'cnn', 'rnn', 'backpropagation'], description: 'Deep dive into neural networks, CNNs, RNNs, and optimisation.' },
    { title: 'Neural Networks: Zero to Hero — Andrej Karpathy', url: 'https://youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ', type: 'video', author: 'Andrej Karpathy', platform: 'YouTube',       keywords: ['neural networks', 'deep learning', 'backpropagation', 'gpt', 'transformers'], description: 'Build neural networks from scratch in Python. Exceptional for deep understanding.' },
    { title: 'Mathematics for Machine Learning',              url: 'https://mml-book.github.io',                                            type: 'book',          author: 'Deisenroth et al', platform: 'Free PDF',    keywords: ['mathematics', 'linear algebra', 'calculus', 'probability', 'statistics'], description: 'Free book covering all the maths needed for ML.' },
  ],

  'react': [
    { title: 'React Official Documentation',                  url: 'https://react.dev',                                                     type: 'documentation', author: 'React Team',     platform: 'react.dev',     keywords: ['components', 'jsx', 'hooks', 'state', 'props', 'useEffect', 'context', 'router'], description: 'The authoritative source. New docs (react.dev) are outstanding — start here.' },
    { title: 'Scrimba — Learn React for Free',                url: 'https://scrimba.com/learn/learnreact',                                  type: 'course',        author: 'Bob Ziroll',     platform: 'Scrimba',       keywords: ['basics', 'jsx', 'components', 'state', 'props', 'hooks', 'projects'], description: 'Interactive coding course. Excellent for beginners — code in the browser.' },
    { title: 'Fireship — React in 100 Seconds',               url: 'https://youtu.be/Tn6-PIqc4UM',                                          type: 'video',         author: 'Fireship',       platform: 'YouTube',       keywords: ['overview', 'jsx', 'components', 'state'], description: 'Sharp 100-second overview of core React concepts.' },
    { title: 'Jack Herrington — React Hooks Deep Dive',       url: 'https://youtube.com/@jherr',                                            type: 'video',         author: 'Jack Herrington', platform: 'YouTube',      keywords: ['hooks', 'useEffect', 'useCallback', 'useMemo', 'custom hooks'], description: 'Advanced hooks patterns and performance optimisation.' },
    { title: 'Kent C. Dodds Blog',                            url: 'https://kentcdodds.com/blog',                                           type: 'article',       author: 'Kent C. Dodds',  platform: 'Personal Blog', keywords: ['testing', 'patterns', 'hooks', 'state management', 'best practices'], description: 'Authoritative blog on React testing, patterns, and best practices.' },
    { title: 'React Router v6 Documentation',                 url: 'https://reactrouter.com/en/main',                                       type: 'documentation', author: 'Remix Team',     platform: 'reactrouter.com', keywords: ['routing', 'react router', 'navigation', 'nested routes', 'loader'], description: 'Official React Router docs — v6 is significantly different from v5.' },
    { title: 'TanStack Query (React Query) Docs',             url: 'https://tanstack.com/query/latest',                                     type: 'documentation', author: 'TanStack',       platform: 'tanstack.com',  keywords: ['data fetching', 'api', 'caching', 'async', 'server state'], description: 'De facto standard for server-state management and API calls in React.' },
    { title: 'Epic React by Kent C. Dodds',                   url: 'https://epicreact.dev',                                                 type: 'course',        author: 'Kent C. Dodds',  platform: 'epicreact.dev', keywords: ['advanced', 'hooks', 'patterns', 'performance', 'testing', 'state management'], description: 'The most comprehensive advanced React course. Covers everything deeply.' },
    { title: 'Zustand Documentation',                         url: 'https://zustand-demo.pmnd.rs',                                          type: 'documentation', author: 'Poimandres',     platform: 'GitHub',        keywords: ['state management', 'zustand', 'global state', 'store'], description: 'Lightweight, modern state management. Good alternative to Redux for most apps.' },
    { title: 'React Testing Library Docs',                    url: 'https://testing-library.com/docs/react-testing-library/intro/',         type: 'documentation', author: 'Testing Library', platform: 'testing-library.com', keywords: ['testing', 'unit tests', 'integration tests', 'user interactions'], description: 'The standard approach to testing React components — test behaviour, not implementation.' },
    { title: 'JavaScript.info — Modern JavaScript',           url: 'https://javascript.info',                                               type: 'article',       author: 'Ilya Kantor',    platform: 'javascript.info', keywords: ['javascript', 'es6', 'async', 'promises', 'closures', 'destructuring'], description: 'Best free JS reference. Essential prerequisites for React.' },
    { title: 'CSS Tricks — A Complete Guide to Flexbox',      url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',               type: 'article',       author: 'Chris Coyier',   platform: 'CSS-Tricks',    keywords: ['css', 'flexbox', 'layout', 'styling'], description: 'The reference card everyone uses for Flexbox.' },
  ],

  'system design': [
    { title: 'System Design Interview — Alex Xu (Vol 1)',     url: 'https://bytebytego.com',                                               type: 'book',          author: 'Alex Xu',        platform: 'ByteByteGo',    keywords: ['fundamentals', 'scalability', 'databases', 'caching', 'load balancing', 'interviews'], description: 'The most widely read system design book. Excellent for interviews and fundamentals.' },
    { title: 'ByteByteGo YouTube Channel',                   url: 'https://youtube.com/@ByteByteGo',                                       type: 'video',         author: 'Alex Xu',        platform: 'YouTube',       keywords: ['scalability', 'databases', 'caching', 'api design', 'microservices', 'distributed'], description: 'Visual system design walkthroughs — 10-minute deep dives on each topic.' },
    { title: 'Designing Data-Intensive Applications — Kleppmann', url: 'https://dataintensive.net',                                        type: 'book',          author: 'Martin Kleppmann', platform: "O'Reilly",    keywords: ['distributed systems', 'replication', 'partitioning', 'transactions', 'stream processing', 'consistency'], description: 'The definitive book on data systems. Required reading for senior engineers.' },
    { title: 'High Scalability Blog',                        url: 'https://highscalability.com',                                           type: 'article',       author: 'Various',        platform: 'Blog',          keywords: ['scalability', 'case studies', 'architecture', 'real-world systems'], description: 'Real-world architecture case studies (Twitter, YouTube, Amazon). Invaluable.' },
    { title: 'AWS Architecture Center',                       url: 'https://aws.amazon.com/architecture/',                                  type: 'documentation', author: 'AWS',            platform: 'AWS',           keywords: ['cloud', 'aws', 'microservices', 'serverless', 'databases', 'queues'], description: 'Reference architectures and whitepapers from AWS.' },
    { title: 'Martin Fowler — Patterns of Enterprise Application Architecture', url: 'https://martinfowler.com/eaaCatalog/', type: 'article', author: 'Martin Fowler', platform: 'martinfowler.com', keywords: ['patterns', 'architecture', 'microservices', 'api design', 'domain modelling'], description: 'Foundational patterns for application architecture. High signal-to-noise ratio.' },
    { title: 'System Design Primer — GitHub',                url: 'https://github.com/donnemartin/system-design-primer',                   type: 'article',       author: 'Donne Martin',   platform: 'GitHub',        keywords: ['fundamentals', 'scalability', 'load balancing', 'caching', 'databases', 'message queues'], description: 'Comprehensive free resource covering all system design topics with diagrams.' },
    { title: 'CAP Theorem — Visual Guide',                   url: 'https://robertgreiner.com/cap-theorem-revisited/',                      type: 'article',       author: 'Robert Greiner', platform: 'Blog',          keywords: ['distributed systems', 'consistency', 'availability', 'partition tolerance', 'cap'], description: 'Clear explanation of the CAP theorem with real-world examples.' },
    { title: 'Database Internals — Alex Petrov',             url: 'https://databass.dev',                                                  type: 'book',          author: 'Alex Petrov',    platform: "O'Reilly",      keywords: ['databases', 'storage engines', 'indexing', 'transactions', 'b-trees'], description: 'Deep dive into how databases actually work internally.' },
    { title: 'Redis Documentation — Data Types',             url: 'https://redis.io/docs/data-types/',                                     type: 'documentation', author: 'Redis',          platform: 'redis.io',      keywords: ['caching', 'redis', 'key-value', 'pub-sub', 'data structures'], description: 'Redis data types and use cases — the standard caching layer.' },
    { title: 'Kafka: The Definitive Guide',                  url: 'https://www.confluent.io/resources/kafka-the-definitive-guide/',        type: 'book',          author: 'Confluent',      platform: 'Confluent',     keywords: ['message queues', 'kafka', 'event streaming', 'pub-sub', 'distributed'], description: 'Free book covering Kafka architecture and patterns.' },
    { title: 'Grokking Modern System Design Interview',      url: 'https://educative.io/courses/grokking-modern-system-design-interview',  type: 'course',        author: 'Design Gurus',   platform: 'Educative',     keywords: ['interviews', 'api design', 'scalability', 'databases', 'caching', 'microservices'], description: 'Interview-focused system design course with structured problem-solving framework.' },
  ],
};

/**
 * Returns the source pool for a topic (case-insensitive fuzzy match).
 * Falls back to an empty array — the Source-Finder should then use live search.
 *
 * @param {string} topic
 * @returns {object[]}
 */
function getSourcePool(topic) {
  const key = topic.toLowerCase();
  // Exact match
  if (SOURCES[key]) return SOURCES[key];
  // Fuzzy: check if any known topic is contained in the query or vice versa
  for (const [k, sources] of Object.entries(SOURCES)) {
    if (key.includes(k) || k.includes(key)) return sources;
  }
  return [];
}

/**
 * Keywords from a sub-topic name and objectives — used by Source-Finder
 * to score relevance of each source in the pool.
 *
 * @param {object} subTopic  { name, objectives[] }
 * @returns {string[]}
 */
function extractKeywords(subTopic) {
  return [subTopic.name, ...subTopic.objectives]
    .join(' ')
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3);
}

module.exports = { getSourcePool, extractKeywords, SOURCES };
