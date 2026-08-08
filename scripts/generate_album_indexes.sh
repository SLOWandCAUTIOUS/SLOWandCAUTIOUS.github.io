#!/usr/bin/env bash
set -euo pipefail

# generate_album_indexes.sh
# Usage: ./scripts/generate_album_indexes.sh
# Scans the ./album/* directories and generates a static index.html for each album
# and regenerates the album overview at ./album/index.html.

ROOT_DIR="$(pwd)"
ALBUMS_DIR="album"
OUT_OVERVIEW="$ALBUMS_DIR/index.html"

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
    # Determine mime type for source tag (basic guess)
    case "${imgname,,}" in
      *.svg) mimetype="image/svg+xml" ;;
      *.webp) mimetype="image/webp" ;;
      *.png) mimetype="image/png" ;;
      *.gif) mimetype="image/gif" ;;
      *) mimetype="image/jpeg" ;;
    esac

    cat >> "$out" <<EOF
      <div class="photo">
        <a href="./$imgname" data-title="$imgname"><picture>
          <source srcset="./$imgname" type="$mimetype">
          <img src="./$imgname" alt="$imgname" loading="lazy">
        </picture></a>
      </div>
EOF
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