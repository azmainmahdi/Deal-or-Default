# Extract art from the Illustrator files

The .ai files (HomeDrive/Deal or Default) have an empty PDF layer: the art sits off the artboard
in Illustrator's own zstd-compressed stream. These scripts decode that stream and redraw it.

    python3 -m venv venv && venv/bin/pip install pymupdf zstandard skia-python pillow
    venv/bin/python dec.py "12 Cards Evil.ai" dec/evil.ai.txt      # decode (likewise good, country, waiver)
    venv/bin/python render.py dec/evil.ai.txt out.png 4 x0 y0 x1 y1  # render a box (AI points, y up) at 4x
    ./export.sh out                                                  # every card face (needs dec/*.ai.txt)
    venv/bin/python rects.py dec/evil.ai.txt 252 180                 # find card rectangles of a size

render.py handles paths, compound paths, clip groups (clip path written last), group blend/opacity
(Xy after U), and linear gradients approximated across each shape's box. Rasters and stroke
gradients are skipped; none of the card art needs them.
