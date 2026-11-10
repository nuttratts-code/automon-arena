#!/bin/sh
# Wrap the built game.html like the publish step does (doctype + phone viewport meta).
# Without it a mobile browser lays the page out at 980 px and every phone check is wrong (set 179).
# usage: sh wrap.sh <src/game.html> <out.html>
{ printf '<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n'; cat "$1"; printf '</body></html>'; } > "$2"
