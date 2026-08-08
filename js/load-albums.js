// js/load-albums.js — build tiles from album/albums.json and prefer thumb files when available
window.buildAlbumTiles = async function buildAlbumTiles(){
  'use strict';

  const gallery = document.querySelector('.gallery');
  if(!gallery) return;
  gallery.innerHTML = '';

  window.__albumCache = window.__albumCache || new Map();

  // helper: test if a URL exists using HEAD
  async function exists(url){
    try{
      const r = await fetch(url, { method: 'HEAD' });
      return r && r.ok;
    }catch(e){
      return false;
    }
  }

  try{
    const listRes = await fetch('/album/albums.json');
    if(!listRes.ok){ console.error('Failed to fetch albums.json', listRes.status); return; }
    const list = await listRes.json();
    const parser = new DOMParser();

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

    for(const item of list){
      const href = typeof item === 'string' ? item : (item && item.href) || '';
      if(!href) continue;
      const albumName = href.replace(/\/+$/,'').split('/').pop();

      // choose a thumbnail by checking several candidate filenames
      let thumb = '/albums/cover.jpg';

      // 1) if we have cached HTML for the album, use its first image
      if(window.__albumCache.has(href)){
        try{
          const t = window.__albumCache.get(href);
          const d = parser.parseFromString(t, 'text/html');
          const firstImg = d.querySelector('.album-gallery img');
          if(firstImg) thumb = new URL(firstImg.getAttribute('src'), href).href;
        }catch(e){ /* ignore */ }
      } else {
        // 2) try a list of candidate thumb filenames (HEAD requests)
        const candidates = [
          `${href}${albumName}_thumb.jpg`,
          `${href}${albumName}-thumb.jpg`,
          `${href}thumb.jpg`,
          `${href}cover.jpg`,
          `${href}index_thumb.jpg`,
          `${href}index.jpg`,
          `albums/${albumName}_cover.jpg`,
          `albums/${albumName}_thumb.jpg`
        ];

        let found = false;
        for(const c of candidates){
          if(await exists(c)){
            thumb = c;
            found = true;
            break;
          }
        }

        // 3) if nothing found, attempt to fetch the album HTML quickly and parse first image
        if(!found){
          try{
            const r = await fetch(href);
            if(r.ok){
              const t = await r.text();
              window.__albumCache.set(href, t);
              const d = parser.parseFromString(t, 'text/html');
              const firstImg = d.querySelector('.album-gallery img');
              if(firstImg) thumb = new URL(firstImg.getAttribute('src'), href).href;
            }
          }catch(e){ /* ignore */ }
        }
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
        hoverTimer = setTimeout(() => prefetch(href), 120);
      });
      tile.addEventListener('mouseleave', () => { if(hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; } });
      tile.addEventListener('focus', () => { prefetch(href); });
    }

    // delegated prefetch (capture) — more reliable when tiles are reflowed
    document.addEventListener('pointerenter', function(ev){
      const t = ev.target.closest && ev.target.closest('.tile');
      if(!t) return;
      const href = t.getAttribute('href');
      setTimeout(()=>{ if(t.matches(':hover')) prefetch(href); }, 120);
    }, true);

  }catch(e){ console.error('Failed to build album tiles', e); }
};

// run initially
if(typeof window.buildAlbumTiles === 'function') window.buildAlbumTiles();
