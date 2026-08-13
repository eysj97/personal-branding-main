// Snapkeep's analysis endpoint on the deployed site.
//
// Everything it does lives in ../server/analyze.js, which the dev server mounts
// too. See api/chat.js for where the key comes from — the two are set up the
// same way and read the same variable.
//
// This is the one that costs real money per call: the request body is an image.
// If you only ever set a spend limit on one thing, set it on the account this
// key belongs to.
import { createAnalyzeHandler } from "../server/analyze.js";

export default createAnalyzeHandler(process.env.ANTHROPIC_API_KEY);
