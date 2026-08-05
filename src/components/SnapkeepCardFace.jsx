import { useEffect, useRef, useState } from "react";

import icOptions from "../assets/snapkeep-card/options.svg";
import icSearch from "../assets/snapkeep-card/search.svg";
import icBookmark from "../assets/snapkeep-card/bookmark.svg";

// Authored at the card's own size in Figma, so everything below is placed in
// those literal px and the whole face is scaled to whatever the cube's card
// happens to be. Laying it out in percentages instead would leave the type
// sizes behind, since only the boxes would follow.
const W = 343;
const H = 522;

/** Snapkeep's face on the project cube — the app's own shell, drawn rather
    than screenshotted so it stays crisp at any card size and matches the live
    app it opens into. */
export default function SnapkeepCardFace() {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(1);

  // The card sizes off a clamp() on the viewport, so the only reliable number
  // is the one it actually rendered at.
  useEffect(() => {
    const el = boxRef.current;
    const measure = () => setScale(el.clientWidth / W);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 overflow-hidden rounded-[15px] border border-solid border-[#e7e6e3] bg-[#f7f7f5]"
    >
      {/* Uniform scale off the width. The card's aspect drifts by about a
          percent across the clamp's range, so the background above fills the
          card and only the content rides this layer. */}
      <div
        className="origin-top-left"
        style={{ width: W, height: H, transform: `scale(${scale})` }}
      >
        <p
          className="absolute left-[20px] top-[44px] font-['Inter'] text-[38px] font-bold italic leading-[46px] text-[#1d1c1c]"
          style={{ fontStyle: "italic" }}
        >
          snapkeep
        </p>

        {/* Search field */}
        <div className="absolute left-[12px] top-[140px] flex h-[55px] w-[319px] items-center rounded-[50px] bg-white pl-[23px] pr-[21px]">
          <p className="font-['Inter'] text-[16px] font-medium leading-none text-[#1d1c1c]">
            키워드 또는 질문으로 검색
          </p>
          <img src={icSearch} alt="" className="ml-auto size-[32px]" />
        </div>

        {/* View switch + the two trailing icons */}
        <div className="absolute left-[12px] top-[215px] flex h-[44px] w-[319px] items-center">
          <div className="flex h-[44px] w-[170px] items-center rounded-[50px] bg-[#e7e6e3] p-[3px]">
            <span className="flex h-[37px] w-[46px] items-center justify-center rounded-[100px] bg-white font-['Inter'] text-[14px] font-bold italic text-[#1d1c1c]">
              원본
            </span>
            <span className="flex h-[37px] w-[46px] items-center justify-center font-['Inter'] text-[14px] font-bold italic text-[#474646]">
              구조
            </span>
            <span className="flex h-[37px] w-[72px] items-center justify-center font-['Inter'] text-[14px] font-bold italic text-[#474646]">
              컴포넌트
            </span>
          </div>
          <img src={icOptions} alt="" className="ml-auto size-[24px]" />
          <img src={icBookmark} alt="" className="ml-[1px] size-[32px]" />
        </div>

        {/* The reference grid, standing in as one block at this size. */}
        <div className="absolute left-[19px] top-[297px] h-[209px] w-[305px] rounded-[20px] bg-[#d9d9d9]" />

        {/* Floats over the grid's bottom-right corner, the way the real one
            sits above the reference list. */}
        <div className="absolute left-[255px] top-[431px] flex h-[40px] w-[62px] items-center justify-center rounded-[50px] bg-[#017c6e] px-[10px]">
          <p className="font-['Pretendard'] text-[16px] font-medium leading-none text-white">
            + 등록
          </p>
        </div>
      </div>
    </div>
  );
}
