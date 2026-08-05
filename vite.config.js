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
            max_tokens: 4096,
            // Tagging a screenshot is a short classification, so the low effort
            // level keeps the upload responsive.
            output_config: { effort: 'low', format: { type: 'json_schema', schema: TAG_SCHEMA } },
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

// The wireframe's vocabulary. Deliberately coarser than a real component list —
// a structure view is about where the blocks sit and how big they are, so a
// handful of shapes carries it and more roles would only add noise.
const BLOCK_ROLES = [
  '헤더', '탭바', '검색바', '이미지', '카드', '리스트', '텍스트', '버튼', '칩', '입력', '아이콘',
]

// Normalised to the screenshot (0 = left/top edge, 1 = right/bottom), so the
// wireframe redraws at whatever size the panel gives it without carrying the
// original's pixel dimensions around.
const LAYOUT_BLOCK = {
  type: 'object',
  properties: {
    role: { type: 'string', enum: BLOCK_ROLES },
    x: { type: 'number', description: '블록 왼쪽 위치. 화면 너비 대비 0~1 비율.' },
    y: { type: 'number', description: '블록 위쪽 위치. 화면 높이 대비 0~1 비율.' },
    w: { type: 'number', description: '블록 너비. 화면 너비 대비 0~1 비율.' },
    h: { type: 'number', description: '블록 높이. 화면 높이 대비 0~1 비율.' },
  },
  required: ['role', 'x', 'y', 'w', 'h'],
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
    platform: { type: 'string', enum: PLATFORMS },
    service: { type: 'string', enum: SERVICES },
    screen: { type: 'string', enum: SCREENS },
    elements: { type: 'array', items: { type: 'string', enum: ELEMENTS } },
    mood: { type: 'string', enum: MOODS },
    accent: { type: 'string', description: '화면에서 가장 두드러지는 강조 색상. #rrggbb 형식.' },
    note: { type: 'string', description: '이 화면의 구성과 의도를 설명하는 한국어 2~3문장.' },
    basis: { type: 'string', description: '무엇을 근거로 이렇게 분류했는지 한국어 한 문장.' },
  },
  required: ['platform', 'service', 'screen', 'elements', 'mood', 'accent', 'note', 'basis', 'layout'],
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
- layout: 이 화면을 와이어프레임으로 다시 그리기 위한 블록 목록입니다.
  - 눈에 보이는 덩어리만 8~16개로 잡습니다. 글자 한 줄, 아이콘 하나까지 쪼개지 마세요.
  - x, y, w, h는 화면 전체를 1로 본 비율입니다. x+w와 y+h가 1을 넘지 않게 합니다.
  - 위에서 아래, 같은 높이면 왼쪽에서 오른쪽 순서로 나열합니다.
  - 반복되는 카드나 목록 항목은 각각 하나의 블록으로 잡아, 그 반복 자체가 구조로 보이게 합니다.
  - 배경이나 화면 전체를 덮는 블록은 넣지 마세요. 구조가 드러나지 않습니다.

모든 한국어 문장은 존댓말로 씁니다. 확신이 없으면 가장 가까운 선택지를 고르고 basis에 그 불확실함을 적으세요.`

export default defineConfig(({ mode }) => {
  // The third argument is '' so non-VITE_-prefixed vars load too. This value is
  // only ever read here in the Node process — it is not exposed to the client.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), snapkeepAnalyze(env.ANTHROPIC_API_KEY)],
  }
})
