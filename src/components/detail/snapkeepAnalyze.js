import { useState } from "react";

import { measureType, withMeasuredType } from "./measureType";
import { withPlacedComponents } from "./snapkeepLayouts";
import { sheetFromLayout } from "./snapkeepComponents";

/**
 * Turning a dropped screenshot into a reference.
 *
 * Split out of SnapkeepSpread alongside snapkeepLibrary: the desktop spread and
 * the phone layout both register uploads, and this is the part of that with no
 * markup in it at all. `scanReference` is the whole job end to end — the two
 * layouts differ only in where the "분석 중" state is shown.
 */

// ---------------------------------------------------------------------------
// Upload analysis, in two stages.
//
// 1. Locally: downscale the screenshot (this is what keeps a few uploads from
//    blowing past the localStorage quota) and measure aspect ratio, brightness,
//    and colour.
// 2. Remotely: POST that image to /api/analyze, which the Vite dev server
//    answers by calling Claude (see vite.config.js — the key lives in .env and
//    never reaches the browser).
//
// If the endpoint isn't there — a static build, no API key, offline — the local
// measurements become the tags on their own. Which path ran is recorded on the
// reference, so the detail panel can say so rather than implying a model call
// that never happened.
// ---------------------------------------------------------------------------
const ANALYSIS_MAX_WIDTH = 960;

const FILENAME_HINTS = [
  [/home|main|홈|메인/i, { screen: "홈" }],
  [/detail|상세/i, { screen: "상세" }],
  [/pay|checkout|order|결제|주문/i, { screen: "결제·주문", service: "핀테크" }],
  [/profile|setting|mypage|프로필|설정|마이/i, { screen: "프로필·설정" }],
  [/dash|board|대시보드/i, { screen: "대시보드" }],
  [/land|hero|랜딩|히어로/i, { screen: "랜딩·히어로" }],
  [/shop|store|commerce|커머스|쇼핑/i, { service: "커머스" }],
  [/bank|finance|금융|핀테크/i, { service: "핀테크" }],
  [/health|fitness|헬스|건강|운동/i, { service: "헬스케어" }],
  [/travel|trip|map|여행|지도/i, { service: "여행·이동" }],
  [/social|feed|chat|소셜|피드|채팅/i, { service: "소셜" }],
  [/media|video|music|콘텐츠|미디어/i, { service: "콘텐츠·미디어" }],
];

const SCREEN_ELEMENTS = {
  "홈": ["헤더", "탭바", "카드"],
  "상세": ["헤더", "카드", "버튼"],
  "랜딩·히어로": ["헤더", "카드", "버튼"],
  "대시보드": ["리스트", "칩", "카드"],
  "결제·주문": ["폼", "버튼", "스텝퍼"],
  "프로필·설정": ["헤더", "리스트", "칩"],
};

const toHex = ([r, g, b]) => `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

/** Average brightness + the most vivid colour, from a sparse sample of the pixels. */
function readTone(context, canvas) {
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let luma = 0;
  let saturation = 0;
  let samples = 0;
  let vividScore = 0;
  let vivid = null;

  // 148 is a multiple of 4, so the stride stays aligned to pixel boundaries.
  for (let i = 0; i < data.length; i += 148) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const pixelSaturation = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    saturation += pixelSaturation;
    samples += 1;

    const score = pixelSaturation * (max / 255);
    if (score > vividScore) {
      vividScore = score;
      vivid = [r, g, b];
    }
  }

  if (!samples) return { luma: 128, saturation: 0, accent: "#017c6e" };
  return {
    luma: luma / samples,
    saturation: saturation / samples,
    accent: vividScore > 0.12 && vivid ? toHex(vivid) : "#017c6e",
  };
}

function analyzeImage(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const scale = Math.min(1, ANALYSIS_MAX_WIDTH / image.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      let tone;
      try {
        tone = readTone(context, canvas);
      } catch {
        tone = { luma: 128, saturation: 0.3, accent: "#017c6e" };
      }

      let pixels = null;
      try {
        pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        pixels = null;
      }
      resolve({
        image: canvas.toDataURL("image/jpeg", 0.82),
        ratio: image.width / image.height,
        // The file’s own size, not the downscaled canvas’s. It is what lets
        // a component report the pixels it really is, the way the built-in
        // references do off REFERENCE_PIXELS — 960 is a working width, not
        // a fact about the screen.
        natural: [image.width, image.height],
        // Held for the type measuring, which needs the analysis's blocks and so
        // cannot run until the model has answered. Dropped before the reference
        // is stored — pixels do not belong in localStorage.
        pixels,
        ...tone,
      });
    });
    image.addEventListener("error", () => resolve(null));
    image.src = dataUrl;
  });
}

function describeUpload(fileName, analysis) {
  const { ratio, luma, saturation, accent } = analysis;

  const platform =
    ratio < 0.62 ? "모바일 앱" : ratio < 1 ? "웹(모바일)" : ratio < 1.45 ? "태블릿" : "웹(데스크톱)";

  const mood =
    luma < 72 ? "다크"
      : saturation > 0.55 ? "비비드"
        : saturation < 0.12 ? "미니멀"
          : luma > 205 ? "라이트"
            : saturation < 0.32 ? "파스텔"
              : "사진 중심";

  const hinted = FILENAME_HINTS.reduce(
    (result, [pattern, values]) => (pattern.test(fileName) ? { ...result, ...values } : result),
    {},
  );
  const screen = hinted.screen ?? (platform === "웹(데스크톱)" ? "랜딩·히어로" : "홈");
  const service = hinted.service ?? "콘텐츠·미디어";

  return {
    platform,
    service,
    screen,
    mood,
    accent,
    elements: SCREEN_ELEMENTS[screen] ?? ["헤더", "카드", "버튼"],
    note: `가로세로 비율(${ratio.toFixed(2)}:1)과 색 분포를 읽어 ${platform} · ${screen} 화면으로 추정했어요. 아래 태그를 고치면 검색과 필터에 바로 반영됩니다.`,
    basis: `비율 ${ratio.toFixed(2)}:1, 평균 밝기 ${Math.round(luma)}/255, 평균 채도 ${Math.round(saturation * 100)}%를 계산했습니다.`,
  };
}

/**
 * Ask the dev-server endpoint to run the image through Claude. On any failure
 * returns `{ ok: false, reason }` — the caller falls back to the local
 * measurements and keeps the reason in the reference's analysis record.
 */
async function requestRemoteAnalysis(dataUrl, fileName) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { ok: false, reason: "이미지를 전송할 수 없는 형식이었습니다." };

  const [, mediaType, image] = match;
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, mediaType, fileName }),
    });

    // A static build has no /api/analyze — the SPA fallback answers with HTML,
    // which fails to parse below and lands in the catch.
    const payload = await response.json();
    if (!response.ok) return { ok: false, reason: payload?.error ?? `AI 분석 요청이 실패했습니다 (${response.status}).` };
    if (!payload?.analysis) return { ok: false, reason: "AI 분석 응답이 비어 있었습니다." };

    return { ok: true, analysis: payload.analysis, model: payload.model };
  } catch {
    return { ok: false, reason: "AI 분석 서버에 연결하지 못했습니다. npm run dev로 실행 중인지 확인해 주세요." };
  }
}

/**
 * One dropped file, all the way to a reference — or a message saying why not.
 *
 * The 400ms floor is deliberate: the local-only path can finish faster than the
 * "분석 중" state is readable, and a spinner that flashes reads as a bug rather
 * than as work being done.
 */
export async function scanReference({ fileName, dataUrl }) {
  const run = async () => {
    const measured = await analyzeImage(dataUrl);
    if (!measured) return null;
    return { measured, remote: await requestRemoteAnalysis(measured.image, fileName) };
  };

  const [outcome] = await Promise.all([run(), new Promise((resolve) => window.setTimeout(resolve, 400))]);

  if (!outcome) return { error: "이미지를 분석하지 못했어요. 다른 파일로 시도해 주세요." };

  const { measured, remote } = outcome;
  // `componentTags` comes off here rather than being spread onto the reference:
  // it is a legend for the marks in `layout` — what each named component is a
  // kind of — and it is spent building the sheet a few lines below. It carries
  // no geometry, which is what keeps it from being the second, separate answer
  // about the screen that `parts` used to be.
  const { basis, componentTags, ...described } = remote.ok ? remote.analysis : describeUpload(fileName, measured);
  const statedTags = Object.fromEntries((componentTags ?? []).map(({ name, tags }) => [name, tags]));

  // The model said where the text is; the pixels say how big it is. Measured
  // here rather than asked for, and measured by the same code that measured
  // the references shipped with the app — otherwise the built-in eight would
  // be the only screens whose type was ever right, and an uploaded one would
  // be stuck with a guess for ever.
  if (described.layout?.length && measured.pixels) {
    described.layout = withMeasuredType(
      described.layout,
      measureType(measured.pixels, described.layout),
    );
  }

  // The component sheet, read back out of the structure rather than assembled
  // beside it. The model marked which blocks make up a component and which
  // instance is which; `withPlacedComponents` takes one definition per
  // component and puts it down at every instance, exactly as the built-in
  // screens are built, and then the built-in screens’ own reader runs over the
  // result.
  //
  // Which is the whole change. The two tabs had nothing in common before: 구조
  // drew a wireframe off `layout` and 컴포넌트 showed crops of the screenshot
  // off a separate `parts` list, so a component could be outlined in one view
  // and absent from the other, and the sheet was a photograph of the thing the
  // drawing was of. Now the sheet is made of the screen’s own blocks — if it
  // is wrong, the screen is wrong in the same way.
  //
  // After the type measuring, which is keyed by block index: markers inserted
  // first would shift every index after the first component.
  if (described.layout?.length) {
    described.layout = withPlacedComponents(described.layout);
  }
  const pieces = described.layout?.length
    ? sheetFromLayout(described.layout, measured.ratio, measured.natural, { tags: statedTags })
    : [];

  return {
    reference: {
      id: `upload-${Date.now()}`,
      title: fileName.replace(/\.[^/.]+$/, "") || "새 레퍼런스",
      image: measured.image,
      ...described,
      pieces,
      // The screenshot’s own pixel size, so the sheet can be rebuilt from the
      // layout later and still report real sizes.
      pixels: measured.natural,
      // After the spread, so the measured value always wins: this is the
      // screenshot's real shape, and it is what keeps the structure view's
      // wireframe in the original's proportions.
      aspect: measured.ratio,
      // The analysis record: what ran, when, and on what evidence.
      analysis: {
        source: remote.ok ? "claude" : "local",
        model: remote.ok ? remote.model : null,
        analyzedAt: new Date().toISOString(),
        basis,
        fallbackReason: remote.ok ? null : remote.reason,
      },
    },
  };
}

/**
 * The dropzone's half of registering a reference: pick a file, check it is an
 * image, read it, hand it on, and hold whatever went wrong.
 *
 * A hook rather than a component because the desktop's dropzone and the phone's
 * are different shapes — a 720-wide modal and a sheet hugging the bottom of a
 * 430 screen — and identical underneath. `onSubmit` resolves to a message when
 * the analysis fails and to nothing when it succeeds, by which point the
 * dropzone that called it is usually already unmounted.
 */
export function useReferenceFile(onSubmit) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const readFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("PNG, JPG, WEBP 이미지만 넣을 수 있어요.");
      return;
    }

    setError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.addEventListener("load", async () => {
      const failure = await onSubmit({ fileName: file.name, dataUrl: reader.result });
      if (failure) setError(failure);
    });
    reader.addEventListener("error", () => setError("파일을 읽지 못했어요. 다시 시도해 주세요."));
    reader.readAsDataURL(file);
  };

  return {
    fileName,
    error,
    selectFile: (event) => {
      readFile(event.target.files?.[0]);
      // Lets the same file be picked twice in a row.
      event.target.value = "";
    },
    dropFile: (event) => {
      event.preventDefault();
      readFile(event.dataTransfer.files?.[0]);
    },
  };
}
