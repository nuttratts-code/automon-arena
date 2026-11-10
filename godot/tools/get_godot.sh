#!/usr/bin/env bash
# Download the pinned Godot editor binary (Linux x86_64) from the OFFICIAL source only
# (github.com/godotengine/godot releases) and check its SHA-512 against the value pinned
# HERE (not a downloaded sums file). HARD RULE 9 ②. Set 192.
#   godot/tools/get_godot.sh <dest-dir> [templates]
# Prints the binary path. 'templates' also fetches + checks the export templates (~1 GB download,
# keeps only the web ones; local only, not in CI).
set -euo pipefail
VER=4.7.2-stable
BASE=https://github.com/godotengine/godot/releases/download/$VER
ZIP=Godot_v${VER}_linux.x86_64.zip
ZIP_SHA512=9aa00f7a605200940bce3027a567b782f49bd8e940dd06ae9e987bd65aee1b1467edd56ed84fcdcbdd44354bf613bdbb4e5d2913e925850368e150c59ed54c65
TPZ=Godot_v${VER}_export_templates.tpz
TPZ_SHA512=ca4d71c4d7b81dfc15d1a98baa07534aa95b03fdda78a0075b06672e1648d2e5f40980c9adc28d23e1b92e732ee7bf3461997aa804af74ec2fcd7a93ccb84079
DEST=${1:?usage: get_godot.sh <dest-dir> [templates]}
mkdir -p "$DEST"
BIN="$DEST/Godot_v${VER}_linux.x86_64"
if [ ! -x "$BIN" ]; then
  curl -fsSL -o "$DEST/$ZIP" "$BASE/$ZIP"
  echo "$ZIP_SHA512  $DEST/$ZIP" | sha512sum -c --quiet - >&2
  unzip -oq "$DEST/$ZIP" -d "$DEST"
  rm -f "$DEST/$ZIP"
fi
if [ "${2:-}" = templates ]; then
  TDIR="$HOME/.local/share/godot/export_templates/${VER/-/.}"
  if [ ! -f "$TDIR/web_nothreads_release.zip" ]; then
    curl -fsSL -o "$DEST/$TPZ" "$BASE/$TPZ"
    echo "$TPZ_SHA512  $DEST/$TPZ" | sha512sum -c --quiet - >&2
    mkdir -p "$TDIR"
    unzip -oqj "$DEST/$TPZ" "templates/web_*" "templates/version.txt" -d "$TDIR"  # web only (P1 size check)
    rm -f "$DEST/$TPZ"
  fi
fi
echo "$BIN"
