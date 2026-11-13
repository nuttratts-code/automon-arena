#!/bin/sh
# set 217 R13 (sample copy only): one formation try on the copy <g> → shots in <out>.
#   sh r13-try.sh <g> <out> <pitch> <spr_h> <cols a,b,c> <lanes far,near> <far_shift> <plaza_k> <side px> <top px>
g=$1; out=$2
st=$g/scripts/ui/stage3d.gd
sed -i "s/^const PITCH := [0-9.]*/const PITCH := $3/; s/^const SPR_H := [0-9.]*/const SPR_H := $4/; s/^const COL_X := \[[^]]*\]/const COL_X := [$(echo $5 | sed 's/,/, /g')]/; s/^const LANE_Z := \[[^]]*\]/const LANE_Z := [$(echo $6 | sed 's/,/, /g')]/; s/^const FAR_SHIFT := [0-9.]*/const FAR_SHIFT := $7/" $st
sed -i "s/^const PLAZA_K := [0-9.]*/const PLAZA_K := $8/" $g/tools/s217_make_r6.gd
sed -i "s/br = bf.grow_individual([^)]*)/br = bf.grow_individual(-$9.0, -${10}.0, -$9.0, -4.0)/" $g/scripts/ui/app.gd
grep -E "^const (PITCH|SPR_H|COL_X|LANE_Z|FAR_SHIFT) " $st | tr '\n' ' '; echo
"$G" --headless --path $g -s res://tools/s217_make_r6.gd 2>&1 | grep -E "^save|SCRIPT ERROR"
rm -rf $out; mkdir -p $out
"$G" --rendering-driver opengl3 --audio-driver Dummy --path $g --resolution 844x390 -s res://tests/shots.gd -- --out $out --light 2>&1 | grep -E "MOVE CHECK|SCRIPT ERROR|CAMXF" | sort | uniq -c | sort -rn | head -3
