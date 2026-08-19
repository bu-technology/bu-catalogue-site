const BU_TEXTURES = {
  ember:    { label:'Ember',    hint:'Stimulation', base:'#0A0603', lights:['#FFB44D','#CC5500','#7A2E00'] },
  verdant:  { label:'Verdant',  hint:'Recovery',    base:'#050A05', lights:['#A8D48A','#5B7A5B','#26401F'] },
  current:  { label:'Current',  hint:'Focus',       base:'#01070A', lights:['#7FE9F0','#1B6B7D','#123E7A'] },
  bloom:    { label:'Bloom',    hint:'Connection',  base:'#0A0410', lights:['#E88AD6','#6B3B7A','#3A1C52'] },
  charcoal: { label:'Charcoal', hint:'Quiet',       base:'#0C0C0C', lights:['#8A8A8A','#3A3A3A','#1C1C1C'] }
};

/* Smooth value-noise: hash-based lattice with cubic interpolation. */
function _buHash(x, y, seed){
  let h = x*374761393 + y*668265263 + seed*1442695040;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function _buSmooth(t){ return t*t*(3-2*t); }
function _buNoise(x, y, seed){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x-xi, yf = y-yi;
  const u = _buSmooth(xf), v = _buSmooth(yf);
  const a = _buHash(xi, yi, seed),     b = _buHash(xi+1, yi, seed);
  const c = _buHash(xi, yi+1, seed),   d = _buHash(xi+1, yi+1, seed);
  return (a*(1-u)+b*u)*(1-v) + (c*(1-u)+d*u)*v;
}
function _buFbm(x, y, seed){
  return _buNoise(x,y,seed)*0.6 + _buNoise(x*2.1,y*2.1,seed+7)*0.3 + _buNoise(x*4.3,y*4.3,seed+13)*0.1;
}

function _buHexToRgb(hex){
  const n = parseInt(hex.slice(1),16);
  return [ (n>>16)&255, (n>>8)&255, n&255 ];
}
function _buMix(c1, c2, t){
  return [ c1[0]+(c2[0]-c1[0])*t, c1[1]+(c2[1]-c1[1])*t, c1[2]+(c2[2]-c1[2])*t ];
}

/**
 * Renders an animated halftone field: a soft light source behind organic
 * noise blobs, drawn as a grid of dots whose radius tracks local brightness.
 */
function buStartTexture(canvas, styleKey, opts){
  opts = opts || {};
  const cfg = BU_TEXTURES[styleKey] || BU_TEXTURES.ember;
  const ctx = canvas.getContext('2d', { alpha:false });

  const dotGap   = opts.dotGap || 7;
  const speed    = opts.speed  || 0.000075;
  const seed     = Math.floor(Math.random()*900);

  const baseRgb  = _buHexToRgb(cfg.base);
  const lightRgb = cfg.lights.map(_buHexToRgb);

  let W = 0, H = 0, cols = 0, rows = 0;
  let raf = null, running = true;

  function resize(){
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cols = Math.ceil(W / dotGap) + 1;
    rows = Math.ceil(H / dotGap) + 1;
  }
  resize();
  const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(resize) : null;
  if(ro) ro.observe(canvas);

  function draw(t){
    if(!running) return;
    const time = t * speed;

    ctx.fillStyle = cfg.base;
    ctx.fillRect(0,0,W,H);

    // Light source drifts slowly; blobs drift against it.
    const lx = W*(0.5 + Math.sin(time*0.9)*0.16);
    const ly = H*(0.45 + Math.cos(time*0.7)*0.14);
    const maxD = Math.sqrt(W*W + H*H) * 0.55;

    for(let gy=0; gy<rows; gy++){
      for(let gx=0; gx<cols; gx++){
        const px = gx*dotGap;
        const py = gy*dotGap;

        // radial falloff from the light
        const dx = px-lx, dy = py-ly;
        const dist = Math.sqrt(dx*dx+dy*dy);
        let glow = Math.max(0, 1 - dist/maxD);
        glow = Math.pow(glow, 1.4);

        // organic drifting shapes
        const n = _buFbm(px*0.0075 + time*1.4, py*0.0075 - time*0.9, seed);

        // combine: blobs lit by the drifting source
        let v = (glow*0.55 + 0.45) * (n*1.55);
        v = Math.max(0, Math.min(1, v));
        if(v < 0.035) continue;

        // colour ramp: deep -> mid -> hot
        let col;
        if(v < 0.5){ col = _buMix(baseRgb, lightRgb[2], v/0.5); }
        else if(v < 0.8){ col = _buMix(lightRgb[2], lightRgb[1], (v-0.5)/0.3); }
        else { col = _buMix(lightRgb[1], lightRgb[0], (v-0.8)/0.2); }

        const r = (dotGap*0.52) * Math.pow(v, 0.72);
        if(r < 0.25) continue;

        ctx.fillStyle = 'rgb(' + (col[0]|0) + ',' + (col[1]|0) + ',' + (col[2]|0) + ')';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.2832);
        ctx.fill();
      }
    }
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  return {
    stop(){ running = false; if(raf) cancelAnimationFrame(raf); if(ro) ro.disconnect(); },
    resume(){ if(!running){ running = true; raf = requestAnimationFrame(draw); } }
  };
}
