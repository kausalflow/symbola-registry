"""Writes small, valid PDFs with real text for the end-to-end test."""
import sys

def pdf(lines, title, pages=2):
    objs = []
    kids = " ".join(f"{3 + 2*i} 0 R" for i in range(pages))
    objs.append("<</Type/Catalog/Pages 2 0 R>>")
    objs.append(f"<</Type/Pages/Kids[{kids}]/Count {pages}>>")
    font_id = 3 + 2 * pages
    for i in range(pages):
        objs.append(f"<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 {font_id} 0 R>>>>/Contents {4 + 2*i} 0 R>>")
        body = ["BT", "/F1 16 Tf", "72 720 Td", "20 TL"]
        for line in (lines if i == 0 else [f"Page {i+1}: more text about the method and results."] * 5):
            body.append("(" + line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") + ") Tj T*")
        body.append("ET")
        stream = "\n".join(body)
        objs.append(f"<</Length {len(stream)}>>\nstream\n{stream}\nendstream")
    objs.append("<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>")
    objs.append(f"<</Title({title})/Author(Test Author)>>")
    out = "%PDF-1.4\n"
    offsets = []
    for n, o in enumerate(objs, 1):
        offsets.append(len(out.encode("latin-1")))
        out += f"{n} 0 obj\n{o}\nendobj\n"
    xref = len(out.encode("latin-1"))
    out += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n" + "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<</Size {len(objs)+1}/Root 1 0 R/Info {len(objs)} 0 R>>\nstartxref\n{xref}\n%%EOF\n"
    return out.encode("latin-1")

d = sys.argv[1]
open(f"{d}/attention.pdf", "wb").write(pdf(["Attention Is All You Need", "Ashish Vaswani, Noam Shazeer", "arXiv:1706.03762v7 [cs.CL]", "The dominant sequence transduction models are based on", "complex recurrent or convolutional neural networks."], "Attention Is All You Need"))
open(f"{d}/withdoi.pdf", "wb").write(pdf(["Quantum Widgets and Their Discontents", "Jane Doe and John Roe", "doi:10.1234/qw.2021.42", "We study widgets in the quantum regime, a zymurgy of ideas."], "Quantum Widgets"))
open(f"{d}/unknown.pdf", "wb").write(pdf(["Some notes without identifiers", "Nothing to look up here."], "My Lecture Notes"))
