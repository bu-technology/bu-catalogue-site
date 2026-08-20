/* ---------------------------------------------------------------
   BU animated mesh-gradient backgrounds.

   Rendered at low resolution onto a small canvas, then scaled up by
   the browser with a blur — this is what gives the soft "mesh" look
   and keeps it cheap enough to run on a phone. A grain overlay is
   applied in CSS on top.
   --------------------------------------------------------------- */

const BU_BG_STYLES = {
  aurora: { label:'Aurora', hint:'Slow drifting light' },
  silk:   { label:'Silk',   hint:'Folding waves' },
  orbit:  { label:'Orbit',  hint:'Circling colour' },
  pulse:  { label:'Pulse',  hint:'Breathing bloom' },
  drift:  { label:'Drift',  hint:'Lazy diagonal flow' }
};

const BU_PALETTES = [
  { label:'Ember',   colors:['#CC5500','#F0A24B','#2A1006'] },
  { label:'Gold & Green', colors:['#D4A93C','#5B7A5B','#12180F'] },
  { label:'Deep Teal', colors:['#1B6B7D','#7FD4E0','#07171C'] },
  { label:'Plum',    colors:['#6B3B7A','#D98AC4','#150A1A'] },
  { label:'Steel',   colors:['#5D8DA0','#C7DCE4','#0E171B'] },
  { label:'Charcoal',colors:['#3A3A3A','#8A8A8A','#0C0C0C'] }
];

function _buHexToRgb(hex){
  hex = (hex||'#000000').trim();
  if(hex.length === 4){ hex = '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3]; }
  const n = parseInt(hex.slice(1),16);
  if(isNaN(n)) return [0,0,0];
  return [ (n>>16)&255, (n>>8)&255, n&255 ];
}

/**
 * @param canvas   target <canvas>
 * @param styleKey one of BU_BG_STYLES
 * @param colors   array of hex strings (first two are the light sources,
 *                 last is the base/background)
 */
function buStartBackground(canvas, styleKey, colors){
  const style = BU_BG_STYLES[styleKey] ? styleKey : 'aurora';
  const pal = (colors && colors.length >= 3) ? colors : BU_PALETTES[0].colors;
  const ctx = canvas.getContext('2d', { alpha:false });

  // Fixed low internal resolution; CSS scales it up.
  const W = 64, H = 64;
  canvas.width = W; canvas.height = H;

  const c1 = _buHexToRgb(pal[0]);
  const c2 = _buHexToRgb(pal[1]);
  const base = _buHexToRgb(pal[2]);
  const baseCss = 'rgb(' + base[0] + ',' + base[1] + ',' + base[2] + ')';

  // A third accent, mixed from the two lights, adds depth.
  const c3 = [ (c1[0]+c2[0])/2 | 0, (c1[1]+c2[1])/2 | 0, (c1[2]+c2[2])/2 | 0 ];

  const seed = Math.random() * Math.PI * 2;
  let raf = null, running = true;

  function blob(x, y, r, rgb, alpha){
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')');
    g.addColorStop(0.55,'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (alpha*0.45) + ')');
    g.addColorStop(1,   'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  function draw(now){
    if(!running) return;
    const t = now * 0.00012 + seed;

    ctx.fillStyle = baseCss;
    ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation = 'lighter';

    if(style === 'aurora'){
      blob(W*(0.5+Math.sin(t*0.9)*0.34),  H*(0.42+Math.cos(t*0.7)*0.3),  W*0.62, c1, 0.95);
      blob(W*(0.5+Math.cos(t*0.62)*0.36), H*(0.58+Math.sin(t*0.83)*0.32), W*0.58, c2, 0.9);
      blob(W*(0.5+Math.sin(t*1.15+2)*0.3),H*(0.5+Math.cos(t*0.95+1)*0.28),W*0.45, c3, 0.6);
    } else if(style === 'silk'){
      for(let i=0;i<4;i++){
        const p = i/4;
        blob(W*(0.5 + Math.sin(t*0.8 + p*3.1)*0.42),
             H*(0.2 + p*0.6 + Math.cos(t*0.6 + p*2.4)*0.14),
             W*0.5, i%2 ? c2 : c1, 0.7);
      }
    } else if(style === 'orbit'){
      const R = 0.3;
      blob(W*(0.5+Math.cos(t*1.1)*R),       H*(0.5+Math.sin(t*1.1)*R),       W*0.55, c1, 0.95);
      blob(W*(0.5+Math.cos(t*1.1+2.09)*R),  H*(0.5+Math.sin(t*1.1+2.09)*R),  W*0.55, c2, 0.95);
      blob(W*(0.5+Math.cos(t*1.1+4.19)*R),  H*(0.5+Math.sin(t*1.1+4.19)*R),  W*0.55, c3, 0.8);
    } else if(style === 'pulse'){
      const b = 0.5 + Math.sin(t*1.6)*0.5;
      blob(W*0.5, H*0.48, W*(0.34 + b*0.34), c1, 0.95);
      blob(W*(0.34+Math.sin(t*0.9)*0.12), H*(0.62+Math.cos(t*1.1)*0.12), W*0.42, c2, 0.75);
      blob(W*(0.68+Math.cos(t*0.8)*0.12), H*(0.36+Math.sin(t*1.0)*0.12), W*0.38, c3, 0.6);
    } else { // drift
      const d = (t*0.35) % 1;
      for(let i=0;i<3;i++){
        const p = (d + i/3) % 1;
        blob(W*(-0.2 + p*1.4), H*(0.75 - p*0.55), W*0.6, i===1 ? c2 : (i===2 ? c3 : c1), 0.85);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  return {
    stop(){ running = false; if(raf) cancelAnimationFrame(raf); },
    resume(){ if(!running){ running = true; raf = requestAnimationFrame(draw); } }
  };
}
