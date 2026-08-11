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
import bottle from "../../assets/project/detail/layer/bottle.svg";
// Sized to 2x what each well actually paints; the Figma exports were 4K
// captures. See AquaplanetSpread for the same treatment.
import survey from "../../assets/project/detail/layer/survey.avif";
import retrospect from "../../assets/project/detail/layer/retrospect.avif";
import magazine from "../../assets/project/detail/layer/magazine.avif";
import ai1 from "../../assets/project/detail/layer/ai-1.avif";
import ai2 from "../../assets/project/detail/layer/ai-2.avif";

// Figma frame 154:4094.
const PAD = { top: 40, bottom: 40, left: 95, right: 195 };

// Every body on this page is set at the same size, so it is stated once.
const BODY = { size: 18, tracking: "-0.36px" };

// The header's own line breaks (205:2626, 205:2627) — see AquaplanetSpread for
// why they are authored rather than left to the browser. This header needs them
// most: it is the one the design hugs to its own lines rather than fitting to a
// column, so its width *is* the longest of these.
const ROLE = [
  "디자인(매거진·향수 상세페이지·챗봇 캐릭터)",
  "· 설문지 제작 · 구현(향수 상세페이지·카테고리·챗봇)",
];
const ABOUT = [
  "서비스. 향수를 어렵게 느끼는 사람도",
  "자기에게 맞는 향을 찾을 수 있도록.",
  "AI 와 유저 추천으로 향을 제안하는 커뮤니티 앱입니다.",
];

const fill = (extra) => ({ width: "100%", height: "100%", left: 0, top: 0, ...extra });

// Detail Page leads with the real note card rather than a screenshot of one —
// it is flat vector in the design, so it is cheaper and sharper as markup.
const NOTES = [
  ["TOP", ["#알데하이드", "#배", "#베르가못"]],
  ["MIDDLE", ["#은방울꽃", "#아이리스", "#장미"]],
  ["BASE", ["#화이트 머스크", "#앰버"]],
];

function NoteCard() {
  return (
    <div className="flex w-[443px] shrink-0 items-center justify-center gap-[60px] rounded-[16px] border border-[#dddddd] bg-white py-[30px]">
      <img src={bottle} alt="" className="h-[160px] w-[65.92px] shrink-0" />
      <div className="flex w-[142px] shrink-0 flex-col gap-[24px]">
        {NOTES.map(([label, keywords]) => (
          <div key={label} className="flex flex-col gap-[4px]">
            <p className="font-['Pretendard'] text-[14px] leading-[1.4] tracking-[-0.28px] text-[#1a1a1a]">
              {label}
            </p>
            <div className="flex items-center gap-[8px]">
              {keywords.map((keyword) => (
                <p
                  key={keyword}
                  className="whitespace-nowrap font-['Pretendard'] text-[12px] font-medium tracking-[-0.24px] text-[#8a8a8a]"
                >
                  {keyword}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LayerSpread({ stacked }) {
  const header = (
    <div
      className={`flex flex-col gap-[8px] text-white ${
        stacked ? "mx-auto w-[350px] items-start text-left" : "items-end text-right"
      }`}
    >
      <p className="whitespace-pre font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-0.44px]">
        <span className="text-[28px]">{`Layer `}</span>
        {/* The kind of project — the phrase beside the name — is dropped on a
            phone, which is what the design does (355:153): the name stands alone
            there. Nothing is lost, only deferred — the line directly under it is
            the role, and the one under that says what the thing is. On a 350px
            measure the suffix pushed the name onto a second line, so the header
            opened with a wrap instead of a title. */}
        {!stacked && <span className="text-[22px]">{` Team Cummunity APP`}</span>}
      </p>
      <p className="w-full whitespace-pre-line font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-0.44px]">
        {ROLE.join(stacked ? " " : "\n")}
      </p>
      <p className="w-full whitespace-pre-line font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-1.1px]">
        {ABOUT.join(stacked ? " " : "\n")}
      </p>
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px]">
        <VisitLink href={VISIT.layer} />
        <VisitLink href={DECK.layer} label="장표 다운로드" />
      </div>
    </div>
  );

  return (
    <SpreadPalette panel="#f7f7f7" ink="#1a1a1a">
      <SpreadFrame pad={PAD} gap={32} stacked={stacked}>
        {/* Column 1 — the project header floats above these two blocks. Hug
            width here, unlike the other two spreads: the design gives it no
            frame of its own (205:2624), the longest of its lines sets it. Which
            is what `max-content` is — and it is also what stops the lines above
            from re-wrapping, since the box can never be narrower than they are. */}
        <HeaderColumn
          at={{ left: 36, top: 16, width: "max-content" }}
          gap={24}
          header={header}
          stacked={stacked}
        >
          <Block>
            {/* Two captures stacked in Figma; the upper one is opaque and covers
                the well edge to edge, so only it is loaded. */}
            <Shot
              height={222}
              sources={[
                {
                  src: ai1,
                  style: { width: "100%", height: "117.84%", left: 0, top: "-13.42%" },
                },
              ]}
            />
            <Heading size={32}>AI Implementaion</Heading>
            <Body {...BODY}>
              {[
                "[카테고리] 전달받은 디자인이 실제 데이터와 맞지 않아, 디자인은 그대로 두고 내용을 데이터에 맞게 고쳤습니다.",
                "[챗봇] 모든 질문에 답할 수는 없으니 퀵버튼으로 범위를 좁히고, 답변은 여러 버전을 준비했습니다. 챗봇 캐릭터는 직접 만들었습니다.",
              ]}
            </Body>
          </Block>

          <Block>
            <Shot height={220} sources={[{ src: ai2, style: fill({ objectFit: "contain" }) }]} />
            <Heading size={32}>AI Implementaion</Heading>
            <Body {...BODY}>
              {[
                "상세페이지의 향수 이미지는 AI로 생성했습니다. 분위기를 통일해야 해서 향수마다 세 장으로 제한했습니다.",
                "요소는 고정하고 계열과 브랜드에 따라 배경만 달라지게 하니 전체가 하나의 톤으로 보였습니다.",
              ]}
            </Body>
          </Block>
        </HeaderColumn>

        {/* Column 2 */}
        <div className={`${COLUMN} w-[475px] gap-[60px]`}>
          <Block>
            <Shot height={320} sources={[{ src: magazine, style: fill({ objectFit: "contain" }) }]} />
            <Heading size={32}>Magazine Page</Heading>
            <Body {...BODY}>
              {[
                "향수 상식과 트렌드를 다루는 공간입니다. 입문자는 지식을, 애호가는 트렌드를 얻습니다.",
                "모바일에 맞는 형태가 드물어 카드뉴스에서 실마리를 얻어 세 가지를 만들었습니다.",
                "한 장형 : 한 화면에 담기는 카드",
                "리스트형 : 방법이 여럿인 주제는 가로로 이어 봅니다.",
                "비주얼형 : 사진과 글을 번갈아 배치합니다.",
              ]}
            </Body>
          </Block>

          <Block>
            <Shot height={294} sources={[{ src: survey, style: fill({ objectFit: "cover" }) }]} />
            <Heading size={32}>Survey</Heading>
            <Body {...BODY}>
              {[
                "향수 사용자 50명에게 물으니, 가장 어려운 점은 나에게 맞는 향을 찾는 일이었습니다. 90%가 맞춤 추천을 원했습니다.",
                "정보의 양이 아니라 취향에 맞는 향을 고르지 못하는 것이 문제였습니다.",
              ]}
            </Body>
          </Block>
        </div>

        {/* Column 3 */}
        <div className={`${COLUMN} w-[475px] gap-[24px] pb-[60px]`}>
          <Block>
            <NoteCard />
            <Heading size={32}>Detail Page</Heading>
            <Body {...BODY}>
              {[
                "상세페이지는 한눈에 파악되는 것이 가장 중요하다고 봤습니다. 병에 탑·미들·베이스 노트를 색으로 나누고 함유량만큼 채웠습니다.",
                "디자인부터 구현까지 직접 했습니다. AI로 병의 배경을 지우고 데이터의 색을 비율대로 채웠고, 병마다 크기가 달라지는 문제는 높이를 기준으로 맞춰 해결했습니다.",
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
                "이 프로젝트에서 가장 크게 남은 건, 참고할 것이 없을 때 스스로 답을 만든 경험입니다.",
                '매거진 페이지를 맡았을 때 모바일에 맞는 매거진 레퍼런스 자체가 드물었습니다. 하지만 "작은 화면에서 긴 정보를 부담 없이 전달한다"는 본질만 남기자, 다른 분야인 카드뉴스에서 실마리가 보였습니다. 레퍼런스를 가져오는 것이 아니라 문제의 본질을 정의하고 구조를 직접 설계하는 것이 디자인이라는 걸 배웠습니다.',
              ]}
            </Body>
          </Block>
        </div>
      </SpreadFrame>
    </SpreadPalette>
  );
}
