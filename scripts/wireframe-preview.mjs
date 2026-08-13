/**
 * Renders Snapkeep's structure wireframes to PNG, outside the browser.
 *
 *     node scripts/wireframe-preview.mjs [outDir] [id ...]
 *
 * Why this exists: the structure tab is a drawing, and the only honest way to
 * check a drawing is to look at it. Twice in this file's history a change that
 * built clean and typechecked clean put a black screen in front of the person
 * using it, because "the build passed" answers a different question from "does
 * it draw". This renders the same LayoutWireframe the app renders, through
 * react-dom/server, and rasterises the SVG — so a change can be looked at
 * before it is handed over.
 *
 * It is not a substitute for the app. The browser measures the reference image
 * and fits each run of type with getBBox(); neither happens here, so type comes
 * out at its declared size. Geometry — boxes, corners, angles, components — is
 * exactly what the app draws.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "rolldown";

const ROOT = process.cwd();
const out = process.argv[2] ?? ".";
const ids = process.argv.slice(3);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { LayoutWireframe } from ${JSON.stringify(join(ROOT, "src/components/detail/SnapkeepSpread.jsx").replace(/\\/g, "/"))};
import { REFERENCE_LAYOUTS, REFERENCE_ASPECTS } from ${JSON.stringify(join(ROOT, "src/components/detail/snapkeepLayouts.js").replace(/\\/g, "/"))};
import { REFERENCE_COMPONENTS } from ${JSON.stringify(join(ROOT, "src/components/detail/snapkeepComponents.js").replace(/\\/g, "/"))};

const out = ${JSON.stringify(out)};
const wanted = ${JSON.stringify(ids)};
const ids = wanted.length ? wanted : Object.keys(REFERENCE_LAYOUTS);

// Each component state, at the component's own proportions — the component tab
// as the app draws it. It has its own way of going wrong: a component states
// its type size against itself, so an ink height left as a fraction of the
// screen renders here as a speck.
const draw = async (name, layout, aspect) => {
  const html = renderToStaticMarkup(React.createElement(LayoutWireframe, { layout, aspect }));
  const svg = html.slice(html.indexOf("<svg"), html.lastIndexOf("</svg>") + 6);
  if (!svg.startsWith("<svg")) { console.log(name, "— drew no svg"); process.exitCode = 1; return; }
  const w = 420, h = Math.max(40, Math.round(w / aspect));
  await sharp(Buffer.from(svg.replace("<svg", \`<svg width="\${w}" height="\${h}"\`))).png().toFile(\`\${out}/\${name}.png\`);
  console.log(name, "->", \`\${w}x\${h}\`);
};
for (const id of ids) {
  for (const piece of REFERENCE_COMPONENTS[id] ?? [])
    for (const state of piece.states)
      await draw(\`\${id}--\${piece.name}--\${state.label}\`.replace(/\\s+/g, "_"), state.layout, piece.aspect);
}

for (const id of ids) {
  if (!REFERENCE_LAYOUTS[id]) { console.log(id, "— no such reference"); process.exitCode = 1; continue; }
  const html = renderToStaticMarkup(
    React.createElement(LayoutWireframe, { layout: REFERENCE_LAYOUTS[id], aspect: REFERENCE_ASPECTS[id] }),
  );
  const svg = html.slice(html.indexOf("<svg"), html.lastIndexOf("</svg>") + 6);
  if (!svg.startsWith("<svg")) { console.log(id, "— drew no svg"); process.exitCode = 1; continue; }
  const w = 900, h = Math.round(w / REFERENCE_ASPECTS[id]);
  await sharp(Buffer.from(svg.replace("<svg", \`<svg width="\${w}" height="\${h}"\`))).png().toFile(\`\${out}/\${id}.png\`);
  console.log(id, "->", \`\${out}/\${id}.png\`, \`\${w}x\${h}\`);
}
`;

if (!existsSync(join(ROOT, "node_modules/sharp"))) {
  console.error("needs sharp:  npm i --no-save sharp");
  process.exit(1);
}

// Inside node_modules rather than the system temp dir, so that `react` and the
// rest resolve the way they do anywhere else in the project.
const dir = join(ROOT, "node_modules/.cache/snapkeep-preview");
mkdirSync(dir, { recursive: true });
const entry = join(dir, "entry.mjs");
writeFileSync(entry, ENTRY);
await build({
  input: entry,
  platform: "node",
  external: ["react", "react-dom/server", "sharp"],
  // Assets are only imported for their URL here; nothing is drawn from them.
  moduleTypes: {
    ".avif": "dataurl", ".png": "dataurl", ".jpg": "dataurl",
    ".svg": "dataurl", ".webp": "dataurl", ".css": "empty",
  },
  resolve: { extensions: [".js", ".jsx", ".mjs", ".json"] },
  output: { file: join(dir, "bundle.mjs"), format: "esm", codeSplitting: false },
});
await import(pathToFileURL(join(dir, "bundle.mjs")).href);
