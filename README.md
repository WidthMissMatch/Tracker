# Tracker — RASO IMM Mission Control

Interactive radar-tracker / cockpit-HUD visualisation. Built as a single React app
that replays IMM (Interacting Multiple Model) tracking data across multiple
segments and renders a stylised F-35-style HUD scene.

**Live:** https://widthmissmatch.github.io/Tracker/

## What's in this repo

The source artefact was a single self-contained 4 MB HTML file
(`RASO Mission Control v11.html`) — a "bundler" format where every asset
is base64-encoded and gzipped into inline `<script type="__bundler/*">` blocks.
This repo unpacks that bundle into a normal static site:

```
index.html                   clean entry point (~34 KB)
assets/
  data/                      raso.json (5.7 MB tracker dataset)
  fonts/                     Inter + JetBrains Mono woff2 subsets
  js/                        React + ReactDOM + Babel-standalone + 4 app JSX bundles
RASO Mission Control v11.html   original single-file source (kept for reference)
unpack.py                    extractor — regenerates index.html + assets/ from the original
push.py                      one-shot publisher — creates the repo, pushes, enables Pages
```

The unpacked output is byte-equivalent at render time to the original
bundled HTML — same React tree, same data, same fonts — just served as
separate files so it works on GitHub Pages and is easier to maintain.

## Running locally

No build step. Any static HTTP server works:

```
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`. Opening `index.html` directly from
the file system also works in most browsers, but a real HTTP origin
avoids `file://` quirks with the JSON fetch.

## Regenerating from the source bundle

If a newer `RASO Mission Control v*.html` arrives, drop it into the
project root (matching the filename in `unpack.py`'s `SRC` constant) and
run:

```
python unpack.py
```

That wipes `assets/` and rewrites `index.html` from the new bundle.

## Deploying

`push.py` reads a GitHub personal access token from a local file named
`.github_token` (gitignored — never committed), then:

1. Authenticates to GitHub as the token's owner.
2. Creates a public repo named `Tracker` under that account if it doesn't
   already exist.
3. Initialises git, commits everything as the configured author, pushes
   `main`.
4. Strips the token from `.git/config` so it isn't left behind.
5. Enables GitHub Pages on `main` / root.

Token scopes needed (classic PAT): `repo`. Then:

```
python push.py
```

## Notes

- The app logs a handful of `TypeError` messages during the first render
  pass (both in the original bundled HTML and in this unpacked version).
  They're React's internal first-render-then-recover behaviour — the
  visual output is unaffected.
- All assets are local; the page makes zero outbound network requests at
  runtime.
