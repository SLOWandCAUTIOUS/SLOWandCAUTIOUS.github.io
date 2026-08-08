// UI init + dynamic album navigation + lightbox
(function(){
  'use strict';

  const lb = document.getElementById('lightbox');
  const lbImg = lb?.querySelector('.lightbox-img');
  const caption = lb?.querySelector('.caption');
  const closeBtn = lb?.querySelector('.close');
  const prevBtn = lb?.querySelector('.prev');
  const nextBtn = lb?.querySelector('.next');
  const backToTopBtn = document.getElementById('back-to-top');
  const skipBtn = document.getElementById('skip-hero');
  const mainEl = document.getElementById('main');

  let originalMainHTML = mainEl ? mainEl.innerHTML : '';
  let currentClickables = [];
  let currentIndex = -1;

  function updateClickables(){
    currentClickables = Array.from(document.querySelectorAll('.gallery .tile, .album-gallery .photo a'));
  }

  function openLightboxFromAnchor(a){
    updateClickables();
    currentIndex = currentClickables.indexOf(a);
    if(currentIndex === -1) currentIndex = 0;
    openByIndex(currentIndex);
  }

  function openByIndex(i){
    const a = currentClickables[i];
    if(!a) return;
    lbImg.src = a.href;
    caption.textContent = a.dataset.title || a.querySelector('img')?.alt || '';
    lb.classList.add('show');
    lb.setAttribute('aria-hidden','false');
    closeBtn?.focus();
    currentIndex = i;
  }
  function closeLightbox(){ lb.classList.remove('show'); lb.setAttribute('aria-hidden','true'); currentIndex = -1; lbImg.src = ''; }
  function nextLightbox(){ if(currentIndex < currentClickables.length -1) openByIndex(currentIndex+1); }
  function prevLightbox(){ if(currentIndex > 0) openByIndex(currentIndex-1); }

  // Back-to-top visibility
  function updateBack(){ if(window.scrollY > 400) backToTopBtn?.classList.add('show'); else backToTopBtn?.classList.remove('show'); }

  // Replace relative image/srcset paths inside a container to absolute based on baseUrl
  function absolutizePaths(container, baseUrl){
    const imgs = container.querySelectorAll('img');
    imgs.forEach(img => {
      const s = img.getAttribute('src');
      if(s && !/^https?:|^\/\//.test(s) && !s.startsWith('/')){
        img.src = new URL(s, baseUrl).href;
      }
    });
    const sources = container.querySelectorAll('source');
    sources.forEach(src => {
      const ss = src.getAttribute('srcset');
      if(ss && !/^https?:|^\/\//.test(ss) && !ss.startsWith('/')){
        src.srcset = new URL(ss, baseUrl).href;
      }
    });
    // Also adjust anchors inside album main so hrefs remain correct
    const anchors = container.querySelectorAll('a');
    anchors.forEach(a => {
      const h = a.getAttribute('href');
      if(h && !/^https?:|^\/\//.test(h) && !h.startsWith('/')){
        a.href = new URL(h, baseUrl).href;
      }
    });
  }

  async function loadAlbumInMain(href, push=true){
    try{
      const res = await fetch(href);
      if(!res.ok) {
        console.error('Failed to fetch album', href, res.status);
        return;
      }
      const txt = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(txt, 'text/html');
      const fetchedMain = doc.querySelector('main');
      if(!fetchedMain){
        console.error('No <main> in fetched album', href);
        return;
      }
      // Make absolute paths so images load correctly when injected
      absolutizePaths(fetchedMain, res.url);

      // Use animated replacement if available
      if(typeof replaceMainWith === 'function'){
        replaceMainWith(fetchedMain.innerHTML);
      } else {
        if(mainEl) mainEl.innerHTML = fetchedMain.innerHTML;
      }

      // Update document title
      const newTitle = doc.querySelector('title')?.textContent || document.title;
      document.title = newTitle;

      // Ensure UI bindings that depend on DOM are updated
      updateClickables();

      // push history
      if(push){
        history.pushState({albumUrl: href}, '', href);
      } else {
        history.replaceState({albumUrl: href}, '', href);
      }

      // Scroll to top of main
      mainEl?.scrollIntoView({behavior:'smooth'});

    }catch(e){ console.error('loadAlbumInMain error', e); }
  }

  // Restore home/main content
  function restoreHome(){
    if(mainEl) mainEl.innerHTML = originalMainHTML;
    document.title = 'Slow & Cautious — Portfolio';
    updateClickables();
  }

  // Animated replacement helper (fade + slide)
  function replaceMainWith(nodeHtml){
    const main = document.getElementById('main');
    if(!main) return;

    main.classList.add('main-transition-exit');
    // force reflow
    void main.offsetWidth;
    main.classList.add('main-transition-active');

    setTimeout(() => {
      main.classList.remove('main-transition-exit', 'main-transition-active');
      main.innerHTML = nodeHtml;

      // enter
      main.classList.add('main-transition-enter');
      void main.offsetWidth;
      main.classList.add('main-transition-active');

      setTimeout(() => {
        main.classList.remove('main-transition-enter', 'main-transition-active');
      }, 360);
    }, 180);
  }

  // Global click delegation
  document.addEventListener('click', function(e){
    const a = e.target.closest('a');
    if(!a) return;

    // don't intercept if default already prevented
    if(e.defaultPrevented) return;
    // only handle left clicks (button === 0); some browsers set e.button undefined for keyboard activations
    if(typeof e.button === 'number' && e.button !== 0) return;
    // respect modifier keys (open in new tab / special behavior)
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // respect target
    if(a.target && a.target === '_blank') return;

    const hrefAttr = a.getAttribute('href') || '';
    let resolvedPath = hrefAttr;
    try { resolvedPath = new URL(hrefAttr, location.href).pathname; } catch(_){ /* leave as-is */ }

    // Match both /album/NN/ and /albums/NN/ variants
    const isAlbumLink = /^\/albums?\/[0-9]+\/?$/.test(resolvedPath);

    // If it's a gallery tile (startsida) and album link, load in-place
    if(isAlbumLink && a.matches('.gallery .tile')){
      e.preventDefault();
      // use hrefAttr (allows relative) when fetching
      loadAlbumInMain(hrefAttr);
      return;
    }

    // Some generated tiles might live directly under .gallery without the exact class on the anchor
    if(isAlbumLink && a.closest('.gallery')){
      e.preventDefault();
      loadAlbumInMain(hrefAttr);
      return;
    }

    // If it's an album photo, open lightbox
    if(a.matches('.album-gallery .photo a')){
      e.preventDefault();
      openLightboxFromAnchor(a);
      return;
    }

    // Otherwise allow default navigation
  }, false);

  // Keyboard & lightbox button bindings
  document.addEventListener('keydown', function(e){
    if(lb?.classList.contains('show')){
      if(e.key === 'Escape') closeLightbox();
      if(e.key === 'ArrowRight') nextLightbox();
      if(e.key === 'ArrowLeft') prevLightbox();
    }
  });

  closeBtn?.addEventListener('click', closeLightbox);
  nextBtn?.addEventListener('click', nextLightbox);
  prevBtn?.addEventListener('click', prevLightbox);

  // Make images/tiles focusable by keyboard
  document.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      const el = document.activeElement;
      if(el && (el.matches('.gallery .tile') || el.matches('.album-gallery .photo a'))){
        el.click();
      }
    }
  });

  // Skip hero
  if(skipBtn) skipBtn.addEventListener('click', ()=>{ mainEl?.scrollIntoView({behavior:'smooth'}); });

  // Back to top
  window.addEventListener('scroll', updateBack); updateBack();
  backToTopBtn?.addEventListener('click', ()=> window.scrollTo({top:0,behavior:'smooth'}));

  // Handle popstate
  window.addEventListener('popstate', function(e){
    const state = e.state;
    if(state && state.albumUrl){
      // load album but do not push new history
      loadAlbumInMain(state.albumUrl, false);
    } else {
      // state null -> restore home
      restoreHome();
      history.replaceState(null, '', '/');
    }
  });

  // Init clickables on load
  updateClickables();
})();
