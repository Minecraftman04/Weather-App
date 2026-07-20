from pathlib import Path

index_path = Path("index.html")
marker = '<script src="github-sync.js"></script>'
text = index_path.read_text(encoding="utf-8")

if marker not in text:
    if "</body>" not in text:
        raise SystemExit("Could not find </body> in index.html")
    text = text.replace("</body>", f"  {marker}\n</body>", 1)
    index_path.write_text(text, encoding="utf-8")
