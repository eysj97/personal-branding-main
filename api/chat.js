// The chatbot endpoint on the deployed site.
//
// Everything it does lives in ../server/chat.js, which the dev server mounts
// too — so what a visitor gets is what you tested locally, not a second
// implementation that drifts.
//
// The key comes from the host's environment rather than a .env file: .env is in
// .gitignore and never leaves the machine it was written on, which is the point
// of it. On Vercel, set ANTHROPIC_API_KEY under Settings → Environment
// Variables, then redeploy — a variable added after a build is not in that
// build. With no key this answers 503 and the panel falls back to the keyword
// matcher, which is the same thing it did before this file existed.
import { createChatHandler } from "../server/chat.js";

export default createChatHandler(process.env.ANTHROPIC_API_KEY);
