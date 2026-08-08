#!/usr/bin/env bash
set -euo pipefail

# generate_album_indexes.sh
# Usage: ./scripts/generate_album_indexes.sh
# Scans the ./album/* directories and generates a static index.html for each album
# and regenerates the album overview at ./album/index.html.
# If thumbnails exist (name_thumb.ext or name-thumb.ext), the generated album pages
# will use the thumbnail as the <img src=> and keep the <a href=> pointing to full image.
# Optionally, if ImageMagick is installed and you pass --make-thumbs, the script will
# generate thumbnails for images and name them with _thumb before the extension.

ROOT_DIR="$(pwd)"
ALBUMS_DIR="album"
OUT_OVERVIEW="$ALBUMS_DIR/index.html"
MAKE_THUMBS=false
THUMB_MAX_WIDTH=1200

if [ "${1:-}" = "--make-thumbs" ]; then
  MAKE_THUMBS=true
  echo "Will attempt to generate thumbnails (ImageMagick required)."
fi

# Helper: create an album index from files in the directory
generate_album() {
  dir="$1"
  name="$(basename "$dir")"
  out="$dir/index.html"

  echo "Generating $out"

  cat > "$out" <<EOF
<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Album $name</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <main class="wrap">
    <h1>Album $name</h1>
    <section class="album-gallery" aria-label="Album $name bilder">
EOF

  # Find images (sorted by name). Adjust extensions if needed.
  shopt -s nullglob
  for img in "$dir"/*.{jpg,jpeg,png,webp,gif,svg}; do
    [ -f "$img" ] || continue
    imgname="$(basename "$img")"
    ext="${imgname##*.}"
    base="${imgname%.*}"

    # Candidate thumb names
    thumb1="$dir/${base}_thumb.$ext"
    thumb2="$dir/${base}-thumb.$ext"

    # Optionally create thumbnail if requested and ImageMagick is available
    if [ "$MAKE_THUMBS" = true ]; then
      if command -v magick >/dev/null 2>&1; then
        thumb1="$dir/${base}_thumb.$ext"
        if [ ! -f "$thumb1" ]; then
          echo "Creating thumbnail $thumb1"
          magick convert "$img" -resize ${THUMB_MAX_WIDTH}x -quality 80 "$thumb1"
        fi
      fi
    fi

    # Decide which thumbnail to use (if present)
    thumbsrc=""
    if [ -f "$thumb1" ]; then
      thumbsrc="${base}_thumb.$ext"
    elif [ -f "$thumb2" ]; then
      thumbsrc="${base}-thumb.$ext"
    fi

    # If thumb exists use it as <img src> but keep <a href> pointing to full image
    if [ -n "$thumbsrc" ]; then
      cat >> "$out" <<EOF
      <div class="photo">
        <a href="./$imgname" data-title="$imgname"><picture>
          <source srcset="./$thumbsrc" type="image/$ext">
          <img src="./$thumbsrc" alt="$imgname" loading="lazy">
        </picture></a>
      </div>
EOF
    else
      cat >> "$out" <<EOF
      <div class="photo">
        <a href="./$imgname" data-title="$imgname"><picture>
          <source srcset="./$imgname" type="image/$ext">
          <img src="./$imgname" alt="$imgname" loading="lazy">
        </picture></a>
      </div>
EOF
    fi
  done
  shopt -u nullglob

  cat >> "$out" <<'EOF'
    </section>
    <p><a href="/album/">← Tillbaka till albumöversikten</a></p>
  </main>
</body>
</html>
EOF
}

# Regenerate overview listing, newest (highest number) first
generate_overview() {
  echo "Generating overview $OUT_OVERVIEW"
  cat > "$OUT_OVERVIEW" <<'EOF'
<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Album — Översikt</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <main class="wrap">
    <h1>Album</h1>
    <p>Nyast först — skapa ett nytt album genom att skapa en mapp med högre nummer än befintliga.</p>
    <ul>
EOF

  # Find numeric album directories and sort descending
  dirs=("$ALBUMS_DIR"/*)
  nums=()
  for d in "${dirs[@]}"; do
    [ -d "$d" ] || continue
    base="$(basename "$d")"
    if [[ "$base" =~ ^[0-9]+$ ]]; then
      nums+=("$base")
    fi
  done

  if [ ${#nums[@]} -eq 0 ]; then
    cat >> "$OUT_OVERVIEW" <<'EOF'
      <li>Inga album funna</li>
EOF
  else
    # sort numeric descending
    IFS=$'\n' sorted_nums=($(printf "%s\n" "${nums[@]}" | sort -rn))
    for n in "${sorted_nums[@]}"; do
      # Use a thumbnail if present in album dir (first image or cover)
      thumb="/albums/cover.jpg"
      # try to find a thumb file inside the album
      if [ -d "$ALBUMS_DIR/$n" ]; then
        # find first thumb-like file
        found=""
        for t in "$ALBUMS_DIR/$n"/*_thumb.* "$ALBUMS_DIR/$n"/*-thumb.*; do
          if [ -f "$t" ]; then
            fn="$(basename "$t")"
            found="$fn"
            break
          fi
        done
        if [ -n "$found" ]; then
          thumb="/album/$n/$found"
        else
          # fallback to first image in folder
          for i in "$ALBUMS_DIR/$n"/*.{jpg,jpeg,png,webp,gif,svg}; do
            if [ -f "$i" ]; then fn="$(basename "$i")"; thumb="/album/$n/$fn"; break; fi
          done
        fi
      fi

      cat >> "$OUT_OVERVIEW" <<EOF
      <li><a href="/album/$n/">$n</a></li>
EOF
    done
  fi

  cat >> "$OUT_OVERVIEW" <<'EOF'
    </ul>
    <p><a href="/">← Tillbaka till startsidan</a></p>
  </main>
</body>
</html>
EOF
}

# Main
if [ ! -d "$ALBUMS_DIR" ]; then
  echo "Directory $ALBUMS_DIR does not exist. Create it first." >&2
  exit 1
fi

# Generate each numeric album
for d in "$ALBUMS_DIR"/*; do
  [ -d "$d" ] || continue
  base="$(basename "$d")"
  if [[ "$base" =~ ^[0-9]+$ ]]; then
    generate_album "$d"
  fi
done

# Generate overview
generate_overview

echo "Done. Commit the generated index.html files and push to your repo."