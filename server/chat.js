import Anthropic from "@anthropic-ai/sdk";
import { guard, send } from "./guard.js";
// The same file the matcher and the panel read. One place to edit an answer,
// and no second copy of her career to drift out of date.
import * as facts from "../src/data/chatbot.js";

// The chatbot's answers, generated rather than looked up.
//
// This is *grounded*, not open. data/chatbot.js opens by arguing against putting
// a model in this loop at all, and the argument is right — it speaks for a real
// person to people deciding whether to hire her, and an answer that is nearly
// right about her career is worse than none. So the model is not asked what it
// knows. It is handed her written answers as the only permitted source and told
// to answer out of them: what it adds is understanding the question, not the
// facts.
//
// Which is the actual gap. The matcher needs a visitor to type a substring it
// has been given; ask it something phrased sideways, or two things at once, and
// it dead-ends on the email line. This closes that without inventing anything.
//
// The handler is built here and mounted twice — by the dev server in
// vite.config.js and by api/chat.js on the deployed site — so both run the same
// code. Before there was a deployed copy this lived in the Vite config alone,
// which is why a static build had no endpoint at all and everything fell to the
// matcher. See lib/chatbotAsk: that fallback is still there and still correct,
// it is just no longer the only thing that answers.

// A question box beside a portfolio. Anything longer than this is not a question.
const MAX_QUESTION = 500;

const LIMITS = {
  name: "chat",
  // A question and a few short turns of context. Kilobytes, not megabytes.
  maxBytes: 64_000,
  max: 30,
  windowMs: 10 * 60 * 1000,
};

function chatSystemPrompt({ ANSWERS, EMAIL, FALLBACK, OUT_OF_SCOPE }) {
  // Her answers, verbatim, as the only material. Ids come along so the rules
  // below can talk about them, not because the model should ever say one.
  const material = ANSWERS.map((a) => `[${a.id}] ${a.text}`).join('\n\n')

  return `당신은 UX/UI 디자이너 윤수정의 포트폴리오 사이트에 있는 안내 챗봇입니다.
방문자는 대부분 그를 채용할지 검토하는 사람입니다.

# 자료
아래는 수정님이 직접 쓴 답변 전문입니다. 이것이 당신이 가진 정보의 전부입니다.

${material}

# 규칙
- 위 자료에 있는 내용만으로 답하세요. 자료에 없는 경력·수치·회사명·기간·도구·성과를 새로 만들어내지 마세요. 추측도 하지 마세요.
- 자료로 답할 수 없는 질문에는 정확히 이렇게 답하세요: "${FALLBACK}"
- 수정님과 무관한 질문(날씨, 뉴스, 번역, 코드 작성 등)에는 정확히 이렇게 답하세요: "${OUT_OF_SCOPE}"
- 여러 자료에 걸친 질문이면 관련된 내용을 합쳐서 답해도 됩니다. 자료 안에서 합치는 것은 괜찮고, 자료 밖으로 나가는 것은 안 됩니다.
- 자료의 문장을 그대로 쓰거나 자연스럽게 다듬어 쓰세요. 뜻이 달라지면 안 됩니다.

# 말투
- 한국어 존댓말. 수정님을 3인칭으로 "수정님"이라고 부릅니다.
- 2~4문장. 길게 늘어놓지 마세요.
- 목록, 제목, 마크다운 기호를 쓰지 마세요. 말하듯 이어지는 문장으로 씁니다.
- 연락처를 안내할 때는 ${EMAIL} 를 씁니다.`
}

export function createChatHandler(apiKey) {
  return async (request, response) => {
    // Checked before the body is read: with no key there is nothing to do with
    // it, and the client treats any failure the same way — it answers from the
    // matcher either way.
    if (!apiKey) return send(response, 503, { error: "ANTHROPIC_API_KEY가 없습니다." });

    const body = await guard(request, response, LIMITS);
    if (!body) return;

    const question = String(body.question ?? "").trim();
    if (!question) return send(response, 400, { error: "질문이 없습니다." });
    if (question.length > MAX_QUESTION) {
      return send(response, 400, { error: "질문이 너무 깁니다." });
    }

    try {
      const client = new Anthropic({ apiKey });
      const result = await client.messages.create({
        model: "claude-opus-5",
        // An answer is two or three sentences. Room for that and no room to
        // wander into an essay about her.
        max_tokens: 512,
        output_config: { effort: "low" },
        system: chatSystemPrompt(facts),
        messages: [
          // A few turns of context so "그건 왜요?" has an antecedent. Only a
          // few: this is a question box beside a portfolio, not a thread anyone
          // scrolls back through. Each turn is truncated as well as counted —
          // six unbounded ones would be a way around the question limit above.
          ...(Array.isArray(body.history) ? body.history.slice(-6) : []).map((m) => ({
            role: m.from === "you" ? "user" : "assistant",
            content: String(m.text ?? "").slice(0, MAX_QUESTION),
          })),
          { role: "user", content: question },
        ],
      });

      const text = result.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

      if (!text) return send(response, 502, { error: "답변을 만들지 못했습니다." });
      send(response, 200, { text });
    } catch (error) {
      console.error(`[chatbot-answer] ${error?.message ?? error}`);
      send(response, 502, { error: error?.message ?? "답변에 실패했습니다." });
    }
  };
}
