#!/bin/sh
# R35d live window = r35c live (random teams each launch) with the crisp icons (patch s286r35d-patch.py already applied to g286)
sed -e 's#s286r35clive#s286r35dlive#g' "$(dirname $0)/live_r35c.sh" > /tmp/live_r35d.sh && sh /tmp/live_r35d.sh
