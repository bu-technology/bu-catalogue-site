function buAccent(drink){
  return drink.bean === 'Romance' ? '#6B3B7A' : '#CC5500';
}

function initArcCarousel(opts){
  const container = opts.container;
  const drinks = opts.drinks;
  const onChange = opts.onChange || function(){};
  let current = 0;
  let dragging = false, startX = 0, dragOffset = 0, pointerId = null;

  container.innerHTML = '';
  const glow = document.createElement('div');
  glow.className = 'arc-glow';
  const stage = document.createElement('div');
  stage.className = 'arc-stage';
  container.appendChild(glow);
  container.appendChild(stage);

  function buildCards(){
    stage.innerHTML = '';
    drinks.forEach((d)=>{
      const card = document.createElement('div');
      card.className = 'arc-card';
      const img = document.createElement('img');
      img.src = d.image_url;
      img.alt = d.name;
      img.loading = 'lazy';
      card.appendChild(img);
      stage.appendChild(card);
    });
  }

  function layout(preview){
    const cards = stage.children;
    const n = drinks.length;
    for(let i=0;i<cards.length;i++){
      let off = i - current - (preview||0);
      if(off > n/2) off -= n;
      if(off < -n/2) off += n;
      const a = Math.abs(off);
      const tx = off * 190;
      const ty = a*a*16;
      const rot = off * 11;
      const scale = Math.max(0.5, 1 - a*0.19);
      const op = Math.max(0, 1 - a*0.32);
      const blur = Math.min(6, a*2.4);
      cards[i].style.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + rot + 'deg) scale(' + scale + ')';
      cards[i].style.opacity = op;
      cards[i].style.filter = 'blur(' + blur + 'px)';
      cards[i].style.zIndex = 500 - Math.round(a*10) - i;
    }
  }

  function announce(){
    const d = drinks[current];
    glow.style.setProperty('--glow-color', buAccent(d));
    onChange(d, current);
  }

  function goTo(i){
    const n = drinks.length;
    current = ((i % n) + n) % n;
    layout(0);
    announce();
  }

  container.addEventListener('pointerdown', e=>{
    dragging = true; startX = e.clientX; pointerId = e.pointerId;
    container.setPointerCapture(pointerId);
    container.classList.add('grabbing');
  });
  container.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const dx = e.clientX - startX;
    dragOffset = dx/190;
    layout(dragOffset);
  });
  function release(){
    if(!dragging) return;
    dragging = false;
    container.classList.remove('grabbing');
    const move = Math.round(dragOffset);
    if(move !== 0){ goTo(current - move); } else { layout(0); }
    dragOffset = 0;
  }
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', release);

  let wheelLocked = false;
  let wheelAccum = 0;
  container.addEventListener('wheel', e=>{
    e.preventDefault();
    if(wheelLocked) return;
    wheelAccum += e.deltaY !== 0 ? e.deltaY : e.deltaX;
    if(Math.abs(wheelAccum) > 40){
      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      wheelLocked = true;
      goTo(current + dir);
      setTimeout(()=>{ wheelLocked = false; }, 420);
    }
  }, { passive:false });

  document.addEventListener('keydown', e=>{
    if(!container.dataset.buActive) return;
    if(e.key === 'ArrowRight') goTo(current+1);
    if(e.key === 'ArrowLeft') goTo(current-1);
  });
  container.dataset.buActive = '1';

  function enter(){
    buildCards();
    const cards = stage.children;
    for(let i=0;i<cards.length;i++){
      cards[i].style.transition = 'none';
      cards[i].style.transform = 'translate(0px,320px) scale(0.62)';
      cards[i].style.opacity = '0';
    }
    requestAnimationFrame(()=>{
      setTimeout(()=>{
        for(let i=0;i<cards.length;i++){
          cards[i].style.transitionDelay = (i*60) + 'ms';
          cards[i].style.transition = 'transform 1s cubic-bezier(.32,1.6,.5,1), opacity .6s ease, filter .6s';
        }
        layout(0);
        announce();
        setTimeout(()=>{
          for(let i=0;i<cards.length;i++){
            cards[i].style.transitionDelay = '0ms';
            cards[i].style.transition = 'transform .6s cubic-bezier(.25,1.3,.4,1), opacity .4s ease, filter .4s';
          }
        }, 1000);
      }, 60);
    });
  }

  enter();

  return {
    goTo: goTo,
    next: ()=> goTo(current+1),
    prev: ()=> goTo(current-1),
    current: ()=> drinks[current]
  };
}
