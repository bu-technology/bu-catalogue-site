const BU_TEXTURES = {
  ember:    { label: 'Ember',      hint: 'Stimulation', base:'#150D08', colors:['#CC5500','#E08A3C','#7A2E00'] },
  verdant:  { label: 'Verdant',    hint: 'Recovery',    base:'#0C120C', colors:['#5B7A5B','#8CAE8C','#2E3F2E'] },
  current:  { label: 'Current',    hint: 'Focus',       base:'#0A1416', colors:['#1B6B7D','#5D8DA0','#0E2E36'] },
  bloom:    { label: 'Bloom',      hint: 'Connection',  base:'#130A16', colors:['#6B3B7A','#9A6BAE','#3A1C42'] },
  charcoal: { label: 'Charcoal',   hint: 'Quiet',        base:'#1A1A1A', colors:['#2A2A2A','#242424','#161616'] }
};

function buStartTexture(canvas, styleKey){
  const cfg = BU_TEXTURES[styleKey] || BU_TEXTURES.ember;
  const ctx = canvas.getContext('2d');
  const RES = 220;
  canvas.width = RES; canvas.height = RES;

  let raf = null;
  let visible = true;
  const seed = Math.random()*1000;

  const blobs = cfg.colors.map((c,i)=>({
    color: c,
    r: 60 + i*26,
    ax: 40 + i*18, ay: 34 + i*14,
    sx: 0.00025 + i*0.00009, sy: 0.00021 + i*0.00011,
    px: (i*137) % 360
  }));

  const nodes = styleKey === 'current' ? Array.from({length:7}, (_,i)=>({
    ox: 30 + (i*47)%160, oy: 30 + (i*83)%160, r: 10+i*3, ph: i*0.9
  })) : null;

  const grain = styleKey === 'verdant' ? Array.from({length:36}, (_,i)=>({
    x: (i*53)%RES, y: (i*97)%RES, ph: i*0.4, r: 2+ (i%3)
  })) : null;

  function draw(t){
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = cfg.base;
    ctx.fillRect(0,0,RES,RES);
    ctx.globalCompositeOperation = 'lighter';

    if(styleKey === 'current' && nodes){
      ctx.strokeStyle = cfg.colors[1]; ctx.lineWidth = 1;
      const pts = nodes.map(n=>({
        x: n.ox + Math.sin(t*0.00035 + n.ph)*22,
        y: n.oy + Math.cos(t*0.0003 + n.ph)*22
      }));
      for(let i=0;i<pts.length;i++){
        for(let j=i+1;j<pts.length;j++){
          const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
          const d = Math.sqrt(dx*dx+dy*dy);
          if(d < 90){
            ctx.globalAlpha = Math.max(0, 1 - d/90) * 0.35;
            ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      pts.forEach(p=>{
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,14);
        g.addColorStop(0, cfg.colors[1]); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,14,0,7); ctx.fill();
      });
    } else if(styleKey === 'verdant' && grain){
      grain.forEach(p=>{
        const flicker = (Math.sin(t*0.002 + p.ph)+1)/2;
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);
        g.addColorStop(0, cfg.colors[1]); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = flicker*0.55;
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*4,0,7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      blobs.forEach(b=>{
        const x = RES/2 + Math.sin(t*b.sx + seed)*b.ax;
        const y = RES/2 + Math.cos(t*b.sy + seed)*b.ay;
        const g = ctx.createRadialGradient(x,y,0,x,y,b.r);
        g.addColorStop(0, b.color+'55'); g.addColorStop(1,'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,b.r,0,7); ctx.fill();
      });
    } else {
      blobs.forEach(b=>{
        const x = RES/2 + Math.sin(t*b.sx + seed)*b.ax;
        const y = RES/2 + Math.cos(t*b.sy + seed)*b.ay;
        const g = ctx.createRadialGradient(x,y,0,x,y,b.r);
        g.addColorStop(0, b.color); g.addColorStop(1,'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,b.r,0,7); ctx.fill();
      });
    }

    if(visible) raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  return {
    stop(){ visible = false; if(raf) cancelAnimationFrame(raf); },
    resume(){ if(!visible){ visible = true; raf = requestAnimationFrame(draw); } }
  };
}
