// The Safari chrome, on its own.
//
// It was inside ExperienceSection, next to the only thing that used it. There
// are two now: the desktop strip stacks three of these inside an iMac, and the
// phone's EXPERIENCE draws one inside the same iMac at about two fifths the
// size. Neither owns it, so it lives here.
//
// The chrome is fixed px — traffic lights, a 28px address field, hairlines —
// so it cannot be laid out fluidly and made smaller. It is built once at the
// design's own window size and the whole thing is scaled, which is the same
// fixed-canvas trick every section here uses.
import sfSidebar from "../../assets/experience/safari/sidebar-leading.svg";
import sfChevronDown from "../../assets/experience/safari/chevron-down.svg";
import sfChevronLeft from "../../assets/experience/safari/chevron-left.svg";
import sfChevronRight from "../../assets/experience/safari/chevron-right.svg";
import sfShield from "../../assets/experience/safari/shield.svg";
import sfLock from "../../assets/experience/safari/lock.svg";
import sfReload from "../../assets/experience/safari/reload.svg";
import sfShare from "../../assets/experience/safari/share.svg";
import sfPlus from "../../assets/experience/safari/plus.svg";
import sfGrid from "../../assets/experience/safari/grid.svg";

// The size the design draws a browser window at. Its chrome is fixed px, so
// the only way a smaller copy keeps its proportions is to build it at this size
// and scale the whole thing — the same fixed-canvas trick the sections use.
export const WINDOW = { width: 852, height: 494 };

/** The Safari chrome, at the design's own window size. */
export default function SafariWindow({ url, children }) {
  return (
    <div className="absolute inset-0 flex flex-col items-start overflow-hidden rounded-[10px] border-[0.5px] border-solid border-[#a5a5a5] bg-[#bfc2c8]">
      <div className="relative h-[52px] w-full shrink-0 overflow-hidden bg-[rgba(255,255,255,0.8)] backdrop-blur-[24px]">
        <div className="absolute left-[20px] top-[20px] flex items-start gap-[8px]">
          <div className="size-[12px] shrink-0 rounded-[6px] bg-[#ec6b5e]" />
          <div className="size-[12px] shrink-0 rounded-[6px] bg-[#f4bf4f]" />
          <div className="size-[12px] shrink-0 rounded-[6px] bg-[#61c453]" />
        </div>

        <img
          src={sfSidebar}
          alt=""
          className="absolute left-[110.91px] top-[20.41px] h-[14.383px] w-[18.422px] max-w-none"
        />
        <div className="absolute left-[139.21px] top-[19.09px] h-[18px] w-px bg-[rgba(0,0,0,0.1)]" />
        <img
          src={sfChevronDown}
          alt=""
          className="absolute left-[147.07px] top-[28.07px] h-[3px] w-[6px] max-w-none"
        />
        <img
          src={sfChevronLeft}
          alt=""
          className="absolute left-[163.63px] top-[18.58px] h-[13.563px] w-[7.641px] max-w-none"
        />
        <img
          src={sfChevronRight}
          alt=""
          className="absolute left-[199.61px] top-[18.58px] h-[13.563px] w-[7.641px] max-w-none"
        />

        <div className="absolute left-[27.69%] right-[29.84%] top-1/2 h-[28px] -translate-y-1/2">
          <img
            src={sfShield}
            alt=""
            className="absolute left-[0.76px] top-[6.68px] h-[15.781px] w-[12.984px] max-w-none"
          />
          <div className="absolute left-[29.5px] right-0 top-1/2 h-[28px] -translate-y-1/2 overflow-hidden rounded-[8px] border border-solid border-[rgba(0,0,0,0.25)]">
            <div className="absolute left-1/2 top-[5.5px] flex -translate-x-1/2 items-center justify-center gap-[8px]">
              <img
                src={sfLock}
                alt=""
                className="h-[11.432px] w-[7.828px] max-w-none shrink-0"
              />
              <p className="shrink-0 font-['Roboto'] text-[14px] leading-normal text-[#999] whitespace-nowrap">
                {url}
              </p>
            </div>
            <img
              src={sfReload}
              alt=""
              className="absolute right-[5.77px] top-[5.58px] h-[13.667px] w-[11.216px] max-w-none"
            />
          </div>
        </div>

        <img
          src={sfShare}
          alt=""
          className="absolute right-[93.57px] top-[15.97px] h-[17.633px] w-[13.867px] max-w-none"
        />
        <img
          src={sfPlus}
          alt=""
          className="absolute right-[57.55px] top-[18.91px] size-[12.891px] max-w-none"
        />
        <img
          src={sfGrid}
          alt=""
          className="absolute right-[19.81px] top-[18.18px] h-[14.383px] w-[14.383px] max-w-none"
        />
      </div>

      <div className="relative min-h-px w-full flex-1 overflow-hidden bg-[#f5f5f5]">
        {children}
        {/* The hairline the design puts under the toolbar. */}
        <div className="absolute inset-x-0 top-0 h-[0.5px] bg-[rgba(0,0,0,0.2)]" />
        <div className="absolute inset-x-0 top-[0.5px] h-[0.5px] bg-[rgba(0,0,0,0.1)]" />
      </div>
    </div>
  );
}
