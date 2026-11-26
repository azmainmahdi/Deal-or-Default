# keep the file header + layer start, but only the given 1-based line ranges of art, then the trailer
import sys
L = open(sys.argv[1], 'rb').read().split(b'\n')
s = next(i for i, l in enumerate(L) if l.startswith(b'%AI5_BeginLayer'))
t = max(i for i, l in enumerate(L) if l.startswith(b'%%Trailer'))
keep = L[:s + 4]
for r in sys.argv[3:]:
    a, b = map(int, r.split(':')); keep += L[a - 1:b]
open(sys.argv[2], 'wb').write(b'\n'.join(keep + L[t:]))
