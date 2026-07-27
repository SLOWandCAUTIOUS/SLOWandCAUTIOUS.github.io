// Enkel lightbox för galleriet (oförändrad funktion, men med fokus-stöd)
(() => {
  const tiles = Array.from(document.querySelectorAll('.gallery .tile'));
  if (!tiles.length) return;

  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('.lightbox-img');
  const caption = lb.querySelector('.caption');
  const closeBtn = lb.querySelector('.close');
  const prevBtn = lb.querySelector('.prev');
  const nextBtn = lb.querySelector('.next');

  let current = -1;
  function open(index){
    const a = tiles[index];
    lbImg.src = a.href;
    caption.textContent = a.dataset.title || a.querySelector('img')?.alt || '';
    lb.classList.add('show');
    lb.setAttribute('aria-hidden','false');
    closeBtn.focus();
    current = index;
  }
  function close(){ lb.classList.remove('show'); lb.setAttribute('aria-hidden','true'); current = -1; }
  function next(){ if(current<tiles.length-1) open(current+1); }
  function prev(){ if(current>0) open(current-1); }

  tiles.forEach((t,i)=> t.addEventListener('click', e => { e.preventDefault(); open(i); }));
  tiles.forEach(t => t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); t.click(); } }));

  closeBtn.addEventListener('click', close);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  document.addEventListener('keydown', e => {
    if (lb.classList.contains('show')) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
  });
})();
