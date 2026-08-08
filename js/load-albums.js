// Dynamic homepage album loader
// Fetches /album/index.html, extracts album links, then for each album
// fetches album/index.html to find the first image and builds gallery tiles.

(async function(){
  'use strict';

  const gallery = document.querySelector('.gallery');
  if(!gallery) return;

  try{
    const res = await fetch('/album/index.html');
    if(!res.ok) return;
    const txt = await res.text();

    // Parse album links from overview
    const parser = new DOMParser();
    const doc = parser.parseFromString(txt, 'text/html');
    const links = Array.from(doc.querySelectorAll('a')).filter(a=>/\/album\/[0-9]+\//.test(a.getAttribute('href')));

    // For each album (already sorted by overview), fetch album index and find first image
    for(const a of links){
      const href = a.getAttribute('href');
      const albumName = href.replace(/\/+$/,'').split('/').pop();
      let thumb = '/albums/cover.jpg'; // fallback
      try{
        const r2 = await fetch(href);
        if(r2.ok){
          const t2 = await r2.text();
          const d2 = parser.parseFromString(t2,'text/html');
          const img = d2.querySelector('.album-gallery img');
          if(img) thumb = new URL(img.getAttribute('src'), href).href;
        }
      }catch(e){ /* ignore */ }

      // Build tile
      const tile = document.createElement('a');
      tile.className = 'tile';
      tile.href = href;
      tile.setAttribute('data-title', `Album ${albumName}`);
      tile.setAttribute('aria-label', `Album: ${albumName}`);

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
    }
  }catch(e){ console.error('Failed to load album overview', e); }
})();
