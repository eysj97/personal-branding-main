import {
  ANSWERS,
  FALLBACK,
  OFF_TOPIC_KEYS,
  OUT_OF_SCOPE,
} from "../data/chatbot.js";

/**
 * Pick the written answer a question is asking for, or say so when none is.
 *
 * Substring matching, not word matching. Korean does not put spaces where the
 * meaning breaks — "스냅킵이" and "스냅킵은" and "스냅킵에대해" are all the same
 * question — so splitting on spaces would miss most of them. Stripping the
 * spaces out of both sides and looking for the key inside catches all of it,
 * and it catches "AI를" and "AI는" for free.
 */

const normalise = (s) =>
  s
    .toLowerCase()
    // Punctuation only. Spaces go too, which is the point — see above.
    .replace(/[\s?!.,~"'()[\]{}<>/\\|:;`^*+=_-]/g, "");

/**
 * How much a matched key is worth.
 *
 * Length squared, so a long specific key beats a pile of short vague ones. The
 * shape of the problem: "ai" is two characters and turns up inside plenty of
 * ordinary words, while "사회복지" is four and means exactly one thing. Scoring
 * them equally lets the vague one win a question it has no business answering.
 */
const weight = (key) => key.length * key.length;

// Below this, treat it as not understood rather than guessing.
//
// Set at exactly one two-character key. That looks lax and is not: Korean packs
// a whole specific noun into two characters — 협업, 연락, 철학, 채용 — and
// demanding three would throw away most of the vocabulary a visitor actually
// types. It was 9 first and the matcher failed a dozen ordinary questions.
const MIN_SCORE = 4;

export function match(question) {
  const q = normalise(question);
  if (!q) return { id: "fallback", text: FALLBACK };

  // Checked first and on its own: a question about the weather should not get
  // to compete for an answer about a project, however it happens to score.
  if (OFF_TOPIC_KEYS.some((k) => q.includes(normalise(k)))) {
    return { id: "off-topic", text: OUT_OF_SCOPE };
  }

  const scored = [];
  for (const answer of ANSWERS) {
    let score = 0;
    for (const key of answer.keys) {
      const k = normalise(key);
      if (k && q.includes(k)) score += weight(k);
    }
    if (score >= MIN_SCORE) scored.push({ answer, score });
  }
  if (!scored.length) return { id: "fallback", text: FALLBACK };

  // "레이어 프로젝트 궁금해요" matches both Layer and the list-of-projects
  // answer, and on score alone the list wins — 프로젝트 is the longer word. But
  // the visitor named one, and naming one is the more specific ask. So an
  // answer marked `general` steps aside whenever anything else matched at all.
  const specific = scored.filter((s) => !s.answer.general);
  const pool = specific.length ? specific : scored;

  // Strictly greater, so the earlier answer keeps a tie. ANSWERS is ordered
  // roughly general to specific for exactly that.
  let best = pool[0];
  for (const s of pool) if (s.score > best.score) best = s;
  return { id: best.answer.id, text: best.answer.text };
}
