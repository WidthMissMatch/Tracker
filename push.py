"""
Publish this project to GitHub and enable GitHub Pages.

Reads a personal access token from `.github_token` (gitignored), then:
  1. Looks up the authenticated user's login.
  2. Creates a public repo named REPO_NAME under that login (skips if exists).
  3. Initialises git in this directory if needed, stages the project files,
     commits with the configured author identity, and pushes to `main`.
  4. Enables GitHub Pages on the `main` branch (root path).
  5. Strips the token from the remote URL so .git/config doesn't leak it.

Token requirements:
  - Classic PAT: `repo` scope.
  - Fine-grained PAT: Contents (read+write), Administration (read+write),
    Pages (read+write), and Metadata (read).
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_DIR  = Path(__file__).parent
TOKEN_FILE   = PROJECT_DIR / ".github_token"
REPO_NAME    = "Tracker"
AUTHOR_NAME  = "Vipul"
AUTHOR_EMAIL = "nboruv@gmail.com"
COMMIT_MSG   = "Publish RASO IMM Mission Control"
BRANCH       = "main"

GITHUB_API   = "https://api.github.com"


def die(msg: str, code: int = 1):
    print(f"[push] error: {msg}", file=sys.stderr)
    sys.exit(code)


def read_token() -> str:
    if not TOKEN_FILE.is_file():
        die(f"missing {TOKEN_FILE.name}. Create it with your PAT on a single line.")
    tok = TOKEN_FILE.read_text(encoding="utf-8").strip()
    if not tok:
        die(f"{TOKEN_FILE.name} is empty")
    return tok


def gh_request(method: str, path: str, token: str, body: dict | None = None) -> dict:
    """Call the GitHub REST API and return the parsed JSON response."""
    url = f"{GITHUB_API}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("User-Agent", "raso-tracker-publisher")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raise RuntimeError(
            f"{method} {path} → HTTP {e.code}: {e.read().decode('utf-8', 'replace')}"
        ) from None


def git(*args: str, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=PROJECT_DIR,
        check=check,
        capture_output=capture,
        text=True,
    )


def ensure_repo_exists(token: str, login: str) -> dict:
    """Return the repo dict, creating it if necessary."""
    try:
        return gh_request("GET", f"/repos/{login}/{REPO_NAME}", token)
    except RuntimeError as e:
        if "HTTP 404" not in str(e):
            raise
    print(f"[push] creating repo {login}/{REPO_NAME} (public)")
    return gh_request("POST", "/user/repos", token, {
        "name": REPO_NAME,
        "description": "RASO IMM Mission Control — interactive radar tracker visualisation.",
        "private": False,
        "auto_init": False,
        "has_issues": True,
        "has_projects": False,
        "has_wiki": False,
    })


def init_git_if_needed():
    if (PROJECT_DIR / ".git").is_dir():
        return
    print("[push] initialising git repo")
    git("init", "-b", BRANCH)


def configure_identity():
    git("config", "user.name", AUTHOR_NAME)
    git("config", "user.email", AUTHOR_EMAIL)


def has_anything_to_commit() -> bool:
    r = git("status", "--porcelain", capture=True)
    return bool(r.stdout.strip())


def stage_and_commit():
    git("add", "--all")
    if not has_anything_to_commit():
        # Nothing staged that differs from HEAD. If HEAD doesn't exist yet
        # (fresh repo), there's still nothing to commit — abort cleanly.
        try:
            git("rev-parse", "HEAD", capture=True)
            print("[push] working tree clean, skipping commit")
            return
        except subprocess.CalledProcessError:
            die("nothing to commit and no prior history")
    # Use an explicit author so the commit reflects the configured identity
    # even if some other global git config overrides user.* values.
    print(f"[push] committing as {AUTHOR_NAME} <{AUTHOR_EMAIL}>")
    git("commit",
        "-m", COMMIT_MSG,
        "--author", f"{AUTHOR_NAME} <{AUTHOR_EMAIL}>")


def set_remote_with_token(token: str, login: str):
    """Configure 'origin' to a URL that embeds the token for push auth."""
    url = f"https://x-access-token:{token}@github.com/{login}/{REPO_NAME}.git"
    # Replace any existing origin; add if absent.
    try:
        git("remote", "set-url", "origin", url, capture=True)
    except subprocess.CalledProcessError:
        git("remote", "add", "origin", url)


def strip_token_from_remote(login: str):
    """Replace the token-embedded remote URL with a clean one."""
    clean = f"https://github.com/{login}/{REPO_NAME}.git"
    git("remote", "set-url", "origin", clean)


def push_to_main():
    print(f"[push] pushing to origin/{BRANCH}")
    git("branch", "-M", BRANCH)
    git("push", "-u", "origin", BRANCH)


def enable_pages(token: str, login: str):
    """Enable GitHub Pages on the main branch root path."""
    body = {"source": {"branch": BRANCH, "path": "/"}, "build_type": "legacy"}
    try:
        info = gh_request("POST", f"/repos/{login}/{REPO_NAME}/pages", token, body)
        print(f"[push] pages enabled → {info.get('html_url', '(url pending)')}")
    except RuntimeError as e:
        msg = str(e)
        if "HTTP 409" in msg or "already exists" in msg.lower():
            info = gh_request("GET", f"/repos/{login}/{REPO_NAME}/pages", token)
            print(f"[push] pages already enabled → {info.get('html_url', '(url unknown)')}")
        else:
            print(f"[push] pages enable failed: {msg}")


def main():
    token = read_token()
    me = gh_request("GET", "/user", token)
    login = me["login"]
    print(f"[push] authenticated as {login}")

    repo = ensure_repo_exists(token, login)
    print(f"[push] repo: {repo['html_url']}")

    init_git_if_needed()
    configure_identity()
    stage_and_commit()
    set_remote_with_token(token, login)
    push_to_main()
    strip_token_from_remote(login)
    enable_pages(token, login)

    print(f"[push] done. Site will be live at: https://{login}.github.io/{REPO_NAME}/")


if __name__ == "__main__":
    main()
