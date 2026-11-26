#!/bin/zsh
# export every card face from the decoded .ai files; args: out dir
O=$1; R(){ venv/bin/python -I tools/render.py "$@" >/dev/null; }
mkdir -p $O/event-cards $O/character-cards $O/tariff-waiver
# evil sheet: rows of 4, art face on top of text face
evil=(bankingPanic cyberAttack commodityCrash embargo sovereignDefault strike portBlockade insuranceFraud corruptionProbe debtSpiral sanctionThreat capitalControls)
good=(commodityBoom lendLease debtRestructure fastTrack productivitySurge surplusBudget tradeCorridor strategicReserve tariffTruce exportSubsidy alliedAid warBond)
ex=(1593.86 2038.11 2482.36 2926.60); ey=(-31.26 -668.13 -1305.00)   # art face top edge per row; text face is 225.34 lower
i=1; for r in 1 2 3; do for c in 1 2 3 4; do x=${ex[$c]}; y=${ey[$r]}
  R dec/evil.ai.txt $O/event-cards/${evil[$i]}-front.png 4 $x $((y-180)) $((x+252)) $y >/dev/null &
  R dec/evil.ai.txt $O/event-cards/${evil[$i]}-back.png 4 $x $((y-405.34)) $((x+252)) $((y-225.34)) >/dev/null &
  i=$((i+1)); done; wait; done
# good sheet is hand-placed, so each card has its own corner (x, top of art face, top of text face)
g=(1463.07,-25.55,-251.89 1875.93,-25.55,-251.89 2277.21,-25.55,-251.89 2658.08,-25.55,-251.89
   1454.32,-588.72,-815.06 1870.76,-588.72,-815.06 2283.60,-588.72,-815.06 2659.88,-588.72,-815.06
   1451.59,-1166.52,-1392.85 1876.32,-1144.25,-1370.59 2274.51,-1150.82,-1377.16 2660.51,-1144.36,-1370.70)
for i in {1..12}; do a=(${(s:,:)g[$i]}); x=$a[1]
  R dec/good.ai.txt $O/event-cards/${good[$i]}-front.png 4 $x $((a[2]-180)) $((x+252)) $a[2] >/dev/null &
  R dec/good.ai.txt $O/event-cards/${good[$i]}-back.png 4 $x $((a[3]-180)) $((x+252)) $a[3] >/dev/null &
  (( i % 4 == 0 )) && wait; done; wait
# character cards: portrait 180x252, art face left, text face right
cc=(usa china japan germany bangladesh uk); cx=(1566.81 2133.51 2700.21); bx=(1772.89 2339.59 2906.29)
i=1; for top in 124.34 -242.35; do for c in 1 2 3; do
  R dec/country.ai.txt $O/character-cards/${cc[$i]}-front.png 4 ${cx[$c]} $((top-252)) $((cx[$c]+180)) $top >/dev/null &
  R dec/country.ai.txt $O/character-cards/${cc[$i]}-back.png 4 ${bx[$c]} $((top-252.84)) $((bx[$c]+180)) $((top-0.84)) >/dev/null &
  i=$((i+1)); done; done; wait
# tariff waiver ticket, both sides, and the ticket icon alone
# (icon file first: slice.py dec/waiver.ai.txt dec/w_icon.ai.txt 33754:33982)
R dec/waiver.ai.txt $O/tariff-waiver/front.png 6 1644.72 -22.81 1824.72 85.19 >/dev/null &
R dec/waiver.ai.txt $O/tariff-waiver/back.png 6 2731.02 -22.81 2911.02 85.19 >/dev/null &
R dec/w_icon.ai.txt $O/tariff-waiver/icon.png 16 1700.2 25.7 1736.3 64.5 >/dev/null &
wait
