import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Snapkeep's "AI 분석" endpoint.
//
// This runs inside the Vite dev server (Node), never in the browser, so the
// API key stays in .env and is never bundled. `apply: 'serve'` means it is not
// part of `vite build` at all — a statically deployed build has no /api/analyze,
// the fetch fails, and the client falls back to its local heuristic.
function snapkeepAnalyze(apiKey) {
  return {
    name: 'snapkeep-analyze',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (request, response) => {
        const send = (status, body) => {
          response.statusCode = status
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify(body))
        }

        if (request.method !== 'POST') return send(405, { error: 'POST만 지원합니다.' })

        if (!apiKey) {
          return send(503, {
            error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.example을 참고해 .env를 만들어 주세요.',
          })
        }

        try {
          const { default: Anthropic } = await import('@anthropic-ai/sdk')
          const { image, mediaType, fileName } = await readJson(request)
          if (!image) return send(400, { error: '이미지가 없습니다.' })

          const client = new Anthropic({ apiKey })
          const result = await client.messages.parse({
            model: 'claude-opus-5',
            // 20-40 layout blocks, each with a box and a tone, plus the parts
            // list and the prose. 4096 fitted the old coarse block list and no
            // longer does; a response cut off mid-array is a wireframe missing
            // its bottom half.
            max_tokens: 8192,
            // Was 'low', which suited tagging: pick six labels off a menu. The
            // layout pass is a different job — reading positions and relative
            // darkness off an image is measurement, and measurement done
            // carelessly produces a plausible drawing of the wrong screen.
            output_config: { effort: 'medium', format: { type: 'json_schema', schema: TAG_SCHEMA } },
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: image } },
                  { type: 'text', text: `파일명: ${fileName ?? '(없음)'}\n이 UI 스크린샷을 분석해 태그를 정리해 주세요.` },
                ],
              },
            ],
          })

          if (result.stop_reason === 'refusal') {
            return send(422, { error: '모델이 이 이미지 분석을 거절했습니다.' })
          }
          if (!result.parsed_output) {
            return send(502, { error: '분석 결과를 해석하지 못했습니다.' })
          }

          send(200, { analysis: result.parsed_output, model: result.model })
        } catch (error) {
          server.config.logger.error(`[snapkeep-analyze] ${error?.message ?? error}`)
          send(502, { error: error?.message ?? 'AI 분석에 실패했습니다.' })
        }
      })
    },
  }
}

// The chatbot's answers, generated rather than looked up.
//
// Same shape as the analyzer above and for the same reasons: inside the dev
// server, key never bundled, `apply: 'serve'` so a static build simply does not
// have it. When it is not there the client falls back to the keyword matcher it
// used to be — see lib/chatbotAsk.
//
// The one thing that is not like the analyzer: this is *grounded*, not open.
// data/chatbot.js opens by arguing against putting a model in this loop at all,
// and the argument is right — it speaks for a real person to people deciding
// whether to hire her, and an answer that is nearly right about her career is
// worse than none. So the model is not asked what it knows. It is handed her
// written answers as the only permitted source and told to answer out of them:
// what it adds is understanding the question, not the facts.
//
// Which is the actual gap. The matcher needs a visitor to type a substring it
// has been given; ask it something phrased sideways, or two things at once, and
// it dead-ends on the email line. This closes that without inventing anything.
function chatbotAnswer(apiKey) {
  return {
    name: 'chatbot-answer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (request, response) => {
        const send = (status, body) => {
          response.statusCode = status
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify(body))
        }

        if (request.method !== 'POST') return send(405, { error: 'POST만 지원합니다.' })
        if (!apiKey) return send(503, { error: 'ANTHROPIC_API_KEY가 없습니다.' })

        try {
          const { default: Anthropic } = await import('@anthropic-ai/sdk')
          // The same file the matcher and the panel read. One place to edit an
          // answer, and no second copy of her career to drift out of date.
          const facts = await import('./src/data/chatbot.js')
          const { question, history } = await readJson(request)
          if (!question?.trim()) return send(400, { error: '질문이 없습니다.' })

          const client = new Anthropic({ apiKey })
          const result = await client.messages.create({
            model: 'claude-opus-5',
            // An answer is two or three sentences. Room for that and no room to
            // wander into an essay about her.
            max_tokens: 512,
            output_config: { effort: 'low' },
            system: chatSystemPrompt(facts),
            messages: [
              // A few turns of context so "그건 왜요?" has an antecedent. Only a
              // few: this is a question box beside a portfolio, not a thread
              // anyone scrolls back through.
              ...(Array.isArray(history) ? history.slice(-6) : []).map((m) => ({
                role: m.from === 'you' ? 'user' : 'assistant',
                content: String(m.text ?? ''),
              })),
              { role: 'user', content: question.trim() },
            ],
          })

          const text = result.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('')
            .trim()

          if (!text) return send(502, { error: '답변을 만들지 못했습니다.' })
          send(200, { text })
        } catch (error) {
          server.config.logger.error(`[chatbot-answer] ${error?.message ?? error}`)
          send(502, { error: error?.message ?? '답변에 실패했습니다.' })
        }
      })
    },
  }
}

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

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      // A downscaled screenshot is well under this; anything larger is a bug.
      if (body.length > 12_000_000) reject(new Error('요청이 너무 큽니다.'))
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('잘못된 요청 형식입니다.'))
      }
    })
    request.on('error', reject)
  })
}

// The enums mirror FILTERS in SnapkeepSpread.jsx, so every tag the model returns
// is one the filter drawer can actually find again.
const PLATFORMS = ['모바일 앱', '웹(데스크톱)', '웹(모바일)', '태블릿']
const SERVICES = ['커머스', '핀테크', '콘텐츠·미디어', '여행·이동', '헬스케어', '소셜']
const SCREENS = ['홈', '상세', '랜딩·히어로', '대시보드', '결제·주문', '프로필·설정']
const ELEMENTS = ['헤더', '탭바', '카드', '리스트', '칩', '검색바', '버튼', '폼', '스텝퍼', '토글']
const MOODS = ['미니멀', '다크', '라이트', '파스텔', '비비드', '사진 중심']

// The wireframe's vocabulary. Roles are leaf-level: a button and its label are
// two entries, not one, because the drawing places every element where it
// really sits and a label is an element.
const BLOCK_ROLES = [
  '배경', '헤더', '탭바', '검색바', '이미지', '카드', '리스트', '텍스트', '버튼', '칩', '입력', '아이콘', '구분선', '곡선',
]

// Rounded and circular things have to be told apart, because a picture is drawn
// as a crossed box and a round picture — an avatar — as a crossed circle.
const BLOCK_SHAPES = ['사각형', '둥근사각형', '원']
const BLOCK_ALIGNS = ['왼쪽', '가운데', '오른쪽']

// Normalised to the screenshot (0 = left/top edge, 1 = right/bottom), so the
// wireframe redraws at whatever size the panel gives it without carrying the
// original's pixel dimensions around.
//
// `tone` is what makes the drawing greyscale rather than colourless. The
// wireframe throws the hues away but keeps how dark each thing was, so a black
// bar stays the heaviest thing on the page and a pale card stays quiet — which
// is the part of the original's hierarchy that survives losing colour.
const LAYOUT_BLOCK = {
  type: 'object',
  properties: {
    role: { type: 'string', enum: BLOCK_ROLES },
    x: { type: 'number', description: '요소 왼쪽 위치. 화면 너비 대비 0~1 비율.' },
    y: { type: 'number', description: '요소 위쪽 위치. 화면 높이 대비 0~1 비율.' },
    w: { type: 'number', description: '요소 너비. 화면 너비 대비 0~1 비율.' },
    h: { type: 'number', description: '요소 높이. 화면 높이 대비 0~1 비율.' },
    tone: {
      type: 'number',
      description:
        '이 요소가 실제로 얼마나 어두운지. 0이 검정, 1이 흰색입니다. 색상은 무시하고 밝기만 봅니다. 예: 검은 버튼 0.1, 진한 파란 버튼 0.35, 회색 카드 0.8, 흰 카드 0.97. 텍스트는 글자색의 밝기를 적습니다.',
    },
    shape: { type: 'string', enum: BLOCK_SHAPES, description: '요소의 외곽 모양.' },
    radius: {
      type: 'number',
      description:
        '모서리 반경. 화면 너비 대비 비율입니다. 각지면 0, 양끝이 완전히 둥근 알약이면 h의 절반에 해당하는 값을 적습니다. 눈대중하지 말고 실제로 재세요 — 같은 화면의 카드가 모두 같은 반경을 쓰는지, 버튼만 더 둥근지가 그 디자인의 성격입니다.',
    },
    border: {
      type: 'number',
      description:
        '테두리 두께. 화면 너비 대비 비율이며, 테두리가 없으면 0입니다. 대부분의 채워진 카드와 버튼은 0입니다. 얇은 선으로 둘러싸인 입력창이나 아웃라인 버튼만 값을 갖습니다.',
    },
    rotate: {
      type: 'number',
      description:
        '기울어진 각도(도). 똑바로 서 있으면 0, 시계방향이 양수입니다. x, y, w, h는 기울이기 전의 똑바로 선 상태로 적고, 기운 정도만 여기에 적습니다.',
    },
    taper: {
      type: 'number',
      description:
        '원근으로 윗변과 아랫변의 길이가 다른 정도. -1~1이며 평행하면 0입니다. 뒤로 누워 윗변이 짧아 보이면 양수, 아랫변이 짧으면 음수입니다. 예: 윗변이 아랫변의 80%로 보이면 0.2.',
    },
    bend: {
      type: 'number',
      description:
        '긴 변이 활처럼 휜 정도. -1~1이며 곧으면 0입니다. 종이가 말린 카드, 둥글게 굽은 띠처럼 변이 직선이 아닌 경우에만 값을 갖습니다. role이 곡선일 때는 그 곡선이 얼마나 굽었는지를 뜻합니다.',
    },
    lines: {
      type: 'integer',
      description: 'role이 텍스트일 때 그 안의 글자 줄 수. 텍스트가 아니면 0.',
    },
    chars: {
      type: 'integer',
      description:
        'role이 텍스트일 때 한 줄에 들어 있는 글자 수. 도면에는 이 개수만큼 알파벳이 찍히므로, 실제 글자 수를 세어 적어야 길이가 맞습니다. 한글은 한 글자를 두 자로 셉니다(한글이 알파벳보다 넓기 때문입니다). 여러 줄이면 한 줄 평균을 적습니다. 텍스트가 아니면 0.',
    },
    align: { type: 'string', enum: BLOCK_ALIGNS, description: 'role이 텍스트일 때 정렬. 아니면 왼쪽.' },
  },
  required: [
    'role', 'x', 'y', 'w', 'h', 'tone', 'shape', 'radius', 'border',
    'rotate', 'taper', 'bend', 'lines', 'chars', 'align',
  ],
  additionalProperties: false,
}

// One reusable component, located precisely enough that the client can crop it
// straight out of the screenshot. Cropping is the whole point: it shows the
// real thing rather than a redrawn approximation of it, which is what the
// built-in references do with their own artwork.
const COMPONENT_PART = {
  type: 'object',
  properties: {
    role: { type: 'string', enum: ELEMENTS },
    label: { type: 'string', description: '이 컴포넌트를 부르는 짧은 한국어 이름.' },
    x: { type: 'number', description: '왼쪽 위치. 화면 너비 대비 0~1 비율.' },
    y: { type: 'number', description: '위쪽 위치. 화면 높이 대비 0~1 비율.' },
    w: { type: 'number', description: '너비. 화면 너비 대비 0~1 비율.' },
    h: { type: 'number', description: '높이. 화면 높이 대비 0~1 비율.' },
    spec: { type: 'string', description: '모서리, 채움, 상태 등 눈에 보이는 특징 한 줄.' },
  },
  required: ['role', 'label', 'x', 'y', 'w', 'h', 'spec'],
  additionalProperties: false,
}

const TAG_SCHEMA = {
  type: 'object',
  properties: {
    layout: {
      type: 'array',
      description: '화면을 와이어프레임으로 다시 그리기 위한 블록 목록. 위에서 아래 순서.',
      items: LAYOUT_BLOCK,
    },
    parts: {
      type: 'array',
      description: '화면에서 다시 쓸 만한 UI 컴포넌트 목록. 각각 잘라낼 수 있는 상자로 잡습니다.',
      items: COMPONENT_PART,
    },
    platform: { type: 'string', enum: PLATFORMS },
    service: { type: 'string', enum: SERVICES },
    screen: { type: 'string', enum: SCREENS },
    elements: { type: 'array', items: { type: 'string', enum: ELEMENTS } },
    mood: { type: 'string', enum: MOODS },
    accent: { type: 'string', description: '화면에서 가장 두드러지는 강조 색상. #rrggbb 형식.' },
    note: { type: 'string', description: '이 화면의 구성과 의도를 설명하는 한국어 2~3문장.' },
    basis: { type: 'string', description: '무엇을 근거로 이렇게 분류했는지 한국어 한 문장.' },
  },
  required: ['platform', 'service', 'screen', 'elements', 'mood', 'accent', 'note', 'basis', 'layout', 'parts'],
  additionalProperties: false,
}

const SYSTEM_PROMPT = `당신은 UI 레퍼런스를 정리하는 디자인 어시스턴트입니다.
사용자가 올린 화면 스크린샷을 보고 아래 기준으로 태그를 정리하세요.

- platform: 화면 비율과 UI 밀도로 판단합니다.
- screen: 화면의 목적으로 판단합니다.
- elements: 실제로 화면에 보이는 요소만 2~4개 고릅니다. 보이지 않는 요소는 넣지 마세요.
- accent: 버튼이나 강조 요소에 쓰인 가장 두드러지는 색을 #rrggbb로 적습니다.
- note: 이 화면이 무엇을 어떻게 보여주는지, 레이아웃과 위계를 중심으로 설명합니다.
- basis: 어떤 시각적 단서로 이렇게 판단했는지 한 문장으로 적습니다.
- layout: 이 화면을 흑백 와이어프레임으로 다시 그리기 위한 요소 목록입니다.
  결과물은 색을 모두 버리고 밝기만 남긴 도면이며, 글자는 그 글자 수만큼의
  알파벳으로 대체되고 사진과 아이콘은 X를 그은 도형이 됩니다. 그래도 원본과 같은
  자리에 같은 크기로 놓이면 같은 화면으로 읽혀야 합니다. 그것이 이 목록의 목표입니다.
  - 눈에 보이는 요소를 전부 나열합니다. 보통 30~60개입니다. 개수를 아끼지 마세요.
    상태바의 시계와 아이콘, 버튼 안의 글자, 카드 안의 사진과 제목과 설명, 목록의
    각 줄까지 따로 적습니다. 뭉뚱그린 덩어리 하나보다 잘게 쪼갠 열 개가 낫습니다.
  - 버튼과 그 안의 글자는 각각 하나씩, 둘로 적습니다. 카드와 그 안의 사진·제목·설명도
    각각 적습니다. 담는 것과 담기는 것은 별개의 요소입니다.
  - 담는 것을 먼저, 담기는 것을 나중에 적습니다. 목록 순서가 그리는 순서이므로,
    카드보다 카드 안의 글자가 뒤에 와야 글자가 카드 위에 얹힙니다.
  - x, y, w, h는 화면 전체를 1로 본 비율입니다. x+w와 y+h가 1을 넘지 않게 합니다.
  - 치수가 이 도면의 전부입니다. 색도 글자도 없으니, 이 화면이 빽빽한지 널널한지,
    딱딱한지 부드러운지는 오로지 크기·간격·모서리·두께로만 전달됩니다.
    그러니 다음을 지키세요:
    · 같은 여백에서 시작하는 것들은 x를 **같은 값으로** 적습니다. 0.06과 0.062로
      갈리면 도면에서 줄이 안 맞고, 안 맞는 줄은 그 디자인이 안 맞는다는 뜻이 됩니다.
    · 같은 크기로 반복되는 카드는 w와 h를 **같은 값으로** 적습니다.
    · 요소 사이의 간격이 일정하면 그 간격도 일정하게 유지합니다.
    · 화면 가장자리 여백을 먼저 정하고, 그 안에서 나머지를 배치하세요.
  - tone은 색을 빼고 밝기만 본 값입니다. 화면에서 가장 어두운 것과 가장 밝은 것이
    분명히 다른 값을 갖게 하세요. 전부 0.5 근처로 적으면 도면이 밋밋해집니다.
  - 반복되는 카드나 목록 항목은 각각 하나씩 적어, 그 반복 자체가 구조로 보이게 합니다.
  - 화면 바탕이 흰색이나 아주 밝은 회색이면 배경 요소를 넣지 마세요. 도면의 종이가
    이미 흰색이므로 아무것도 더하지 않습니다.
  - 바탕이 어둡거나 색이 있으면, 목록의 맨 처음에 role이 배경인 요소를 하나 넣고
    (x0 y0 w1 h1) tone에 그 바탕의 밝기를 적으세요. 이것을 빠뜨리면 어두운 화면의
    흰 글자가 흰 종이 위의 흰 글자가 되어 사라집니다. 배경은 이 한 개만 허용됩니다.
  - 텍스트는 lines에 줄 수를, chars에 한 줄의 글자 수를, align에 정렬을 적습니다.
    여러 줄 문단은 한 요소로 잡고 lines에 줄 수를 적으면 됩니다. 제목처럼 한 줄이면
    lines는 1입니다.
  - chars는 눈대중이 아니라 실제로 세어서 적으세요. 도면에 찍히는 알파벳 개수가
    곧 이 값이고, 그것이 원본 글자의 길이를 알려주는 유일한 단서입니다. "Ticket"은
    6, "Community Board"는 15입니다. 한글은 알파벳보다 넓으므로 한 글자를 두 자로
    셉니다 — "계속하기"는 8입니다.
  - 사진, 일러스트, 로고, 프로필 이미지는 role을 이미지로 적습니다. 작은 글리프
    하나는 role을 아이콘으로 적습니다.
  - 이미지의 shape는 **그림을 잘라내는 그릇**을 따릅니다. 그림 자체의 생김새가
    아닙니다.
    · 동그랗게 잘린 프로필 사진, 둥근 카드 끝에 맞춰 잘린 사진 → 원
    · 사각 프레임 안의 사진 → 사각형
    · 배경 없이 떠 있는 컷아웃(누끼 딴 상품, 캐릭터 일러스트) → 사각형입니다.
      테두리가 없어 보여도, 이 도면이 그리는 것은 그림의 윤곽선이 아니라 그 그림이
      레이아웃에서 차지하는 자리이기 때문입니다.
  - **모든 것이 똑바로 선 직사각형은 아닙니다.** 화면을 다시 보고, 다음에 해당하는
    요소를 사각형으로 뭉개지 마세요. 이걸 놓치면 기울어진 카드로 만든 화면이
    평평한 상자 더미가 되어, 그 화면의 성격이 통째로 사라집니다.
    · 비스듬히 놓인 것 → rotate에 각도를 적습니다.
    · 뒤로 누워 윗변과 아랫변 길이가 달라 보이는 것 → taper에 적습니다.
    · 종이처럼 말려 변이 곡선인 것 → bend에 적습니다.
    · 띠나 레일처럼 선 자체가 곡선인 것 → role을 곡선으로 하고 bend에 굽은 정도를
      적습니다. 둥근 모서리 상자로 대신하지 마세요. 상자는 곡선이 아닙니다.
    셋 다 해당하지 않으면 rotate, taper, bend는 모두 0입니다. 대부분은 0입니다.
- parts: 이 화면에서 다시 쓸 만한 UI 컴포넌트를 3~6개 고릅니다.
  - 상자를 그대로 잘라내어 보여줄 것이므로, 그 컴포넌트만 딱 감싸게 잡습니다.
    여백을 크게 두거나 옆 요소를 함께 물면 잘린 그림이 무엇인지 알 수 없습니다.
  - 화면 전체나 큰 영역은 컴포넌트가 아닙니다. 버튼 하나, 카드 한 장, 칩 하나처럼
    떼어내서 다른 화면에 쓸 수 있는 단위만 고릅니다.
  - 같은 컴포넌트가 여러 번 반복되면 그중 하나만 고르고, spec에 반복된다고 적습니다.
  - label은 화면에 적힌 말이 아니라 그 컴포넌트의 역할로 짓습니다.

모든 한국어 문장은 존댓말로 씁니다. 확신이 없으면 가장 가까운 선택지를 고르고 basis에 그 불확실함을 적으세요.`

export default defineConfig(({ mode }) => {
  // The third argument is '' so non-VITE_-prefixed vars load too. This value is
  // only ever read here in the Node process — it is not exposed to the client.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      snapkeepAnalyze(env.ANTHROPIC_API_KEY),
      chatbotAnswer(env.ANTHROPIC_API_KEY),
    ],
  }
})

// A note on `npm run build`, if it fails with "Rolldown failed to resolve
// import 'react'" or "지정된 경로를 찾을 수 없습니다 (os error 3)":
//
// That is the path this folder lives under, not the code. Vite 8 bundles with
// Rolldown, whose Windows native binding cannot read files under a path
// containing Hangul — and this one sits in …/문서/윤수정/uxui디자이너/….
// Copying the project verbatim (same node_modules) to an ASCII-only path and
// running the same command builds it in under a second.
//
// The dev server is unaffected: it resolves and serves per request in JS and
// never hands these paths to that binding.
//
// Aliasing react/react-dom to absolute paths does not fix it — it only moves
// the failure from resolving the package to opening the file. The fix is to
// keep the project somewhere ASCII, e.g. C:\dev\personal-branding.
