#!/bin/sh
# shot227.sh <name> [extra --e: args]  — set 226 current pick (look G + P1 plaza + round shadow), then extras
SP=$(cygpath -u 'C:\Users\nuttr\AppData\Local\Temp\claude\6778d44212994c0a\e44da554-341a-472f-839e-ef20a29a07a0\scratchpad')
GD=/c/Users/nuttr/Downloads/Godot_v4.7.2-stable_win64.exe/Godot_v4.7.2-stable_win64_console.exe
N=$1; shift
rm -rf $SP/out/$N
timeout 300 $GD --rendering-driver opengl3 --audio-driver Dummy --path "$(cygpath -w $SP/g)" --resolution 1920x1080 -s res://tests/s226.gd -- --out "$(cygpath -w $SP/out/$N)" --look G --e:fog=#7fa6a2 --e:fogd=0.35 --e:ground=0.82,0.9,1.0 --e:hills=0.42,0.62,0.58 --e:teal=0.22 --e:tufts=220 --e:tw0=0.6 --e:tw1=1.1 --e:sky=0.46,0.55,0.60 --e:plaza=0.48,0.45,0.37 --e:ray=0.3 --e:vig=0.75 --e:fgy=0.70 --e:fgtint=0.30,0.36,0.27 --e:fb=0.76 --e:lod=2.6 --e:r1x=-15 --e:r2x=-10.5 --e:pzy=0.8 --e:lift=0.3 --e:pzn=2 --e:sunel=32 --e:sunaz=-55 --e:blob=1.3 --e:blobd=2.6 --e:bloba=1 --e:blobc=#000000 --e:bloby=0.06 --e:blobz=0.2 "$@" 2>&1 | grep -iE "S225|SCRIPT ERROR|Parse Error|at:" | head
ls $SP/out/$N
