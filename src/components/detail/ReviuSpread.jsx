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
// Sized to 2x what each well actually paints; the Figma exports were 4K
// captures. See AquaplanetSpread for the same treatment.
import problem from "../../assets/project/detail/reviu/problem.avif";
import reviewTiming from "../../assets/project/detail/reviu/review-timing.avif";
import solution from "../../assets/project/detail/reviu/solution.avif";
import notification from "../../assets/project/detail/reviu/notification.avif";
import retrospect from "../../assets/project/detail/reviu/retrospect.avif";
import cornell from "../../assets/project/detail/reviu/cornell.avif";
import ai from "../../assets/project/detail/reviu/ai.avif";

// Figma frame 154:4088. Bright green page, so the panels are solid white with
// black type rather than the translucent panels the dark Aquaplanet page uses.
const PAD = { top: 50, bottom: 50, left: 95, right: 195 };
const HAIRLINE = "#d9d9d9";

// Every body on this page is set at the same size, so it is stated once.
const BODY = { size: 18, tracking: "-0.36px" };

// The header's own line breaks (204:2189) — see AquaplanetSpread for why they
// are authored rather than left to the browser.
const ABOUT = [
  "서비스. 필기를 스캔하면 코넬 노트로 정리하고",
  "문제까지 만들어주는 학습 앱. 복습 타이밍을 정해",
  "알림으로 챙겨, 학습의 흐름이 끊기지 않게 합니다.",
];

const fill = (extra) => ({ width: "100%", height: "100%", left: 0, top: 0, ...extra });

export default function ReviuSpread({ stacked }) {
  const header = (
    // Black, unlike the other two spreads' headers. This is the one block on
    // the page that sits on the page itself rather than in a panel, so it takes
    // the page's colour — and Reviu's page is the bright lime one. White type on
    // that is barely there.
    <div
      className={`flex flex-col gap-[8px] text-black ${
        stacked ? "w-[350px] items-start text-left" : "items-end text-right"
      }`}
    >
      <p className="whitespace-pre font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-0.44px]">
        <span className="text-[28px]">{`Reviu `}</span>
        {/* The kind of project — the phrase beside the name — is dropped on a
            phone, which is what the design does (355:153): the name stands alone
            there. Nothing is lost, only deferred — the line directly under it is
            the role, and the one under that says what the thing is. On a 350px
            measure the suffix pushed the name onto a second line, so the header
            opened with a wrap instead of a title. */}
        {!stacked && <span className="text-[22px]">{` Personal APP`}</span>}
      </p>
      <p className="whitespace-nowrap font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-0.44px]">
        기획 · UI 디자인 · 퍼블리싱
      </p>
      <p className="whitespace-pre-line font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-1.1px]">
        {ABOUT.join(stacked ? " " : "\n")}
      </p>
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px]">
        <VisitLink href={VISIT.reviu} />
        <VisitLink href={DECK.reviu} label="장표 다운로드" />
      </div>
    </div>
  );

  return (
    <SpreadPalette panel="#ffffff" ink="#000000">
      {/* The gutter between the columns is the same 24 the blocks are stacked
          at, and not the 33/32 the design measures. Side by side, a horizontal
          gap that is a third wider than the vertical one reads as the two
          columns having drifted apart rather than as a grid — the eye compares
          the two directions directly and nothing else on the page explains the
          difference. */}
      <SpreadFrame pad={PAD} gap={24} stacked={stacked}>
        {/* Column 1 — the project header floats above these two blocks. */}
        <HeaderColumn at={{ left: 0, top: 61, width: 475 }} gap={24} header={header} stacked={stacked}>
          <Block>
            <Shot height={222} sources={[{ src: problem, style: fill({ objectFit: "cover" }) }]} />
            <Heading size={32}>Problem</Heading>
            <Body {...BODY}>
              {[
                "공부의 어려움은 이해만이 아닙니다. 언제 복습해야 하는지, 무엇을 놓쳤는지는 스스로 알기 어렵습니다.",
                "학습이 끊기는 지점을 사용자가 인식하지 못하는 것이 문제라고 봤습니다.",
              ]}
            </Body>
          </Block>

          <Block>
            <Shot height={312} sources={[{ src: cornell, style: fill({ objectFit: "contain" }) }]} />
            <Heading size={32}>Cornell Notes</Heading>
            <Body {...BODY}>
              {[
                "코넬 노트는 따로 익히지 않아도 쓸 수 있고, 핵심·설명·요약 구조로 복습 효과가 검증된 방식입니다.",
                "다만 좌우로 나누는 형식이라 모바일에서는 가독성이 떨어져, 핵심 구조는 살리되 큰 단원 안에 키워드와 설명을 담는 방식으로 재구성했습니다.",
              ]}
            </Body>
          </Block>
        </HeaderColumn>

        {/* Column 2 — the tallest one, so it sets the spread's overall height. */}
        <div className={`${COLUMN} w-[475px] gap-[var(--column-gap,24px)]`}>
          <Block>
            <Shot
              height={222}
              border={HAIRLINE}
              sources={[{ src: solution, style: fill({ objectFit: "cover" }) }]}
            />
            <Heading size={32}>Solution</Heading>
            <Body {...BODY}>
              {[
                "필기를 촬영하면 AI가 코넬 노트로 구조화하고 문제를 만들어, 퀴즈로 학습하다 복습할 때가 되면 알려줍니다.",
              ]}
            </Body>
          </Block>

          <Block>
            <Shot
              height={222}
              border={HAIRLINE}
              sources={[{ src: notification, style: fill({ objectFit: "contain" }) }]}
            />
            <Heading size={32}>Notification</Heading>
            <Body {...BODY}>
              {[
                "학습 알림은 압박이 되기 쉬워 톤을 최대한 부드럽게 설계했습니다.",
                '"커피 한 잔 마시는 동안 끝낼 분량이 준비되어 있어요."처럼 재촉하지 않고, 학습이 습관으로 이어지게 했습니다.',
              ]}
            </Body>
          </Block>

          <Block>
            <Shot
              height={222}
              sources={[
                { src: retrospect, style: fill({ objectFit: "cover", objectPosition: "bottom" }) },
              ]}
            />
            <Heading size={32}>Retrospect</Heading>
            <Body {...BODY}>
              {[
                "기획·디자인·웹퍼블리싱까지 혼자 전 과정을 수행한 첫 프로젝트입니다.",
                "막막했지만 스스로 고민하고 피드백을 받아 기틀을 잡았고, 막히는 지점에서 방법을 찾아 끝까지 밀고 나가는 힘을 길렀습니다.",
              ]}
            </Body>
          </Block>
        </div>

        {/* Column 3 */}
        {/* 24, like every other column. It was 120 — a hand-tuned number
            whose job was to push this column’s blocks down until its bottom
            edge lined up with the other two on the desktop. What that buys is
            one straight line along the foot of the spread; what it costs is a
            gap five times the others in the middle of the reading, which is
            the part anyone actually looks at. */}
        <div className={`${COLUMN} w-[475px] gap-[var(--column-gap,24px)] pb-[60px]`}>
          <Block>
            <Shot
              height={348}
              border={HAIRLINE}
              sources={[{ src: reviewTiming, style: fill({ objectFit: "contain" }) }]}
            />
            <Heading size={32}>Review timing</Heading>
            <Body {...BODY}>
              {[
                '복습 시점을 정하는 일이 가장 어렵습니다. 그래서 "복습 타이밍은 시스템이 정해준다"를 핵심 기능으로 삼았습니다.',
                "밀린 양을 보여주면 그 자체가 압박이 되므로, 복습할 내용을 '오늘의 학습'에 넣어 오늘 분량만 하면 자연스럽게 복습이 되도록 했습니다.",
              ]}
            </Body>
          </Block>

          <Block>
            {/* Figma stacks two captures here, but the upper one is opaque and
                covers the well edge to edge, so only it is loaded. */}
            <Shot
              height={222}
              sources={[
                {
                  src: ai,
                  style: { width: "100%", height: "116.95%", left: 0, top: "-13.05%" },
                },
              ]}
            />
            <Heading size={32}>AI Implementaion</Heading>
            <Body {...BODY}>
              {[
                "모든 화면을 AI로 생성하고 직접 검토·수정하며 퍼블리싱했습니다. 다만 섹션마다 클래스명이 제각각이라 공통 요소를 재사용할 수 없었습니다.",
                "클래스명을 다시 정하고 헤더를 통일해, 한 번 잡은 구조를 여러 페이지에서 그대로 쓸 수 있게 만들었습니다.",
              ]}
            </Body>
          </Block>
        </div>
      </SpreadFrame>
    </SpreadPalette>
  );
}
