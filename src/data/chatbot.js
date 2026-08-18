// What the chatbot knows and what it says.
//
// Everything below is a sentence she wrote. That has not changed and is the
// whole point of the file: this thing speaks for a real person to people
// deciding whether to hire her, and an answer that is *nearly* right about her
// career is worse than no answer at all.
//
// There is exactly one consumer: chatbotMatch picks one of these answers by
// keyword and says it verbatim. No model is in the loop, here or in production —
// what a visitor reads is what is written below, and nothing else.
//
// That is a decision, not a limitation left unfixed. A grounded model answering
// out of this same material was built and worked; it was taken back out because
// the endpoint would be public and billed, and because a chatbot beside a
// portfolio does not need to understand a question — it needs to not get her
// career wrong. Snapkeep's image analysis is the one thing here that does call
// a model (see server/analyze.js), and that is because its whole claim is that
// AI reads the screenshot.
//
// The cost of that decision is real and worth knowing: the matcher only fires
// when a visitor types a substring it has been given. Phrase a covered question
// sideways — "일한 지 얼마나 되셨나요?" against keys like `몇년` — and it lands on
// FALLBACK instead. The fix for that is another key, not another model.
//
// VOICE: third person, always. The bot is an assistant that speaks *about* her,
// which is what the greeting, the fallback and OUT_OF_SCOPE all establish —
// "저는 수정님에 대해서만 답할 수 있어요". So "저" in an answer is the bot, never
// her, and an answer written in the first person makes the bot claim her degree
// and her four years. Say 수정님 at least once per answer and let the following
// sentences inherit the subject.
//
// Adding an answer: put it in ANSWERS with a few `keys` a visitor would
// actually type. Keys are matched as substrings against the question with
// spaces stripped, so short ones are dangerous — see match() for how they are
// weighted, and read the ORDERING note above ANSWERS before choosing a place.

export const EMAIL = "eysj1620@gmail.com";

/** The buttons shown above the thread when the panel opens, in order.
 *
 * The first three are the design's (Figma 343:2429) and stay as they were. The
 * last two were added once there were answers behind them: the AI one puts the
 * sharpest question a visitor could ask right on the surface rather than
 * waiting to be caught out by it, and the site one points at the thing they are
 * already looking at.
 *
 * Every one of these has to land on a written answer, and which one it lands on
 * is not obvious — they run through the same scoring as anything typed. Two of
 * the original three needed keys added when they were first wired up (see
 * `transition`), and the AI button here needed `ai로만들`. Change the wording and
 * you have to re-check it. The layout wraps, so a sixth would not break it. */
export const QUICK = [
  "uxui디자이너가 된 이유?",
  "진행한 프로젝트에 대한 설명",
  "장단점",
  "AI로 만들면 실력은?",
  "이 사이트도 직접 만들었나요?",
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

// ORDERING. match() breaks a tie by taking whichever answer comes first here,
// so the order is load-bearing in one specific case: a question that names a
// project *and* asks a sub-topic about it — "레이어에서 리서치는 어떻게
// 했어요?" — scores the project and the sub-topic equally, and the sub-topic is
// the actual question. So every sub-topic answer sits above the four project
// answers. Moving one below them silently changes what that question returns.
export const ANSWERS = [
  {
    id: "intro",
    keys: ["어떤디자이너", "소개", "누구", "어떤분", "본인", "자기소개", "어떤사람"],
    text:
      "수정님은 사용자도 의식하지 못한 불편을 발견해 설계하는 UX/UI 디자이너예요. " +
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
    //
    // "비전공" used to be here too and has moved to `non-major`, which is the
    // answer that question actually wants. It tied at 9 against that one and
    // won on being written first, so "비전공인데 괜찮을까요?" was answered with
    // the career-change story instead of the reassurance it was asking for.
    keys: [
      "사회복지", "직무", "전환", "왜디자인", "바꿨", "바꾸",
      "이직", "디자이너가되", "된이유",
    ],
    text:
      "수정님이 하던 사회복지사의 개입은 늘 문제가 생긴 뒤였어요. 문제가 생기기 전에 막을 수 없을까 고민한 끝에 디자인을 만났고요. " +
      "막아설 때보다 조금씩 나아지게 만들 때 힘을 얻는 사람이라, 도망친 게 아니라 개입의 시점을 사후에서 사전으로 재정의한 거예요.",
  },
  {
    id: "philosophy",
    keys: ["철학", "가치관", "중요하게", "신념", "디자인관", "어떻게디자인"],
    text:
      "수정님은 예쁜 것보다 사용성을 봐요. 정보를 다 보여주는 것과 잘 읽히는 것은 다르다고 생각하거든요. " +
      "같은 정보도 상황에 따라 압박이 될 수 있어서, 사용자의 맥락을 먼저 읽습니다.",
  },
  {
    id: "strengths",
    keys: ["장단점", "장점", "강점", "단점", "약점", "잘하는", "부족한"],
    text:
      "수정님의 장점은 작은 변화를 빠르게 알아차리는 거예요. 4년간 사회복지 현장에서 사람들의 작은 변화와 맥락을 읽는 게 일상이었고, " +
      "그 감각으로 사용자가 말하지 않는 불편을 찾아요. 반면 아쉬운 점이 눈에 잘 들어오는 만큼 세부를 다듬는 데 시간을 쓰는 편이라, " +
      "작업 초반에 우선순위를 정해 완성도와 일정을 함께 관리하는 습관을 기르고 있어요.",
  },

  // — 이력 —
  {
    id: "career",
    keys: ["경력몇", "경력", "몇년", "연차", "신입", "일한지", "얼마나되"],
    text:
      "수정님은 디자인 직무로는 신입이에요. 대신 그 전에 정신건강사회복지사로 4년간 일하며 사람의 숨은 니즈를 읽는 훈련을 했고, " +
      "그 감각을 디자인에 그대로 쓰고 있어요. 팀·개인 프로젝트 4개로 기획부터 구현까지의 경험을 쌓았습니다.",
  },
  {
    id: "education",
    keys: ["어디서배", "독학", "부트캠프", "학원", "배웠", "어떻게공부", "공부하셨"],
    text:
      "수정님은 비전공으로 시작해 학원 과정을 수료하고, 독학을 병행하며 배웠어요. " +
      "배운 것을 팀 프로젝트 2개와 개인 프로젝트 2개로 바로 검증했고, 지금 보고 계신 이 사이트도 그 과정의 결과물이에요.",
  },
  {
    id: "major",
    keys: ["전공", "무슨과", "학력", "학교", "대학", "졸업"],
    text:
      "수정님은 사회복지학을 전공했어요. 졸업 후 정신건강사회복지사로 4년간 일했고, 디자인은 학원 수료와 독학으로 익혀 프로젝트로 검증해왔어요. " +
      "전공은 다르지만, 사람을 이해하는 훈련은 그때 받은 셈이에요.",
  },
  {
    id: "previous-work",
    // "어떤회사"/"회사다니" are here rather than on `team-fit`, where they were
    // first drafted: "어떤 회사 다니셨어요?" is asking where she worked, not
    // what kind of team she wants to join next.
    // The two employers by name: someone who has read the résumé asks about
    // them directly, and nothing else on the site answers to either word.
    //
    // No bare "어떤회사" — it is the same four characters in "어떤 회사 다니셨어요?"
    // and "어떤 회사에 가고 싶으세요?", and answering the second with a list of
    // her former employers reads as not having understood the question. The
    // past-tense phrasings below carry the verb that distinguishes them; the
    // future-tense ones live on `company-fit`.
    keys: [
      "어디서일", "사회복지사로", "기관", "어떤회사다니", "회사다니", "어디다니",
      "전직장", "직장", "생명의터", "경주정신건강", "상담센터",
    ],
    text:
      "수정님은 생명의터와 경주정신건강상담센터에서 정신건강사회복지사로 4년간 근무했어요. " +
      "자세한 이력은 Contact에서 이력서로 확인하실 수 있어요.",
  },
  {
    id: "license",
    // The two long ones are here to win a fight, not to catch a phrasing.
    // "사회복지사 자격증 있나요?" contains 사회복지 — four characters, sixteen
    // points to 자격증's nine — so it was answered with the career-change story.
    // A key has to be longer than the one it is competing with, and `transition`
    // is written first, so a tie is not enough either.
    keys: ["자격증", "자격", "정신건강사회복지사", "사회복지사자격", "운전면허"],
    text:
      "수정님은 정신건강사회복지사 2급과 사회복지사 1급을 보유하고 있어요. (운전면허 1종 보통도 있고요.) " +
      "디자인 관련 자격증보다는 프로젝트 결과물로 실력을 보여드리는 쪽이에요.",
  },
  {
    id: "work-experience",
    // "인턴해"/"인턴경험" outrun `employment-type`'s bare "인턴": asking whether
    // she has interned is a question about experience, not about which contract
    // types she will accept.
    keys: ["실무경험", "회사에서", "실무해", "인턴해", "인턴경험", "실무는"],
    text:
      "수정님은 회사 소속 디자이너로 일한 실무 경험은 아직 없어요. 대신 팀 프로젝트 2개에서 기획·디자인·구현과 협업을, " +
      "개인 프로젝트 2개에서 전 과정을 혼자 완성하는 경험을 했어요. 실무의 검증은 이제 받으러 가는 중이고, 그래서 더 빠르게 흡수할 준비가 되어 있어요.",
  },
  {
    id: "no-experience",
    // "괜찮을까" was here and had to go. It is four characters, so it scored 16
    // — above almost every three-character noun on the site — and it is a plain
    // Korean ending rather than a subject, so it turned up in questions about
    // everything. "포토샵 못 하시는데 괜찮을까요?" and "비전공인데 괜찮을까요?"
    // both came back with this answer.
    keys: ["실무경험이없", "경험없는데", "경력없는데", "신입인데괜찮"],
    text:
      "수정님은 실무 경험은 없지만, 실무와 가까운 경험을 만들려고 했어요. 팀 프로젝트에서 기획-디자인-구현-협업의 전체 흐름을 겪었고, " +
      "개인 프로젝트는 혼자 끝까지 완성했어요. 이 사이트와 챗봇, 스냅킵 프로토타입까지 — 실제로 작동하는 것을 만들어온 사람이에요. " +
      "빠르게 배우는 건 이미 증명했다고 생각해요.",
  },
  {
    id: "non-major",
    // "비전공인데" as well as "비전공": the long one is what beats `major`'s
    // "전공", which is a substring of the very word the visitor typed.
    keys: ["비전공", "비전공인데", "전공안했", "전공안하"],
    text:
      "수정님이 비전공인 건 맞지만, 다른 전공이 무기가 됐어요. 4년간 사람의 말하지 않는 니즈를 읽는 훈련을 한 디자이너는 흔치 않으니까요. " +
      "그 감각이 리서치와 화면 설계에 그대로 쓰여요. 부족한 부분은 프로젝트 4개를 완성하며 채워왔고, 지금도 채우는 중이에요.",
  },
  {
    id: "back-to-social",
    keys: ["돌아갈생각", "다시사회복지", "복귀할생각", "사회복지로복귀"],
    text:
      "확실히 없어요. 사회복지를 떠난 게 아니라 사람을 돕는 방식을 바꾼 거고, 무엇보다 디자인은 창조하는 일이라 수정님과 잘 맞아요. " +
      "오래, 최선을 다할 수 있는 직업을 만났다고 생각하고 있어요.",
  },

  // — 채용 조건 —
  {
    id: "availability",
    keys: ["언제부터", "출근가능", "입사가능", "바로일", "일시작", "합류"],
    text:
      "수정님은 즉시 출근 가능해요. 구체적인 일정은 이메일로 문의해 주시면 조율할 수 있어요.",
  },
  {
    id: "employment-type",
    keys: ["정규직", "인턴", "계약직", "어떤형태"],
    text:
      "수정님은 정규직, 계약직, 인턴 모두 열어두고 있어요. 성장할 수 있는 팀이라면 형태보다 기회가 먼저라고 생각해요.",
  },
  {
    id: "salary",
    keys: ["연봉", "희망연봉", "급여", "페이", "처우", "보수", "얼마받"],
    text:
      "수정님은 연봉은 회사 내규를 따를 생각이에요. 지금은 금액보다 배우고 성장할 수 있는 환경이 우선이고요. 자세한 논의는 면접에서 나누고 싶어 해요.",
  },
  {
    id: "location",
    keys: [
      "근무지역", "재택", "어디근무", "지역이어디", "근무", "출퇴근",
      "어디사", "거주", "사는곳", "하이브리드", "원격",
    ],
    text:
      "수정님은 서울 전역 출퇴근 가능해요. 재택·하이브리드 환경도 잘 맞고요 — 혼자서도 끝까지 완성해본 사람이라, 원격에서도 스스로 굴러갑니다.",
  },
  {
    id: "company-fit",
    // The forward-looking half of "어떤 회사". See `previous-work` for why the
    // bare phrase belongs to neither of them.
    keys: [
      "어떤회사에", "가고싶은회사", "회사에가고", "가고싶", "지원하셨",
      "지원한이유", "지원동기", "산업분야", "어떤분야",
      "회사고를", "회사를고", "회사선택", "뭘보고",
    ],
    text:
      "수정님이 회사를 볼 때 기준은 성장 가능성이에요. 더 나아지는 쪽으로 움직이는 게 삶의 방식이라, 미래가 그려지지 않는 선택은 하지 않는 편이고요. " +
      "그 회사에서 일하는 자신의 모습과 성장이 그려지는지를 먼저 봅니다.",
  },
  {
    id: "startup-or-corp",
    keys: ["스타트업", "대기업", "규모가", "회사규모", "사수"],
    text:
      "수정님은 규모보다 배울 게 있는지를 봐요. 첫 회사인 만큼 사수가 있으면 좋겠다는 바람은 있지만, " +
      "스타트업이든 대기업이든 본인이 선택한 회사라면 배울 점이 있고 성장시켜줄 곳이라고 생각해요.",
  },
  {
    id: "worklife",
    // "워라밸중요" as well as "워라밸": on its own the short one loses to
    // `philosophy`'s "중요하게", which is a character longer and sits inside the
    // very question — "워라밸 중요하게 생각하세요?" came back with her design
    // philosophy.
    keys: ["워라밸", "워라밸중요", "야근", "주말근무", "업무강도", "일과삶", "칼퇴"],
    text:
      "수정님은 일에서도 성취감과 에너지를 얻는 편이라 야근을 부정적으로 보지는 않아요. " +
      "다만 건강을 해치지 않는 선에서라는 전제는 분명히 두고 있어요.",
  },
  {
    id: "other-applications",
    // "이직계획" has to outrun `transition`'s "이직", which is the same two
    // characters inside it — a question about where she is applying was being
    // answered with the story of why she left social work.
    keys: ["다른회사도", "여러회사", "이직계획", "다른곳도", "다른데도", "지원중"],
    text:
      "네, 여러 회사에 지원하고 있어요. 수정님과 잘 맞고 수정님을 필요로 하는 곳에서 일하고 싶다는 생각이라, " +
      "역량을 살려 최선을 다할 수 있는 자리를 찾는 중이에요.",
  },
  {
    id: "english",
    keys: ["영어", "외국어", "토익", "어학"],
    text:
      "업무에 쓸 수 있는 수준은 아직 아니에요. 어느 정도 알아듣는 정도고요. " +
      "필요한 자리라면 미리 준비해서 일에 차질이 없도록 할 생각이에요.",
  },
  {
    id: "coding-test",
    keys: ["코딩테스트", "코테", "과제전형", "기술면접", "실기시험"],
    text:
      "알고리즘 코딩 테스트를 따로 준비해본 적은 없어요. 대신 AI로 코드를 생성하고 직접 검토·수정하는 방식으로 " +
      "이 사이트와 프로젝트들을 실제로 구현했고, 필요한 디테일은 직접 고쳐가며 완성해왔어요. " +
      "과제 전형이라면 그 방식으로 결과물을 만들어 보여드릴 수 있어요.",
  },
  {
    id: "referral",
    keys: ["추천인", "레퍼런스체크", "평판조회"],
    text:
      `따로 준비된 추천인은 없어요. 궁금한 점은 ${EMAIL} 로 문의해 주시면 수정님이 직접 답변드려요.`,
  },

  // — 일하는 방식 —
  {
    id: "work-style",
    keys: ["일하는스타일", "업무스타일", "일하는방식", "어떻게일하", "업무방식"],
    text:
      "수정님은 시작 전에 방식을 먼저 정해요. 같은 일을 한 자료가 있으면 먼저 찾아보고 업무 방식을 세운 뒤 들어가고, " +
      "처음 하는 일이면 관련 자료와 레퍼런스를 참고해 방향을 잡아요. 그렇게 정하고 시작해야 더 효율적으로 진행된다고 생각해요.",
  },
  {
    id: "solo-or-team",
    keys: ["혼자일", "혼자하는", "혼자가편", "팀으로일", "협업이편", "혼자와같이"],
    text:
      "둘 다 장단점이 있지만 수정님은 협업 쪽을 더 좋아해요. 혼자 하면 본인 한계에서 멈추지만, " +
      "같이 하면 서로 영향을 주고받으며 더 나은 결과물이 나온다고 생각하거든요.",
  },
  {
    id: "stuck",
    keys: ["막히면", "막힐때", "모르는게", "안풀리", "어떻게해결", "질문은"],
    text:
      "먼저 찾아보고, 물어볼 수 있으면 물어봐요. 레퍼런스를 최대한 찾아본 뒤 조언을 구할 사람을 떠올려보고요. " +
      "요즘은 AI와 함께 방법을 모색하기도 해요.",
  },
  {
    id: "schedule",
    keys: ["일정관리", "일정은", "우선순위", "마감", "데드라인", "시간관리"],
    text:
      "수정님은 중요한 일 → 급한 일 → 빨리 끝낼 수 있는 일 → 중요하지도 급하지도 않은 일 순으로 처리해요. " +
      "작업 초반에 이 순서를 정해두고 시작하는 편이에요.",
  },
  {
    id: "personality",
    keys: ["성격", "mbti", "엠비티아이", "성향이"],
    text:
      "MBTI는 INFP인데 모든 지표가 비슷한 중도형이에요. 그래서 다양한 성향을 이해하는 편이고요. " +
      "대신 확실한 걸 좋아해서, 확실한 결과에 다가가려고 노력하는 점은 변하지 않아요.",
  },
  {
    id: "hobby",
    keys: ["취미", "스트레스", "쉴때", "주말에뭐", "여가"],
    text:
      "취미가 많아요. 식물과 어항을 돌보고, 요리와 청소도 좋아하고, 뜨개질이나 다이어리 꾸미기처럼 만드는 일도 해요. " +
      "낼 수 있는 시간과 상황에 맞춰 취미를 골라 쉬는 편이에요.",
  },
  {
    id: "ux-or-ui",
    keys: ["ux와ui", "어느쪽", "유엑스", "유아이"],
    text:
      "수정님의 출발은 UX였어요. 사람들과 상호작용하며 의도하고 개선하는 일이 좋아서 사회복지를 했고, 같은 이유로 리서치와 기획에 먼저 끌렸어요. " +
      "지금은 UI 디자인과 구현까지 다 훈련해서 둘을 이어서 일해요 — 문제를 정의하고, 화면으로 설계하고, 코드로 확인하는 것까지요.",
  },

  // — 이 사이트 —
  {
    id: "this-site",
    // "포트폴리오사이트" is eight characters for one reason: "포트폴리오 사이트는
    // 누가 만들었나요?" scored only on `projects`'s "포트폴리오" and came back
    // with the list of four projects instead of the answer about this site.
    keys: [
      "사이트직접", "직접만들", "직접만든", "직접만드", "사이트도만", "이사이트",
      "포트폴리오사이트", "누가만들", "사이트누가",
    ],
    text:
      "네, 수정님이 기획부터 디자인, 코드까지 직접 만들었어요. AI로 코드를 생성하고 본인이 검토·수정하는 방식으로 작업했고, " +
      "인터랙션과 반응형도 직접 잡았어요. 사이트 자체가 수정님의 작업 방식을 보여주는 증거인 셈이에요.",
  },
  {
    id: "tech-stack",
    keys: ["뭘로만들", "기술스택", "리액트", "react", "vite", "vercel", "호스팅", "어떻게만들"],
    text:
      "React와 Vite로 만들었어요. AI(Claude)로 코드를 생성하고 수정님이 직접 검토·수정하며 구현했고, Vercel로 배포했어요.",
  },
  {
    id: "this-chatbot",
    keys: ["챗봇도", "챗봇도직접", "챗봇직접", "챗봇직접만", "챗봇만든", "챗봇누가", "너도직접", "너는누가"],
    text:
      // "Claude API를 연결하고" was here and had to go: the chatbot does not
      // call a model, so it was telling visitors something untrue about the
      // very thing they were asking about. It cannot notice that itself — it
      // reads this text back whatever is running underneath — so the accuracy
      // has to be maintained here by hand.
      "네, 이 챗봇도 수정님이 직접 만들었어요! 제가 할 답변을 하나하나 직접 쓰고, 질문에 맞는 답을 찾아 꺼내는 방식까지 설계했어요. " +
      "저는 수정님이 정리해둔 내용 안에서만 답하도록 되어 있어요 — 모르는 건 지어내지 않고 이메일로 안내하는 것까지요.",
  },
  {
    id: "learn-section",
    keys: [
      "learn", "런섹션", "여섯개", "6개는",
      "한화", "뮤자인", "대방", "크루어라", "와이스튜디오", "qude",
    ],
    text:
      "LEARN의 6개는 수정님이 웹 기술과 인터랙션을 익히려고 직접 구현해본 학습 결과물이에요. " +
      "실제 클라이언트 작업이 아니라, 기존 사이트를 교재 삼아 디자인을 코드로 옮기는 훈련을 한 거예요. " +
      "이 과정에서 HTML/CSS와 반응형, 인터랙션 구현 감각을 쌓았어요.",
  },
  {
    id: "clone-or-client",
    keys: ["클론코딩", "클라이언트작업", "실제작업"],
    text:
      "클론코딩(학습용 구현)이 맞아요. 실제 클라이언트 작업으로 보이지 않게 정직하게 말씀드려요. " +
      "대신 실제 서비스 수준의 화면을 코드로 재현하며 퍼블리싱 실력을 쌓는 것이 목적이었고, 그 결과는 프로젝트 4개에서 확인하실 수 있어요.",
  },

  // — AI —
  {
    id: "ai",
    keys: ["ai", "인공지능", "claude", "클로드", "chatgpt", "gpt", "gemini", "제미나이"],
    text:
      "수정님은 용도를 나눠 써요. Claude는 코딩, ChatGPT는 아이디어 확장과 이미지, Gemini는 이미지·영상 생성이요. " +
      "코드는 AI로 생성하되 직접 검토하고 수정해요. 화면 배치나 코드 구조처럼 AI가 못 잡는 부분은 직접 판단해 다시 잡습니다.",
  },
  {
    id: "ai-skill",
    // "ai로만들" is the fourth quick button's; without it that button scored
    // only on the bare "ai" key and came back with the tool-list answer above,
    // which is not what the button asks.
    keys: [
      "본인실력", "네실력", "ai로다만들", "ai로만들", "실력은뭔", "그럼실력",
      "ai가다한", "다한거", "ai가한거", "본인이한",
    ],
    text:
      "좋은 질문이에요. AI는 생성을 하고, 판단은 수정님이 해요. 예를 들어 AI가 짠 코드가 화면에서 비눗방울을 규칙 없이 흩어놓았을 때 " +
      "좌표를 직접 조정해 배치를 잡았고, 클래스명이 제각각이라 재사용이 안 되는 구조는 직접 다시 정립했어요. " +
      "무엇이 잘못됐는지 알아보고 고칠 수 있는 것 — 그게 AI 시대 디자이너의 실력이라고 생각해요.",
  },
  {
    id: "ai-fixed",
    keys: ["직접잡", "ai가못", "직접고친", "직접수정한"],
    text:
      "세 가지가 있어요. 아쿠아플라넷에서 AI가 비눗방울을 화면에 맞게 배치하지 못해 수정님이 x·y 좌표를 직접 조정했고, " +
      "작은 화면에서 빛 인터랙션이 디자인을 덮길래 덜어내는 판단을 했어요. 학습 앱에서는 AI 코드의 클래스명이 제각각이라 재사용 구조를 직접 다시 잡았고요. " +
      "AI는 도구고 품질은 사람이 책임진다는 게 수정님의 생각이에요.",
  },
  {
    id: "ai-replace",
    keys: ["필요없어", "대체", "대체할", "대체하", "디자이너없어"],
    text:
      "수정님은 오히려 반대라고 생각해요. AI가 생성을 빠르게 해줄수록, 무엇을 만들지 정의하고 결과가 맞는지 판단하는 사람이 더 중요해져요. " +
      "그 판단을 매 프로젝트에서 해왔고요 — AI 결과물이 의도와 다를 때 원인을 짚고 다시 잡는 것까지요. " +
      "AI를 쓰는 능력은 결국 AI에게 정확히 요구하는 능력이라는 게 수정님의 결론이에요.",
  },

  // — 과정과 역량. 프로젝트 답변보다 위에 있어야 한다(맨 위 ORDERING 참고) —
  {
    id: "research",
    keys: ["리서치", "설문", "조사"],
    text:
      "레이어에서 향수 사용자 50명에게 10가지를 묻는 설문을 진행했어요. 수정님은 AI로 만든 초안 문항을 다듬어 설문지를 제작했고, " +
      "설문은 팀원 모두가 함께 진행했어요. 그 결과 절반 이상이 \"나에게 맞는 향을 찾기 어렵다\"고 답해, " +
      "문제가 정보의 양이 아니라 취향 정의에 있다는 걸 확인했어요.",
  },
  {
    id: "usability-test",
    // "휴리스틱" is the word the answer itself leans on — and the 4.2 score was
    // unreachable without it.
    keys: ["사용성테스트", "usability", "유저테스트", "휴리스틱", "검증", "평가는"],
    text:
      "수정님은 레이어에서 휴리스틱 평가로 사용성을 점검했어요 — 전체 평균 4.2점으로, 미니멀한 디자인과 사용자 통제 항목이 높았고 " +
      "도움말·오류 방지가 보완점으로 나왔어요. 스냅킵의 버튼 배치는 실제 사용성 테스트로 검증하는 것을 다음 단계 과제로 정직하게 남겨뒀어요.",
  },
  {
    id: "design-system",
    keys: ["디자인시스템", "컴포넌트", "가이드", "폰트위계", "표준화", "일관성"],
    text:
      "레이어에서 팀과 함께 폰트 위계, 컬러, 컴포넌트를 표준화했어요. 시스템 정립은 팀이 함께했고, " +
      "수정님은 \"실제로 쓰기 편한가\"의 관점에서 피드백과 의견을 보태는 역할이었어요. 정리된 시스템 안에서 담당 화면들을 일관되게 구현했고요.",
  },
  {
    id: "responsive",
    // "모바일대응" rather than a bare "모바일": the word turns up inside the
    // magazine and Snapkeep answers too, and three characters is enough to win
    // questions that are not about responsive work at all.
    keys: ["반응형", "모바일대응", "화면크기", "디바이스", "모바일에서"],
    text:
      "수정님은 아쿠아플라넷에서 처음 반응형을 잡아봤어요. PC에서 자연스럽던 빛 인터랙션이 태블릿·모바일에서 디자인을 덮어버려서, " +
      "작은 화면에서는 인터랙션을 덜어내는 판단을 했어요. 무리하게 유지하며 오류를 감수하기보다 간소화하는 게 낫다는 걸 그때 배웠고, " +
      "이 사이트도 반응형으로 직접 잡았어요.",
  },
  {
    id: "a11y",
    keys: ["접근성", "a11y", "스크린리더", "웹접근성", "장애인"],
    text:
      "웹 접근성 표준(스크린리더 대응 같은)을 전문적으로 다뤄본 건 아직 아니에요. " +
      "다만 수정님이 사용성을 볼 때 가장 먼저 따지는 게 \"사용자가 접근할 수 있는가\"예요 — 접근할 수 있어야 사용할 수 있으니까요. " +
      "그 관점의 연장에서, 접근성 표준은 실무에서 제대로 배워가고 싶은 영역이에요.",
  },
  {
    id: "data-driven",
    keys: ["지표", "데이터보고", "데이터기반"],
    text:
      "수정님은 휴리스틱 지표로 계속 평가하고 수정하는 방식으로 일해요. 레이어에서는 휴리스틱 평가(평균 4.2점)로 보완점을 짚었고, " +
      "설문 데이터에서 서비스 방향을 잡았어요. 실사용 트래픽 같은 정량 지표 기반 개선은 실무에서 꼭 해보고 싶은 부분이에요.",
  },
  {
    id: "duration",
    keys: ["기간", "얼마나걸", "몇주", "몇개월"],
    text:
      "리뷰는 3월 말부터 6월 초까지 약 두 달, 아쿠아플라넷은 6월 한 달, 레이어는 7월부터 8월 초까지 약 한 달간 진행했어요. " +
      "스냅킵은 약 2~3주간 혼자 집중해서 만들었고요.",
  },
  {
    id: "team-role",
    keys: [
      "팀규모", "몇명", "역할은", "역할", "에서역할", "맡은역할", "뭐맡",
      "담당", "담당한", "무슨일했",
    ],
    text:
      "레이어는 6인 팀이었고, 수정님은 리서치 설문지 제작과 매거진·향수 상세페이지·챗봇 캐릭터 디자인, " +
      "그리고 향수 상세페이지·카테고리·챗봇 구현을 맡았어요. 아쿠아플라넷에서는 기획 문서 작성과 티켓 예매 페이지 UI·퍼블리싱을 담당했고요. " +
      "스냅킵과 리뷰는 혼자 전 과정을 진행한 개인 프로젝트예요. 팀 프로젝트는 모두 6인 1조로 진행했어요.",
  },
  {
    id: "hardest",
    // "매거진"/"카드뉴스" are here because this is the only answer that tells
    // that story — the magazine with no reference to work from, and where the
    // idea finally came from. Nothing else on the site would return it.
    keys: [
      "어려웠", "힘들었", "실패", "좌절", "어려운", "어려움", "난관",
      "매거진", "카드뉴스", "거절",
    ],
    text:
      "수정님이 꼽는 순간은 둘이에요. 레이어에서 매거진을 맡았는데 참고할 모바일 매거진 레퍼런스가 아예 없어 막막했던 때 — " +
      "결국 '작은 화면에서 긴 정보를 전달한다'는 본질만 남기니 카드뉴스에서 실마리가 보였고, 세 가지 구조를 직접 설계했어요. " +
      "그리고 첫 팀 프로젝트에서 기획과 디자인이 거절당한 경험이요. 쉽지 않았지만 그 덕에 자기 수준을 객관적으로 보게 됐어요.",
  },
  {
    id: "regret",
    // "바꾸고싶" has to be longer than `transition`'s "바꾸" — the same two
    // characters sit inside it, and "다시 한다면 뭘 바꾸고 싶으세요?" was coming
    // back with the story of changing careers.
    keys: ["아쉬운", "아쉬웠", "다시한다면", "바꾸고싶", "개선하고싶", "후회"],
    text:
      "레이어를 꼽아요. 입문자를 중심에 두고 애호가가 콘텐츠로 뒷받침하는 구조를 제안해 채택됐는데, " +
      "다시 한다면 그 관계를 더 견고하게 받쳐줄 시스템까지 설계하고 싶어 해요.",
  },
  {
    id: "dev-collab",
    keys: ["개발자와", "개발자랑", "개발협업", "개발자", "개발경험", "엔지니어"],
    text:
      "수정님은 개발자 직군과 함께 일해본 경험은 아직 없어요. 코딩 자체를 디자인 공부하며 처음 시작했고요. " +
      "대신 디자인을 직접 코드로 구현해봤기 때문에, 개발자가 어떤 정보를 필요로 하는지 — 재사용 가능한 구조, 명확한 클래스 체계, 반응형 기준 — 를 몸으로 이해하고 있어요. " +
      "협업할 때 개발자의 언어로 소통할 수 있는 디자이너라고 생각해요.",
  },
  {
    id: "collab",
    keys: ["협업", "팀워크", "팀프로젝트", "갈등", "피드백", "소통"],
    text:
      "수정님은 피드백을 방어하지 않고 발전의 재료로 써요. 레이어에서 입문자 중심 타깃을 제안했다가 팀에서 둘 다 보자는 의견이 나왔을 때, " +
      "입문자는 중심 사용자, 애호가는 콘텐츠 기여자로 나눈 절충 기획서로 다시 써서 최종 채택됐어요. " +
      "주장이 아니라 근거로 설득하려고 합니다.",
  },

  {
    id: "process",
    keys: ["작업순서", "어떤순서", "순서가", "프로세스", "와이어프레임", "어디부터시작"],
    text:
      "기획부터 시작해요. 조사와 자료를 토대로 문제점과 해결 방안, 필요한 기능을 정하고, " +
      "네비게이션과 주요 페이지를 선정한 뒤 와이어프레임을 그려요. 그다음 상세 페이지를 만들면서 구체적인 디자인으로 들어갑니다.",
  },
  {
    id: "prototyping",
    keys: ["프로토타이핑", "프로토타입은", "인터랙션툴", "시안을코드"],
    text:
      "피그마로 먼저 만들고 코딩하는 순서예요. 빠르게 가야 할 때는 코드로 바로 갈 수도 있지만, " +
      "디자인과 기능을 자세히 정한 뒤 구현하는 쪽이 결과물의 완성도가 훨씬 좋다고 생각해요.",
  },
  {
    id: "design-options",
    keys: ["시안", "몇개만드", "안을몇", "여러개만드"],
    text:
      "개인 작업일 때는 피드백에 맞춰 시안을 여러 개 만들어봤고, 팀 프로젝트에서는 팀원이 각자 디자인을 해온 뒤 " +
      "그중에서 방향을 골랐어요. 실무가 아니라 학원 과정의 프로젝트에서 쌓은 경험이에요.",
  },
  {
    id: "planning-doc",
    keys: ["기획서", "기획문서", "문서작성", "기획도"],
    text:
      "네, 씁니다. 아쿠아플라넷에서 기획 문서를 담당했어요. 초안은 AI로 빠르게 잡되, " +
      "AI가 놓치는 부분을 질문하고 피드백하며 현실성 있는 기획서로 다듬는 방식이에요.",
  },
  {
    id: "interview-persona",
    keys: ["인터뷰", "페르소나", "타깃설정", "사용자정의"],
    text:
      "인터뷰 대신 설문조사를 진행했어요. 레이어에서 50명에게 물었고, 줄글로 답하는 문항에서 주요한 문제들을 받을 수 있었어요. " +
      "그 답변을 토대로 핵심 페르소나를 정하고 기획서를 썼습니다.",
  },
  {
    id: "analytics",
    keys: ["분석도구", "애널리틱스", "구글애널", "ab테스트", "에이비테스트", "정량분석"],
    text:
      "아직 없어요. 지금까지 해본 평가는 휴리스틱 평가예요. " +
      "GA 같은 분석 도구나 A/B 테스트는 실무에서 꼭 해보고 싶은 부분이고요.",
  },
  {
    id: "design-qa",
    keys: ["디자인qa", "큐에이", "qa도", "검수"],
    text:
      "디자인 QA를 따로 맡아본 경험은 아직 없어요. 실무에서 배워가고 싶은 부분이에요.",
  },
  {
    id: "app-or-web",
    keys: ["앱과웹", "웹과앱", "앱이편", "웹이편", "앱웹", "앱이랑웹"],
    text:
      "둘 다 장단점이 있다고 생각해요. 웹은 새롭고 다양한 시도를 하기 좋은 대신 한계가 없어서 무엇을 시도할지 망설여지고, " +
      "앱은 한정된 화면에 정리해 넣어야 하지만 틀이 어느 정도 잡혀 있어 빠르게 작업할 수 있어요.",
  },
  {
    id: "branding-motion",
    keys: ["브랜딩", "그래픽디자인", "모션", "영상편집", "일러스트"],
    text:
      "아직이에요. 비전공으로 시작해 UX/UI 디자인을 중심으로 배워와서 브랜딩·그래픽·모션은 다뤄본 적이 없어요. " +
      "앞으로 배워가고 싶은 영역이에요.",
  },
  {
    id: "metrics",
    // Not "지표" — that belongs to `data-driven`, which is about how she works
    // rather than what the numbers were.
    keys: ["성과", "수치", "숫자로", "정량적", "결과가어"],
    text:
      "휴리스틱 평가 점수가 있어요. 개인 프로젝트인 리뷰는 4.22점, 팀 프로젝트는 4점대를 받았어요. " +
      "실사용 트래픽 같은 정량 지표는 아직 없고, 실무에서 꼭 다뤄보고 싶은 부분이에요.",
  },

  // — 배움과 관심 —
  {
    id: "learning-now",
    // "공부는"/"공부어떻게" rather than a bare "공부", which belongs to `reviu`
    // — the study app. "공부는 어떻게 계속 하세요?" was being answered with a
    // description of that project.
    keys: ["요즘배우", "배우고있", "배우고계", "공부는", "공부어떻게", "학습중", "계속공부"],
    text:
      "요즘은 포토샵을 배우고 있어요. 디자이너라면 숙지하고 있어야 할 프로그램이라고 생각해서, 영상 강의를 찾아보며 익히는 중이에요.",
  },
  {
    id: "fav-service",
    keys: [
      "좋아하는앱", "좋아하는서비스", "자주쓰는", "디자인사이트", "즐겨보는",
      "awwwards", "mobbin", "godly",
    ],
    text:
      "자주 쓰는 앱은 카카오톡, 인스타그램, 유튜브, AI 서비스예요. 새로운 정보를 얻는 걸 좋아해서 검색 기능을 가장 많이 쓰고요. " +
      "디자인 레퍼런스는 Awwwards, Mobbin, Godly를 주로 봅니다.",
  },
  {
    id: "trend",
    keys: ["트렌드", "트랜드", "유행"],
    text:
      "솔직히 트렌드는 수정님에게 아직 어려운 영역이에요. 지금은 레퍼런스를 꾸준히 모으며 감각을 쌓아가는 단계예요.",
  },
  {
    id: "rolemodel",
    keys: ["롤모델", "존경하는", "닮고싶", "본받고싶"],
    text:
      "아직 이 분야를 깊이 알지 못해서 정해둔 분은 없어요. 굳이 꼽자면 학원 강사님이요. " +
      "트렌드를 읽는 능력과 개선할 점을 짚어내는 실력을 본받고 싶어 해요.",
  },
  {
    id: "book",
    // Not a bare "책" — one character scores 1, under MIN_SCORE, so it never
    // fires on its own.
    keys: ["읽은책", "책있", "책을", "독서", "무슨책"],
    text:
      "올해 「직업으로서의 정치」를 읽었어요. 직업에 대한 철학적인 고민을 하고 싶어 집어들었는데 실제 내용은 정치에 필요한 역량에 관한 이야기였고, " +
      "과거의 글이 지금의 고민에 답을 주기도 한다는 걸 느꼈다고 해요.",
  },
  {
    id: "overseas",
    keys: ["해외취업", "해외", "외국에서", "글로벌"],
    text:
      "당장의 해외 취업은 아니지만, 언젠가 외주나 회사에서 맡는 외국 기업 대상 프로젝트에 참여해보고 싶어 해요.",
  },

  // — 프로젝트 —
  {
    id: "snapkeep-launch",
    // The project's own name has to be in these keys. "출시" alone is two
    // characters against "스냅킵"'s three, so on score the general Snapkeep
    // answer below won every question that named the project — which is every
    // question anyone would ask about whether it shipped.
    keys: ["스냅킵출시", "스냅킵실제", "스냅킵쓰", "스냅킵배포", "출시", "실제로쓰", "쓰는사람", "배포했"],
    text:
      "아직 출시 전이에요. 지금은 실제 작동하는 프로토타입 단계로, Experience It 섹션에서 직접 써보실 수 있어요. " +
      "스크린샷을 올리면 AI가 태깅하고 검색해 꺼내는 핵심 흐름은 실제로 작동해요.",
  },
  {
    id: "snapkeep",
    // Both halves of both phrasings — "제일 자신있는"/"가장 잘한" are as likely
    // as the two that were here, and matched nothing.
    keys: [
      "스냅킵", "snapkeep", "대표프로젝트", "대표작",
      "제일잘한", "가장잘한", "제일자신", "가장자신",
    ],
    text:
      "스크린샷을 넣으면 AI가 태깅하고, 필요할 때 자기 말로 검색해 꺼내는 레퍼런스 아카이브예요. " +
      "모으기만 하고 못 찾는 문제를 수정님이 직접 겪어서, 혼자 기획부터 프로토타입까지 만들었어요. " +
      "이 사이트 Experience It 섹션에서 직접 써보실 수 있어요!",
  },
  {
    id: "layer",
    keys: ["레이어", "layer", "향수"],
    text:
      "6인 팀으로 만든 향수 커뮤니티 앱이에요. 리서치에서 사용자 50명 중 절반 이상이 " +
      "\"나에게 맞는 향 찾기가 어렵다\"고 했고 9할이 맞춤 추천을 원했는데, 추천은 취향이 정의된 다음에야 가능하잖아요. " +
      "정작 '내 취향'을 다뤄주는 서비스가 없다는 게 팀이 찾은 빈자리였어요. " +
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
      "필기를 스캔하면 코넬 노트로 정리되고 AI가 문제를 만들어주는 학습 앱이에요. 수정님이 혼자 기획부터 구현까지 했고요. " +
      "가장 신경 쓴 건 오히려 '보여주지 않는 것'이었어요. 밀린 복습량을 보여주면 압박이 되니까, " +
      "시스템이 오늘의 학습에 복습분을 알아서 섞어 부담 없이 따라가게 했습니다.",
  },
  {
    id: "projects",
    // Steps aside whenever a named project also matched — see match().
    general: true,
    keys: ["프로젝트", "포트폴리오", "작업물", "어떤거만들", "어떤거만드"],
    text:
      "4개예요. 스냅킵(레퍼런스 아카이브), 레이어(향수 커뮤니티 앱), 아쿠아플라넷(아쿠아리움 리뉴얼), 리뷰(학습 앱). " +
      "궁금한 이름을 말씀해 주시면 자세히 알려드릴게요!",
  },

  // — 그 외 —
  {
    id: "skills",
    // A bare "툴" is one character and scores 1 — under MIN_SCORE, so it never
    // fired on its own. It is kept for questions that also match something
    // else, and the usable phrasings are spelled out beside it.
    keys: [
      "스킬", "기술", "툴", "figma", "피그마", "html", "css", "퍼블리싱", "할줄",
      "어떤툴", "무슨툴", "툴쓰", "툴은", "프로그램", "다룰수",
    ],
    // "사용하는" was here and had to go: four characters beat the two of "ai", so
    // "어떤 AI 사용하는지 궁금해요" came back with the tool list.
    text:
      "수정님은 UX 리서치, 기획, UI 디자인, 인터랙션 디자인을 해요. 주력 툴은 Figma고요. " +
      "HTML/CSS로 반응형 퍼블리싱까지 직접 합니다.",
  },
  {
    id: "photoshop",
    keys: ["포토샵", "photoshop", "일러스트레이터", "illustrator"],
    text:
      "포토샵은 수정님이 현재 학습 중이에요. 주력 툴은 Figma고, HTML/CSS로 직접 퍼블리싱까지 합니다.",
  },
  {
    id: "team-fit",
    // "회사문화" *and* "문화": the long one only ties `previous-work`'s "어떤회사"
    // at sixteen, and that one is written first, so the tie goes to it. The two
    // together add up to twenty and win.
    keys: [
      "어떤팀", "어떤사람과", "같이일하", "동료", "문화", "회사문화", "팀문화",
      "분위기", "일하고싶은",
    ],
    text:
      "솔직하게 피드백을 주고받는 팀이요. 수정님은 팀 프로젝트에서 거절당하는 경험을 통해 성장했고, " +
      "듣기 좋은 말보다 더 나은 방향을 함께 고민해주는 동료가 결과물을 좋게 만든다는 걸 배웠어요. 본인도 그런 동료가 되고 싶어 해요.",
  },
  {
    id: "inspiration",
    // No bare "레퍼런스". It is four characters against 스냅킵's three, so it won
    // "스냅킵은 레퍼런스 아카이브인가요?" — a question about the project, answered
    // with where she keeps her bookmarks. The phrasings below all carry a second
    // word, which is what keeps them to questions actually about finding them.
    keys: [
      "영감", "레퍼런스어디", "어디서얻", "어디서찾", "참고자료",
      "핀터레스트", "북마크", "레퍼런스모",
    ],
    text:
      "수정님은 북마크, 핀터레스트, 피그마 커뮤니티에 레퍼런스를 꾸준히 모아요. 사실 너무 많이 모아서 못 찾는 게 문제였고, " +
      "그걸 풀려고 만든 게 스냅킵이에요. 그리고 딱 맞는 레퍼런스가 없을 땐 분야 밖에서 찾아요 — 모바일 매거진을 카드뉴스에서 착안했던 것처럼요.",
  },
  {
    id: "future",
    keys: [
      "5년뒤", "3년뒤", "어떤디자이너가되", "미래", "목표", "비전",
      "앞으로", "되고싶", "장기적",
    ],
    text:
      "사용자의 불편을 먼저 눈치채고 개선하는 디자이너요. 지금 이 사이트에서 계속 말씀드린 그 방향 그대로예요. " +
      "사람들이 말하기 전에 알아차리는 것 — 그걸 3년 뒤에도 5년 뒤에도 더 잘하는 사람이 되고 싶어 해요.",
  },
  {
    id: "portfolio-pdf",
    // "포트폴리오pdf" is eight characters because it has to beat `projects`'s
    // "포트폴리오" — otherwise a request for the PDF is answered with the list
    // of four projects.
    keys: ["pdf", "포트폴리오pdf", "비핸스", "behance", "노션포트폴리오", "파일로"],
    text:
      "프로젝트 3개를 정리한 PDF 장표가 있어요. 다만 웹과 앱으로 구현한 쪽이 훨씬 사용성이 좋아서, " +
      `직접 써보실 수 있는 이 사이트로 보시기를 더 권해요. PDF가 필요하시면 ${EMAIL} 로 요청해 주세요.`,
  },
  {
    id: "collab-tools",
    keys: ["노션", "협업툴", "깃으로", "깃을", "git", "버전관리", "협업도구"],
    text:
      "노션으로 회의록과 일정, 팀원 연락처처럼 협업에 필요한 정보를 공유하며 일했어요. " +
      "코드는 깃으로 관리했는데, 오류도 많이 겪고 규칙을 정해가며 원활한 협업을 만들어간 게 기억에 남는다고 해요.",
  },
  {
    id: "github",
    keys: ["깃허브", "github", "깃헙", "소스코드"],
    text:
      `깃허브 계정은 있어요. 주소는 ${EMAIL} 로 문의해 주시면 안내드릴게요.`,
  },
  {
    id: "sns",
    keys: ["sns", "인스타", "링크드인", "소셜"],
    text:
      "인스타그램을 해요. 이 분야를 공부하기 시작하면서 게시물을 올리지는 못했지만, 정보를 찾는 용도로 활용하고 있어요.",
  },
  {
    id: "contact",
    keys: ["연락", "이메일", "메일", "contact", "이력서", "채용", "면접", "제안"],
    text:
      `이메일로 연락 주세요 — ${EMAIL} 입니다. 이력서는 이 사이트 맨 아래 Contact에서 바로 보실 수 있어요. ` +
      "더 나은 사용자 경험을 함께 고민할 기회를 기다리고 있어요!",
  },
];
