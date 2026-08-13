// What stands between a public endpoint and someone else's bill.
//
// These endpoints spend money on every call, and once the site is deployed the
// URL is as public as the page it sits on. Nothing here requires a login —
// asking a visitor to sign in before they can try the chatbot would defeat the
// point of putting it on a portfolio — so the job is to make casual abuse
// unrewarding and to bound what a determined one can cost.
//
// Be clear about what each control is actually worth:
//
//   - The origin check stops *other websites* from calling these endpoints with
//     their visitors' browsers. It does NOT stop curl or a script: `Origin` is
//     just a header, and anything that is not a browser can set it to whatever
//     it likes. Treat it as hygiene, not security.
//   - The rate limit is per running instance and lives in memory. On a serverless
//     host each cold start begins with an empty counter, and two concurrent
//     instances count separately. It cuts off the person hammering the endpoint
//     from one machine; it is not a guarantee.
//   - The size caps are the only hard per-request bound, and they matter most on
//     the image endpoint, where the request body *is* the cost.
//
// The one control that actually guarantees a ceiling is the spend limit on the
// Anthropic account. Everything here reduces how often you would reach it.

/** JSON response, in the shape both handlers already use. */
export function send(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

/**
 * The request body, however this host chose to deliver it.
 *
 * Vercel parses JSON onto `request.body` before the handler runs; the Vite dev
 * server hands over the raw stream. Same handler runs in both, so it has to
 * accept either — and read the stream with a cap rather than buffering whatever
 * arrives, since "read it all, then check the length" is not a size limit.
 */
export function readBody(request, maxBytes) {
  if (request.body && typeof request.body === "object") {
    return Promise.resolve(request.body);
  }
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) reject(new Error("요청이 너무 큽니다."));
    });
    request.on("end", () => {
      // An empty body is a malformed request, not an empty object — say so
      // rather than letting the handler report a missing field instead.
      if (!body) return reject(new Error("잘못된 요청 형식입니다."));
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("잘못된 요청 형식입니다."));
      }
    });
    request.on("error", reject);
  });
}

/**
 * Who to count requests against.
 *
 * Behind a proxy the socket address is the proxy's, so the client is the first
 * entry of `x-forwarded-for` — the rest of that header is the proxy chain, and
 * a client can prepend anything it likes to it. Good enough for counting, not
 * for identity.
 */
function clientKey(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return request.socket?.remoteAddress ?? "unknown";
}

/**
 * Reject a browser on another site calling this from its own page.
 *
 * Compared against the request's own Host rather than a configured allowlist,
 * so preview deployments and a custom domain both work with nothing to keep in
 * sync. A missing `Origin` passes: same-origin requests from older browsers
 * omit it, and anything that is not a browser can forge it anyway, so refusing
 * on absence would block real visitors without stopping a single script.
 */
function crossSite(request) {
  const origin = request.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.headers.host;
  } catch {
    return true;
  }
}

// One bucket per client, trimmed as it is read so an idle key does not sit in
// memory forever.
const hits = new Map();

function overRate(key, max, windowMs) {
  const now = Date.now();
  const fresh = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (fresh.length >= max) {
    hits.set(key, fresh);
    return true;
  }
  fresh.push(now);
  hits.set(key, fresh);
  // Cheap sweep: only ever runs when the map has grown enough to be worth it.
  if (hits.size > 500) {
    for (const [other, times] of hits) {
      if (!times.some((at) => now - at < windowMs)) hits.delete(other);
    }
  }
  return false;
}

/**
 * Run every check, and read the body if they pass.
 *
 * Returns the parsed body, or `null` when it has already answered the request —
 * so a handler reads `if (!body) return` and otherwise gets on with its work.
 */
export async function guard(request, response, { name, maxBytes, max, windowMs }) {
  if (request.method !== "POST") {
    send(response, 405, { error: "POST만 지원합니다." });
    return null;
  }
  if (crossSite(request)) {
    send(response, 403, { error: "허용되지 않은 요청입니다." });
    return null;
  }
  // Keyed by endpoint as well as client. Without the name both endpoints share
  // one bucket, and since they have different limits the effective one becomes
  // whichever is lower — a visitor chatting would quietly use up the budget for
  // uploading a screenshot, and neither number would mean what it says.
  if (overRate(`${name}:${clientKey(request)}`, max, windowMs)) {
    // 429 rather than a silent refusal: the client should be able to tell "slow
    // down" apart from "broken", and the panel's fallback answers either way.
    response.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
    send(response, 429, { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." });
    return null;
  }
  try {
    return await readBody(request, maxBytes);
  } catch (error) {
    send(response, 400, { error: error?.message ?? "잘못된 요청 형식입니다." });
    return null;
  }
}
