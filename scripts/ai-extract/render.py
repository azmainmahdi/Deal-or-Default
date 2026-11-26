# Render the art of a decompressed Illustrator native stream (AI5-style ops) to PNG with skia.
# usage: render.py in.txt out.png scale [x0 y0 x1 y1]   (crop box in AI points, y up)
import sys, re, math, skia
src, out = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 3
raw = open(src, 'rb').read().replace(b'\r\n', b'\n').replace(b'\r', b'\n')
start = raw.find(b'%AI5_BeginLayer'); end = raw.rfind(b'%%Trailer')
if len(sys.argv) > 7: x0, y0, x1, y1 = map(float, sys.argv[4:8])
else: x0, y0, x1, y1 = map(float, re.search(rb'%%HiResBoundingBox: (\S+) (\S+) (\S+) (\S+)', raw).groups())
W, H = int((x1 - x0) * scale + .5), int((y1 - y0) * scale + .5)
surf = skia.Surface(W, H); cv = surf.getCanvas(); cv.clear(skia.ColorTRANSPARENT)
cv.scale(scale, -scale); cv.translate(-x0, -y1)

# gradient swatches: name -> [(pos 0..1, rgb)]
grads = {}
for m in re.finditer(rb'%AI5_BeginGradient: \((.*?)\)\n(.*?)%AI5_EndGradient', raw, re.S):
    stops = []
    for l in m.group(2).split(b'\n'):
        t = l.split()
        if t and t[-1] == b'Bs' and l.startswith(b'%_'):
            v = [float(x.lstrip(b'%_')) for x in t[:-1] if re.fullmatch(rb'-?[\d.]+(e-?\d+)?', x.lstrip(b'%_'))]
            # c m y k r g b type ... midpoint pos
            if len(v) >= 10 and v[7] == 2: c = v[4:7]
            elif len(v) >= 7: c = [(1-v[0])*(1-v[3]), (1-v[1])*(1-v[3]), (1-v[2])*(1-v[3])]
            else: c = [1 - v[0]] * 3
            stops.append((v[-1] / 100, c))
    grads[m.group(1)] = sorted(stops)

BLEND = [skia.BlendMode.kSrcOver, skia.BlendMode.kMultiply, skia.BlendMode.kScreen, skia.BlendMode.kOverlay,
         skia.BlendMode.kSoftLight, skia.BlendMode.kHardLight, skia.BlendMode.kColorDodge, skia.BlendMode.kColorBurn,
         skia.BlendMode.kDarken, skia.BlendMode.kLighten, skia.BlendMode.kDifference, skia.BlendMode.kExclusion,
         skia.BlendMode.kHue, skia.BlendMode.kSaturation, skia.BlendMode.kColor, skia.BlendMode.kLuminosity]

def rgb(r, g, b): return skia.Color(int(r*255+.5), int(g*255+.5), int(b*255+.5))
def cmyk(c, m, y, k): return rgb((1-c)*(1-k), (1-m)*(1-k), (1-y)*(1-k))
def last(l):
    t = l.split(); return t[-1] if t else b''

PATHOPS = {b'm', b'L', b'l', b'C', b'c', b'V', b'v', b'Y', b'y', b'h', b'W', b'As'}
def reorder(lines):
    # newer AI writes a clip group's clip path just before Q; move it right after q
    stack = [[]]
    for l in lines:
        if l == b'q': stack.append([]); continue
        if l == b'Q' and len(stack) > 1:
            blk = stack.pop(); w = None
            for k in range(len(blk) - 1, -1, -1):
                if isinstance(blk[k], bytes) and last(blk[k]) == b'W': w = k; break
            if w is not None:
                e = w + 1
                if e < len(blk) and isinstance(blk[e], bytes) and last(blk[e]) in (b'n', b'N'): e += 1
                b0 = w
                while b0 > 0 and isinstance(blk[b0-1], bytes) and (last(blk[b0-1]) in PATHOPS or blk[b0-1][:1] == b'%' or not blk[b0-1].strip()): b0 -= 1
                blk = blk[b0:e] + blk[:b0] + blk[e:]
            stack[-1].append([b'q'] + blk + [b'Q']); continue
        stack[-1].append(l)
    out = []
    def flat(x):
        for y in x:
            if isinstance(y, list): flat(y)
            else: out.append(y)
    flat(stack[0]); return out

lines = reorder(raw[start:end].split(b'\n'))
nl = len(lines)

# group transparency: "mode opacity ... Xy" written right after a group's U applies to that group
grp, xy_used, st = {}, set(), []
for k, l in enumerate(lines):
    if l[:1] == b'%': continue
    for tok in l.split():
        if tok in (b'u', b'*u'): st.append(k)
        elif tok in (b'U', b'*U') and st:
            j = st.pop(); n = k + 1
            while n < nl and (lines[n][:1] == b'%' or not lines[n].strip()): n += 1
            if n < nl and last(lines[n]) == b'Xy' and b'/' not in lines[n]:
                t = lines[n].split(); xy_used.add(n)
                if t[0] != b'0' or float(t[1]) < 1: grp[j] = (int(float(t[0])), float(t[1]))

fill = skia.ColorBLACK; stroke = skia.ColorBLACK; lw = 1.0; evenodd = False
path = skia.Path(); compound = 0; clip_pending = False; cur = (0, 0)
obj = (0, 1.0); gradfill = None; qstack = []; ustack = []; last_op = b'n'
num = re.compile(rb'^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$')

def paint_path(p, do_fill, do_stroke):
    global clip_pending
    p.setFillType(skia.PathFillType.kEvenOdd if evenodd else skia.PathFillType.kWinding)
    if clip_pending:
        cv.clipPath(p, skia.ClipOp.kIntersect, True); clip_pending = False; return
    mode, alpha = obj
    if do_fill:
        pt = skia.Paint(Color=fill, AntiAlias=True, Alphaf=alpha, BlendMode=BLEND[mode] if mode < 16 else BLEND[0])
        if gradfill:
            stops, ang = gradfill
            r = p.computeTightBounds(); cx, cy = r.centerX(), r.centerY()
            a = math.radians(ang); dx, dy = math.cos(a), math.sin(a)
            h = (abs(r.width() * dx) + abs(r.height() * dy)) / 2
            pt.setShader(skia.GradientShader.MakeLinear(
                [skia.Point(cx - dx*h, cy - dy*h), skia.Point(cx + dx*h, cy + dy*h)],
                [rgb(*c) for _, c in stops], [s for s, _ in stops]))
        cv.drawPath(p, pt)
    if do_stroke:
        cv.drawPath(p, skia.Paint(Color=stroke, AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=lw, Alphaf=alpha))

def end_object():
    global path, gradfill, obj
    path = skia.Path(); gradfill = None; obj = (0, 1.0)

i = 0; args = []
while i < nl:
    line = lines[i]; li = i; i += 1
    if not line or line[:1] == b'%':
        if line.startswith(b'%AI5_BeginRaster'):
            while i < nl and not lines[i].startswith(b'%%EndData'): i += 1
        continue
    s = re.sub(rb'\((?:\\.|[^\\)])*\)', b' STR ', line) if b'(' in line else line
    for tok in s.split():
        if num.match(tok): args.append(float(tok)); continue
        op = tok
        if op == b'm': path.moveTo(args[-2], args[-1]); cur = (args[-2], args[-1])
        elif op in (b'l', b'L'): path.lineTo(args[-2], args[-1]); cur = (args[-2], args[-1])
        elif op in (b'c', b'C'): a = args[-6:]; path.cubicTo(*a); cur = (a[4], a[5])
        elif op in (b'v', b'V'): a = args[-4:]; path.cubicTo(cur[0], cur[1], a[0], a[1], a[2], a[3]); cur = (a[2], a[3])
        elif op in (b'y', b'Y'): a = args[-4:]; path.cubicTo(a[0], a[1], a[2], a[3], a[2], a[3]); cur = (a[2], a[3])
        elif op == b'h': path.close()
        elif op == b'W': clip_pending = True
        elif op in (b'f', b'F', b's', b'S', b'b', b'B', b'n', b'N'):
            if op in (b'f', b's', b'b', b'n'): path.close()
            if compound: last_op = op
            else:
                paint_path(path, op in (b'f', b'F', b'b', b'B'), op in (b's', b'S', b'b', b'B')); end_object()
        elif op in (b'u', b'*u'):
            layer = li in grp
            if layer:
                mode, alpha = grp[li]
                cv.saveLayer(None, skia.Paint(Alphaf=alpha, BlendMode=BLEND[mode] if mode < 16 else BLEND[0]))
            ustack.append(layer)
            if op == b'*u': compound += 1; last_op = b'n'
        elif op in (b'U', b'*U'):
            if op == b'*U':
                compound -= 1
                if compound == 0:
                    paint_path(path, last_op in (b'f', b'F', b'b', b'B'), last_op in (b's', b'S', b'b', b'B')); end_object()
            if ustack and ustack.pop(): cv.restore()
        elif op == b'q': cv.save(); qstack.append(1)
        elif op == b'Q':
            if qstack: qstack.pop(); cv.restore()
        elif op == b'Xa' and len(args) >= 3: fill = rgb(*args[-3:])
        elif op == b'XA' and len(args) >= 3: stroke = rgb(*args[-3:])
        elif op == b'Xk' and len(args) >= 7: fill = rgb(*args[4:7])
        elif op == b'XK' and len(args) >= 7: stroke = rgb(*args[4:7])
        elif op == b'k' and len(args) >= 4: fill = cmyk(*args[-4:])
        elif op == b'K' and len(args) >= 4: stroke = cmyk(*args[-4:])
        elif op == b'g' and args: fill = rgb(args[-1], args[-1], args[-1])
        elif op == b'G' and args: stroke = rgb(args[-1], args[-1], args[-1])
        elif op == b'w' and args: lw = args[-1]
        elif op == b'XR' and args: evenodd = bool(args[-1])
        elif op == b'Xy' and li not in xy_used and b'/' not in line and len(args) >= 2: obj = (int(args[0]), args[1])
        elif op == b'Bg':
            m = re.search(rb'\((.*?)\)', line); stops = grads.get(m.group(1) if m else b'')
            # flag 2 = trailing note on a path already painted; only flag 1 sets the fill
            if stops and len(args) >= 5 and args[0] == 1: gradfill = (stops, args[4])
        elif op == b'STR': args.append(0.0); continue
        args = []
surf.makeImageSnapshot().save(out, skia.kPNG)
print(out, W, H)
