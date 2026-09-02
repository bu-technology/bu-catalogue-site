/* Injects a single detail overlay into the page and exposes buOpenDrink(). */
(function(){
  let el = null;

  function ensure(){
    if(el) return el;
    el = document.createElement('div');
    el.id = 'buDetail';
    el.innerHTML =
      '<button class="bu-detail-close" aria-label="Close">&#10005;</button>' +
      '<div class="bu-detail-inner">' +
        '<div class="bu-detail-media"><img id="buDetailImg" alt=""></div>' +
        '<div class="bu-detail-body">' +
          '<p class="kicker" id="buDetailKicker"></p>' +
          '<h2 id="buDetailName"></h2>' +
          '<p class="desc" id="buDetailDesc"></p>' +
          '<div class="bu-detail-tags" id="buDetailTags"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('.bu-detail-close').addEventListener('click', buCloseDrink);
    el.addEventListener('click', e=>{ if(e.target === el) buCloseDrink(); });
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape') buCloseDrink(); });
    return el;
  }

  window.buOpenDrink = function(d){
    const node = ensure();
    document.getElementById('buDetailImg').src = d.image_url;
    document.getElementById('buDetailImg').alt = d.name;
    document.getElementById('buDetailName').textContent = d.name;
    document.getElementById('buDetailDesc').textContent = d.description || '';
    const kick = (d.categories||[]).concat(d.type ? [d.type] : []).filter(Boolean).join(' \u00b7 ');
    document.getElementById('buDetailKicker').textContent = kick;
    const tags = document.getElementById('buDetailTags');
    tags.innerHTML = '';
    (d.tasting_notes||[]).forEach(t=>{
      const s = document.createElement('span'); s.className = 'bu-tag'; s.textContent = t;
      tags.appendChild(s);
    });
    node.style.display = 'block';
    // force reflow so the opacity transition runs
    void node.offsetWidth;
    node.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.buCloseDrink = function(){
    if(!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(()=>{ if(!el.classList.contains('open')) el.style.display = 'none'; }, 360);
  };
})();
