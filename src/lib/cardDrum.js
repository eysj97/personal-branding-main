// The project drum, drawn in WebGL.
//
// The folders stand on a cylinder and are bent around it. CSS cannot bend a
// single element in 3D, so this used to be done by cutting each card into ten
// vertical slices and standing each slice on the drum at its own angle. It
// worked, but every one of those cuts showed: ten hairline seams down every
// card, and a stepped outline along the top and bottom edges where the slices
// projected at slightly different depths. Overlapping the slices hid neither —
// the artwork still jumped between bands.
//
// Here a card is one mesh with the curve in its vertices, so there is nothing
// to seam. The texture is sampled continuously across it and the silhouette is
// a real arc rather than ten steps.
//
// The projection is CSS's own, `perspective` and all, and the transform chain
// below matches what the DOM was doing element for element — which is what
// keeps the plates that still sit on top of these cards (the pointer target,
// the hover artwork) landing where the cards are drawn.

const VERT = `
attribute vec2 a_uv;

uniform float u_angle;    // where this card sits on the drum, radians
uniform float u_span;     // how much of the drum the card wraps, radians
uniform float u_radius;   // drum radius, px
uniform float u_height;   // card height, px
uniform float u_lean;     // the card's own tilt, radians
uniform float u_u0;       // the slice of the arc this mesh covers...
uniform float u_u1;       // ...so the tab can continue past the card's edge
uniform float u_v0;
uniform float u_v1;
uniform vec2  u_centre;   // where the drum's axis sits on screen, px
uniform vec2  u_viewport; // px
uniform float u_depth;    // half-range for the depth buffer, px
uniform float u_camera;   // eye distance, px — CSS's own perspective value.
                          // No backticks in here: this whole shader is a
                          // template literal, and one would end it.

varying vec2 v_uv;
varying float v_facing;
varying vec2 v_px;        // position across the card in its own px, for corners

void main() {
  float u = mix(u_u0, u_u1, a_uv.x);
  float v = mix(u_v0, u_v1, a_uv.y);

  // The same chain CSS was running per slice, with the slice's own angle now a
  // continuous function of u:
  //   rotateY(angle) translateZ(R) rotateZ(lean) translateZ(-R) rotateY(a) translateZ(R)
  float a = (u - 0.5) * u_span;
  vec3 p = vec3(u_radius * sin(a), (v - 0.5) * u_height, u_radius * cos(a) - u_radius);
  vec3 n = vec3(sin(a), 0.0, cos(a));

  float cl = cos(u_lean), sl = sin(u_lean);
  p.xy = vec2(p.x * cl - p.y * sl, p.x * sl + p.y * cl);
  n.xy = vec2(n.x * cl, n.x * sl);
  n.z = cos(a);

  p.z += u_radius;
  float ca = cos(u_angle), sa = sin(u_angle);
  vec3 w = vec3(p.x * ca + p.z * sa, p.y, -p.x * sa + p.z * ca);
  float nz = -n.x * sa + n.z * ca;

  // CSS's own projection, to the letter: a point at depth z is drawn as though
  // seen from an eye u_camera in front of the screen, so it is scaled by
  // d/(d-z) about the perspective origin. Done through the w divide rather
  // than by hand, so it interpolates correctly across a card that is turned —
  // scaling the vertices instead would make the texture slide.
  //
  // This was orthographic for a while, which made every card the same size
  // wherever it sat. It also put each card and the one opposite it on the same
  // screen x, at the same size, so half the drum was hidden behind the other
  // half — and with no depth cue at all, which way the ring was turning became
  // genuinely ambiguous to look at.
  float w_ = (u_camera - w.z) / u_camera;
  vec2 originNdc = vec2(
    (u_centre.x / u_viewport.x) * 2.0 - 1.0,
    1.0 - (u_centre.y / u_viewport.y) * 2.0
  );
  gl_Position = vec4(
    w_ * originNdc.x + 2.0 * w.x / u_viewport.x,
    w_ * originNdc.y - 2.0 * w.y / u_viewport.y,
    w_ * (-w.z / u_depth),
    w_
  );

  v_uv = vec2(u, v);
  v_facing = nz;
  // Relative to the patch being drawn, not to the card — the tab is a second
  // patch further along the same arc, and its corners have to be rounded on
  // its own box rather than on one sitting back at the card's left edge.
  v_px = vec2((u - u_u0) * u_span * u_radius, (v - u_v0) * u_height);
}
`;

const FRAG = `
precision mediump float;

uniform sampler2D u_tex;
uniform vec2  u_texScale;   // cover/crop fit, applied to the card's own uv
uniform vec2  u_texOffset;
uniform vec3  u_backColor;  // what is on the other side of the sheet
uniform vec3  u_flatColor;  // the tab draws this instead of a texture
uniform float u_useTex;
uniform float u_alpha;
uniform vec2  u_size;       // the rect the corners are rounded on, px
uniform vec4  u_radii;      // tl, tr, br, bl
uniform float u_edgeFade;   // how far past edge-on the back is fully opaque

varying vec2 v_uv;
varying float v_facing;
varying vec2 v_px;

// Signed distance to a rounded rectangle, so the corners are cut with a real
// antialiased edge rather than by an overflow:hidden box that cannot follow a
// curved surface.
float roundedRect(vec2 p, vec2 halfSize, vec4 r) {
  float rad = p.x > 0.0
    ? (p.y > 0.0 ? r.z : r.y)
    : (p.y > 0.0 ? r.w : r.x);
  vec2 q = abs(p) - halfSize + rad;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - rad;
}

void main() {
  vec2 halfSize = u_size * 0.5;
  float d = roundedRect(v_px - halfSize, halfSize, u_radii);
  float inside = 1.0 - smoothstep(-1.0, 0.5, d);
  if (inside <= 0.0) discard;

  vec4 face = u_useTex > 0.5
    ? texture2D(u_tex, v_uv * u_texScale + u_texOffset)
    : vec4(u_flatColor, 1.0);

  // Which way this bit of the sheet is turned decides both what is on it and
  // how lit it is. Per fragment, not per card: a bent card is turned by a
  // different amount all the way across, and shading it as one flat plate is
  // what made four curved panels read as cut-outs rather than as one object.
  float facing = clamp(v_facing, -1.0, 1.0);
  float back = clamp((u_edgeFade - facing) / u_edgeFade, 0.0, 1.0);
  vec3 rgb = mix(face.rgb, u_backColor * max(face.a, back), back);
  float a = mix(face.a, max(face.a, back), back);

  rgb *= 0.78 + 0.22 * clamp(facing, 0.0, 1.0);

  gl_FragColor = vec4(rgb, 1.0) * a * inside * u_alpha;
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`drum shader: ${log}`);
  }
  return shader;
}

/** A grid over the unit square. Only the horizontal needs resolution — the
 *  bend runs that way and nothing curves down the card — but the top and
 *  bottom edges are what the lean swings around, so two rows is enough. */
function buildMesh(gl, segments) {
  const verts = [];
  const index = [];
  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    verts.push(u, 0, u, 1);
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(index),
    gl.STATIC_DRAW,
  );
  return { buffer, indices, count: index.length };
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * @param canvas   the <canvas> to draw into
 * @param cards    [{ image, tabColor, backColor, cover }] — `cover` fits the
 *                 art the way `object-fit: cover` would; without it the art is
 *                 stretched to the box, which is what the cropped exports want
 * @param options  geometry shared by every card
 */
export function createCardDrum(canvas, cards, options = {}) {
  const {
    segments = 64,
    radiusRatio = 1.365,
    // The card's own aspect in the design. The exports are wider than this —
    // they carry the tab hanging off the card's right edge — and the difference
    // is how far past the card the artwork reaches. See artSpan in draw.
    //
    // There were three tab options here (tabWidth / tabTop / tabHeight) that
    // placed a flat-coloured tab of the drum's own making. Nothing places a tab
    // any more: the artwork has one and that is the only one there should be.
    cardArtAspect = 343 / 522,
    corner = 5,
    edgeFade = 0.3,
  } = options;

  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    }) || canvas.getContext("experimental-webgl");
  if (!gl) return null;

  // A driver that will not build this is a reason to draw nothing, not a
  // reason to take the section down: the plates, the hover artwork and every
  // link on them are DOM and keep working without it.
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`drum program: ${gl.getProgramInfoLog(program)}`);
    }
  } catch (error) {
    console.error(error);
    return null;
  }
  gl.useProgram(program);

  const mesh = buildMesh(gl, segments);
  const aUv = gl.getAttribLocation(program, "a_uv");
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  for (const name of [
    "u_angle", "u_span", "u_radius", "u_height", "u_lean", "u_camera",
    "u_u0", "u_u1", "u_v0", "u_v1", "u_centre", "u_viewport", "u_depth",
    "u_tex", "u_texScale", "u_texOffset", "u_backColor", "u_flatColor",
    "u_useTex", "u_alpha", "u_size", "u_radii", "u_edgeFade",
  ]) {
    U[name] = gl.getUniformLocation(program, name);
  }

  // Set by dispose(). A drum that has been torn down must not keep uploading:
  // its images decode on their own schedule, so one that lands after the fact
  // would bind and write through a texture name that has already been deleted.
  // The canvas and its GL context outlive the drum — a hot reload builds a new
  // one on the same context — so that write lands in the live context's state
  // rather than harmlessly nowhere.
  //
  // This is the shape of bug that shows a folder wearing another project's
  // face after a few rapid reloads: the picture on screen came from a drum that
  // no longer exists.
  let disposed = false;

  // One texture per card, filled in as each image decodes. A card with nothing
  // loaded yet is skipped rather than drawn as a black rectangle.
  const textures = cards.map((card) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const entry = { texture, ready: false, aspect: 1 };
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      entry.ready = true;
      entry.aspect = img.naturalWidth / img.naturalHeight;
    };
    img.src = card.image;
    return entry;
  });

  // Only the back face is painted from this now — nothing here draws a tab any
  // more — but it is still the folder's own colour, which is what `tabColor`
  // names on the card.
  const tabColors = cards.map((c) => hexToRgb(c.tabColor));
  // The folder's back is the same material as its tab, not catching any light.
  // Darkened here from the hex rather than being handed in ready-made: a CSS
  // colour string is not something this can parse, and one arriving as
  // `rgb(19, 67, 115)` read as NaN and painted every back face black.
  const backColors = tabColors.map((rgb) =>
    rgb.map((channel) => channel * (1 - (options.backShade ?? 0.5))),
  );

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  // Premultiplied: the textures are uploaded that way, and it is the only
  // blend that composites a half-transparent edge over another card correctly.
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let width = 0;
  let height = 0;

  function resize(cssWidth, cssHeight, dpr) {
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    width = cssWidth;
    height = cssHeight;
    gl.viewport(0, 0, w, h);
  }

  /**
   * @param state.cardWidth  px
   * @param state.cardHeight px
   * @param state.centre     [x, y] of the drum's axis, in canvas css px
   * @param state.spin       degrees
   * @param state.leans      per-card tilt, degrees
   * @param state.alpha      0-1, the whole drum
   */
  function draw(state) {
    const { cardWidth, cardHeight, centre, spin, leans, alpha } = state;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (alpha <= 0.001) return;

    const radius = cardWidth * radiusRatio;
    // The card is a sheet bent around the drum, not a chord stretched over it,
    // so its width is an arc length and the angle it covers is width/radius.
    const span = cardWidth / radius;
    const depth = radius * 4;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);

    gl.uniform2f(U.u_centre, centre[0], centre[1]);
    gl.uniform2f(U.u_viewport, width, height);
    gl.uniform1f(U.u_depth, depth);
    gl.uniform1f(U.u_radius, radius);
    gl.uniform1f(U.u_height, cardHeight);
    gl.uniform1f(U.u_span, span);
    gl.uniform1f(U.u_alpha, alpha);
    gl.uniform1f(U.u_edgeFade, edgeFade);
    gl.uniform1f(U.u_camera, state.camera ?? 820);
    gl.uniform1i(U.u_tex, 0);

    // Back to front. The depth buffer already sorts the solid middle of every
    // card; this is for the antialiased corners, which are blended and so have
    // to land in order.
    const order = cards
      .map((card, i) => ({
        i,
        z: Math.cos(((spin + card.angle) * Math.PI) / 180),
      }))
      .sort((a, b) => a.z - b.z);

    for (const { i } of order) {
      const card = cards[i];
      const tex = textures[i];
      if (!tex.ready) continue;
      const angle = ((spin + card.angle) * Math.PI) / 180;
      const lean = ((leans?.[i] ?? 0) * Math.PI) / 180;

      gl.uniform1f(U.u_angle, angle);
      gl.uniform1f(U.u_lean, lean);
      gl.uniform3fv(U.u_backColor, backColors[i]);

      // --- the folder ---
      //
      // One surface for the whole export, tab and all. The artwork *is* the
      // folder — the tab hanging off its right edge is drawn into the file
      // beside the card — so it is laid on the arc in one piece rather than
      // being cut apart and reassembled here.
      //
      // How far it reaches past the card comes from the file's own aspect. The
      // design's 383 x 522 over the card's 343 x 522 gives 1.1166, so the card
      // body lands on exactly cardWidth and the remaining 0.1166 is the tab. A
      // file that is the bare card gives 1 and reaches no further, which is
      // what the flat tab below is still there for.
      const artSpan = Math.max(1, tex.aspect / cardArtAspect);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex.texture);
      gl.uniform1f(U.u_useTex, 1);
      gl.uniform1f(U.u_u0, 0);
      gl.uniform1f(U.u_u1, artSpan);
      gl.uniform1f(U.u_v0, 0);
      gl.uniform1f(U.u_v1, 1);
      gl.uniform2f(U.u_size, cardWidth * artSpan, cardHeight);
      gl.uniform4f(U.u_radii, corner, corner, corner, corner);

      // Everything below divides its horizontal scale by artSpan, and it is not
      // optional. The vertex shader hands the fragment shader the *mapped*
      // coordinate — `v_uv = vec2(u, v)` where u runs u_u0..u_u1 — so widening
      // the quad to artSpan widens the texture coordinate with it. Sampling
      // then runs past 1.0, and the texture is CLAMP_TO_EDGE, so the last
      // column of pixels repeats outward: the tab's right edge smears across
      // the extra span and stands there looking like a second tab.
      if (card.cover) {
        // The framing `object-fit: cover` would give: fill the box, crop the
        // overflowing axis, keep the middle.
        const boxAspect = cardWidth / cardHeight;
        const scaleX = tex.aspect > boxAspect ? boxAspect / tex.aspect : 1;
        const scaleY = tex.aspect > boxAspect ? 1 : tex.aspect / boxAspect;
        gl.uniform2f(U.u_texScale, scaleX / artSpan, scaleY);
        gl.uniform2f(U.u_texOffset, (1 - scaleX) / 2, (1 - scaleY) / 2);
      } else {
        // The whole file across the whole quad, uncropped. Its own transparency
        // is what shapes the folder — the corners it was drawn with, and the
        // empty space above and below the tab.
        gl.uniform2f(U.u_texScale, 1 / artSpan, 1);
        gl.uniform2f(U.u_texOffset, 0, 0);
      }
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);

      // One draw, and only one. There used to be a second pass here that built
      // a tab of its own out of a flat colour, from back when the exports were
      // bare cards. The exports draw their own tab now, so that pass could only
      // ever stand a second one beside it — which is exactly what it did.
    }
  }

  function dispose() {
    disposed = true;
    for (const t of textures) gl.deleteTexture(t.texture);
    gl.deleteBuffer(mesh.buffer);
    gl.deleteBuffer(mesh.indices);
    gl.deleteProgram(program);
  }

  return { resize, draw, dispose };
}
