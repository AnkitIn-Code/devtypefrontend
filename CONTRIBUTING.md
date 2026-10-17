# Contributing to DevType

## Prerequisites

- Java 21, Maven 3.9+
- Node.js 20+, npm 10+
- A Neon PostgreSQL account (free tier is fine)
- A Fireworks AI account (for AI snippet generation)
- Copy `backend/.env.example` → `backend/.env` and fill in real values

## Running Locally

**Backend:**
```powershell
cd backend
# Requires .env to be populated — see backend/.env.example
.\run_backend.ps1
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Security Policy — No Hardcoded Secrets

> **This is a hard rule. PRs violating it will be rejected, no exceptions.**

### What counts as a secret

- Database URLs, usernames, or passwords (including Neon connection strings)
- JWT signing secrets / signing keys
- API keys (Fireworks AI, Resend, or any other provider)
- OAuth client secrets
- Any string that starts with `fw_`, `re_`, `npg_`, or `Bearer <token>`

### Where secrets go

| Location | Allowed? |
|---|---|
| `.env` (git-ignored, local only) | ✅ Yes |
| System/shell environment variables | ✅ Yes |
| CI/CD secret store (GitHub Secrets, etc.) | ✅ Yes |
| `application.yml` — as `${ENV_VAR_NAME}` references | ✅ Yes |
| `.env.example` — placeholder values only (no real values) | ✅ Yes |
| Source code files (`.java`, `.jsx`, `.ts`, etc.) | ❌ Never |
| Startup scripts (`.ps1`, `.sh`) — as hardcoded fallbacks | ❌ Never |
| Test files | ❌ Never (use `test/resources/application.yml` env overrides) |
| `application.yml` defaults | ❌ Never (use `${VAR_NAME:}` empty default, not a real value) |

### Pre-commit hook

Install the pre-commit hook to catch secrets before they leave your machine:

```bash
# Make the hook executable (Mac/Linux)
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks

# For Windows (PowerShell), manually run before committing:
sh .githooks/pre-commit
```

Also install [gitleaks](https://github.com/gitleaks/gitleaks#install) for more thorough scanning:
```bash
# Mac
brew install gitleaks

# Windows (Chocolatey)
choco install gitleaks
```

### CI secret scanning

Every pull request runs `gitleaks detect` as a required check. A PR cannot be merged if gitleaks reports any findings.

---

## If Secrets Were Accidentally Committed

If a secret makes it into the git history (even if later removed from the current file):

1. **Rotate the secret immediately** — treat the old value as permanently compromised.
2. **Scrub git history** using `git-filter-repo`:
   ```bash
   # Install: pip install git-filter-repo
   # Purge a specific file from all history:
   git filter-repo --path backend/run_backend.ps1 --invert-paths
   # Or redact a specific string everywhere:
   git filter-repo --replace-text <(echo 'EXPOSED_SECRET==>REDACTED')
   ```
3. **Force-push** after scrubbing. **Coordinate with all repo collaborators first** — anyone with a local clone must re-clone after a history rewrite, because their local history will diverge.
4. **Revoke any CI deploy keys** or tokens that had access to the repo during the exposure window.
5. Notify the repo owner so they can audit access logs.

> **Note:** `git filter-repo` is preferred over the older BFG Repo Cleaner for modern git repos. Do not use `git filter-branch` — it is deprecated.

---

## Adding New Environment Variables

When adding a new required variable:

1. Add it to `backend/.env.example` with a placeholder value and an explanation comment.
2. Reference it in `application.yml` as `${MY_VAR_NAME}` (no default that contains a real value).
3. Add it to the `$required` or `$recommended` array in `run_backend.ps1` as appropriate.
4. Document it in the relevant section of this file.

---

## Code Review Checklist

Before approving a PR:

- [ ] No hardcoded secrets, API keys, or passwords anywhere in the diff
- [ ] New env vars are documented in `.env.example`
- [ ] `gitleaks detect` passes on the branch
- [ ] `EXPOSE_DEV_RESET_TOKEN` is not set to `true` in any non-dev config
- [ ] No `findAll()` followed by in-memory filtering on large tables (use `@Query` instead)
