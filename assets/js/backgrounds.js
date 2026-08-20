/* ---------------------------------------------------------------
   BU animated backgrounds — real WebGL fragment shaders.

   Each style is the same simplex-noise + domain-warp core with
   different motion parameters, so colours stay consistent across
   styles and only the movement changes.
   --------------------------------------------------------------- */

const BU_BG_STYLES = {
  flow:   { label:'Flow',   warp:1.0, speed:0.055, scale:1.5, swirl:0.0, bands:0.0 },
  swirl:  { label:'Swirl',  warp:1.5, speed:0.045, scale:1.2, swirl:1.0, bands:0.0 },
  silk:   { label:'Silk',   warp:0.7, speed:0.05,  scale:2.1, swirl:0.0, bands:1.0 },
  plasma: { label:'Plasma', warp:2.2, speed:0.075, scale:1.8, swirl:0.35, bands:0.0 },
  calm:   { label:'Calm',   warp:0.45, speed:0.025, scale:1.0, swirl:0.0, bands:0.0 }
};

const BU_PALETTES = [
  { label:'Ember',        colors:['#CC5500','#F0A24B','#7A2E00','#1A0C04'] },
  { label:'Gold & Green', colors:['#D4A93C','#5B7A5B','#2F4A2C','#0E140C'] },
  { label:'Deep Teal',    colors:['#1B6B7D','#7FD4E0','#134A5A','#06141A'] },
  { label:'Plum',         colors:['#6B3B7A','#D98AC4','#43215A','#120A18'] },
  { label:'Steel',        colors:['#5D8DA0','#C7DCE4','#33586A','#0C151A'] },
  { label:'Charcoal',     colors:['#4A4A4A','#8A8A8A','#2A2A2A','#0C0C0C'] }
];

const _BU_VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const _BU_FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uC1, uC2, uC3, uC4;
uniform float uWarp, uScale, uSwirl, uBands, uGrain;

// --- simplex noise (Ashima / webgl-noise, public domain) ---
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                          + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i=0;i<4;i++){ s += a * snoise(p); p *= 2.02; a *= 0.5; }
  return s;
}

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p  = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0) * uScale;

  float t = uTime;

  // optional swirl around the centre
  if(uSwirl > 0.0){
    float r = length(p);
    float a = atan(p.y, p.x) + uSwirl * (0.6 - r) * sin(t*0.4);
    p = vec2(cos(a), sin(a)) * r;
  }

  // domain warping — this is what makes it read as a mesh gradient
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t*0.8)));
  vec2 r = vec2(fbm(p + uWarp*q + vec2(1.7, 9.2) + t*0.35),
                fbm(p + uWarp*q + vec2(8.3, 2.8) - t*0.28));
  float f = fbm(p + uWarp*r);

  // remap to 0..1
  float v = clamp(f*0.5 + 0.5, 0.0, 1.0);

  // silk: fold the field into soft bands
  if(uBands > 0.0){
    v = mix(v, 0.5 + 0.5*sin(6.2831*(v*1.4 + t*0.25)), uBands*0.55);
  }

  float m1 = smoothstep(0.0, 0.45, v);
  float m2 = smoothstep(0.35, 0.72, v);
  float m3 = smoothstep(0.6,  0.95, v);

  vec3 col = uC4;
  col = mix(col, uC3, m1);
  col = mix(col, uC1, m2);
  col = mix(col, uC2, m3);

  // subtle vertical depth
  col *= 0.86 + 0.2 * (1.0 - uv.y);

  // film grain
  float g = rand(gl_FragCoord.xy + fract(t)*100.0);
  col += (g - 0.5) * uGrain;

  gl_FragColor = vec4(col, 1.0);
}
`;

function _buHexToVec3(hex){
  hex = (hex || '#000000').trim();
  if(hex.length === 4) hex = '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  const n = parseInt(hex.slice(1), 16);
  if(isNaN(n)) return [0,0,0];
  return [ ((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255 ];
}

function _buCompile(gl, type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    console.warn('BU shader error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s); return null;
  }
  return s;
}

/**
 * @param canvas  target <canvas>
 * @param styleKey key of BU_BG_STYLES
 * @param colors  array of 3–4 hex strings (light1, light2, mid, base)
 * @param opts    { quality: 0..1 render scale, grain: 0..0.2 }
 */
function buStartBackground(canvas, styleKey, colors, opts){
  opts = opts || {};
  const cfg = BU_BG_STYLES[styleKey] || BU_BG_STYLES.flow;
  let pal = (colors && colors.length >= 3) ? colors.slice() : BU_PALETTES[0].colors.slice();
  while(pal.length < 4) pal.push(pal[pal.length-1]);

  const gl = canvas.getContext('webgl', { antialias:false, alpha:false, depth:false })
          || canvas.getContext('experimental-webgl');

  /* ---- graceful fallback: static CSS gradient if WebGL is unavailable ---- */
  if(!gl){
    canvas.style.background =
      'radial-gradient(120% 90% at 30% 25%, ' + pal[0] + ', transparent 55%),' +
      'radial-gradient(110% 80% at 75% 70%, ' + pal[1] + ', transparent 55%),' +
      pal[3];
    return { stop(){}, resume(){}, setColors(){}, setStyle(){} };
  }

  const vs = _buCompile(gl, gl.VERTEX_SHADER, _BU_VERT);
  const fs = _buCompile(gl, gl.FRAGMENT_SHADER, _BU_FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = n => gl.getUniformLocation(prog, n);
  const uRes=U('uRes'), uTime=U('uTime');
  const uC1=U('uC1'), uC2=U('uC2'), uC3=U('uC3'), uC4=U('uC4');
  const uWarp=U('uWarp'), uScale=U('uScale'), uSwirl=U('uSwirl'), uBands=U('uBands'), uGrain=U('uGrain');

  let style = cfg;
  const quality = opts.quality || 0.5;   // render below CSS size, scaled up by the browser
  const grain = (opts.grain === undefined) ? 0.055 : opts.grain;

  function pushColors(){
    gl.uniform3fv(uC1, _buHexToVec3(pal[0]));
    gl.uniform3fv(uC2, _buHexToVec3(pal[1]));
    gl.uniform3fv(uC3, _buHexToVec3(pal[2]));
    gl.uniform3fv(uC4, _buHexToVec3(pal[3]));
  }
  pushColors();

  function resize(){
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width  * quality));
    const h = Math.max(1, Math.round(rect.height * quality));
    if(canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
      gl.viewport(0,0,w,h);
    }
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  resize();
  const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(resize) : null;
  if(ro) ro.observe(canvas);

  const t0 = performance.now();
  let raf = null, running = true;

  function frame(){
    if(!running) return;
    resize();
    gl.uniform1f(uTime, (performance.now() - t0) * 0.001 * style.speed * 10.0);
    gl.uniform1f(uWarp,  style.warp);
    gl.uniform1f(uScale, style.scale);
    gl.uniform1f(uSwirl, style.swirl);
    gl.uniform1f(uBands, style.bands);
    gl.uniform1f(uGrain, grain);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    stop(){ running=false; if(raf) cancelAnimationFrame(raf); if(ro) ro.disconnect(); },
    resume(){ if(!running){ running=true; raf=requestAnimationFrame(frame); } },
    setColors(next){
      pal = next.slice();
      while(pal.length < 4) pal.push(pal[pal.length-1]);
      gl.useProgram(prog); pushColors();
    },
    setStyle(key){ style = BU_BG_STYLES[key] || style; }
  };
}
