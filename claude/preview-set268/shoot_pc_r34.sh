#!/bin/sh
# usage: sh shoot_pc_r34.sh <name> <deco 0-3> [fake12 0/1] [S268FIGHT override] [S268T0]
N=$1; D=$2; F=${3:-0}; FT=$4; T0=$5
sed -e "s#out/s268r33_closed#out/s268r34_$N#" -e "s#S268H=7#S268H=7 S268DECO=$D S268FAKE12=$F#" shoot_pc_r33_closed.sh > /tmp/s268r34_$N.sh
[ -n "$FT" ] && sed -i "s#S268FIGHT=[^ ]*#S268FIGHT=$FT#" /tmp/s268r34_$N.sh
[ -n "$T0" ] && sed -i "s#S268T0=[0-9]*#S268T0=$T0#" /tmp/s268r34_$N.sh
sh /tmp/s268r34_$N.sh
