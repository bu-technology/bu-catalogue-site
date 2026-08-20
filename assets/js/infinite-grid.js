/* ---------------------------------------------------------------
   Infinite 2D draggable grid.

   Only the cells visible in the viewport are rendered as DOM nodes;
   as you drag, cells that scroll out are recycled. The item shown in
   any cell is chosen by (col,row) modulo the item list, so the plane
   repeats forever in both axes.
   --------------------------------------------------------------- */
function buInfiniteGrid(opts){
  const viewport = opts.viewport;
  const items    = opts.items || [];
  const onOpen   = opts.onOpen || function(){};
  if(items.length === 0) return null;

  const layer = document.createElement('div');
  layer.className = 'ig-layer';
  viewport.appendChild(layer);

  let cellW = 0, cellH = 0, gap = 0;
  function measure(){
    const w = viewport.clientWidth;
    const size = w < 560 ? 132 : (w < 900 ? 158 : 186);
    gap   = w < 560 ? 14 : 22;
    cellW = size + gap;
    cellH = size + gap + 34; // room for the label
  }
  measure();

  let ox = 0, oy = 0;                 // world offset in px
  let vx = 0, vy = 0;                 // velocity px/ms
  let dragging = false, moved = false;
  let lastX = 0, lastY = 0, lastT = 0;
  const FRICTION = 0.93;

  const pool = new Map();             // "col,row" -> element

  function itemFor(col, row){
    // 2D hash into the item list so neighbours differ
    let i = (col * 31 + row * 17) % items.length;
    if(i < 0) i += items.length;
    return items[i];
  }

  function build(cellKey, col, row){
    const d = itemFor(col, row);
    const node = document.createElement('div');
    node.className = 'ig-cell';
    node.style.width = (cellW - gap) + 'px';
    node.innerHTML =
      '<div class="ig-frame"><img loading="lazy" draggable="false"></div>' +
      '<p class="ig-name"></p>';
    const img = node.querySelector('img');
    img.src = d.image_url; img.alt = d.name;
    node.querySelector('.ig-name').textContent = d.name;
    node.addEventListener('click', ()=>{ if(!moved) onOpen(d); });
    layer.appendChild(node);
    pool.set(cellKey, node);
    return node;
  }

  function render(){
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const startCol = Math.floor(-ox / cellW) - 1;
    const endCol   = Math.floor((-ox + vw) / cellW) + 1;
    const startRow = Math.floor(-oy / cellH) - 1;
    const endRow   = Math.floor((-oy + vh) / cellH) + 1;

    const needed = new Set();
    for(let row=startRow; row<=endRow; row++){
      for(let col=startCol; col<=endCol; col++){
        const key = col + ',' + row;
        needed.add(key);
        let node = pool.get(key);
        if(!node) node = build(key, col, row);
        const x = col*cellW + ox;
        const y = row*cellH + oy;
        node.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      }
    }
    pool.forEach((node, key)=>{
      if(!needed.has(key)){ node.remove(); pool.delete(key); }
    });
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

  viewport.addEventListener('pointerdown', e=>{
    dragging = true; moved = false;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    vx = vy = 0;
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('grabbing');
  });
  viewport.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if(Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
    ox += dx; oy += dy;
    const now = performance.now(), dt = now - lastT;
    if(dt > 0){
      vx = vx*0.65 + (dx/dt)*0.35;
      vy = vy*0.65 + (dy/dt)*0.35;
    }
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    render();
  });
  function release(){
    if(!dragging) return;
    dragging = false;
    viewport.classList.remove('grabbing');
    if(performance.now() - lastT > 90){ vx = vy = 0; }
    const cap = 3.2;
    vx = Math.max(-cap, Math.min(cap, vx));
    vy = Math.max(-cap, Math.min(cap, vy));
    setTimeout(()=>{ moved = false; }, 40);
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);

  viewport.addEventListener('wheel', e=>{
    e.preventDefault();
    ox -= e.deltaX; oy -= e.deltaY;
    vx = vy = 0;
    render();
  }, { passive:false });

  window.addEventListener('resize', ()=>{
    measure();
    pool.forEach(n=>n.remove()); pool.clear();
    render();
  });

  render();
  return { destroy(){ if(raf) cancelAnimationFrame(raf); layer.remove(); } };
}
