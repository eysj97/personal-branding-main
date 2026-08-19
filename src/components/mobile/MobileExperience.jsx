import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGroundUnder } from "../../lib/useGround";
import { vw } from "./MobileHeader";
import StepDots from "./StepDots";
import { pinPage } from "../../lib/pinPage";
import { navigate } from "../../lib/route";
import SafariWindow, { WINDOW } from "../experience/SafariWindow";

// The monitor the saved-references screen is shown in — the same asset the
// desktop strip and the project cards use.
import imacFrame from "../../assets/project/mockup/imac.avif";
import savedScreen from "../../assets/experience/saved-screen.avif";
// The library as it actually looks. `snapkeep-grid` rather than
// `archive-capture`, although the design names the layer after the latter:
// they are the same capture, and archive-capture.png is the 8304px still that
// backs the desktop's video — sixty-one megapixels for something shown 385
// wide here. snapkeep-grid is the same picture already downscaled to 1420.
import snapkeepGrid from "../../assets/experience/snapkeep-grid.png";

// The drawn-on marks.
//
// The four composite ones come in as markup, the way the desktop takes them.
// They were <img> src's to begin with, on the grounds that nothing here has to
// animate their insides — which is true, and still left the sparkle cluster
// rendering as a broken image: an <img> loads the SVG as a separate document
// with its own parse and its own fetch, and these files are exports that were
// only ever written to be inlined. Put the markup in the page and there is no
// second document to fail to load.
//
// The three single-shape ones stay files. They are one path each, they load,
// and inlining them would put three more copies of an <svg> in every render.
import problemSquiggle from "../../assets/experience/doodle/problem-squiggle.svg?raw";
import problemArrow from "../../assets/experience/doodle/problem-arrow.svg?raw";
import solutionSparkle from "../../assets/experience/doodle/solution-sparkle.svg?raw";
import tagSparkle from "../../assets/experience/doodle/tag-sparkle.svg";
import searchLoupe from "../../assets/experience/doodle/search-loupe.svg";
import searchBubble from "../../assets/experience/doodle/search-bubble.svg";

/*  EXPERIENCE, on a phone. Figma 1317:114 / 92 / 149 / 461 / 545 / 582 / 598 /
 *  685, all drawn at 430 x 932.
 *
 *  The desktop tells this story as one strip five screens wide, panned past you
 *  by the page's scroll. That does not survive a phone: fitted to the width, a
 *  panel drawn for a 1920px canvas comes out a quarter the size and the copy
 *  with it — which is what it was doing here, at about 27px for a heading every
 *  other section sets at 60.
 *
 *  So the same eight beats are eight screens, and the gesture changes with
 *  them. Scroll is the wrong verb for this: the strip needs a long, continuous
 *  drag to read as travel, and a phone's scroll is short, flicked, and shared
 *  with getting to the next section. A tap is none of those things — it is
 *  discrete, it lands on exactly one beat, and it cannot overshoot three.
 *
 *  Everything below is written in the design's own 430-wide px and converted
 *  once, by vw() — so the composition holds its proportions on any phone,
 *  exactly as the other mobile sections do. Body copy is the exception and is
 *  flat 16px: that is what PROJECT, LEARN and SKILLS set their line under the
 *  name at, and a caption that is 14.5 here and 16 next door reads as a
 *  different site.
 */

// The eight beats, in the order the desktop tells them: the title card, what
// the thing is, the problem in two halves, the three answers in two, and the
// invitation.
const LAST = 7;

// How far every screen's composition sits below the middle of the screen.
//
// Zero, and the constant is kept because it is the one place to put a number if
// one is ever wanted again. It was 20 while the stage was the space left over
// between a header band at the top and a dot row at the bottom, which is not
// the middle of anything — the composition sat 56 low and the 20 made it worse.
// The track fills the section now and the header and the dots float over it, so
// centred means centred, which is how all eight frames are drawn.
const DROP = 0;

// A run of type set on white, the way the design draws its highlights.
//
// Two things are wrong with a plain `bg-white` on a span and both show. A
// background on an *inline* box is drawn over the font's whole content area —
// ascender to descender, near enough 1.25em on this face — so at 42px the block
// stands about 10px taller than the capitals it is supposed to be hugging.
// `inline-block` makes the box the line box instead, and 0.8 of an em is the
// cap height with a hair either side.
//
// The other is the space. `<span> Needed</span>` paints the space too, which is
// a quarter of an em of white before the word starts and reads as the block
// being off to the left. The space belongs to the line, not to the run.
const MARKED = "inline-block bg-white text-black leading-[0.8]";

// Body copy, everywhere. See the note above on why this one is not in vw.
const BODY = "font-['Pretendard'] font-medium text-[16px] leading-none text-white";

/** One of the loose marks scribbled over a screen.
 *
 *  `raw` is the SVG's markup and `src` is a file; a mark is one or the other.
 *  Either way the box is the design's and the drawing fills it — the exports
 *  carry their own width and height, which `[&>svg]:size-full` overrides for
 *  the inlined ones and `size-full` for the loaded ones.
 *
 *  `centre` puts the box on the middle of its parent instead of at `left`. One
 *  of these sits over a word in a centred line, and a measured `left` only
 *  lands on it while the type is exactly as wide as it was when the number was
 *  worked out. */
function Mark({ src, raw, left, top, width, height, turn, flipY, centre }) {
  const spin = [
    centre ? "translateX(-50%)" : "",
    turn ? `rotate(${turn}deg)` : "",
    flipY ? "scaleY(-1)" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const box = {
    left: centre ? "50%" : vw(left),
    top: vw(top),
    width: vw(width),
    height: vw(height),
    transform: spin || undefined,
  };
  if (raw) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute [&>svg]:size-full"
        style={box}
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    );
  }
  return (
    <div aria-hidden className="pointer-events-none absolute" style={box}>
      <img src={src} alt="" className="block size-full max-w-none" />
    </div>
  );
}

/** A mark that is inked on when its screen arrives, rather than simply being
 *  there.
 *
 *  Same trick the desktop draws these with: one dash as long as the whole line
 *  followed by a gap just as long, slid along by the offset. At a full length
 *  the dash sits entirely past the end of the path and nothing shows; bring the
 *  offset to zero and the line is uncovered from its start. The difference is
 *  what drives it — up there it is the scroll position, and here it is a
 *  transition, because a screen is either the one you are on or it is not.
 *
 *  It rewinds when the screen leaves, so swiping back and forth draws it again
 *  instead of showing a mark that has already happened.
 *
 *  `relay` runs the paths one after another instead of together, and the share
 *  of the clock each gets is its share of the total length — one nib at one
 *  speed across the whole mark. Only the arrow needs it: a shaft and a head are
 *  two strokes in that order, and nobody draws the head while the line is still
 *  crawling towards it. A loop is one gesture that happens to be exported as
 *  several paths, and relaying that reads as separate marks being placed.
 */
function DrawnMark({ raw, left, top, width, height, turn, active, duration = 700, relay }) {
  const ref = useRef(null);
  const paths = useRef([]);

  useLayoutEffect(() => {
    paths.current = Array.from(ref.current.querySelectorAll("path"));
    for (const path of paths.current) {
      // Measured once. getTotalLength walks the path's geometry and is not
      // free, and this needs the number on every state change.
      const length = path.getTotalLength();
      path.dataset.length = String(length);
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = String(length);
    }
  }, []);

  useEffect(() => {
    const list = paths.current;
    if (!list.length) return undefined;

    if (!active) {
      for (const path of list) {
        for (const running of path.getAnimations()) running.cancel();
        path.style.strokeDashoffset = path.dataset.length;
      }
      return undefined;
    }

    // Animated rather than transitioned, and that is the fix rather than a
    // preference. A transition only runs if the property changes while a
    // transition is already set on it; these paths sit at `transition: none`
    // while their screen is off, so turning the transition on and moving the
    // offset in the same tick is the one case an engine is free to skip — and
    // skipping it leaves the mark simply present, which is what it was doing.
    // An animation has no before-state to compare against: it is told to run
    // and it runs.
    const total = list.reduce((sum, path) => sum + Number(path.dataset.length), 0);
    let before = 0;
    const playing = list.map((path) => {
      const length = Number(path.dataset.length);
      const span = (relay ? length / total : 1) * duration;
      const delay = (relay ? before / total : 0) * duration;
      before += length;
      return path.animate(
        [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
        // `both`, so a path that has not started yet is held wound back rather
        // than sitting drawn through its own delay — which is the whole of what
        // the relay is for.
        { duration: span, delay, easing: "linear", fill: "both" },
      );
    });
    return () => {
      for (const running of playing) running.cancel();
    };
  }, [active, duration, relay]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute [&>svg]:size-full"
      style={{
        left: vw(left),
        top: vw(top),
        width: vw(width),
        height: vw(height),
        transform: turn ? `rotate(${turn}deg)` : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  );
}

// How a block arrives when its screen does: in from the left, out of a fifth of
// its own weight. `order` is its place in the queue rather than a delay in ms —
// the pacing is one number, and a block only says where it is in the line.
//
// A fifth rather than nothing for the headlines, and that is the point of them:
// the line is legibly there before it arrives, so what you watch is a sentence
// coming into focus rather than a sentence appearing out of an empty screen. It
// rewinds when the screen leaves, so swiping back plays it again.
//
// `rest` is that fifth, and it is a parameter because the solutions want zero.
// One headline fading up from a fifth is a sentence sharpening; three of them
// stacked at a fifth are three grey lines already on the screen, and what
// arrives afterwards is not an entrance, it is a brightness change on a list
// that was already there. A list that comes in one item at a time has to start
// with no items.
const REVEAL_MS = 520;
const REVEAL_STAGGER = 170;
const REVEAL_FROM = -34;
const REVEAL_REST = 0.2;
const reveal = (active, order = 0, rest = REVEAL_REST) => {
  const delay = active ? order * REVEAL_STAGGER : 0;
  return {
    opacity: active ? 1 : rest,
    transform: active ? "none" : `translateX(${vw(REVEAL_FROM)})`,
    transition: `opacity ${REVEAL_MS}ms ease-out ${delay}ms, transform ${REVEAL_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
  };
};

/** The black rounded tag the design pins on two of the headlines ("But",
 *  "Try"). One component because they are the same object at the same angle,
 *  differing only in the word and where it is pinned. */
function Badge({ children, left, top }) {
  return (
    <div
      className="pointer-events-none absolute origin-top-left"
      style={{ left: vw(left), top: vw(top), transform: "rotate(11.41deg)" }}
    >
      <div
        className="flex items-center justify-center bg-black font-['Plus_Jakarta_Sans'] font-bold leading-none text-white"
        style={{
          borderRadius: vw(10),
          padding: `${vw(5)} ${vw(10)}`,
          fontSize: vw(28),
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The Safari window, scaled into the monitor's glass.
 *
 *  Its chrome is fixed px and cannot be laid out fluidly (see the note in
 *  experience/SafariWindow), so the window is built at its own 852x494 and the
 *  whole thing is scaled down. The factor has to be measured rather than
 *  written: the glass is sized in vw, the window in px, and CSS cannot divide
 *  one by the other. */
function GlassWindow({ url, children }) {
  const glassRef = useRef(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const glass = glassRef.current;
    const measure = () => setScale(glass.clientWidth / WINDOW.width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(glass);
    return () => observer.disconnect();
  }, []);

  return (
    // The glass, as fractions of the monitor — the screen inside the bezel.
    // The same four numbers the desktop keeps in GLASS.
    <div
      ref={glassRef}
      className="absolute overflow-hidden"
      style={{ inset: "4.62% 3.89% 32.05% 4%" }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: WINDOW.width,
          height: WINDOW.height,
          transform: `scale(${scale})`,
          // Nothing to show until it has been measured — at scale 0 the window
          // is invisible anyway, but this keeps a full-size window from being
          // painted for one frame on a slow first layout.
          visibility: scale ? "visible" : "hidden",
        }}
      >
        <SafariWindow url={url}>{children}</SafariWindow>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- screens -- */

/** 1 — the title card that hands off from the hero. Figma 1317:114. */
function Intro({ active }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: vw(12) }}>
      <p
        className="whitespace-nowrap font-['Plus_Jakarta_Sans'] font-semibold leading-[1.2] text-white"
        style={{ fontSize: vw(60), letterSpacing: vw(-1.2), ...reveal(active) }}
      >
        Experience it
      </p>
      <p className={`${BODY} text-center leading-[1.2] tracking-[-0.32px]`}>
        말보다 먼저 만든걸 보여드릴께요
      </p>
    </div>
  );
}

/** 2 — what the thing actually is, before the story of building it.
 *  Figma 1317:92. */
function Archive({ active }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: vw(32) }}>
      <div className="flex flex-col items-center" style={{ gap: vw(24) }}>
        <p className="font-['Pretendard'] text-[12px] font-medium leading-none text-white">
          SNAPKEEP · 개인 프로젝트
        </p>

        <div className="flex flex-col" style={{ width: vw(392), gap: vw(18) }}>
          {/* Centred, where the design ranges both lines right. Ranged right
              they sit hard against the block's edge with the ragged side
              inboard, which on a 392 block inside a 430 screen reads as the
              headline having slid off to one side. */}
          <div
            className="flex flex-col items-center text-center font-['Plus_Jakarta_Sans'] font-bold text-white"
            style={{ gap: vw(4), fontSize: vw(42), ...reveal(active) }}
          >
            <p className="whitespace-nowrap leading-none">The Archive You&rsquo;ve</p>
            <p className="whitespace-nowrap leading-none">
              Always
              {/* The white block behind "Needed" is the word's own background
                  now, not a rectangle placed at 265.
                  
                  It was a rectangle, because that is how the design draws it:
                  the two lines are ranged right, so the last word ends exactly
                  where the block does and a fixed 265-to-392 bar lands on it.
                  Centre the lines and that stops being true — the word moves
                  and the bar does not. A highlight that is part of the run it
                  highlights cannot come apart from it. */}
              {" "}
              <span className={MARKED}>Needed</span>
            </p>
          </div>
          <p className={`${BODY} text-center`}>
            모은 레퍼런스를 제때 꺼내 쓸 수 있는 경험
          </p>
        </div>

      </div>

      <Capture />

      <p className={`${BODY} text-center`}>이것을 만들기까지의 과정을 보여드립니다</p>
    </div>
  );
}

/** The library capture, at the size both screens that use it draw it. */
function Capture({ onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="block overflow-hidden"
      style={{ width: vw(385), height: vw(343), borderRadius: vw(6) }}
    >
      <img
        src={snapkeepGrid}
        alt="Snapkeep 라이브러리 화면"
        className="block size-full object-cover"
      />
    </Tag>
  );
}

/** 3 — everything saved, nothing findable. Figma 1317:149. */
function Saved({ active }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ gap: vw(38) }}>
      <div className="flex flex-col items-end" style={{ gap: vw(12) }}>
        {/* The two lines and the tag are one block: the tag is pinned to the
            left of the second line and overlaps the first, so they cannot be
            three rows in a column. */}
        <div className="relative" style={{ width: vw(320), height: vw(96), ...reveal(active) }}>
          <p
            className="absolute whitespace-nowrap text-right font-['Plus_Jakarta_Sans'] font-bold leading-none text-white"
            style={{ left: vw(73.75), top: 0, fontSize: vw(42) }}
          >
            Saved it,
          </p>
          <Badge left={0} top={31.6}>
            But
          </Badge>
          <p
            className="absolute whitespace-nowrap text-right font-['Plus_Jakarta_Sans'] font-bold leading-none text-white"
            style={{ left: vw(74.5), top: vw(42.44), fontSize: vw(42) }}
          >
            can&rsquo;t find it
          </p>
        </div>
        {/* w-full, which is the design's `min-w-full`: the column above is
            ranged right — the two headline lines are — and without a width of
            its own this line is ranged right with them, so `text-center`
            centres it inside its own text box and that box sits hard against
            the right edge. Given the column's width it centres over the
            headline instead, which is centred on the screen. */}
        <p className={`${BODY} w-full text-center`} style={{ lineHeight: 1.35 }}>
          사용자들이 레퍼런스는 많이 저장하지만,
          <br />
          정작 필요할 때 찾지 못하는 문제
        </p>
      </div>

      <div className="relative" style={{ width: vw(385), height: vw(325) }}>
        <img src={imacFrame} alt="" className="block size-full object-cover" />
        <GlassWindow url="khazifire.com">
          <img
            src={savedScreen}
            alt="레퍼런스를 저장해 둔 보드"
            className="absolute left-0 top-0 block size-full max-w-none object-cover"
          />
        </GlassWindow>
      </div>
    </div>
  );
}

/** 4 — the problem, first half. Figma 1317:461. */
function ProblemA({ active }) {
  return (
    <div className="relative flex flex-col" style={{ width: vw(380), gap: vw(12) }}>
      <div
        className="relative flex flex-col items-end"
        style={{ width: vw(377), ...reveal(active) }}
      >
        {/* The white block is the word's own background here too — the last
            measured rectangle in this file has gone with the others. */}
        <p
          className="w-full text-left font-['Pretendard'] font-bold leading-none"
          style={{ fontSize: vw(42) }}
        >
          <span className={MARKED}>The problem</span>
        </p>
        <p
          className="whitespace-nowrap text-right font-['Pretendard'] font-bold leading-none text-white"
          style={{ fontSize: vw(42) }}
        >
          wasn&apos;t saving
        </p>
        {/* The square box the drawing sits in, with its own slack — see the
            note on the desktop's marks. 91 is the desktop's 216.784 at the
            ratio the two headlines are drawn at (42 against 100). */}
        <DrawnMark
          raw={problemSquiggle}
          left={236}
          top={-24}
          width={91}
          height={91}
          turn={15}
          active={active}
        />
      </div>
      <p className={BODY}>현재 있는 저장기능은 충분하고 다양하게 존재합니다</p>
    </div>
  );
}

/** 5 — the problem, second half. Figma 1317:545. */
function ProblemB({ active }) {
  return (
    <div className="relative flex flex-col" style={{ width: vw(370), gap: vw(12) }}>
      <div
        className="font-['Pretendard'] font-bold leading-none text-white"
        style={{ fontSize: vw(42), ...reveal(active) }}
      >
        <p className="whitespace-nowrap">it was getting it</p>
        <p className="whitespace-nowrap" style={{ marginTop: vw(6) }}>
          back out
        </p>
      </div>
      {/* Its own line, where the design frame repeats the previous screen's.
          The two headlines are the halves of one sentence — the problem was not
          saving, it was getting it back out — and a caption that says the same
          thing under both leaves the second half unanswered. */}
      <p className={BODY}>저장된 내용을 어떻게 꺼내는 지가 중요합니다</p>
      {/* The desktop's 439.666 box at the same 42-against-100 ratio. */}
      <DrawnMark
        raw={problemArrow}
        left={222}
        top={-52}
        width={185}
        height={185}
        turn={-9.68}
        active={active}
        duration={900}
        relay
      />
    </div>
  );
}

/** 6 — the three answers, announced. Figma 1317:582. */
function Produce({ active }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: vw(16) }}>
      <p
        className="whitespace-nowrap font-['Pretendard'] font-bold leading-none text-white"
        style={{ fontSize: vw(42), ...reveal(active) }}
      >
        Produce{" "}
        {/* The burst hangs off the numeral itself, not off the line or the
            block. Both of those were tried and both are the same mistake in
            different clothes: they put the mark at a measured x that is only
            over the "3" while the words either side of it are exactly as wide
            as they were when the number was worked out. Hung here it is over
            the numeral by construction, at any size, in any font that loads.

            -50 is read off the drawing rather than guessed: the five strokes
            radiate from a point at (84, 159) of the file's 170x203 box and
            their inner ends reach y=141.86, which at this box's scale puts the
            lowest ink 59 down — so the box starts 50 above the numeral's top
            and the ink stops just clear of it. */}
        <span className="relative inline-block text-[#f460c0]">
          3
          <Mark raw={solutionSparkle} centre top={-50} width={71} height={85} />
        </span>{" "}
        solution
      </p>
      <p className={`${BODY} text-center`}>사용자의 행동 패턴에서 도출한 3가지 핵심 기능</p>
    </div>
  );
}

/** 7 — the three answers themselves. Figma 1317:598.
 *
 *  100 between the rows is the design's, and it is what makes the three read as
 *  one list rather than three stacked cards. */
function Solutions({ active }) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ width: vw(430), gap: vw(100) }}
    >
      {/* Row 1 — AI tagging. The three arrive in reading order rather than
          together: they are a list of three answers, and a list that appears
          all at once is a picture of a list. */}
      <div
        className="flex w-full items-center"
        style={{ paddingInline: vw(20), ...reveal(active, 0, 0) }}
      >
        <div className="relative flex flex-col items-center" style={{ gap: vw(20) }}>
      {/* The white block is the word's own background, not a rectangle placed
          at a measured x.

          It was a rectangle, because that is how the design draws it — and a
          rectangle is a size and a position worked out for one type size. These
          headlines are 42 now where the frame set them at 36, and every one of
          those rectangles was suddenly the wrong length in the wrong place. A
          highlight that is part of the run it highlights cannot come apart from
          it, whatever size the run is set at. */}
          <div
            className="relative flex flex-col items-end font-['Plus_Jakarta_Sans'] font-bold text-white"
            style={{ width: vw(394), gap: vw(4), letterSpacing: vw(-0.72) }}
          >
            <p className="w-full text-left leading-none" style={{ fontSize: vw(42) }}>
              <span className={MARKED}>AI tagging</span> instead
            </p>
            <p
              className="whitespace-nowrap text-right leading-none"
              style={{ fontSize: vw(42) }}
            >
              of folders
            </p>
          </div>
          <p className={`${BODY} text-center`}>폴더 체계 대신 AI 기반 태그로 자동 분류</p>
          {/* 62 / -10 is where the design puts the mark's *box*, and that box
              is 27.749 square with the 20.379 drawing centred in it — so the
              drawing's own corner is 3.685 further in on both axes. */}
          <Mark
            src={tagSparkle}
            left={62 + (27.749 - 20.379) / 2}
            top={-10 + (27.749 - 20.379) / 2}
            width={20.379}
            height={20.379}
            turn={-60.67}
          />
        </div>
      </div>

      {/* Row 2 — search. */}
      <div
        className="flex w-full items-center"
        style={{ paddingInline: vw(20), ...reveal(active, 1, 0) }}
      >
        <div className="relative flex flex-col items-center" style={{ width: vw(390), gap: vw(24) }}>
          <div
            className="relative flex w-full flex-col items-start font-['Plus_Jakarta_Sans'] font-bold"
            style={{ gap: vw(4), letterSpacing: vw(-0.72) }}
          >
            <p className="w-full text-left leading-none text-white" style={{ fontSize: vw(42) }}>
              Search in
            </p>
            <p className="w-full text-right leading-none" style={{ fontSize: vw(42) }}>
              <span className={MARKED}>design language</span>
            </p>
            {/* inset[27.63% 52.21% 38.16% 40.26%] of the 390 x 76 title block,
                resolved. The design stretches this one slightly wider than it
                is tall, so the two numbers are not equal. */}
            <Mark src={searchLoupe} left={157} top={21} width={29.4} height={26} />
            <Mark src={searchBubble} left={329} top={15} width={38.074} height={37} />
          </div>
          <p
            className="w-full text-right font-['Plus_Jakarta_Sans'] text-[16px] font-medium leading-none text-white tracking-[-0.32px]"
          >
            디자인언어를 사용한 태깅 및 검색 제공
          </p>
        </div>
      </div>

      {/* Row 3 — layout structure. The three marks beside it are plain coloured
          rectangles in the design, not the folder icons the desktop uses. */}
      <div
        className="relative flex flex-col items-center"
        style={{ gap: vw(24), ...reveal(active, 2, 0) }}
      >
        <p
          className="relative whitespace-nowrap text-right font-['Plus_Jakarta_Sans'] font-bold leading-none"
          style={{ fontSize: vw(42), letterSpacing: vw(-0.72) }}
        >
          <span className={MARKED}>Layout structure</span>
        </p>
        <p
          className="whitespace-nowrap text-right font-['Plus_Jakarta_Sans'] text-[16px] font-medium leading-none text-white tracking-[-0.32px]"
        >
          원본뿐만 아니라 구조 분석 후 구조도 및 컴포넌트 제공
        </p>
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: vw(-17.85), top: vw(15), width: vw(40), height: vw(30) }}
        >
          <div
            className="absolute bg-[#ffd527]"
            style={{ left: 0, top: vw(2.17), width: vw(12.494), height: vw(25.63), transform: "rotate(-6.16deg)" }}
          />
          <div
            className="absolute bg-[#28c9a0]"
            style={{ left: vw(17.23), top: vw(14.77), width: vw(12.493), height: vw(12.599) }}
          />
          <div
            className="absolute bg-[#f460c0]"
            style={{ left: vw(22.4), top: 0, width: vw(12.493), height: vw(12.599) }}
          />
        </div>
      </div>
    </div>
  );
}

/** 8 — the payoff: the invitation, and the app behind it. Figma 1317:685. */
function Snapkeep({ active }) {
  return (
    // The tag hangs off this box, not off the line of type inside it. The
    // design pins it 50 from the left of the block that holds *both* the words
    // and the capture, and that block is the capture's own 385 wide — measure
    // it from the narrower text block instead and 50 lands a good forty px
    // further right, which is on top of the S it is supposed to sit beside.
    <div className="relative flex flex-col items-center" style={{ gap: vw(32) }}>
      <div className="flex flex-col items-center" style={{ gap: vw(12) }}>
        {/* The design writes the headline as eight leading spaces and a word,
            to hold the tag's room open. Padding instead — the spaces are a
            Figma habit and survive neither a copy-paste nor a screen reader —
            and 94 is what those eight come to at this size. */}
        <p
          className="whitespace-nowrap font-['Plus_Jakarta_Sans'] font-bold leading-none text-white"
          // 74, where the design's eight leading spaces come to 94. The tag is
          // pinned beside this word and set at an angle, and at the design's
          // own spacing the two read as a tag and a heading that happen to be
          // near each other rather than as one thing.
          style={{ fontSize: vw(42), paddingLeft: vw(74), ...reveal(active) }}
        >
          Snapkeep
        </p>
        <p className={`${BODY} text-center`}>
          완성된 서비스 경험 클릭해서 직접 체험해보세요
        </p>
      </div>
      <Badge left={50} top={-11}>
        Try
      </Badge>
      {/* The picture opens the app's own phone layout at /snapkeep, the same
          place the corner word goes. It used to swap itself for the desktop
          spread scaled into this 385-wide box — 1440px of app at about a
          quarter size, which was the best that could be done before there was
          a phone layout to send anyone to. There is one now, so the picture
          sends you to it: same app, drawn for the screen it is on, and with a
          URL the back gesture can close. */}
      <Capture onClick={() => navigate("/snapkeep")} />
    </div>
  );
}

const SCREENS = [Intro, Archive, Saved, ProblemA, ProblemB, Produce, Solutions, Snapkeep];

// The word, once the section that offers it has gone by.
//
// The desktop does this: Snapkeep's panel scrolls away and the word travels out
// of it to park in the corner, over the chat character, where it stays as a
// second way in. The phone had no such thing — scroll past EXPERIENCE and the
// only route to the app was to scroll back and find the screen again.
//
// It is not the desktop's flight, which is a per-frame path with coloured
// copies running ahead of it. It is the end of that flight: the word arrives
// where the character is and stays. A phone has no room for the journey and
// the journey is not what the word is for.
//
// The corner is the chat circle's own, read from Chatbot's numbers so the two
// cannot drift apart: 44 in from the right, and up from the bottom by 44 plus
// the character's height plus a gap.
const CHAT_INSET = 44;
const CHAT_SIZE = 60;
const WORD_GAP = 10;

function ParkedWord({ onOpen }) {
  const [shown, setShown] = useState(false);
  const wordRef = useRef(null);
  // The word travels the length of the page once it has parked, and the page
  // changes colour under it more than once. Blue on the white sections, white
  // on the blue — the same read the header does, from the same hook, so the two
  // cannot end up disagreeing about what they are standing on.
  const { light } = useGroundUnder(wordRef);

  // Shown once EXPERIENCE has left the top of the window — which is exactly
  // when its own copy of the invitation has gone.
  useEffect(() => {
    const section = document.querySelector(".section-mobile-experience");
    if (!section) return undefined;
    let ticking = false;
    const read = () => {
      ticking = false;
      setShown(section.getBoundingClientRect().bottom <= 0);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Nothing renders on a server here, but this is the one component that would
  // throw rather than come out empty if anything ever did — and it is the one
  // thing standing between a rendered check of this file and an exception.
  if (typeof document === "undefined") return null;

  return createPortal(
    // z-61: over the chat circle at 62's ground but under the sheet at 60’s
    // panel — in practice, above the page and below anything the chat opens.
    <button
      type="button"
      onClick={onOpen}
      aria-label="Snapkeep 열기"
      ref={wordRef}
      className={`fixed z-[59] font-['Plus_Jakarta_Sans'] font-bold leading-none transition-all duration-500 ${
        light ? "text-[#336bec]" : "text-white"
      }`}
      style={{
        // Centred over the circle, not right-aligned with it.
        //
        // It was `right: CHAT_INSET` — the circle's own inset — which lines the
        // word's right edge up with the circle's right edge. That is only the
        // same thing as centring it if the two are the same width, and they are
        // not: "Snapkeep" at 18px runs about 88px against a 60px circle, so
        // right-aligning them hangs the word a good 14px off to the left and it
        // reads as a label belonging to something further along.
        //
        // The circle's centre is CHAT_SIZE / 2 in from its own inset, so the
        // word's right edge goes there and the `translateX(50%)` below pushes
        // it back out by half its own width — whatever that turns out to be.
        // A percentage rather than a measured half-width on purpose: the word
        // is set in a webfont, and any number written here would be a guess at
        // its metrics that goes stale the moment the face or the size changes.
        right: CHAT_INSET + CHAT_SIZE / 2,
        bottom: CHAT_INSET + CHAT_SIZE + WORD_GAP,
        fontSize: 18,
        letterSpacing: "-0.02em",
        opacity: shown ? 1 : 0,
        // Up into place rather than simply on. It arrives from where it was.
        //
        // The translateX is the centring above and is on in both states; only
        // the Y is the arrival. Written together because one `transform` is one
        // property — dropping the X in either state would slide the word
        // sideways as it appears.
        transform: shown
          ? "translateX(50%)"
          : "translateX(50%) translateY(10px)",
        pointerEvents: shown ? "auto" : "none",
      }}
    >
      Snapkeep
    </button>,
    document.body,
  );
}

/* ---------------------------------------------------------------- section -- */

export default function MobileExperience() {
  const [step, setStep] = useState(0);
  // Snapkeep opens as its own page — see the /snapkeep branch in App. It used
  // to be a boolean here and a full-screen overlay next to the section, which
  // looked the same and behaved differently in the one way that matters on a
  // phone: the back button did nothing, because there was nothing in history to
  // go back to. A route has an entry, so closing it and pressing back are the
  // same movement.
  //
  // Both ways in go there: the corner word, and the capture on the last screen
  // of the strip. The capture used to run the desktop spread in place instead,
  // scaled into its own box, which is what /snapkeep on a phone now does
  // properly.

  const trackRef = useRef(null);
  // Which screen the strip is on, kept off React so the resize handler can
  // read it without being re-created every time it changes.
  const stepRef = useRef(0);
  // Where a press went down, so a drag that ends on the glass is not read as a
  // tap. A scroll container usually swallows the click after a real swipe, but
  // "usually" is doing work across browsers, and a swipe that also steps a
  // screen skips one.
  const press = useRef(null);

  // Which screen is in frame, read off the track rather than held as the truth.
  //
  // The scroll position is the state now: a finger can put the track anywhere,
  // so a `step` of its own would be a second answer to the same question and
  // the two would disagree the moment someone swipes. This only mirrors it, for
  // the dots and for working out where a tap should go next.
  // The strip is re-pinned whenever the window changes size, and that is what
  // stops it drifting.
  //
  // A phone's viewport height is not a constant: the URL bar shows and hides as
  // you scroll, and `100svh` sections re-layout when it does. A mandatory snap
  // container that re-lays-out mid-scroll re-snaps, and re-snapping from a
  // scrollLeft that is a fraction of a pixel off a boundary lands it on the
  // *other* boundary — which is the shake. Putting it back on the screen it was
  // already on, exactly, leaves it nothing to re-decide.
  //
  // `scrollLeft` rather than scrollTo: this is a correction, not a move, and it
  // must not animate.
  useEffect(() => {
    const track = trackRef.current;
    const read = () => {
      const at = Math.round(track.scrollLeft / track.clientWidth);
      const next = Math.min(LAST, Math.max(0, at));
      stepRef.current = next;
      setStep(next);
    };
    const repin = () => {
      track.scrollLeft = stepRef.current * track.clientWidth;
      read();
    };
    read();
    track.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", repin);
    return () => {
      track.removeEventListener("scroll", read);
      window.removeEventListener("resize", repin);
    };
  }, []);

  // Pinned, because a press inside a scroll container makes the browser scroll
  // that container into view on both axes — and the one that actually moves is
  // the page. See lib/pinPage.
  const goTo = (index) => {
    const track = trackRef.current;
    const at = Math.min(LAST, Math.max(0, index));
    pinPage(() => track.scrollTo({ left: at * track.clientWidth, behavior: "smooth" }));
  };

  // A tap on the left half goes back, on the right half goes on — the two
  // halves of a page being turned. Worked out from where the tap landed rather
  // than from two overlay elements, because the screens have their own controls
  // inside (the last one opens the app) and an overlay would sit on top of
  // them.
  const onPointerDown = (event) => {
    press.current = { x: event.clientX, y: event.clientY };
  };
  const onClick = (event) => {
    // The inner control already dealt with it.
    // Anything that handles its own taps — a control, or the running Snapkeep
    // demo, which is full of them and is not a button itself.
    if (event.target.closest("button, a, [data-interactive]")) return;
    const from = press.current;
    press.current = null;
    // A drag, not a tap. 10px is the usual slop for a finger that meant to
    // stay put.
    if (
      from &&
      Math.hypot(event.clientX - from.x, event.clientY - from.y) > 10
    ) {
      return;
    }
    const box = trackRef.current.getBoundingClientRect();
    goTo(step + (event.clientX < box.left + box.width / 2 ? -1 : 1));
  };

  return (
    <>
      {/* `h-[100svh]`, not `min-h-`. The dots below are pinned to this box's
          bottom, and with only a minimum the box is free to grow past the
          screen whenever a screen's composition runs long — which puts them
          under the fold rather than on it, on exactly the phones where the
          composition is tightest. A definite height also gives the track's
          `flex-1` something to resolve against, so the eight cells are the
          screen's height by construction and `overflow-hidden` keeps whatever
          does not fit inside the section instead of lengthening the page. */}
      <section
      data-ground="dark"
      className="section-mobile-experience relative h-[100svh] overflow-hidden bg-[#336bec]"
    >

      {/* A real scroll container, for the reason LEARN's strip is one: a row
          that is swiped through wants the scrolling the platform already has
          — momentum, rubber-banding at the ends, a trackpad, a keyboard — and
          snapping is one CSS property against a gesture handler's worth of
          code. The taps below are laid over it rather than instead of it.

          `overscroll-x-contain` so running off the last screen does not hand
          the gesture to the browser's back-swipe. */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onClick={onClick}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [overflow-anchor:none]"
      >
        {SCREENS.map((Screen, i) => (
          <div
            key={i}
            // overflow-hidden per cell, not on the section: several of the
            // loose marks are placed past their block's edge on purpose, and
            // inside a scroll container that overhang would widen the track
            // past eight screens — which is the number every index here is
            // worked out from.
            className="flex w-full shrink-0 snap-center items-center justify-center overflow-hidden"
          >
            {/* The drop is its own element rather than padding on the cell:
                the cell centres its child, so a top padding would move the
                composition half of what it says. */}
            <div style={{ transform: `translateY(${vw(DROP)})` }}>
              {/* `active` is what starts anything that plays: the marks that
                  ink themselves on, the rows that arrive in order. A screen
                  that is merely rendered has not happened yet. */}
              <Screen active={i === step} />
            </div>
          </div>
        ))}
      </div>

      {/* Not in the design, and here anyway. The section does not hold the
          page any more — a vertical scroll leaves it whenever the reader wants,
          which is what a phone's scroll is for — and that is exactly why these
          have to stay: nothing now forces the eight screens to be seen, so the
          only thing saying there are eight is this. It reads as "there is more
          sideways", which is the one thing a single screen cannot say by
          itself.

          Over the track rather than under it, now that the track fills the
          section — and in a wrapper of its own that does the positioning. That
          is the part that matters: StepDots used to place itself, which only
          worked in the box it happened to assume. The section knows where the
          bottom of the section is. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
        // 72, not 40. The bottom of a phone is the browser's and the system's
        // before it is the page's, and a row this small sitting in it is a row
        // that may as well not be drawn.
        style={{ bottom: vw(72) }}
      >
        <StepDots count={SCREENS.length} at={step} tone="dark" />
      </div>
      </section>

      {/* Outside the section, so it survives the section scrolling away —
          which is the whole point of it. */}
      <ParkedWord onOpen={() => navigate("/snapkeep")} />
    </>
  );
}
