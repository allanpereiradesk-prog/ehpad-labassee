"""Construit files/dce/index.json : le texte des PDF du DCE découpé en passages (document, page, paragraphe du CCTP)."""
import json, re, subprocess, sys, os, glob

DCE = "/home/claude/ehpad-labassee/files/dce"
OCR = os.environ.get("OCR_DIR", os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]

TITLES = {"cctp": "CCTP lot 12 CVC-DF-GEO-PBS", "schema": "Schéma CVC-S-1 chauffage + ECS + eau glacée", "ft": "Fiches techniques CVC / PBS",
  "sousdalle": "Réseaux sous dalle (GO RT20-04)", "ar01": "Plan archi RDC 1/100 (AR01)", "ar02": "Plan archi R+1 1/100 (AR02)", "trt": "Rapport TRT GEOSYNERGIE (04/2022)",
  "sondes": "Scénario 4 – 11 sondes géothermiques", "pv": "PV de réception sonde test", "ncrt": "Note de calcul RT 2012, E+C- et STD", "ccap": "CCAP",
  "charte": "Charte de synthèse BIM", "conv": "Convention BIM DCE", "planning": "Planning prévisionnel chantier", "noticebim": "Notice BIM", "noticearc": "Notice architecturale",
  "ar15": "Coupes et élévations (AR15)", "ar16": "Faux plafonds RDC (AR16)", "ar17": "Faux plafonds R+1 (AR17)", "ar11": "Façades, coupes, détails (AR11)",
  "ar24": "Menuiseries extérieures (AR24)", "menext": "CCTP lot 04 menuiseries extérieures", "surf": "Tableau des surfaces globales", "acou": "Notice acoustique",
  "rset": "Notice énergie RSET", "eplusc": "Étude E+C- (V1-S01)", "pc16": "PC 16 – attestation thermique", "ae": "Acte d'engagement (AE)"}
KIND = {k: ("plan" if k.startswith("ar") or k in ("schema", "sondes", "sousdalle", "surf") else "doc") for k in TITLES}
ORDER = ["cctp", "ccap", "ae", "ft", "acou", "ncrt", "rset", "eplusc", "trt", "pv", "charte", "conv", "noticebim", "noticearc", "menext", "planning", "pc16",
         "schema", "surf", "ar01", "ar02", "ar11", "ar15", "ar16", "ar17", "ar24", "sondes", "sousdalle"]

def pages(key):
    f = f"{DCE}/{key}.pdf"
    if key == "pc16":
        out = []
        for i in range(1, 36):
            p = f"{OCR}/ocr_{i}.txt"
            out.append(open(p, encoding="utf-8", errors="ignore").read() if os.path.exists(p) else "")
        return out
    n = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", f], capture_output=True, text=True).stdout).group(1))
    res = []
    for i in range(1, n + 1):
        t = subprocess.run(["pdftotext", "-f", str(i), "-l", str(i), "-enc", "UTF-8", f, "-"], capture_output=True, text=True).stdout
        res.append(t)
    return res

HEAD = re.compile(r"^\s*((?:\d{1,2}\.){1,4}\d{1,2})\.?\s+([A-ZÉÈÀÂÎÔÛÇ][^\n]{2,90})$")
def clean(t):
    t = t.replace("­", "").replace("\x0c", "\n")
    t = re.sub(r"[\uf000-\uf8ff\u25aa\u25cf\u2022\u00b7]", "•", t)
    t = re.sub(r"(•\s*){2,}", "• ", t)
    t = re.sub(r"(\w)-\n(\w)", r"\1\2", t)
    t = re.sub(r"[ \t ]+", " ", t)
    return t

docs, chunks = [], []
for key in ORDER:
    if not os.path.exists(f"{DCE}/{key}.pdf"):
        continue
    P = pages(key)
    docs.append({"k": key, "t": TITLES[key], "n": len(P), "kind": KIND[key]})
    sec = ""
    for pi, raw in enumerate(P, start=1):
        txt = clean(raw)
        if KIND[key] == "plan":
            words = re.findall(r"[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9'’./°²³-]{1,}", txt)
            seen, keep = set(), []
            for w in words:
                lw = w.lower()
                if lw in seen or re.fullmatch(r"[\d.,-]+", w):
                    continue
                seen.add(lw); keep.append(w)
            body = " ".join(keep)[:20000]
            for j in range(0, len(body), 900):
                chunks.append({"d": key, "p": pi, "s": "", "t": body[j:j + 900]})
            continue
        lines = [l.strip() for l in txt.split("\n")]
        buf, bsec = [], sec
        def flush():
            global buf
            t = " ".join(x for x in buf if x).strip()
            t = re.sub(r"\s+", " ", t)
            if len(t) > 25 and t.count(".") / len(t) < 0.12 and not re.search(r"\.{6,}", t):
                chunks.append({"d": key, "p": pi, "s": bsec, "t": t})
            buf = []
        size = 0
        for l in lines:
            m = HEAD.match(l)
            if m and key in ("cctp", "ccap", "menext", "acou", "charte", "conv", "noticebim", "ae", "trt"):
                if buf:
                    flush(); size = 0
                sec = (m.group(1) + " " + m.group(2)).strip()[:110]
                bsec = sec
            if not l:
                if size > 420:
                    flush(); size = 0; bsec = sec
                continue
            buf.append(l); size += len(l)
            if size > 750:
                flush(); size = 0; bsec = sec
        if buf:
            flush()
idx = {"v": 1, "docs": docs, "chunks": [[c["d"], c["p"], c["s"], c["t"]] for c in chunks]}
json.dump(idx, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(docs), "documents", len(chunks), "passages", os.path.getsize(OUT) // 1024, "Ko")
from collections import Counter
print(Counter(c["d"] for c in chunks).most_common(30))
