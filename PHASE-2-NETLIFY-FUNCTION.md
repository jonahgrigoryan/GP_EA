# Phase 2: Netlify Function (capture-init)

Date: 2026-02-27  
Status: Pending

## Objective
Implement only the `capture-init` Netlify function and minimal Netlify config so it can mint presigned S3 upload URLs.

- Keep bucket objects private (no website/I/O changes in this phase).
- Return exactly the v0 contract required by `README.md` and `YOU ARE CODEX.md`:
  - `capture_id`, `photo_put_url`, `summary_put_url`, `expires_in_seconds`
  - key format: `captures/<capture_id>/photo.<file_ext>` and `captures/<capture_id>/summary.json`
- Include CORS for browser-safe POST and OPTIONS.

## Scope (Do Not Do in This Phase)
- No website file-input removal, hidden fields, or launch-button changes in `deploy/index.html`.
- No changes to `deploy/assets/js/script.js`.
- No AWS resource provisioning (Phase 1 already covers this).
- No iOS app code.

## Required Outputs
1. New file: `deploy/netlify/functions/capture-init.js`
2. New/updated root dependency manifest: `package.json` with:
   - `@aws-sdk/client-s3`
   - `@aws-sdk/s3-request-presigner`
3. Updated `deploy/netlify.toml` entries:
   - `[build] publish = "."`
   - `[functions] directory = "netlify/functions"` (preserve existing plugin-emails blocks)
4. Verified local runs:
   - `OPTIONS` returns CORS headers.
   - `POST` with required payload returns `{ capture_id, photo_put_url, summary_put_url, expires_in_seconds }`.
   - `POST` missing valid API key returns 403 when `AWCS_CAPTURE_API_KEY` is set.

## Preflight Checklist
1. Confirm repo context and phase handoff.
   - `cd /Users/jonahgrigoryan/GP_EA`
   - `pwd`
   - `ls`
2. Confirm tools.
   - `node --version`
   - `npm --version`
   - `npx netlify --version`
3. Load Phase 1 values.
   - `source .aws-phase1.env`
   - Validate values exist:

```bash
for v in AWCS_S3_BUCKET AWS_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  eval "val=\"\${$v}\""
  if [ -z "$val" ]; then
    echo "Missing $v from Phase 1 handoff"; exit 1
  fi
done
```

4. Confirm function directory target from Phase 0.
   - `ls -d deploy` should exist.
   - `deploy/netlify` and `deploy/netlify/functions` may be absent before Step 1.
   - Step 1 creates `deploy/netlify/functions`.
5. Confirm local artifacts are ignored before installing dependencies.
   - `rg -n '^node_modules/?$' .gitignore || echo 'Missing node_modules/ in .gitignore'`
   - `rg -n '^\\.aws-phase1\\.env$' .gitignore || echo 'Missing .aws-phase1.env in .gitignore'`
   - If `node_modules/` is missing, add it before Step 1.

## Step 1 — Create workspace and install dependencies
1. From repo root, prepare dependencies at the root (not inside `deploy/`).

```bash
cd /Users/jonahgrigoryan/GP_EA
mkdir -p deploy/netlify/functions
if [ ! -f package.json ]; then npm init -y; fi
npm pkg set type=module
npm pkg set private=true
npm pkg set name=awcs-wound-capture-site
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

2. Verify installed versions.

```bash
cat package.json
```

3. Keep environment loading in the same shell used to start local Netlify dev.
   - `source .aws-phase1.env` must run in the same terminal session before `npx netlify dev`, unless you explicitly provide equivalent vars via a local `.env` file.

## Step 2 — Implement `capture-init` function
Create `deploy/netlify/functions/capture-init.js` with exact behavior and validation:

```js
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const EXPIRES_IN_SECONDS = 900;
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/heic', 'image/heif']);
const ALLOWED_EXTS = new Set(['jpg', 'heic']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-awcs-capture-key',
  'Access-Control-Max-Age': '600',
};

function buildHeaders(extra = {}) {
  return {
    ...CORS_HEADERS,
    ...extra,
  };
}

function toLowerHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof key === 'string') out[key.toLowerCase()] = value;
  }
  return out;
}

function jsonResponse(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: buildHeaders({ 'Content-Type': 'application/json', ...extraHeaders }),
    body: JSON.stringify(payload),
  };
}

function missingEnvResponse() {
  return jsonResponse(500, {
    error: 'Server misconfigured: missing required AWS environment variables.',
  });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: buildHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed. Use POST.',
    });
  }

  const headers = toLowerHeaders(event.headers || {});
  const configuredApiKey = process.env.AWCS_CAPTURE_API_KEY?.trim();
  const incomingApiKey = headers['x-awcs-capture-key'];
  if (configuredApiKey && incomingApiKey !== configuredApiKey) {
    return jsonResponse(403, {
      error: 'Missing or invalid x-awcs-capture-key',
    });
  }

  const requiredEnv = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWCS_S3_BUCKET',
  ];
  for (const name of requiredEnv) {
    if (!process.env[name]) return missingEnvResponse();
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return jsonResponse(400, {
      error: 'Invalid JSON body',
    });
  }

  const { content_type, file_ext } = payload;
  if (!ALLOWED_CONTENT_TYPES.has(content_type) || !ALLOWED_EXTS.has(file_ext)) {
    return jsonResponse(400, {
      error: 'Invalid input: content_type must be image/jpeg|image/heic|image/heif and file_ext must be jpg|heic',
    });
  }

  const capture_id = randomUUID();
  const bucket = process.env.AWCS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const photoKey = `captures/${capture_id}/photo.${file_ext}`;
  const summaryKey = `captures/${capture_id}/summary.json`;

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const photo_put_url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: photoKey,
        ContentType: content_type,
      }),
      { expiresIn: EXPIRES_IN_SECONDS },
    );

    const summary_put_url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: summaryKey,
        ContentType: 'application/json',
      }),
      { expiresIn: EXPIRES_IN_SECONDS },
    );

    return jsonResponse(200, {
      capture_id,
      photo_put_url,
      summary_put_url,
      expires_in_seconds: EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: 'Failed to generate pre-signed URL',
      detail: error?.message || 'Unknown error',
    });
  }
}
```

## Step 3 — Update `deploy/netlify.toml`
Use relative publish path and set function directory while preserving email function config.

1. Edit only the `[functions]` and `[build]` sections in `deploy/netlify.toml`.
   - Under `[functions]`, set `directory = "netlify/functions"` and `node_bundler = "esbuild"`.
   - Under `[build]`, change only `publish` to `"."`.
   - Leave `[functions.emails]`, `[functions."*"]`, `[plugins]`, `[[headers]]`, and section order unchanged.

2. Expected shape for those sections:

```toml
[build]
publish = "."
publishOrigin = "config"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

  [functions.emails]
  included_files = [
    "./emails/**"
  ]

  [functions."*"]
```

3. Ensure the rest of file sections remain unchanged (`headers`, `[plugins]`, etc.).

4. Quick diff check.

```bash
git diff -- deploy/netlify.toml
```

## Step 4 — Smoke Test / Verification
Run from repo root so local behavior matches deployment entry points in Phase 0.

1. Start Netlify dev.

```bash
cd /Users/jonahgrigoryan/GP_EA
source .aws-phase1.env
npx netlify dev --dir deploy --functions deploy/netlify/functions
```

2. In a second terminal, run the verification calls below.
   - If API key mode is enabled, run `source .aws-phase1.env` in that second terminal too.

3. CORS preflight check.

```bash
curl -i -X OPTIONS http://localhost:8888/.netlify/functions/capture-init
```

4. Valid `POST` without API key (run only when `AWCS_CAPTURE_API_KEY` is unset).

```bash
curl -i -X POST http://localhost:8888/.netlify/functions/capture-init \
  -H "Content-Type: application/json" \
  -d '{"content_type":"image/jpeg","file_ext":"jpg"}'
```

5. Valid `POST` with API key (required when `AWCS_CAPTURE_API_KEY` is set).

```bash
curl -i -X POST http://localhost:8888/.netlify/functions/capture-init \
  -H "Content-Type: application/json" \
  -H "x-awcs-capture-key: ${AWCS_CAPTURE_API_KEY}" \
  -d '{"content_type":"image/jpeg","file_ext":"jpg"}'
```

6. Negative API-key test (run only when `AWCS_CAPTURE_API_KEY` is set).

```bash
curl -i -X POST http://localhost:8888/.netlify/functions/capture-init \
  -H "Content-Type: application/json" \
  -d '{"content_type":"image/jpeg","file_ext":"jpg"}'
```

Expect `HTTP 403` and `{"error":"Missing or invalid x-awcs-capture-key"}`.

7. Optional verification of response shape.
   - If key is enabled, include header `x-awcs-capture-key`.
   - If key is disabled, omit that header.

```bash
# key-enabled mode
curl -s -X POST http://localhost:8888/.netlify/functions/capture-init \
  -H "Content-Type: application/json" \
  -H "x-awcs-capture-key: ${AWCS_CAPTURE_API_KEY}" \
  -d '{"content_type":"image/jpeg","file_ext":"jpg"}' \
  | jq '{capture_id: .capture_id, expires_in_seconds: .expires_in_seconds, has_photo_url: (.photo_put_url|length>0), has_summary_url: (.summary_put_url|length>0)}'

# key-disabled mode
curl -s -X POST http://localhost:8888/.netlify/functions/capture-init \
  -H "Content-Type: application/json" \
  -d '{"content_type":"image/jpeg","file_ext":"jpg"}' \
  | jq '{capture_id: .capture_id, expires_in_seconds: .expires_in_seconds, has_photo_url: (.photo_put_url|length>0), has_summary_url: (.summary_put_url|length>0)}'
```

8. Optional key-format contract check for dynamic extension.
   - Use the same API-key header rule as Step 7.

```bash
# Add: -H "x-awcs-capture-key: ${AWCS_CAPTURE_API_KEY}" when key mode is enabled
curl -s -X POST http://localhost:8888/.netlify/functions/capture-init \
  -H "Content-Type: application/json" \
  -d '{"content_type":"image/heic","file_ext":"heic"}' \
  | jq '{photo_put_url: .photo_put_url, summary_put_url: .summary_put_url}'
```

Expect `photo_put_url` to include `/photo.heic` and `summary_put_url` to include `/summary.json`.

## Failure and recovery
- `Error: Missing required AWS environment variables`
  - Confirm environment loading:
    - `echo "$AWCS_S3_BUCKET"`
    - `echo "$AWS_REGION"`
    - `echo "$AWS_ACCESS_KEY_ID"`
    - `echo "$AWS_SECRET_ACCESS_KEY"`
    - `echo "$AWCS_CAPTURE_API_KEY"` (optional)
  - In `netlify.toml`, keep env assignments only in Netlify UI/CLI, not in source files.
- `403` for missing `x-awcs-capture-key`
  - Verify `AWCS_CAPTURE_API_KEY` is either unset for open mode or the request includes exact header value.
- Missing expected `403` in Step 4.6
  - If `AWCS_CAPTURE_API_KEY` is unset, missing-key requests should return `200`, not `403`.
- `405` from function
  - Ensure method is POST and URL is `/.netlify/functions/capture-init`.
- `400 Invalid input`
  - Use only `content_type: image/jpeg|image/heic|image/heif`
  - Use only `file_ext: jpg|heic`
- Local `netlify dev` does not auto-load function
  - Ensure function exists at `deploy/netlify/functions/capture-init.js`.
  - Ensure you are running from repo root with `--dir deploy --functions deploy/netlify/functions`.
  - Restart dev server after each `capture-init.js` edit.
- `Cannot find package '@aws-sdk/client-s3'` or similar module resolution errors
  - Confirm dependencies were installed from repo root in Step 1.
  - If still unresolved in local dev, run `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` inside `deploy/` as a local fallback.
- `Failed to generate pre-signed URL`
  - Confirm IAM keys and bucket path are correct and active.
  - Re-run phase 1 smoke test with same key pair to confirm PutObject rights to `captures/*`.

## Handoff to Phase 3
Before moving to website work:
1. Confirm `.gitignore` includes local artifacts (`.netlify`, `.aws-phase1.env`, and `node_modules/`) and that no secrets are tracked.
2. Record/confirm these artifacts:
   - `AWCS_S3_BUCKET`
   - `AWS_REGION`
   - `deploy/netlify/functions/capture-init.js` implemented and returns expected fields
   - key naming contract confirmed: `photo.<file_ext>` + `summary.json`
   - `deploy/netlify.toml` contains:
     - `[build] publish = "."`
     - `[functions] directory = "netlify/functions"`
3. Confirm local function call behavior with `curl` passes for:
   - valid request (200),
   - valid request with key if required,
   - invalid key path (403) if key mode is on.
4. Then proceed to `PHASE-3-WEBSITE.md` only after phase 2 is green.
