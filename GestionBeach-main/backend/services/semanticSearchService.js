// Semantic search using @xenova/transformers (free, runs locally, no API needed)
const path = require('path');

let pipeline = null;
let extractor = null;

// Lazy-load the model on first use. Downloads ~25MB once, then cached.
async function getExtractor() {
  if (extractor) return extractor;

  const { pipeline: createPipeline, env } = await import('@xenova/transformers');
  env.cacheDir = path.join(__dirname, '../model-cache');
  env.allowLocalModels = true;

  console.log('🧠 Cargando modelo de embeddings (primera vez ~25MB)...');
  extractor = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('✅ Modelo semántico listo');
  return extractor;
}

// Embed a batch of texts, returns array of Float32Array
async function embedBatch(texts) {
  const ext = await getExtractor();
  const output = await ext(texts, { pooling: 'mean', normalize: true });
  // output is a Tensor of shape [N, 384]; slice each row
  const n = texts.length;
  const dim = output.data.length / n;
  const embeddings = [];
  for (let i = 0; i < n; i++) {
    embeddings.push(output.data.slice(i * dim, (i + 1) * dim));
  }
  return embeddings;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // vectors are already L2-normalized, so dot = cosine similarity
  return dot;
}

// Given a query string and candidate objects [{text, ...meta}],
// returns candidates sorted by semantic similarity (best first)
async function semanticRank(query, candidates, topK = 10) {
  if (!candidates.length) return [];

  const texts = [query, ...candidates.map((c) => c.text)];
  const embeddings = await embedBatch(texts);

  const queryEmb = embeddings[0];
  return candidates
    .map((c, i) => ({ ...c, score: cosineSimilarity(queryEmb, embeddings[i + 1]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { semanticRank, embedBatch };
