import sys, pymupdf, zstandard, io, re
src, out = sys.argv[1], sys.argv[2]
d = pymupdf.open(src)
cat = d.pdf_catalog()
# find the dict holding AIPrivateData refs
x = None
for i in range(1, d.xref_length()):
    try: s = d.xref_object(i)
    except: continue
    if '/AIPrivateData1 ' in s: x = s; break
refs = {int(a): int(b) for a, b in re.findall(r'/AIPrivateData(\d+) (\d+) 0 R', x)}
buf = b''.join(d.xref_stream(refs[k]) for k in sorted(refs))
i = buf.find(b'%AI24_ZStandard_Data')
head, body = buf[:i], buf[i+len(b'%AI24_ZStandard_Data'):]
dc = zstandard.ZstdDecompressor().stream_reader(io.BytesIO(body))
data = dc.read()
open(out, 'wb').write(head + data)
print(src, len(buf), '->', len(data))
