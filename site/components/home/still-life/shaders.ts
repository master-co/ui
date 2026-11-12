/**
 * The hero's figure: the theme's surface ladder as an exploded section. A tray, a raised sheet and a floating
 * sheet hang over a table printed with markup, each a signed distance field with its interface blind-embossed
 * into its face, lit by the theme's one lamp above and a little left. The only dark object is the primary button.
 *
 * Material ids: 1 raised, 2 inset, 3 ink, 5 mark, 6 rule, 7 mark on the tray, 11 tint, 12 tray, 13 floating.
 * A mark (a line of text, a nav item) or a rule is raised less than a pixel, so its relief alone would break into
 * dots; it carries a faint tone of its own and is shaded as the level face it is printed on.
 */
export const vertexSource = /* glsl */ `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

export const fragmentSource = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uBoot;
uniform vec3 uCamPos;
uniform vec3 uCamTarget;
uniform float uFocal;
uniform vec3 uLamp;
uniform vec3 uLampColor;
uniform vec3 uGround;
uniform vec3 uInk;
uniform float uDark;
uniform vec4 uReading;
uniform float uReadingRadius;
/* The drafting notes' column, kept clear of print like the words: left, bottom, right, top in pixels. */
uniform vec4 uNotes;
uniform sampler2D uAtlas;
/* x, z, scale, turn */
uniform vec4 uStack;
/* The underside of the tray, the sheet and the floating sheet, in the stack's units. */
uniform vec3 uLayers;

const float CELL = 0.2;
const float GRID = 8.0;
const vec3 BOUND_CENTER = vec3(0.3, 1.3, 0.2);
const float BOUND_RADIUS = 4.6;
/* How far from the stack its bounding sphere stands in for it. */
const float gMargin = 0.3;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash1(float n) { return fract(sin(n * 127.1 + 0.37) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

/* A rounded rectangle extruded to half-height h, every edge eased by e. */
float sdSlab(vec3 p, vec2 b, float r, float h, float e) {
  float d = sdRoundRect(p.xz, b - e, max(r - e, 0.0));
  vec2 w = vec2(d, abs(p.y) - (h - e));
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - e;
}

/* Cut a recess into a face whose top is at s.y = 0. */
void carve(inout vec2 res, vec3 s, vec2 c, vec2 b, float r, float depth, float id) {
  float w = sdSlab(s - vec3(c.x, 0.0, c.y), b, r, depth, min(depth * 0.5, 0.008));
  if (-w > res.x) res = vec2(-w, id);
}

/* Raise a mark from a face whose top is at s.y = 0. */
void emboss(inout vec2 res, vec3 s, vec2 c, vec2 b, float r, float h, float id) {
  float k = sdSlab(s - vec3(c.x, h * 0.5 - 0.004, c.y), b, r, h * 0.5 + 0.004, min(h * 0.45, 0.012));
  if (k < res.x) res = vec2(k, id);
}

/* The stack in its own units: the tray on the table, the sheet above it, the floating sheet above that. */
vec2 stack(vec3 q) {
  float yTray = uLayers.x, ySheet = uLayers.y, yFloat = uLayers.z;

  // The tray: a recessed shelf with a column of navigation marks in its margin.
  vec3 t = q - vec3(0.0, yTray + 0.07, 0.0);
  vec2 res = vec2(sdSlab(t, vec2(3.3, 2.2), 0.44, 0.07, 0.035), 12.0);
  if (res.x < 0.08) {
    vec3 s = t - vec3(0.0, 0.07, 0.0);
    for (int i = 0; i < 4; i++) emboss(res, s, vec2(-2.98, -1.62 + float(i) * 0.3), vec2(0.17, 0.028), 0.028, 0.008, 7.0);
  }

  // The raised sheet: a card with a header and its action, two fields and its two actions.
  vec3 c = q - vec3(0.18, ySheet + 0.07, -0.04);
  vec2 sheet = vec2(sdSlab(c, vec2(2.72, 1.74), 0.34, 0.07, 0.035), 1.0);
  if (sheet.x < 0.1) {
    vec3 s = c - vec3(0.0, 0.07, 0.0);
    emboss(sheet, s, vec2(-2.2, -1.22), vec2(0.21, 0.21), 0.21, 0.012, 11.0);
    emboss(sheet, s, vec2(-1.36, -1.31), vec2(0.6, 0.05), 0.05, 0.008, 5.0);
    emboss(sheet, s, vec2(-1.5, -1.12), vec2(0.46, 0.035), 0.035, 0.006, 5.0);
    // The header's action: a small raised button marked with three dots, the menu's opener.
    emboss(sheet, s, vec2(2.3, -1.22), vec2(0.17, 0.17), 0.07, 0.03, 1.0);
    for (int i = -1; i <= 1; i++) carve(sheet, s - vec3(0.0, 0.03, 0.0), vec2(2.3 + float(i) * 0.075, -1.22), vec2(0.022, 0.022), 0.022, 0.008, 2.0);
    emboss(sheet, s, vec2(0.0, -0.74), vec2(2.44, 0.011), 0.011, 0.003, 6.0);
    emboss(sheet, s, vec2(-2.08, -0.43), vec2(0.34, 0.032), 0.032, 0.006, 5.0);
    carve(sheet, s, vec2(0.0, -0.13), vec2(2.42, 0.2), 0.1, 0.016, 2.0);
    emboss(sheet, s, vec2(-2.14, 0.33), vec2(0.28, 0.032), 0.032, 0.006, 5.0);
    carve(sheet, s, vec2(0.0, 0.63), vec2(2.42, 0.2), 0.1, 0.016, 2.0);
    emboss(sheet, s, vec2(0.92, 1.3), vec2(0.44, 0.19), 0.1, 0.034, 1.0);
    emboss(sheet, s, vec2(1.98, 1.3), vec2(0.52, 0.19), 0.1, 0.034, 3.0);
  }
  if (sheet.x < res.x) res = sheet;

  // The floating sheet: the menu the header's action opens, hung below it and out past the sheet's edge, as a
  // popover in the top layer may. Every layer then shows an edge of its own on the figure's right.
  vec3 f = q - vec3(2.6, yFloat + 0.06, -0.25);
  vec2 menu = vec2(sdSlab(f, vec2(1.05, 0.8), 0.2, 0.06, 0.03), 13.0);
  if (menu.x < 0.08) {
    vec3 s = f - vec3(0.0, 0.06, 0.0);
    carve(menu, s, vec2(0.0, -0.4), vec2(0.92, 0.16), 0.08, 0.012, 2.0);
    emboss(menu, s, vec2(-0.42, -0.4), vec2(0.36, 0.03), 0.03, 0.006, 5.0);
    emboss(menu, s, vec2(-0.3, 0.0), vec2(0.48, 0.03), 0.03, 0.006, 5.0);
    emboss(menu, s, vec2(-0.44, 0.4), vec2(0.34, 0.03), 0.03, 0.006, 5.0);
  }
  if (menu.x < res.x) res = menu;
  return res;
}

vec3 local(vec3 p) {
  vec3 q = p - vec3(uStack.x, 0.0, uStack.y);
  q.xz = rot(uStack.w) * q.xz;
  return q / uStack.z;
}

vec2 map(vec3 p) {
  vec3 q = local(p);
  float bound = (length(q - BOUND_CENTER) - BOUND_RADIUS) * uStack.z;
  if (bound > gMargin) return vec2(bound, 0.0);
  vec2 res = stack(q);
  res.x *= uStack.z;
  return res;
}

float mapDistance(vec3 p) { return map(p).x; }

vec3 normalAt(vec3 p, float t) {
  // Sampled about a pixel wide, so a bevel narrower than a pixel shades as a soft continuous line instead of a
  // stair of dark and light pixels.
  vec2 e = vec2(1.0, -1.0) * max(0.0005 * max(t * 0.05, 1.0), 0.6 * t / (uFocal * uResolution.y));
  return normalize(e.xyy * mapDistance(p + e.xyy) + e.yyx * mapDistance(p + e.yyx) + e.yxy * mapDistance(p + e.yxy) + e.xxx * mapDistance(p + e.xxx));
}

float softShadow(vec3 ro, vec3 rd, float tmax, float k) {
  vec3 center = vec3(uStack.x, BOUND_CENTER.y * uStack.z, uStack.y);
  vec3 oc = center - ro;
  float along = max(dot(oc, rd), 0.0);
  // A ray that passes this far outside the bounding sphere gets no penumbra either; the margin scales with the figure.
  if (length(oc - rd * along) > (BOUND_RADIUS + 0.6) * uStack.z) return 1.0;
  float res = 1.0;
  float t = 0.02 * uStack.z;
  for (int i = 0; i < 64; i++) {
    vec2 m = map(ro + rd * t);
    // Only a real surface casts a penumbra; the bounding sphere's distance only lets the ray skip ahead.
    if (m.y > 0.5) res = min(res, k * m.x / t);
    t += clamp(m.x, 0.006 * uStack.z, 0.3);
    if (res < 0.002 || t > tmax) break;
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}

float occlusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float weight = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = (0.02 + 0.07 * float(i)) * uStack.z;
    occ += (h - mapDistance(p + n * h)) * weight;
    weight *= 0.72;
  }
  return clamp(1.0 - 1.8 * occ / uStack.z, 0.0, 1.0);
}

/* The markup printed on the table: slow columns of glyphs, a head that resolves and a trail that fades. */
float glyphs(vec2 xz, float lod) {
  // The print grows with the figure, but slower, so a phone's smaller figure does not stand in outsized type.
  vec2 g = xz / (CELL * sqrt(uStack.z / 0.86));
  vec2 cell = floor(g);
  vec2 f = fract(g);
  float column = cell.x;
  float speed = 0.7 + hash1(column) * 1.5;
  float period = 30.0 + floor(hash1(column + 7.0) * 50.0);
  float trailLength = 6.0 + hash1(column + 3.0) * 16.0;
  float head = uTime * speed + hash1(column + 11.0) * period;
  float m = mod(head - cell.y, period);
  float trail = m < trailLength ? pow(1.0 - m / trailLength, 2.0) : 0.0;
  float isHead = 1.0 - smoothstep(0.0, 1.2, m);
  float rate = mix(0.08, 6.0, isHead);
  float seed = hash2(cell);
  float index = floor(hash2(cell + floor(uTime * rate + seed * 9.0) * 0.173) * GRID * GRID);
  vec2 atlas = (vec2(mod(index, GRID), floor(index / GRID)) + 0.14 + f * 0.72) / GRID;
  float ink;
  if (lod < 0.0) {
    ink = textureGrad(uAtlas, atlas, dFdx(g) * 0.72 / GRID, dFdy(g) * 0.72 / GRID).r;
  } else {
    ink = textureLod(uAtlas, atlas, lod).r;
  }
  float present = step(0.35, hash2(cell + 3.1));
  // Light ink on a dark table carries further than dark on light, so the night print keeps its heads quieter.
  return ink * (0.06 * present + trail * 0.26 + isHead * mix(0.34, 0.22, uDark)) * mix(1.35, 0.62, uDark);
}

/* 0 inside a patch of the stage kept clear of print, rising to 1 a radius outside it. */
float clearOf(vec4 rect, float radius) {
  if (rect.z <= rect.x) return 1.0;
  vec2 center = (rect.xy + rect.zw) * 0.5;
  vec2 half_ = (rect.zw - rect.xy) * 0.5;
  return smoothstep(0.0, radius, sdRoundRect(gl_FragCoord.xy - center, half_, radius * 0.6));
}

vec3 tableColor(vec3 p, float lod) {
  vec3 col = uGround;
  vec2 fromStack = p.xz - uStack.xy;
  // The print is a field around the figure, densest under it and gone before the edges of the hero.
  float reach = uStack.z;
  float field = 1.0 - smoothstep(3.0 * reach, 9.0 * reach, length(fromStack * vec2(0.8, 1.25)));
  float sweep = length(fromStack) - uBoot * 12.0 * reach;
  float printed = 1.0 - smoothstep(-0.6, 0.6, sweep);
  float alpha = glyphs(p.xz, lod) * field * printed;

  alpha *= clearOf(uReading, uReadingRadius) * clearOf(uNotes, uReadingRadius * 0.5);
  return mix(col, uInk, clamp(alpha, 0.0, 0.6));
}

struct Material { vec3 albedo; float wrap; float shine; float spec; float f0; float reflect; };

Material material(float id) {
  if (id > 12.5) return Material(mix(vec3(1.0), vec3(0.042, 0.043, 0.047), uDark), 0.5, 36.0, 0.25, 0.04, mix(0.12, 0.55, uDark));
  if (id > 11.5) return Material(mix(vec3(0.9, 0.903, 0.91), vec3(0.0105, 0.0107, 0.0118), uDark), 0.5, 24.0, 0.12, 0.03, mix(0.06, 0.4, uDark));
  if (id > 10.5) return Material(mix(vec3(0.8, 0.803, 0.812), vec3(0.075, 0.076, 0.082), uDark), 0.45, 30.0, 0.2, 0.04, 0.25);
  // A mark keeps the same contrast to the tray, a step darker than the sheet, as to the sheet.
  if (id > 6.5) return Material(mix(vec3(0.7, 0.703, 0.712), vec3(0.04, 0.041, 0.045), uDark), 0.5, 30.0, 0.15, 0.04, mix(0.06, 0.35, uDark));
  if (id > 5.5) return Material(mix(vec3(0.83, 0.833, 0.84), vec3(0.0085, 0.0087, 0.0097), uDark), 0.45, 20.0, 0.1, 0.03, mix(0.05, 0.35, uDark));
  if (id > 4.5) return Material(mix(vec3(0.78, 0.783, 0.792), vec3(0.1, 0.102, 0.11), uDark), 0.5, 30.0, 0.15, 0.04, mix(0.06, 0.35, uDark));
  if (id > 2.5) return Material(mix(vec3(0.012, 0.012, 0.014), vec3(0.86, 0.865, 0.875), uDark), 0.2, 120.0, 1.2, 0.05, mix(0.9, 0.2, uDark));
  if (id > 1.5) return Material(mix(vec3(0.905, 0.908, 0.915), vec3(0.0085, 0.0087, 0.0097), uDark), 0.45, 20.0, 0.1, 0.03, mix(0.05, 0.35, uDark));
  return Material(mix(vec3(1.0), vec3(0.03, 0.031, 0.034), uDark), 0.5, 36.0, 0.25, 0.04, mix(0.1, 0.55, uDark));
}

/* What a polished face reflects: the printed table below, and above, the room with the lamp's softbox in it. */
vec3 environment(vec3 p, vec3 r) {
  if (r.y < -0.002) {
    vec3 hit = p + r * (-p.y / r.y);
    float ao = clamp(mapDistance(hit + vec3(0.0, 0.2, 0.0)) / 0.2, 0.0, 1.0);
    return tableColor(hit, 1.5) * mix(0.55, 1.0, ao);
  }
  vec3 room = mix(uGround * mix(1.0, 1.4, uDark), mix(vec3(1.0), uGround * 2.0 + 0.012, uDark), smoothstep(0.0, 0.9, r.y));
  float box = smoothstep(0.96, 0.993, dot(r, normalize(uLamp - p)));
  return room + uLampColor * box * mix(1.2, 1.8, uDark);
}

vec3 shade(vec3 p, vec3 n, vec3 rd, float id, float t) {
  Material m = material(id);
  vec3 toLamp = uLamp - p;
  float dl = length(toLamp);
  vec3 l = toLamp / dl;
  float shadow = softShadow(p + n * 0.006 * uStack.z, l, dl, 10.0);
  float ao = occlusion(p, n);
  float diffuse = clamp((dot(n, l) + m.wrap) / (1.0 + m.wrap), 0.0, 1.0) * mix(mix(0.6, 0.3, uDark), 1.0, shadow);
  vec3 h = normalize(l - rd);
  float specular = pow(max(dot(n, h), 0.0), m.shine) * (m.shine + 8.0) / 64.0 * shadow * m.spec;
  float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  vec3 sky = mix(uGround * 0.55, uGround * mix(1.0, 1.7, uDark) + 0.02, n.y * 0.5 + 0.5);
  vec3 col = m.albedo * (uLampColor * diffuse * 0.62 + sky * mix(0.6, 1.0, ao) * 0.44);
  vec3 reflected = environment(p + n * 0.01, reflect(rd, n));
  col = mix(col, reflected * mix(1.0, ao, 0.5), clamp(mix(m.f0, 1.0, fresnel) * m.reflect, 0.0, 1.0));
  col += uLampColor * specular;
  // Obsidian keeps a legible edge against the dark table, as its contour does on the page.
  col += vec3(0.92, 0.94, 1.0) * pow(fresnel, 0.55) * 0.03 * uDark * ao;
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec3 forward = normalize(uCamTarget - uCamPos);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 rd = normalize(forward * uFocal + right * uv.x * 2.0 + up * uv.y * 2.0);
  vec3 ro = uCamPos;

  vec3 col = uGround;
  if (rd.y < 0.0) {
    float tTable = -ro.y / rd.y;
    // The figure lives below this height, so marching starts where the ray enters that layer.
    float ceiling = (BOUND_CENTER.y + BOUND_RADIUS) * uStack.z;
    float t = max((ro.y - ceiling) / -rd.y, 0.0);
    float id = -1.0;
    // How wide a pixel is at distance 1 along the ray.
    float footprint = 2.0 / (uFocal * uResolution.y);
    // The closest the ray came to an edge it then passed, in pixels, and where; the edge's coverage of the pixel.
    float edgeGap = 1.0;
    float edgeT = 0.0;
    float lastD = 1e9;
    float lastT = 0.0;
    // The embossed marks are shallower than a pixel is wide, so a hit is taken only very near the surface.
    for (int i = 0; i < 180; i++) {
      vec2 h = map(ro + rd * t);
      if (h.x < 0.00003 * t) { id = h.y; break; }
      // Closing in, then pulling away: the ray grazed a silhouette without touching it.
      if (h.y > 0.5 && h.x > lastD) {
        float gap = lastD / (lastT * footprint);
        if (gap < edgeGap) { edgeGap = gap; edgeT = lastT; }
      }
      lastD = h.y > 0.5 ? h.x : 1e9;
      lastT = t;
      t += h.x;
      if (t > tTable) break;
    }
    if (id > 0.5 && t < tTable) {
      vec3 p = ro + rd * t;
      // A mark is a tone on a level face: its sub-pixel relief would only add noise to the normal.
      vec3 n = id > 4.5 && id < 7.5 ? vec3(0.0, 1.0, 0.0) : normalAt(p, t);
      col = shade(p, n, rd, id, t);
    } else {
      vec3 p = ro + rd * tTable;
      col = tableColor(p, -1.0);
      vec3 toLamp = uLamp - p;
      float dl = length(toLamp);
      float shadow = softShadow(p + vec3(0.0, 0.002, 0.0), toLamp / dl, dl, 8.0);
      float contact = clamp(mapDistance(p + vec3(0.0, 0.18, 0.0)) / 0.18, 0.0, 1.0);
      col *= mix(mix(0.9, 0.55, uDark), 1.0, shadow) * mix(mix(0.82, 0.5, uDark), 1.0, contact);
    }
    // A pixel the ray left half a pixel from an edge is partly that edge: blend it in, so silhouettes resolve
    // into a smooth line instead of a stair of whole pixels. Only an edge well in front of what the ray met counts;
    // a recess in the same face is not a silhouette.
    if (edgeGap < 0.5 && (id < 0.5 || t - edgeT > 0.08 * uStack.z)) {
      vec3 p = ro + rd * edgeT;
      float edgeId = map(p).y;
      vec3 n = normalAt(p, edgeT);
      col = mix(col, shade(p, n, rd, edgeId, edgeT), 0.5 - edgeGap);
    }
  }
  // Grain breaks the banding of slow gradients on the table.
  col += (hash2(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
  outColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}
`
