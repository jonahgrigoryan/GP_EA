# Phase 0: Repository Alignment

Date: 2026-02-26
Status: Completed

## Scope
Establish the correct working directories, file mappings, and command entrypoints before AWS/function/web changes.

## Canonical Working Directories
- Repository root: `/Users/jonahgrigoryan/GP_EA`
- Netlify site root: `/Users/jonahgrigoryan/GP_EA/deploy`

Use `deploy/` as the primary working directory for website and Netlify changes.

## Prompt-to-Repo Path Mapping
- `index.html` -> `deploy/index.html`
- `assets/js/script.js` -> `deploy/assets/js/script.js`
- `netlify.toml` -> `deploy/netlify.toml`

## Verified Baseline (Pre-Phase 1)
- Contact form exists with Netlify attributes in `deploy/index.html` (`id="contact-form"`, `name="contact"`, `data-netlify="true"`).
- Hidden `form-name` field exists in `deploy/index.html`.
- File upload field still exists in `deploy/index.html` (`input type="file" name="image"`).
- Form JS submit path exists in `deploy/assets/js/script.js` (`fetch('/', { method: 'POST', body: new FormData(form) })`).
- File validation logic currently exists in `deploy/assets/js/script.js`.
- `deploy/netlify.toml` currently uses an absolute publish path: `publish = "/Users/jonahgrigoryan/latest_deploy"`.
- `deploy/netlify/functions/` does not exist yet.
- AWS CLI is installed and configured; local default region is `us-east-1`.
- Netlify CLI is installed (`netlify-cli/23.15.1`).

## Execution Entry Points
- Local Netlify dev (from `deploy/`):
  - `npx netlify dev`
- Alternative from repo root:
  - `npx netlify dev --dir deploy --functions deploy/netlify/functions`
- Production deploy (from repo root):
  - `npx netlify deploy --prod --dir deploy --functions deploy/netlify/functions`

## Phase 1 Handoff Checklist
- Confirm bucket naming convention and create private S3 bucket.
- Create IAM signer user + least-privilege policy for `captures/*`.
- Create access key for signer user (store outside git).
- Decide whether to enforce `AWCS_CAPTURE_API_KEY` in `capture-init`.
- Prepare env var targets for Netlify:
  - `AWCS_S3_BUCKET`
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWCS_CAPTURE_API_KEY` (optional)
