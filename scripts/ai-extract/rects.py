# list distinct painted rectangles of a given size (AI points) in a decoded file
import sys
L = open(sys.argv[1], 'rb').read().split(b'\n')
w0, h0 = float(sys.argv[2]), float(sys.argv[3])
s = next(i for i, l in enumerate(L) if l.startswith(b'%AI5_BeginLayer'))
pts = []; seen = set()
for i in range(s, len(L)):
    l = L[i]
    if l[:1] == b'%': continue
    t = l.split()
    if not t: continue
    if t[-1] in (b'm', b'L', b'l', b'C', b'c'):
        try: pts.append((float(t[-3]), float(t[-2])))
        except: pass
    elif t[-1] in (b'f', b'F', b'n', b'N', b'S', b's', b'B', b'b', b'W'):
        if pts:
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            w, h = max(xs) - min(xs), max(ys) - min(ys)
            if abs(w - w0) < 1.5 and abs(h - h0) < 1.5:
                k = (round(min(xs)), round(max(ys)))
                if k not in seen: seen.add(k); print('%.2f %.2f %.2f %.2f' % (min(xs), min(ys), max(xs), max(ys)))
        pts = []
