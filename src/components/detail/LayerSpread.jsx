import {
  Block,
  Body,
  COLUMN,
  Heading,
  Shot,
  SpreadFrame,
  SpreadPalette,
} from "./primitives";
import bottle from "../../assets/project/detail/layer/bottle.svg";
// Sized to 2x what each well actually paints; the Figma exports were 4K
// captures. See AquaplanetSpread for the same treatment.
import survey from "../../assets/project/detail/layer/survey.jpg";
import retrospect from "../../assets/project/detail/layer/retrospect.jpg";
import magazine from "../../assets/project/detail/layer/magazine.jpg";
import ai1 from "../../assets/project/detail/layer/ai-1.jpg";
import ai2 from "../../assets/project/detail/layer/ai-2.jpg";

// Figma frame 154:4094.
const PAD = { top: 40, bottom: 40, left: 95, right: 195 };

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

export default function LayerSpread() {
  return (
    <SpreadPalette panel="#f7f7f7" ink="#1a1a1a">
      <SpreadFrame pad={PAD} gap={32}>
        {/* Column 1 — carries the project header above its first block. */}
        <div className={`${COLUMN} w-[475px] gap-[91px] pb-[50px]`}>
          {/* The header sits closer to its block than the blocks do to each
              other, so it pulls back the difference. */}
          <div className="-mb-[17px] ml-[20px] flex w-[439px] flex-col items-end gap-[8px] text-right text-white">
            <p className="whitespace-pre font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-0.44px]">
              <span className="text-[28px]">{`Layer `}</span>
              <span className="text-[22px]">{` Team Cummunity APP`}</span>
            </p>
            <p className="font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-0.44px]">
              디자인(매거진·향수 상세페이지·챗봇 캐릭터) · 설문지 제작 ·
              구현(향수 상세페이지·카테고리·챗봇)
            </p>
            <p className="font-['Pretendard'] text-[22px] font-semibold leading-[1.2] tracking-[-1.1px]">
              서비스. 향수를 어렵게 느끼는 사람도 자기에게 맞는 향을 찾을 수
              있도록. AI 와 유저 추천으로 향을 제안하는 커뮤니티 앱입니다.
            </p>
          </div>

          <Block>
            <Shot height={294} sources={[{ src: survey, style: fill({ objectFit: "cover" }) }]} />
            <Heading size={32}>Survey</Heading>
            <Body size={24} tracking="-0.48px">
              {[
                "향수 사용자 50명에게 10가지를 물었습니다. 가장 어렵다고 느끼는 것에 대해 질문하니 용어가 어렵다거나 종류가 너무많다는 것 보다 나에게 맞는 향을 찾기 어렵다는 답변이 많았습니다.",
                "원하는 서비스를 묻는 질문에도 90%가 나에게 맞는 추천을 받고싶다고 하였습니다. 설문결과 문제는 정보의 양이 아니라, 취향에 맞는 향을 고르지 못한다는 것으로 나타났습니다.",
                "시간이 촉박한 상황에서, AI로 문항을 생성한 뒤 다듬어 리서치 설문지를 만들었고, 설문은 팀원 모두가 함께 진행했습니다.",
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
                "이 프로젝트에서 가장 크게 남은 건, 참고할 것이 없을 때 스스로 답을 만들어야 했던 경험입니다. 매거진 페이지를 맡았을 때 향수앱은 물론 모바일에 맞는 매거진 형태 자체가 드물어, 참고할 레퍼런스가 없었습니다.",
                "처음엔 막막했지만, 결국 향수 매거진이라는 틀에 갇히지 않고 작은 화면에서 긴 정보를 부담 없이 전달한다는 핵심에 맞는 다른 분야의 레퍼런스를 고민했고 카드뉴스가 떠올랐습니다.",
                "레퍼런스를 그대로 가져오는 것이 아니라, 문제의 본질을 정의하고 그에 맞는 구조를 직접 설계하는 것이 디자인이라는 걸 배울 수 있었습니다.",
              ]}
            </Body>
          </Block>
        </div>

        {/* Column 2 — the tallest one, so it sets the spread's overall height. */}
        <div className={`${COLUMN} w-[475px] gap-[40px]`}>
          <Block>
            <NoteCard />
            <Heading size={32}>Detail Page</Heading>
            <Body size={24} tracking="-0.48px">
              {[
                '향수 상세페이지는 한눈에 향수에 대해 파악할 수 있게 하는 것이 가장 중요하다고 생각했습니다. 그래서 향수 병에 탑·미들·베이스 노트를 색으로 나누고, 향의 함유량만큼 병에 색을 채웠습니다. 글로 "탑노트: 베르가못"이라고 나열하는 것보다, 사용자가 병을 보고 향의 구성을 감각적으로 이해하는 것이 필요하다고 생각했기 때문입니다.',
                "디자인부터 구현까지 직접 진행했는데, AI를 활용해 병의 배경을 제거하고 노트별 색을 지정해 채우는 작업을 했습니다. 처음에는 피그마에 있던 기본 향수 모양으로만 만들어져서, AI에게 해당 향수의 형태를 그대로 가져와 향수 데이터에 저장된 색을 디자인한 비율대로 채우도록 요청했습니다.",
                "다른 문제도 있었는데, 향수 병이 일정하지 않은 만큼 크기를 일정하게 유지하지 못한다는 점 이었습니다. 높이를 기준으로 맞추되, 높이를 맞췄을 때 향수 노트 섹션이 화면을 벗어나면 너비를 기준으로 삼도록 규칙을 정해, 일정한 병 사이즈를 유지할 수 있었습니다.",
              ]}
            </Body>
          </Block>

          <Block>
            <Shot height={320} sources={[{ src: magazine, style: fill({ objectFit: "contain" }) }]} />
            <Heading size={32}>Magazine Page</Heading>
            <Body size={24} tracking="-0.48px">
              {[
                "향수 상식과 트렌드 등 향에 대한 다양한 정보를 다루는 공간으로, 입문자는 향수 지식을 얻고 애호가는 트렌드를 접할 수 있도록 구성했습니다. 서로 다른 두 사용자가 한 페이지에서 각자의 욕구를 채울 수 있도록 한 것입니다.",
                "하지만 참고할 레퍼런스가 없었습니다. 향수앱은 물론, 모바일에 최적화된 매거진 형태 자체가 드물었습니다. 레퍼런슬 찾기 위해 쇼핑몰앱을 조사하다, 네이버 카드뉴스가 앱에서도 긴 정보를 부담 없이 전달할 수 있겠다는 생각에 콘텐츠의 성격에 맞는 3가지의 만들었습니다.",
                "한 장형 : 스크롤 없이 한 화면에 담기는 카드",
                "리스트형 : 향수 오래 지속시키는 법 처럼 방법이 여럿인 주제는, 설명글에 각 방법을 카드로 들어 가로 스크롤로 이어 볼 수 있습니다.",
                "비주얼형 : 사진과 글을 번갈아 배치해, 한 화면에 글이 너무 몰리지 않도록하였습니다.",
              ]}
            </Body>
          </Block>
        </div>

        {/* Column 3 */}
        <div className={`${COLUMN} w-[475px] gap-[107px] pb-[130px]`}>
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
            <Body size={24} tracking="-0.48px">
              {[
                "저는 카테고리 및 챗봇의 구현을 담당했습니다.",
                "[카테고리] 전달받은 카테고리 디자인은 준비된 실제 향수 데이터와 맞지 않았습니다. 디자인은 그대로 구현하되, 내용은 실제 데이터에 맞게 수정했습니다.",
                "[챗봇] 사용자의 모든 질문에 답변할 수는 없으므로 질문의 범위를 좁혀야 한다고 생각했습니다. 퀵버튼으로 질문을 유도해 범위를 줄이고, 답변은 여러 버전을 준비해 최대한 다양한 상황에 대비할 수 있도록 했습니다.",
                "지도로 가까운 매장을 찾는 기능은 AI(Claude)의 도움으로 지도를 이미지로 생성해 넣었습니다. 챗봇 페이지의 디자인 요소를 더하기 위해, 챗봇 캐릭터는 직접 만들었습니다.",
                "담당한 화면들은 AI로 코드를 생성하고 직접 검토·수정하며 퍼블리싱했습니다. AI를 활용하되, 의도와 맞지 않는 부분은 다시 수정을 요청하며 구현했습니다.",
              ]}
            </Body>
          </Block>

          <Block>
            <Shot height={220} sources={[{ src: ai2, style: fill({ objectFit: "contain" }) }]} />
            <Heading size={32}>AI Implementaion</Heading>
            <Body size={24} tracking="-0.48px">
              {[
                "상세페이지의 향수 이미지를 AI로 생성했습니다. 같은 화면 구조에 놓이는 만큼 분위기를 통일할 필요가 있다고 생각했고, 앱 실행 시 용량으로 인한 오류를 고려해 향수마다 세 장으로 제한했습니다.",
                "향수 없이 분위기만 담은 이미지, 향수가 들어간 이미지, 향수와 패키징이 함께 있는 이미지로 들어가는 요소는 고정하고 향의 계열과 브랜드에 따라 배경 분위기만 달라지게 하니, 향수마다 다른 이미지여도 전체적으로 하나의 톤으로 보였습니다.",
              ]}
            </Body>
          </Block>
        </div>
      </SpreadFrame>
    </SpreadPalette>
  );
}
