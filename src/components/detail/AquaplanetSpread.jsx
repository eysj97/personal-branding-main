import {
  Block,
  Body,
  COLUMN,
  HeaderColumn,
  Heading,
  Shot,
  SpreadFrame,
  SpreadPalette,
  VisitLink,
} from "./primitives";
import { DECK, VISIT } from "./links";
// Sized to 2x what each well actually paints — the Figma exports were 4K
// screen captures. JPEG for the photographic ones, PNG where the flat document
// screenshot still compresses smaller.
import ticketPage from "../../assets/project/detail/aquaplanet/ticket-page.avif";
import visual from "../../assets/project/detail/aquaplanet/visual.avif";
import planning from "../../assets/project/detail/aquaplanet/planning.avif";
import ai2 from "../../assets/project/detail/aquaplanet/ai-2.avif";
import retrospect from "../../assets/project/detail/aquaplanet/retrospect.avif";
import problem from "../../assets/project/detail/aquaplanet/problem.avif";

// Figma frame 154:4041. Dark page, so the panels are translucent white with
// white type — the bright Reviu and Layer pages invert that.
const PAD = { top: 40, bottom: 52, left: 96, right: 194 };

// One size for every paragraph on the page, matching Reviu and Layer. The Figma
// frame ran some blocks at 24 and others at 18, which read as two different
// kinds of copy when they are the same kind; the tracking is the -0.02em the
// other two spreads use at this size.
const BODY = { size: 18, tracking: "-0.36px" };

// The header's own line breaks (154:4077). Authored, not wrapped: the block is
// right-aligned against nothing, so where it turns is a decision — and left to
// the browser this one broke between "AI" and "와". Stacked, the measure is
// different and the same breaks would be wrong, so there they are spaces again.
// The one place this spread knowingly departs from the design. Figma's 204:2191
// still carries Layer's old about-line — an aquarium renewal described as a
// perfume app — and has since the first commit, so there is no earlier version
// to restore either. The line here is the project's own description, taken from
// the two places the repo already states it: the chatbot's answer about
// Aquaplanet (data/chatbot.js) and the card face's "Combine four branches into
// one".
//
// Figma is left as it is by choice, so the two will read differently until
// someone edits 204:2191. Anything else on this page that disagrees with the
// frame is a bug; this is not.
const ABOUT = [
  "4개 지점으로 흩어진 아쿠아리움 사이트를",
  "하나의 브랜드로 잇는 리뉴얼 제안입니다.",
];

export default function AquaplanetSpread({ stacked }) {
  const header = (
    <div
      className={`flex flex-col gap-[8px] font-['Pretendard'] tracking-[-0.44px] text-white ${
        stacked ? "w-[350px] items-start text-left" : "items-end"
      }`}
    >
      <p className="whitespace-pre font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-0.56px]">
        <span className="text-[28px]">AQUAPLANET</span>
        {/* The kind of project — the phrase beside the name — is dropped on a
            phone, which is what the design does (355:153): the name stands alone
            there. Nothing is lost, only deferred — the line directly under it is
            the role, and the one under that says what the thing is. On a 350px
            measure the suffix pushed the name onto a second line, so the header
            opened with a wrap instead of a title. */}
        {!stacked && <span className="text-[22px]">{` Site Renewal  Team Project`}</span>}
      </p>
      <p className="whitespace-nowrap text-[22px] font-semibold leading-[1.2]">
        티켓 페이지 UI·퍼블리싱, 기획 참여
      </p>
      <p
        className={`w-full whitespace-pre-line text-[22px] font-semibold leading-[1.2] ${
          stacked ? "text-left" : "text-right"
        }`}
      >
        {ABOUT.join(stacked ? " " : "\n")}
      </p>
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px]">
        <VisitLink href={VISIT.aquaplanet} />
        <VisitLink href={DECK.aquaplanet} label="장표 다운로드" />
      </div>
    </div>
  );

  return (
    <SpreadPalette panel="rgba(255,255,255,0.1)" ink="#ffffff">
      <SpreadFrame pad={PAD} gap={33} stacked={stacked}>
        {/* Column 1 — the project header floats above these two blocks. */}
        <HeaderColumn at={{ left: 0, top: 86, width: 475 }} gap={24} header={header} stacked={stacked}>
          <Block>
            <Shot
              height={222}
              sources={[
                {
                  src: visual,
                  style: { width: "100%", height: "119.77%", left: "0.04%", top: "-0.83%" },
                },
              ]}
            />
            <Heading size={32}>Visual</Heading>
            <Body {...BODY}>
              {[
                "티켓 페이지는 요금을 확인하는 화면이지만, 아쿠아리움은 가고 싶게 만드는 것이 목적이라고 생각했습니다.",
                "물과 어울리는 비눗방울에 각 지점의 대표 해양 생물을 담았고, 누르면 방울이 터지며 요금·할인 카드가 떠오릅니다.",
              ]}
            </Body>
          </Block>

          <Block>
            {/* Figma stacks two captures in this one well, but the upper one is a
                fully opaque 4K screenshot that covers the well edge to edge — the
                lower one was never visible, so only this one is loaded. */}
            <Shot
              height={222}
              sources={[
                {
                  src: ai2,
                  style: { width: "100%", height: "117.71%", left: 0, top: "-13.13%" },
                },
              ]}
            />
            <Heading size={32}>AI Implementaion</Heading>
            <Body {...BODY}>
              {[
                "화면은 AI로 코드를 생성하고 검토·수정하며 구현했습니다. 비눗방울 위치가 하나도 맞지 않아 좌표를 직접 조정했습니다.",
                "PC에서 자연스럽던 물빛이 작은 화면에서는 너무 강해 상단을 덮어버려 결국 덜어냈습니다. 무리해서 유지하기보다 덜어내는 편이 낫다는 걸 배웠습니다.",
              ]}
            </Body>
          </Block>
        </HeaderColumn>

        {/* Column 2 — 208:2727. */}
        <div className={`${COLUMN} w-[475px] gap-[24px]`}>
          <Block>
            <Shot
              height={234}
              sources={[
                {
                  src: ticketPage,
                  style: { width: "100%", height: "107.67%", left: "0.01%", top: "-1.61%" },
                },
              ]}
            />
            <Heading size={26}>Ticket Page</Heading>
            <Body {...BODY}>
              {[
                "티켓 페이지를 맡고 가장 먼저 마주한 건 정보가 흩어져 있다는 것이었습니다. 프로모션, 기획상품, 제휴 혜택 같은 할인 정보가 페이지 곳곳에 제각각 놓여 있어, 저부터도 어떤 할인이 있는지 한눈에 파악하기 어려웠습니다. 그래서 흩어진 할인 정보를 모두 찾아 성격별로 정리하는 것부터 시작했습니다.",
                "그런데 모아 놓고 보니 종류가 너무 많았습니다. 지점마다 요금과 할인이 다르고 종류도 다양해서, 한 화면에 다 담으면 오히려 읽는게 더 어렵다고 판단했습니다.",
                "그래서 지점 단위로 나누되, 전환은 클릭 한 번으로 빠르게 이루어지도록 설계했습니다. 첫 진입에서 지점을 한 번 고르면, 이후에는 다른 지점을 눌러도 화면 전체가 아니라 요금 카드만 바로 바뀌도록 했습니다. 사용자가 지점을 오가며 비교하더라도 매번 처음부터 다시 탐색하지 않도록 하고 싶었습니다.",
              ]}
            </Body>
          </Block>

          <Block gap={19}>
            <Shot
              height={222}
              sources={[
                {
                  src: problem,
                  style: { width: "100%", height: "102.25%", left: "-0.06%", top: "0.09%" },
                },
              ]}
            />
            <div className="flex flex-col gap-[3px]">
              <Heading size={26}>Problem</Heading>
              <Body {...BODY}>
                {[
                  "처음엔 '4개 지점이 하나로 이어지지 않는다' 하나뿐이라, 어느 방향으로 정리해도 같은 말로 돌아왔습니다. 사이트를 다시 보며 문제를 셋으로 넓혔습니다.",
                  "첫번째, 지점마다 사이트가 따로 운영되고 이동 경로가 숨어 있어 하나의 브랜드로 이어지지 않습니다.",
                  "두번째, 로딩이 멈추거나 PC에서 모바일 화면이 뜨는 등 시스템이 불안정합니다.",
                  "세번째, 아시아 최대 규모임에도 정적인 텍스트 위주라 브랜드의 분위기가 전달되지 않습니다.",
                ]}
              </Body>
            </div>
          </Block>
        </div>

        {/* Column 3 — 154:4068. The only column the design hangs from the top of
            the row rather than its bottom (`self-stretch`, not `items-end`): it
            is the tallest, so in Figma the two amount to the same thing, but if
            the browser wraps column 2 longer than Figma did, this one should
            stay put rather than being pushed down. */}
        <div className={`${COLUMN} w-[475px] justify-start gap-[24px] self-stretch`}>
          <Block>
            <Shot
              height={222}
              sources={[
                {
                  src: retrospect,
                  style: { width: "100%", height: "100%", left: 0, top: 0, objectFit: "cover" },
                },
              ]}
            />
            <Heading size={32}>Retrospect</Heading>
            <Body {...BODY}>
              {[
                "처음으로 팀과 작업하며 제 기획과 디자인이 선택받지 못하는 경험을 여러 번 했습니다.",
                "쉽지 않았지만 저를 객관적으로 보게 해줬고, 제 수준을 정확히 알고 나아갈 방향을 정할 수 있었습니다.",
              ]}
            </Body>
          </Block>

          {/* Drawn taller than its content and centred inside — 380:166. */}
          <Block minHeight={694}>
            <Shot
              height={497}
              sources={[
                {
                  src: planning,
                  style: { width: "100%", height: "115.29%", left: "0.02%", top: "-7.52%" },
                },
              ]}
            />
            <Heading size={26}>Planning Participation</Heading>
            <Body {...BODY}>
              {[
                "팀의 리뉴얼 방향을 문제 정의·리서치·인사이트로 구조화하는 기획 문서를 작성했고, 그중 제가 맡은 화면이 티켓 예매 페이지입니다.",
              ]}
            </Body>
          </Block>
        </div>
      </SpreadFrame>
    </SpreadPalette>
  );
}
