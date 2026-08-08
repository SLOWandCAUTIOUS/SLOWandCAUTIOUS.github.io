// Fetch album overview, build tiles, add prefetch on hover
(async function(){
  'use strict';

  const gallery = document.querySelector('.gallery');
  if(!gallery) return;

  // simple in-memory cache for prefetched album HTML
  window.__albumCache = window.__albumCache || new Map();

  try{
    const res = await fetch('/album/index.html');
    if(!res.ok) return;
    const txt = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(txt, 'text/html');
    const links = Array.from(doc.querySelectorAll('a')).filter(a=>/\/album\/[0-9]+\//.test(a.getAttribute('href')));

    // helper to prefetch and cache
    const prefetch = async (href) => {
      if(window.__albumCache.has(href)) return;
      try{
        const r = await fetch(href);
        if(r.ok){
          const t = await r.text();
          window.__albumCache.set(href, t);
        }
      }catch(e){ /* ignore */ }
    };

    for(const a of links){
      const href = a.getAttribute('href');
      const albumName = href.replace(/\/+$/,'').split('/').pop();
      let thumb = '/albums/cover.jpg';

      // if we already prefetched, try to find first img
      if(window.__albumCache.has(href)){
        const t2 = window.__albumCache.get(href);
        const d2 = parser.parseFromString(t2,'text/html');
        const img = d2.querySelector('.album-gallery img');
        if(img) thumb = new URL(img.getAttribute('src'), href).href;
      } else {
        // attempt quick HEAD for a common thumb name inside album
        const candidateThumbs = [
          `${href}*/_thumb`,
        ];
      }

      const tile = document.createElement('a');
      tile.className = 'tile';
      tile.href = href;
      tile.setAttribute('data-title', `Album ${albumName}`);
      tile.setAttribute('aria-label', `Album: ${albumName}`);
      tile.tabIndex = 0;

      const pic = document.createElement('picture');
      const source = document.createElement('source');
      source.srcset = thumb;
      source.type = 'image/jpeg';
      const img = document.createElement('img');
      img.src = thumb;
      img.alt = `Thumbnail album ${albumName}`;
      img.loading = 'lazy';
      pic.appendChild(source); pic.appendChild(img);

      const overlay = document.createElement('div'); overlay.className = 'overlay';
      const meta = document.createElement('div'); meta.className = 'meta'; meta.innerHTML = `${albumName}<br><small>Album</small>`;
      overlay.appendChild(meta);

      tile.appendChild(pic); tile.appendChild(overlay);
      gallery.appendChild(tile);

      // prefetch on hover
      let hoverTimer = null;
      tile.addEventListener('mouseenter', () => {
        // small delay so we don't prefetch on accidental hovers
        hoverTimer = setTimeout(() => prefetch(href), 120);
      });
      tile.addEventListener('mouseleave', () => { if(hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; } });

      // also prefetch on focus (keyboard)
      tile.addEventListener('focus', () => { prefetch(href); });

      // if we have cache already, update tile image to the cached first image
      if(window.__albumCache.has(href)){
        try{
          const t2 = window.__albumCache.get(href);
          const d2 = parser.parseFromString(t2,'text/html');
          const img2 = d2.querySelector('.album-gallery img');
          if(img2){
            const thumbUrl = new URL(img2.getAttribute('src'), href).href;
            source.srcset = thumbUrl;
            img.src = thumbUrl;
          }
        }catch(e){ /* ignore */ }
      }
    }
  }catch(e){ console.error('Failed to load album overview', e); }
})();
