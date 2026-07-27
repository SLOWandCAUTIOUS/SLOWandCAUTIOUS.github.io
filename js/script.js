// Lightbox + album behavior, plus Skip hero and Back-to-top
(() => {
  // Lightbox (supports gallery tiles and album photos)
  const tiles = Array.from(document.querySelectorAll('.gallery .tile'));
  const albumPhotos = Array.from(document.querySelectorAll('.album-gallery .photo a'));
  const clickables = tiles.concat(albumPhotos);

  const lb = document.getElementById('lightbox');
  const lbImg = lb?.querySelector('.lightbox-img');
  const caption = lb?.querySelector('.caption');
  const closeBtn = lb?.querySelector('.close');
  const prevBtn = lb?.querySelector('.prev');
  const nextBtn = lb?.querySelector('.next');

  let current = -1;
  function open(index){
    const a = clickables[index];
    if(!a) return;
    lbImg.src = a.href;
    caption.textContent = a.dataset.title || a.querySelector('img')?.alt || '';
    lb.classList.add('show');
    lb.setAttribute('aria-hidden','false');
    closeBtn?.focus();
    current = index;
  }
  function close(){ lb.classList.remove('show'); lb.setAttribute('aria-hidden','true'); current = -1; }
  function next(){ if(current<clickables.length-1) open(current+1); }
  function prev(){ if(current>0) open(current-1); }

  clickables.forEach((t,i)=> t.addEventListener('click', e => { if(t.closest('.tile')){/* allow navigation to album */ if(t.closest('.tile')){ /* if it's a tile on index page, we want default behavior to follow link to album */ }} e.preventDefault(); open(i); }));
  clickables.forEach(t => t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); t.click(); } }));

  closeBtn?.addEventListener('click', close);
  nextBtn?.addEventListener('click', next);
  prevBtn?.addEventListener('click', prev);
  lb?.addEventListener('click', e => { if (e.target === lb) close(); });

  document.addEventListener('keydown', e => {
    if (lb?.classList.contains('show')) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
  });

  // Skip hero button
  const skip = document.getElementById('skip-hero');
  if (skip) skip.addEventListener('click', () => {
    const main = document.getElementById('main');
    main?.scrollIntoView({behavior:'smooth'});
  });

  // Back to top
  const back = document.getElementById('back-to-top');
  function updateBack(){ if(window.scrollY > 400) back?.classList.add('show'); else back?.classList.remove('show'); }
  window.addEventListener('scroll', updateBack); updateBack();
  back?.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
})();
