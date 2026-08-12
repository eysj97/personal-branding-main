import { match } from "./chatbotMatch.js";

// How the panel gets an answer: ask the model, and fall back to the written
// one if it cannot.
//
// The endpoint lives in the dev server (see chatbotAnswer in vite.config.js) so
// the API key is never in the bundle. `apply: 'serve'` means a statically
// deployed build has no /api/chat at all — the fetch 404s, and everything below
// lands on the keyword matcher this used to be. That is not a degraded mode
// bolted on afterwards; it is the same matcher, with the same written answers,
// behaving exactly as it did before any of this existed.
//
// So there are three ways to end up on the matcher, and all of them are fine:
// the site is deployed, the key is missing, or the request failed. What none of
// them do is leave a visitor looking at a chat box that does not reply.

// Long enough to cover a normal answer, short enough that a hung request does
// not leave "답변 중…" on screen indefinitely. The matcher is instant, so
// waiting longer than this is strictly worse than answering.
const TIMEOUT_MS = 12000;

/**
 * @param {string} question  what the visitor typed
 * @param {{from: string, text: string}[]} history  the thread so far
 */
export async function askChatbot(question, history = []) {
  try {
    // AbortSignal.timeout rather than a manual setTimeout race: it cancels the
    // request itself, so a slow answer is not still arriving after we have
    // already shown the written one.
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    if (!text) throw new Error("empty");
    return text;
  } catch {
    // Deliberately silent. Every one of these is a case the matcher handles,
    // and a console full of red on a deployed portfolio helps nobody.
    return match(question).text;
  }
}
