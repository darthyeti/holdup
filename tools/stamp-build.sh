#!/bin/sh
# Versionierung beim Veröffentlichen: setzt in index.html die Build-Nummer und das Datum und hängt dieselbe Nummer
# an alle Skript-Tags js/*.js?v=N (gegen alte Caches). Läuft im Workflow .github/workflows/pages.yml auf der
# Kopie, die auf GitHub Pages geht, nie als Commit. Damit kollidieren parallele Branches nicht mehr an der Build-Zeile.
# Aufruf: tools/stamp-build.sh <Ordner> <Nummer> [Datum JJJJ-MM-TT]
set -eu
dir=$1
n=$2
d=${3:-$(date +%F)}
f="$dir/index.html"
perl -pi -e "s/^const BUILD=\{n:\d+,d:'[\d-]+'\};\/\/BUILD/const BUILD={n:$n,d:'$d'};\/\/BUILD/; s/(js\/[\w-]+\.js)\?v=\d+/\$1?v=$n/g" "$f"
grep -q "^const BUILD={n:$n,d:'$d'};//BUILD" "$f" || { echo "Build-Zeile nicht gefunden" >&2; exit 1; }
echo "Build $n vom $d gesetzt"
