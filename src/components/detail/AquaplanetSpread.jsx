import {
  Block,
  Body,
  COLUMN,
  Heading,
  Shot,
  SpreadFrame,
  SpreadPalette,
} from "./primitives";
// Sized to 2x what each well actually paints — the Figma exports were 4K
// screen captures. JPEG for the photographic ones, PNG where the flat document
// screenshot still compresses smaller.
import ticketPage from "../../assets/project/detail/aquaplanet/ticket-page.jpg";
import visual from "../../assets/project/detail/aquaplanet/visual.jpg";
import planning from "../../assets/project/detail/aquaplanet/planning.png";
import ai2 from "../../assets/project/detail/aquaplanet/ai-2.jpg";
import retrospect from "../../assets/project/detail/aquaplanet/retrospect.jpg";
import problem from "../../assets/project/detail/aquaplanet/problem.jpg";

// Figma frame 154:4041. Dark page, so the panels are translucent white with
// white type — the bright Reviu and Layer pages invert that.
const PAD = { top: 40, bottom: 41, left: 96, right: 194 };

export default function AquaplanetSpread() {
  return (
    <SpreadPalette panel="rgba(255,255,255,0.1)" ink="#ffffff">
      <SpreadFrame pad={PAD} gap={33}>
      {/* Column 1 — carries the project header above its first block. */}
      <div className={`${COLUMN} w-[474px] gap-[71px] pb-[50px]`}>
        {/* The header sits further off its block than the blocks do from each
            other, so it makes up the difference on its own. */}
        <div className="mb-[39px] flex flex-col items-end gap-[8px] font-['Pretendard'] text-white tracking-[-0.44px]">
          <p className="whitespace-pre font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] tracking-[-0.56px]">
            <span className="text-[28px]">AQUAPLANET</span>
            <span className="text-[22px]">{` Site Renewal  Team Project`}</span>
          </p>
          <p className="whitespace-nowrap text-[22px] font-semibold leading-[1.2]">
            티켓 페이지 UI·퍼블리싱, 기획 참여
          </p>
          <p className="w-full text-right text-[22px] font-semibold leading-[1.2]">
            향수가 어려운 사람에게 자신에게 맞는 향을 찾아주는, AI와 유저 추천으로
            향을 제안하는 커뮤니티 앱입니다.
          </p>
        </div>

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
          <Body size={18} tracking="-0.36px">
            {[
              "티켓 페이지를 맡고 가장 먼저 마주한 건 정보가 흩어져 있다는 것이었습니다. 프로모션, 기획상품, 제휴 혜택 같은 할인 정보가 페이지 곳곳에 제각각 놓여 있어, 저부터도 어떤 할인이 있는지 한눈에 파악하기 어려웠습니다. 그래서 흩어진 할인 정보를 모두 찾아 성격별로 정리하는 것부터 시작했습니다.",
              "그런데 모아 놓고 보니 종류가 너무 많았습니다. 지점마다 요금과 할인이 다르고 종류도 다양해서, 한 화면에 다 담으면 오히려 읽는게 더 어렵다고 판단했습니다.",
              "그래서 지점 단위로 나누되, 전환은 클릭 한 번으로 빠르게 이루어지도록 설계했습니다. 첫 진입에서 지점을 한 번 고르면, 이후에는 다른 지점을 눌러도 화면 전체가 아니라 요금 카드만 바로 바뀌도록 했습니다. 사용자가 지점을 오가며 비교하더라도 매번 처음부터 다시 탐색하지 않도록 하고 싶었습니다.",
            ]}
          </Body>
        </Block>

        <Block>
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
          <Body size={18} tracking="-0.36px">
            {[
              "팀의 리뉴얼 방향을 문제 정의·리서치·핵심 인사이트로 구조화하는 기획 문서를 작성했습니다.",
              "4개 지점이 하나의 브랜드로 인식되지 못한다는 문제와 지점 간 연결 UX의 근거를 정리했으며, 그중 제가 맡은 화면이 티켓 예매 페이지입니다.",
            ]}
          </Body>
        </Block>
      </div>

      {/* Column 2 — the tallest one, so it sets the spread's overall height. */}
      <div className={`${COLUMN} w-[475px] gap-[43px]`}>
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
            <Body size={24} tracking="-0.48px">
              {[
                "처음 이 프로젝트의 문제는 4개 지점이 하나로 이어지지 않는다는 핵심문제 하나였습니다.",
                "기획을 진행하던 중 한 팀원이 장표에서 같은 이야기가 계속 반복된다는 점을 짚었고, 저는 그 원인이 문제가 하나이기 때문이라는 걸 깨달았습니다. 풀어야 할 문제가 하나뿐이니 어느 방향으로 정리해도 결국 같은 말로 돌아왔던 것입니다. 그래서 기존 사이트를 다시 들여다보며 놓치고 있던 문제들을 찾아 문제를 세 가지로 넓혔습니다.",
                "첫번째는, 지점이 하나의 브랜드로 이어지지 않는다는 점 입니다. 지점마다 사이트가 따로 운영되고, 다른 지점으로 가는 이동 경로는 화면 구석 메뉴에 숨어 있었습니다. 한 지점을 보러 온 사용자는 다른 지점이 있다는 것조차 자연스럽게 알기 어려웠습니다. 사용자는 선택지를 놓치고, 브랜드는 다른 지점에도 방문할 수 있는 기회를 놓치고 있었습니다.",
                "두번째, 시스템이 불안정하다는 사실입니다. 사이트 곳곳에 오류가 있었습니다. 4개 지점 링크를 모아둔 페이지는 로딩이 70%에서 멈춰 열리지 않았고, PC로 접속했는데 모바일 화면이 뜨는 등 기본적인 동작이 불안정했습니다.",
                "세번째는 브랜드의 분위기가 전달되지 않는다는 점 입니다. 아시아 최대 규모의 아쿠아리움임에도, 사이트는 정적인 텍스트 위주라 그 규모감과 '바닷속을 경험한다'는 브랜드 감성이 느껴지지 않았습니다. 이렇게 문제를 세 층위로 나누자, 각각의 해결 방향도 분명해졌습니다.",
              ]}
            </Body>
          </div>
        </Block>

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
          <Body size={24} tracking="-1.2px">
            {[
              "티켓 페이지는 가격을 확인하는 기능적인 화면이지만, 아쿠아리움은 결국 가고 싶게 만드는 것이 목적인 서비스라고 생각했습니다. 그래서 요금을 보여주기 전에, 각 지점의 매력을 먼저 느끼게 하고 싶었습니다.",
              "물이라는 공간과 자연스럽게 어울리는 비눗방울 안에, 각 지점의 대표 해양 생물을 담았습니다. 지점을 고르는 순간이 단순한 선택이 아니라 각지점별로 대표하는 생물의을 발견하는 순간이 되길 바랐습니다. 비눗방울을 누르면 방울이 터지며 그 지점의 요금·할인 카드가 떠오릅니다.",
            ]}
          </Body>
        </Block>
      </div>

      {/* Column 3 */}
      <div className={`${COLUMN} w-[474px] gap-[130px] pb-[51px]`}>
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
          <Body size={24} tracking="-1.2px">
            {[
              "화면은 AI로 코드를 생성하고, 의도한 인터랙션에 맞게 검토·수정하며 구현했습니다. 다만 AI가 만든 결과에 그대로 쓰기 어려운 지점들이 있었고, 그 부분은 직접 판단해 수정을 요청했습니다.",
              "AI가 피그마의 디자인을 보고 생성한 비눗방울의 위치는 하나도 일치하지 않았습니다. 그래서 직접 x·y 좌표를 직접 조정해가며 다시 배치했습니다.",
              "배경에는 물속에서 빛이 일렁이는 인터랙션을 넣고 싶었습니다. 빛이 퍼지는 정도와 세기, 몇 개의 관선을 넣을지를 조정하며 디자인을 구현했습니다.",
              "반응형을 처음 적용하는데 문제가 발생했습니다. PC에서는 자연스럽던 빛이 태블릿·모바일에서는 너무 강해서, 상단 디자인을 덮어버렸습니다. 세기를 조정해봤지만 작은 화면에서는 안정적으로 담기 어려웠고, 결국 작은 화면에서는 이 인터랙션을 덜어냈습니다. 화면이 작아질 때 무리해서 유지하다 오류를 감수하기보다, 인터랙션을 덜어내는 편이 낫다는 걸 이때 배웠습니다.",
              "결제는 실결제까지가 프로토타입의 범위는 아니라고 판단해, 실제 티켓 구매 페이지로 연결했습니다.",
            ]}
          </Body>
        </Block>

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
          <Body size={24} tracking="-0.48px">
            {[
              "전에는 혼자 작업을 했는데, 이 프로젝트에서 팀원과 함께 작업을 하게 되면서 처음으로 여러사람의 피드백을 받을 수 있었습니다. 팀원의 다양한 의견들에 제 기획과 디자인은 늘 선택받지 못해 거절당하는 경험을 겪었습니다.",
              "그 과정이 쉽지 않았지만, 오히려 저를 객관적으로 보게 해줬습니다. 혼자서 좋아 보이던 결정도 팀 안에서는 다른 이유들로 진행할 수 없었고, 그때마다 저의 부족한 부분을 알아갔습니다. 현재 제 수준을 정확히 알게 되고 나아가야 할 방향을 명확히 정할 수 있었다는 사실을 배웠습니다.",
            ]}
          </Body>
        </Block>
        </div>
      </SpreadFrame>
    </SpreadPalette>
  );
}
