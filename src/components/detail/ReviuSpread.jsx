import {
  Block,
  Body,
  COLUMN,
  Heading,
  Shot,
  SpreadFrame,
  SpreadPalette,
} from "./primitives";
// Sized to 2x what each well actually paints; the Figma exports were 4K
// captures. See AquaplanetSpread for the same treatment.
import problem from "../../assets/project/detail/reviu/problem.jpg";
import reviewTiming from "../../assets/project/detail/reviu/review-timing.jpg";
import solution from "../../assets/project/detail/reviu/solution.jpg";
import notification from "../../assets/project/detail/reviu/notification.jpg";
import retrospect from "../../assets/project/detail/reviu/retrospect.jpg";
import cornell from "../../assets/project/detail/reviu/cornell.jpg";
import ai from "../../assets/project/detail/reviu/ai.jpg";

// Figma frame 154:4088. Bright green page, so the panels are solid white with
// black type rather than the translucent panels the dark Aquaplanet page uses.
const PAD = { top: 50, bottom: 50, left: 95, right: 195 };
const HAIRLINE = "#d9d9d9";

const fill = (extra) => ({ width: "100%", height: "100%", left: 0, top: 0, ...extra });

export default function ReviuSpread() {
  return (
    <SpreadPalette panel="#ffffff" ink="#000000">
      <SpreadFrame pad={PAD} gap={32}>
        {/* Column 1 — carries the project header above its first block. */}
        <div className={`${COLUMN} w-[475px] gap-[100px] pb-[62px]`}>
          {/* The header sits closer to its block than the blocks do to each
              other, so it pulls back the difference. */}
          <div className="-mb-[39px] flex flex-col items-end gap-[8px] text-right text-white">
            <p className="whitespace-pre font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-0.44px]">
              <span className="text-[28px]">{`Reviu `}</span>
              <span className="text-[22px]">{` Personal APP`}</span>
            </p>
            <p className="whitespace-nowrap font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-0.44px]">
              기획 · UI 디자인 · 퍼블리싱
            </p>
            <p className="font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-1.1px]">
              서비스. 필기를 스캔하면 코넬 노트로 정리하고 문제까지 만들어주는 학습
              앱. 복습 타이밍을 정해 알림으로 챙겨, 학습의 흐름이 끊기지 않게
              합니다.
            </p>
          </div>

          <Block>
            <Shot height={222} sources={[{ src: problem, style: fill({ objectFit: "cover" }) }]} />
            <Heading size={32}>Problem</Heading>
            <Body size={24} tracking="-0.48px">
              {[
                "공부의 어려운 점은 내용을 이해하는 것 만이 아닙니다. 언제 복습해야 하는지, 무엇을 놓치고 있는지는 스스로 알기 어렵습니다.",
                "다시 말해서 학습이 끊기는 지점을 사용자가 인식하지 못하는 것이 문제라고 생각했습니다.",
              ]}
            </Body>
          </Block>

          <Block>
            <Shot
              height={348}
              border={HAIRLINE}
              sources={[{ src: reviewTiming, style: fill({ objectFit: "contain" }) }]}
            />
            <Heading size={32}>Review timing</Heading>
            <Body size={24} tracking="-0.48px">
              {[
                '복습 시점을 정하는 것은 사용자가 가장 어렵게 생각하는 부분입니다. 그래서 "복습 타이밍은 사용자가 아니라 시스템이 정해줘야 한다"는 것을 핵심 기능으로 정의했습니다.',
                '그래서 "복습이 며칠 밀렸다" 같은 정보를 굳이 사용자에게 보여주지 않았습니다. 밀린 복습량을 보여주는 순간 그 자체가 압박이 될 수 있기 때문입니다.',
                "대신 시스템이 복습해야 할 내용을 '오늘의 학습'의 내용으로 포함하여, 사용자가 오늘 분량의 학습을 하면 자연스럽게 복습이 이뤄지도록 했습니다. 복습을 관리하는 부담 자체을 없앤 것입니다.",
              ]}
            </Body>
          </Block>
        </div>

        {/* Column 2 — the tallest one, so it sets the spread's overall height. */}
        <div className={`${COLUMN} w-[475px] gap-[31.5px]`}>
          <Block>
            <Shot
              height={222}
              border={HAIRLINE}
              sources={[{ src: solution, style: fill({ objectFit: "cover" }) }]}
            />
            <Heading size={32}>Solution</Heading>
            <Body size={24} tracking="-0.48px">
              {[
                "학습의 흐름을 네가지 단계로 이었습니다. 가장 먼저 스캔단계에서 필기를 촬영하면, AI분석을 통해 코넬 노트 형식으로 구조화 및 학습 내용의 문제 생성 후 퀴즈를 통해 학습하며 복습이 필요할 때가 되면 알려줍니다.",
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
            <Body size={24} tracking="-0.48px">
              {[
                "학습 알림은 자칫 부담과 압박으로 느껴질 수 있어 알림의 톤을 최대한 부드럽게 설계했습니다.",
                '"학습한 지 20일 되었어요, 오늘도 시작해 볼까요?" "커피 한 잔 마시는 동안 끝낼 분량이 준비되어 있어요." "가벼운 마음으로 시작해요."',
                "등 복습을 재촉하는 대신 부담 없이 다시 돌아올 수 있도록 유도해, 학습이 압박이 아니라 습관으로 이어질 수 있게 도왔습니다.",
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
            <Body size={24} tracking="-0.48px">
              {[
                "혼자 처음으로 전과정을 수행한 프로젝트입니다. 기획으로 문제를 정의하고 화면을 디자인과, 웹퍼플리싱까지 전 과정을 혼자 진행했습니다.",
                "처음으로 만들어보는 과정들에 어떻게 만들어 가야할 지 모르겠다는 막막함이 컸지만, 제 나름대로 고민하고 선생님의 피드백을 받아 기틀을 잡아가며 완성해 갈 수 있었습니다.",
                "덕분에 각 단계에서 무엇을 수행해야 하는지를 직접 격어보며 이해할 수 있었고 막히는 지점이 생기면 스스로 방법을 찾아 끝까지 밀고 나가는 힘을 길렀습니다.",
              ]}
            </Body>
          </Block>
        </div>

        {/* Column 3 */}
        <div className={`${COLUMN} w-[475px] gap-[77px] pb-[92px]`}>
          <Block>
            <Shot height={312} sources={[{ src: cornell, style: fill({ objectFit: "contain" }) }]} />
            <Heading size={32}>Cornell Notes</Heading>
            <Body size={24} tracking="-0.48px">
              {[
                "정리 방식으로 코넬 노트를 선택한 이유는 특별한 학습법을 익히지 않아도 누구나 쉽게 따라 쓸 수 있고 핵심·설명·요약으로 구조가 나뉘어 있어 복습에 효과성이 검증된 방식이기 때문입니다. 학습 앱의 정리 포맷을 가장 쉽게 받아들일 수 있는 정리방법이라 판단했습니다.",
                "다만 코넬 노트는 좌우로 나누어 영역을 구분하는 형식이라, 좁고 세로로 긴 모바일 화면에 그대로 사용하면 기면 가독성이 떨어집니다.",
                "그래서 학습 효과를 만드는 핵심 구조는 살리되, 큰 단원으로 내용을 나누고 그 안에 키워드와 설명을 담는 방식으로 조직화 하여 모바일 환경에 맞게 재구성했습니다.",
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
            <Body size={24} tracking="-0.48px">
              {[
                "혼자 진행한 프로젝트라 모든 화면을 AI로 생성하고 직접 검토·수정하며 퍼블리싱했습니다. 다만 AI가 생성한 코드는 화면상 작동은 했지만, 섹션마다 클래스명이 제각각이라 헤더나 네비게이션 같은 공통 요소를 재사용할 수 없는 구조였습니다.",
                "특히 퀴즈 앱은 비슷한 화면이 반복되는 구조라, 공통 요소를 재사용하면 더욱 효율적이었습니다.",
                "그래서 클래스명을 다시 명명하고 헤더를 통일한 뒤 HTML의 박스 구조를 정립해, 한 번 잡은 구조를 여러 페이지에서 그대로 쓸 수 있도록 만들었습니다. AI를 도구로 쓰되, 결과물 구조와 품질은 직접 판단해 수저앟였습니다.",
              ]}
            </Body>
          </Block>
        </div>
      </SpreadFrame>
    </SpreadPalette>
  );
}
