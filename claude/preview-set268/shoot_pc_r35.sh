#!/bin/sh
# usage: sh shoot_pc_r35.sh <name> [extra env, e.g. "S286PICK=1 S286FAKESTAT=1"]
N=$1; X=$2
sed -e "s#/g268)#/g286)#" -e "s#out/s268r33_closed#out/s286r35_$N#" -e "s#S268H=7#S268H=7 S268DECO=1 $X#" -e 's/ | grep.*$/ > "$SP\/out\/s286r35_'$N'.log" 2>\&1/' shoot_pc_r33_closed.sh > /tmp/s286r35_$N.sh
timeout 240 sh /tmp/s286r35_$N.sh
grep -E "SCRIPT ERROR|Parse Error|S286" $(dirname $0)/out/s286r35_$N.log | head -10
