// Snapkeep's analysis endpoint on the deployed site.
//
// Everything it does lives in ../server/analyze.js, which the dev server mounts
// too — so what a visitor gets is what you tested locally, not a second
// implementation that drifts.
//
// The key comes from the host's environment rather than a .env file: .env is in
// .gitignore and never leaves the machine it was written on, which is the point
// of it. On Vercel, set ANTHROPIC_API_KEY under Settings → Environment
// Variables, then redeploy — a variable added after a build is not in that
// build. With no key this answers 503 and the client falls back to its local
// heuristic, which is what it did before this file existed.
//
// This is the only endpoint on the site. The chatbot deliberately has none —
// see the top of src/data/chatbot.js.
//
// This is the one that costs real money per call: the request body is an image.
// If you only ever set a spend limit on one thing, set it on the account this
// key belongs to.
import { createAnalyzeHandler } from "../server/analyze.js";

export default createAnalyzeHandler(process.env.ANTHROPIC_API_KEY);
