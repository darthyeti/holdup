#!/bin/sh
# Stellt die Seite für GitHub Pages zusammen: main im Wurzelordner, dazu je offenem PR mit Label "spielgefuehl"
# eine Vorschau unter pr/<n>/. Läuft im Workflow .github/workflows/pages.yml. Der Code der PRs wird nur kopiert
# (git archive), nie ausgeführt; gestempelt wird mit tools/stamp-build.sh aus dem Checkout von main.
# Aufruf: tools/pages-site.sh <Ordner> [PR-Nummer ...]
# Je PR muss vorher die Ref refs/remotes/origin/pr/<n> geholt sein (git fetch origin pull/<n>/head:refs/remotes/origin/pr/<n>).
set -eu
out=$1
shift
d=$(TZ=Europe/Berlin date +%F)
here=$(dirname "$0")
mkdir -p "$out"
cp -r index.html assets js "$out/"
sh "$here/stamp-build.sh" "$out" "$(git rev-list --count HEAD)" "$d"
for n in "$@"; do
  ref="refs/remotes/origin/pr/$n"
  dir="$out/pr/$n"
  mkdir -p "$dir"
  git archive "$ref" index.html assets js | tar -x -C "$dir"
  sh "$here/stamp-build.sh" "$dir" "$(git rev-list --count "$ref")" "$d"
  perl -pi -e "s{<title>Holdup</title>}{<title>Holdup Vorschau #$n</title>}" "$dir/index.html"
  echo "Vorschau PR $n unter pr/$n/"
done
