/* ---------------------------------------------------------------
   Infinite 2D draggable grid of drink images.

   Note: pointer capture is deliberately NOT used here. Capturing the
   pointer on the viewport retargets click events to the viewport,
   which stops clicks reaching the individual cells. Instead the drag
   is tracked on window and a tap is detected by distance travelled.
   --------------------------------------------------------------- */
function buInfiniteGrid(opts){
  const viewport = opts.viewport;
  const items    = opts.items || [];
  const onOpen   = opts.onOpen || function(){};
  if(items.length === 0) return null;

  const layer = document.createElement('div');
  layer.className = 'ig-layer';
  viewport.appendChild(layer);

  let cell = 0, gap = 0, cellW = 0, cellH = 0;
  function measure(){
    const w = viewport.clientWidth;
    cell = w < 480 ? 128 : (w < 820 ? 168 : 210);
    gap  = w < 480 ? 18 : 30;
    cellW = cell + gap;
    cellH = cell + gap;
  }
  measure();

  let ox = 0, oy = 0, vx = 0, vy = 0;
  let dragging = false, moved = false;
  let startX = 0, startY = 0, lastX = 0, lastY = 0, lastT = 0;
  const FRICTION = 0.935;

  const pool = new Map();

  function itemFor(col, row){
    let i = (col * 31 + row * 17) % items.length;
    if(i < 0) i += items.length;
    return items[i];
  }

  function build(key, col, row){
    const d = itemFor(col, row);
    const node = document.createElement('div');
    node.className = 'ig-cell';
    node.style.width  = cell + 'px';
    node.style.height = cell + 'px';
    const img = document.createElement('img');
    img.src = d.image_url; img.alt = d.name;
    img.loading = 'lazy'; img.draggable = false;
    node.appendChild(img);
    node.addEventListener('click', ()=>{ if(!moved) onOpen(d); });
    layer.appendChild(node);
    pool.set(key, node);
    return node;
  }

  function render(){
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const c0 = Math.floor(-ox / cellW) - 1, c1 = Math.floor((-ox + vw) / cellW) + 1;
    const r0 = Math.floor(-oy / cellH) - 1, r1 = Math.floor((-oy + vh) / cellH) + 1;

    const need = new Set();
    for(let row=r0; row<=r1; row++){
      for(let col=c0; col<=c1; col++){
        const key = col + ',' + row;
        need.add(key);
        let node = pool.get(key) || build(key, col, row);
        // offset alternate rows for a looser, less gridded feel
        const stagger = (((row % 2) + 2) % 2) * (cellW * 0.5);
        const x = col*cellW + ox + stagger;
        const y = row*cellH + oy;
        node.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      }
    }
    pool.forEach((node, key)=>{ if(!need.has(key)){ node.remove(); pool.delete(key); } });
  }

  let raf = null, prevT = null;
  function tick(t){
    if(prevT === null) prevT = t;
    let dt = t - prevT; prevT = t;
    if(dt > 60) dt = 60;
    if(!dragging && (Math.abs(vx) > 0.002 || Math.abs(vy) > 0.002)){
      ox += vx*dt; oy += vy*dt;
      const decay = Math.pow(FRICTION, dt/16.67);
      vx *= decay; vy *= decay;
      render();
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  function onDown(e){
    dragging = true; moved = false;
    startX = lastX = e.clientX; startY = lastY = e.clientY;
    lastT = performance.now();
    vx = vy = 0;
    viewport.classList.add('grabbing');
  }
  function onMove(e){
    if(!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if(Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) moved = true;
    ox += dx; oy += dy;
    const now = performance.now(), dt = now - lastT;
    if(dt > 0){
      vx = vx*0.65 + (dx/dt)*0.35;
      vy = vy*0.65 + (dy/dt)*0.35;
    }
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    render();
  }
  function onUp(){
    if(!dragging) return;
    dragging = false;
    viewport.classList.remove('grabbing');
    if(performance.now() - lastT > 90){ vx = vy = 0; }
    const cap = 3.2;
    vx = Math.max(-cap, Math.min(cap, vx));
    vy = Math.max(-cap, Math.min(cap, vy));
    // let the click event fire first, then clear the flag
    setTimeout(()=>{ moved = false; }, 0);
  }

  viewport.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  viewport.addEventListener('wheel', e=>{
    e.preventDefault();
    ox -= e.deltaX; oy -= e.deltaY;
    vx = vy = 0;
    render();
  }, { passive:false });

  let rt = null;
  window.addEventListener('resize', ()=>{
    clearTimeout(rt);
    rt = setTimeout(()=>{
      measure();
      pool.forEach(n=>n.remove()); pool.clear();
      render();
    }, 140);
  });

  render();
  return {
    destroy(){
      if(raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      layer.remove();
    }
  };
}
