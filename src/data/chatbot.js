// What the chatbot knows and what it says.
//
// Written answers, matched by keyword — no model in the loop. That is a choice,
// not a shortcut: this thing speaks for a real person to people deciding
// whether to hire her, and an answer that is *nearly* right about her career is
// worse than no answer at all. Everything below is a sentence she wrote, said
// back verbatim, and anything not covered gets pointed at her inbox.
//
// It also means the site stays static. There is no key to keep out of the
// bundle, no serverless function to deploy, nothing to inject into, and no bill.
//
// Adding an answer: put it in ANSWERS with a few `keys` a visitor would
// actually type. Keys are matched as substrings against the question with
// spaces stripped, so short ones are dangerous — see match() for how they are
// weighted.

export const EMAIL = "eysj1620@gmail.com";

/** The buttons shown above the thread when the panel opens, in order.
 *
 * Wording and order are the design's (Figma 343:2429), not a paraphrase — these
 * are the four questions she chose to put in front of a visitor. Every one of
 * them has to land on a written answer, so changing one here means checking it
 * still matches in ANSWERS below. Two of these needed keys added when they were
 * first wired up; see the notes on `transition` and `strengths`. */
export const QUICK = [
  "uxui디자이너가 된 이유?",
  "AI활용방법",
  "장단점",
  "진행한 프로젝트에 대한 설명",
];

// Two lines, and the break is deliberate — it is the design's, and the second
// line is what tells a visitor the buttons above it are the quick way in.
export const GREETING =
  "안녕하세요! 윤수정님에 대한 궁금한 점을 알려드립니다\n상단 버튼을 누르거나 궁금한 점을 질문해 주세요";

// The one thing it says when it does not know. Kept in one place because it is
// the answer a visitor is most likely to actually act on.
export const FALLBACK =
  `그 부분은 제가 답변드리기 어려워요. ${EMAIL} 로 직접 문의해 주시면 수정님이 답변드립니다. 아래 버튼의 주제라면 바로 알려드릴 수 있어요!`;

export const OUT_OF_SCOPE =
  "저는 수정님에 대해서만 답할 수 있어요. 수정님의 프로젝트나 디자인 이야기가 궁금하시면 물어봐 주세요!";

// Questions that are clearly not about her. Checked before the answers below,
// so "오늘 날씨" does not score its way into some project by accident.
export const OFF_TOPIC_KEYS = [
  "날씨", "뉴스", "주가", "환율", "로또", "번역해", "코드짜", "코드작성",
  "레시피", "맛집", "영화추천", "노래추천", "운세", "몇시",
];

export const ANSWERS = [
  {
    id: "intro",
    keys: ["어떤디자이너", "소개", "누구", "어떤분", "본인", "자기소개", "어떤사람"],
    text:
      "사용자도 의식하지 못한 불편을 발견해 설계하는 UX/UI 디자이너예요. " +
      "사회복지 현장에서 4년간 사람의 숨은 니즈를 읽던 감각을 디자인에 그대로 쓰고 있어요.",
  },
  {
    id: "transition",
    // "왜 직무를 바꿨어요?" has words between "왜" and "바꿨", so a key like
    // "왜바꿨" never appears in it. Keys have to be the run of characters the
    // visitor actually types without a gap.
    // "디자이너가되" and "된이유" are here for the first quick button,
    // "uxui디자이너가 된 이유?", which matched nothing at all before them —
    // none of the words below appear in it. Both are specific enough to be
    // safe: becoming a designer is only ever this answer.
    keys: [
      "사회복지", "직무", "전환", "왜디자인", "바꿨", "바꾸",
      "이직", "비전공", "디자이너가되", "된이유",
    ],
    text:
      "사회복지사의 개입은 늘 문제가 생긴 뒤였어요. 문제가 생기기 전에 막을 수 없을까 고민한 끝에 디자인을 만났고요. " +
      "막아설 때보다 조금씩 나아지게 만들 때 힘을 얻는 사람이라, 도망친 게 아니라 개입의 시점을 사후에서 사전으로 재정의한 거예요.",
  },
  {
    id: "philosophy",
    keys: ["철학", "가치관", "중요하게", "신념", "디자인관", "어떻게디자인"],
    text:
      "예쁜 것보다 사용성을 봐요. 정보를 다 보여주는 것과 잘 읽히는 것은 다르다고 생각하거든요. " +
      "같은 정보도 상황에 따라 압박이 될 수 있어서, 사용자의 맥락을 먼저 읽습니다.",
  },
  {
    id: "strengths",
    // NEEDS HER APPROVAL — the only answer here she did not write.
    //
    // The "장단점" quick button had nothing to land on, so this was assembled
    // out of things she has already said elsewhere in this file rather than
    // invented: the hidden-needs sense from `intro`, the Reviu decision from
    // `reviu`, the feedback stance from `collab`, and the Photoshop gap she
    // already states plainly in `photoshop`. Nothing new is claimed about her.
    // It still speaks for her to people deciding whether to hire her, which is
    // exactly the thing the top of this file says not to guess at — so it is
    // hers to rewrite or cut.
    keys: ["장단점", "장점", "강점", "단점", "약점", "잘하는", "부족한"],
    text:
      "강점은 사용자가 말하지 않은 불편을 읽어내는 거예요. 사회복지 현장에서 4년간 클라이언트의 숨은 니즈를 듣던 감각이고, " +
      "리뷰 앱에서 밀린 복습량을 '보여주지 않기로' 한 판단도 거기서 나왔어요. 피드백을 방어하지 않고 근거로 다시 설득하는 것도 강점이라고 생각합니다. " +
      "아직 부족한 건 그래픽 툴이에요. 주력은 Figma고 포토샵은 학습 중이라, 비주얼 표현의 폭을 넓히는 게 지금의 과제입니다.",
  },
  {
    id: "snapkeep",
    keys: ["스냅킵", "snapkeep", "대표프로젝트", "대표작", "제일잘한", "가장자신"],
    text:
      "스크린샷을 넣으면 AI가 태깅하고, 필요할 때 내 언어로 검색해 꺼내는 레퍼런스 아카이브예요. " +
      "모으기만 하고 못 찾는 문제를 직접 겪어서, 혼자 기획부터 프로토타입까지 만들었어요. " +
      "이 사이트 Experience It 섹션에서 직접 써보실 수 있어요!",
  },
  {
    id: "layer",
    keys: ["레이어", "layer", "향수"],
    text:
      "6인 팀으로 만든 향수 커뮤니티 앱이에요. 리서치에서 사용자 50명 중 절반 이상이 " +
      "\"나에게 맞는 향 찾기가 어렵다\"고 했고 9할이 맞춤 추천을 원했는데, 추천은 취향이 정의된 다음에야 가능하잖아요. " +
      "정작 '내 취향'을 다뤄주는 서비스가 없다는 게 저희가 찾은 빈자리였어요. " +
      "수정님은 설문지 제작과 매거진·향수 상세페이지 디자인, 그리고 구현을 맡았어요.",
  },
  {
    id: "aquaplanet",
    keys: ["아쿠아", "aqua", "아쿠아리움", "리뉴얼"],
    text:
      "4개 지점으로 흩어진 아쿠아리움 사이트를 하나의 브랜드로 잇는 리뉴얼 제안이에요. " +
      "수정님은 기획 문서와 티켓 예매 페이지를 맡았고, 흩어진 할인 정보를 지점 단위로 정리하되 전환은 클릭 한 번에 끝나게 설계했어요. " +
      "반응형에서 빛 인터랙션이 작은 화면을 덮자 과감히 덜어낸 판단도 이 프로젝트에서 나왔고요.",
  },
  {
    id: "reviu",
    keys: ["리뷰", "reviu", "학습앱", "코넬", "필기", "공부"],
    text:
      "필기를 스캔하면 코넬 노트로 정리되고 AI가 문제를 만들어주는 학습 앱이에요. 혼자 기획부터 구현까지 했고요. " +
      "가장 신경 쓴 건 오히려 '보여주지 않는 것'이었어요. 밀린 복습량을 보여주면 압박이 되니까, " +
      "시스템이 오늘의 학습에 복습분을 알아서 섞어 부담 없이 따라가게 했습니다.",
  },
  {
    id: "projects",
    // Steps aside whenever a named project also matched — see match().
    general: true,
    keys: ["프로젝트", "포트폴리오", "작업물", "어떤거만들"],
    text:
      "4개예요. 스냅킵(레퍼런스 아카이브), 레이어(향수 커뮤니티 앱), 아쿠아플라넷(아쿠아리움 리뉴얼), 리뷰(학습 앱). " +
      "궁금한 이름을 말씀해 주시면 자세히 알려드릴게요!",
  },
  {
    id: "skills",
    keys: ["스킬", "기술", "툴", "figma", "피그마", "html", "css", "퍼블리싱", "할줄"],
    text:
      "UX 리서치, 기획, UI 디자인, 인터랙션 디자인을 하고요. 주력 툴은 Figma예요. " +
      "HTML/CSS로 반응형 퍼블리싱까지 직접 합니다.",
  },
  {
    id: "ai",
    keys: ["ai", "인공지능", "claude", "클로드", "chatgpt", "gpt", "gemini", "제미나이"],
    text:
      "용도를 나눠 씁니다. Claude는 코딩, ChatGPT는 아이디어 확장과 이미지, Gemini는 이미지·영상 생성이요. " +
      "코드는 AI로 생성하되 직접 검토하고 수정해요. 화면 배치나 코드 구조처럼 AI가 못 잡는 부분은 본인이 판단해 다시 잡습니다.",
  },
  {
    id: "collab",
    keys: ["협업", "팀워크", "팀프로젝트", "갈등", "피드백", "소통"],
    text:
      "피드백을 방어하지 않고 발전의 재료로 씁니다. 레이어에서 입문자 중심 타깃을 제안했다가 팀에서 둘 다 보자는 의견이 나왔을 때, " +
      "입문자는 중심 사용자, 애호가는 콘텐츠 기여자로 나눈 절충 기획서로 다시 써서 최종 채택됐어요. " +
      "주장이 아니라 근거로 설득하려고 합니다.",
  },
  {
    id: "photoshop",
    keys: ["포토샵", "photoshop", "일러스트레이터", "illustrator"],
    text:
      "포토샵은 현재 학습 중이에요. 주력 툴은 Figma고, HTML/CSS로 직접 퍼블리싱까지 합니다.",
  },
  {
    id: "contact",
    keys: ["연락", "이메일", "메일", "contact", "이력서", "채용", "면접", "제안"],
    text:
      `이메일로 연락 주세요 — ${EMAIL} 입니다. 이력서는 이 사이트 맨 아래 Contact에서 바로 보실 수 있어요. ` +
      "더 나은 사용자 경험을 함께 고민하겠습니다!",
  },
];
