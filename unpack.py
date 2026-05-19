"""
Unpack a self-contained 'bundler' HTML file into a static site.

The source HTML embeds three script tags:
  <script type="__bundler/manifest">    { uuid: { data: base64, mime, compressed } }
  <script type="__bundler/template">    "<html string with uuid placeholders>"
  <script type="__bundler/ext_resources"> [ { uuid, id } ]   (optional)

The browser-side loader base64-decodes (and optionally gunzips) each asset,
wraps it in a Blob, then string-replaces every uuid in the template with the
blob: URL before swapping the document.

This script does the same thing to disk: each asset becomes a real file
under assets/<category>/<uuid>.<ext>, and the template's uuids are rewritten
to relative paths. Result: a normal multi-file static site that renders
identically to the original single-file bundle.
"""
import base64
import gzip
import json
import os
import re
import shutil
import sys
from pathlib import Path

SRC = Path(__file__).parent / "RASO Mission Control v11.html"
OUT = Path(__file__).parent
ASSETS = OUT / "assets"

# MIME -> (subfolder, extension). Anything missing falls back to ("misc", "bin").
MIME_MAP = {
    "application/javascript":      ("js",     "js"),
    "text/javascript":             ("js",     "js"),
    "text/jsx":                    ("js",     "jsx"),
    "text/babel":                  ("js",     "jsx"),
    "application/json":            ("data",   "json"),
    "text/css":                    ("css",    "css"),
    "text/html":                   ("html",   "html"),
    "image/png":                   ("img",    "png"),
    "image/jpeg":                  ("img",    "jpg"),
    "image/gif":                   ("img",    "gif"),
    "image/webp":                  ("img",    "webp"),
    "image/svg+xml":               ("img",    "svg"),
    "image/x-icon":                ("img",    "ico"),
    "image/vnd.microsoft.icon":    ("img",    "ico"),
    "font/woff":                   ("fonts",  "woff"),
    "font/woff2":                  ("fonts",  "woff2"),
    "font/ttf":                    ("fonts",  "ttf"),
    "font/otf":                    ("fonts",  "otf"),
    "application/font-woff":       ("fonts",  "woff"),
    "application/font-woff2":      ("fonts",  "woff2"),
    "audio/mpeg":                  ("media",  "mp3"),
    "audio/wav":                   ("media",  "wav"),
    "video/mp4":                   ("media",  "mp4"),
    "application/pdf":             ("media",  "pdf"),
    "text/plain":                  ("data",   "txt"),
}


def categorize(mime: str):
    return MIME_MAP.get(mime.lower().split(";")[0].strip(), ("misc", "bin"))


def find_script(html: str, type_attr: str):
    """Return the textContent of <script type="type_attr">...</script> or None."""
    pattern = re.compile(
        r'<script[^>]*type=["\']' + re.escape(type_attr) + r'["\'][^>]*>(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    )
    m = pattern.search(html)
    return m.group(1) if m else None


def main():
    print(f"[unpack] reading {SRC.name} ({SRC.stat().st_size / 1_000_000:.2f} MB)")
    html = SRC.read_text(encoding="utf-8")

    manifest_raw = find_script(html, "__bundler/manifest")
    template_raw = find_script(html, "__bundler/template")
    extres_raw   = find_script(html, "__bundler/ext_resources")

    if manifest_raw is None or template_raw is None:
        sys.exit("[unpack] manifest or template script tag not found")

    manifest = json.loads(manifest_raw)
    template = json.loads(template_raw)   # template is JSON-encoded string
    ext_resources = json.loads(extres_raw) if extres_raw else []

    print(f"[unpack] manifest entries: {len(manifest)}")
    print(f"[unpack] ext resources: {len(ext_resources)}")

    # Wipe a previous run, leave source + scripts alone. shutil.rmtree handles
    # OneDrive-style sync handles on Windows better than manual rglob teardown.
    if ASSETS.exists():
        shutil.rmtree(ASSETS, ignore_errors=True)
    ASSETS.mkdir(exist_ok=True)

    # uuid -> relative path used inside index.html
    url_map = {}

    for uuid, entry in manifest.items():
        data = base64.b64decode(entry["data"])
        if entry.get("compressed"):
            data = gzip.decompress(data)

        subdir, ext = categorize(entry.get("mime", ""))
        (ASSETS / subdir).mkdir(exist_ok=True)

        # uuids are long; first 16 chars stay unique in practice and keep paths sane.
        short = re.sub(r"[^A-Za-z0-9_-]", "_", uuid)[:32]
        out_path = ASSETS / subdir / f"{short}.{ext}"
        out_path.write_bytes(data)

        url_map[uuid] = f"./assets/{subdir}/{short}.{ext}"

    print(f"[unpack] wrote {len(url_map)} asset files")

    # Substitute uuids in the template. Loader uses split/join (literal),
    # so a plain str.replace is the right semantic match.
    for uuid, url in url_map.items():
        template = template.replace(uuid, url)

    # ------------------------------------------------------------------
    # Replicate the original bundler's exact script-loading semantics.
    # The original (1) loaded React/ReactDOM/Babel sequentially with await,
    # (2) inlined every text/babel src into a no-src <script type="text/babel">,
    # (3) called Babel.transformScriptTags() manually.
    #
    # When we leave the page as plain HTML the browser MOSTLY does the same,
    # but Babel-standalone's DOMContentLoaded auto-runner has timing edge
    # cases (Babel's runScripts uses async XHR for src tags, and the order
    # in which it appends transformed code can race with the parser). The
    # safest fix: strip the type="text/babel" from the page entirely and
    # have one bootstrap script perform the exact original sequence.
    # ------------------------------------------------------------------

    # Pull out every script tag with a src attribute that lives in <body>.
    # We collect them in document order and rewrite them as data-tags that
    # the bootstrap loader picks up.
    def tag_to_loader(match):
        attrs = match.group(1)
        # Type marker: text/babel or text/jsx → needs babel transform; else raw.
        type_match = re.search(r'\btype=(?:"|\')([^"\']+)(?:"|\')', attrs)
        src_match  = re.search(r'\bsrc=(?:"|\')([^"\']+)(?:"|\')', attrs)
        if not src_match:
            return match.group(0)
        src = src_match.group(1)
        is_babel = type_match and type_match.group(1).lower() in ("text/babel", "text/jsx")
        return (
            f'<link rel="raso-script" '
            f'data-src="{src}" '
            f'data-babel="{1 if is_babel else 0}">'
        )

    # Match <script ... src="..."></script> inside <body> only. We do a
    # simple body-scope split so we don't touch the resources script in <head>.
    body_marker = re.search(r"<body[^>]*>", template, flags=re.IGNORECASE)
    if body_marker is None:
        sys.exit("[unpack] no <body> tag found in template")

    head_part = template[: body_marker.end()]
    body_part = template[body_marker.end() :]

    body_part = re.sub(
        r'<script\b([^>]*\bsrc=(?:"|\')[^"\']+(?:"|\')[^>]*)>\s*</script>',
        tag_to_loader,
        body_part,
        flags=re.IGNORECASE,
    )

    # Bootstrap loader: walks the data-src markers in order, awaiting each
    # plain <script src>; for babel-typed ones, fetches the source and
    # appends an inline <script type="text/babel"> (no src), then calls
    # Babel.transformScriptTags() once at the end. Identical to the
    # original loader's tail-end logic.
    bootstrap = """
<script>
(async function () {
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  var markers = Array.from(document.querySelectorAll('link[rel="raso-script"]'));
  for (var i = 0; i < markers.length; i++) {
    var m = markers[i];
    var src = m.getAttribute('data-src');
    var isBabel = m.getAttribute('data-babel') === '1';
    if (!isBabel) {
      await loadScript(src);
    } else {
      var r = await fetch(src);
      var body = await r.text();
      var s = document.createElement('script');
      s.type = 'text/babel';
      s.textContent = body;
      document.body.appendChild(s);
    }
  }
  if (window.Babel && typeof window.Babel.transformScriptTags === 'function') {
    window.Babel.transformScriptTags();
  }
})().catch(function (e) {
  var p = document.body || document.documentElement;
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;font:12px/1.4 ui-monospace,monospace;background:#2a1215;color:#ff8a80;padding:10px 14px;border-radius:8px;border:1px solid #5c2b2e;z-index:99999;white-space:pre-wrap';
  d.textContent = '[bootstrap] ' + (e && e.message ? e.message : e);
  p.appendChild(d);
});
</script>
"""

    # Append bootstrap right before </body>.
    body_part = body_part.replace("</body>", bootstrap + "</body>", 1)
    template = head_part + body_part

    # Visible error sink for any runtime errors after bootstrap completes.
    error_sink = (
        '<script>window.addEventListener("error",function(e){'
        'var p=document.body||document.documentElement;'
        'var d=document.getElementById("__app_err")||p.appendChild(document.createElement("div"));'
        'd.id="__app_err";'
        'd.style.cssText="position:fixed;bottom:12px;left:12px;right:12px;'
        'font:12px/1.4 ui-monospace,monospace;background:#2a1215;color:#ff8a80;'
        'padding:10px 14px;border-radius:8px;border:1px solid #5c2b2e;z-index:99999;'
        'white-space:pre-wrap;max-height:40vh;overflow:auto";'
        'd.textContent=(d.textContent?d.textContent+String.fromCharCode(10):"")'
        '+"[runtime] "+(e.message||e.type)'
        '+(e.filename?" ("+e.filename.slice(-60)+":"+e.lineno+")":"");'
        '},true);</script>'
    )
    template = template.replace("</head>", error_sink + "</head>", 1)

    # The loader strips integrity/crossorigin because blob URLs trip SRI under
    # file://. For a normal hosted static site we no longer need that — but the
    # asset bytes are still ours and the integrity hashes were computed against
    # CDN copies, so leaving them in would break loading. Strip them.
    template = re.sub(r'\s+integrity="[^"]*"', "", template, flags=re.IGNORECASE)
    template = re.sub(r'\s+crossorigin="[^"]*"', "", template, flags=re.IGNORECASE)

    # All real assets are now local — drop the Google Fonts preconnect hints so
    # this page makes zero outbound requests at runtime (true offline build).
    template = re.sub(
        r'\s*<link\s+rel="preconnect"\s+href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>',
        "",
        template,
        flags=re.IGNORECASE,
    )

    # Inject window.__resources right after <head> so app code that reads
    # external-resource ids gets file paths in place of the original blob URLs.
    resource_map = {entry["id"]: url_map[entry["uuid"]]
                    for entry in ext_resources if entry["uuid"] in url_map}
    if resource_map:
        # Escape </script> the same way the loader does.
        payload = json.dumps(resource_map).replace("</script>", "<\\/script>")
        injected = f"<script>window.__resources = {payload};</script>"
        m = re.search(r"<head[^>]*>", template, flags=re.IGNORECASE)
        if m:
            i = m.end()
            template = template[:i] + injected + template[i:]
        else:
            template = injected + template

    index_path = OUT / "index.html"
    index_path.write_text(template, encoding="utf-8")
    print(f"[unpack] wrote {index_path.name} ({index_path.stat().st_size / 1_000:.1f} KB)")
    print("[unpack] done")


if __name__ == "__main__":
    main()
