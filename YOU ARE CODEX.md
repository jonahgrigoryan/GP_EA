YOU ARE CODEX. Build “AWCS Staff Wound Capture v0” end-to-end (website + Netlify function + AWS + iOS app).

REPO FACTS (verify in codebase before editing)
- Static site with index.html and assets/js/script.js.
- Contact form: <form id="contact-form" name="contact" method="POST" data-netlify="true" enctype="multipart/form-data"> with hidden form-name input.
- index.html currently includes file input: <input type="file" id="image" name="image" accept="image/*">.
- assets/js/script.js validates file size/type and submits via fetch("/", { method:"POST", body:new FormData(form) }).
- netlify.toml exists and currently uses an absolute [build] publish path; fix to relative.

GOAL (USER FLOW)
Website awcs.health → Contact Us:
1) Staff clicks “Launch iPhone Capture”.
2) iOS app opens (TestFlight internal build), captures a SHARP high-res photo and measures:
   - length_cm
   - width_cm
   - area_cm2_lxw = length_cm * width_cm
3) App uploads photo + summary.json to a PRIVATE S3 bucket using pre-signed PUT URLs minted by a Netlify Function (NO AWS creds in app). Pre-signed URLs are the mechanism. :contentReference[oaicite:2]{index=2}
4) App returns to awcs.health with query params: capture_id, length_cm, width_cm, area_cm2_lxw (#contact anchor).
5) Website auto-fills hidden fields and submits Netlify form.
6) Netlify submission/email contains ONLY: capture_id + the 3 numeric fields. No photo attached to the form.

IMPORTANT CONSTRAINTS
- Replace/remove the website file upload field entirely once app flow exists.
- Do NOT store photos in Netlify forms (8MB max request + 30s upload timeout). :contentReference[oaicite:3]{index=3}
- Don’t commit secrets. Put AWS/Netlify secrets in .env (local) and document needed Netlify env vars.
- No diagnosis/treatment recommendations shown on the public website.

DELIVERABLES
A) AWS provisioning via AWS CLI (you can run commands)
B) Netlify Function: /.netlify/functions/capture-init
C) Website modifications (index.html + assets/js/script.js)
D) netlify.toml fixes and local dev instructions (netlify dev)
E) iOS SwiftUI app skeleton (TestFlight-ready): capture + two-line measurement + upload + return

IMPLEMENTATION ORDER (follow strictly)
1) AWS bucket + IAM signer creds (so function can sign)
2) Netlify function + local test (netlify dev)
3) Website updates (remove file input, add launch button + hidden fields + URL param parsing)
4) iOS app (deep link, capture, measurement, upload, return)
5) End-to-end manual test checklist + README

--------------------------------------------
(1) AWS SETUP (CLI)
- Determine region (use `aws configure get region`; if empty pick us-west-2).
- Create S3 bucket (globally unique name): awcs-wound-capture-prod-<random>
- Block public access, enable default encryption (SSE-S3).
- Create IAM user “awcs-wound-capture-signer” with least privilege:
  Allow s3:PutObject for arn:aws:s3:::BUCKET/captures/*
  Allow s3:GetObject for arn:aws:s3:::BUCKET/captures/* (optional but useful)
  Allow s3:ListBucket for arn:aws:s3:::BUCKET with prefix condition “captures/” (only if needed)
- Create access key for that IAM user (DO NOT print secret key into git; store locally in .env for dev, and list required Netlify env vars in README).

Output: bucket name + region + instructions for setting env vars in Netlify UI.

--------------------------------------------
(2) NETLIFY FUNCTION: capture-init
Create: netlify/functions/capture-init.mjs (or .js)
- Method: POST only; respond to OPTIONS (CORS).
- Input JSON:
  {
    "content_type": "image/jpeg" | "image/heic" | "image/heif",
    "file_ext": "jpg" | "heic"
  }
- Output JSON:
  {
    "capture_id": "<uuid>",
    "photo_put_url": "<presigned PUT url>",
    "summary_put_url": "<presigned PUT url>",
    "expires_in_seconds": 900
  }
- Use AWS SDK v3 (@aws-sdk/client-s3 + @aws-sdk/s3-request-presigner) to generate pre-signed PUT URLs (and set expiresIn).
- Use env vars:
  AWS_REGION
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWCS_S3_BUCKET
  (optional) AWCS_CAPTURE_API_KEY -> if set, require request header x-awcs-capture-key
- Key naming:
  captures/<capture_id>/photo.<ext>
  captures/<capture_id>/summary.json

Notes:
- Netlify function directory defaults to netlify/functions, but explicitly set in netlify.toml for clarity. :contentReference[oaicite:4]{index=4}

Local test:
- Use netlify dev; functions should be available at http://localhost:8888/.netlify/functions/capture-init and .env should load. :contentReference[oaicite:5]{index=5}

--------------------------------------------
(3) WEBSITE CHANGES
index.html:
- REMOVE the file upload UI block (label + <input type="file" ...> + hint).
- Add UI:
  - Button id="launch-capture" text “Launch iPhone Capture”
  - status text id="capture-status" default “No capture attached.”
- Add hidden inputs inside the Netlify form:
  capture_id, length_cm, width_cm, area_cm2_lxw

assets/js/script.js:
- Remove any file-validation logic tied to #image.
- Add:
  (a) Launch button handler:
      - Build return_url = window.location.origin + window.location.pathname + "#contact"
      - Open app via custom URL scheme:
        awcswoundcapture://start?return_url=<urlencoded return_url>
      - (Optional) show a message if not on iOS.
  (b) On page load:
      - Parse URL query params: capture_id, length_cm, width_cm, area_cm2_lxw
      - If present: populate hidden inputs, update #capture-status to show values, and optionally clean the URL (history.replaceState).
  (c) On submit:
      - If “capture is intended” (v0: require capture if any measurement fields exist OR if you add a checkbox, require capture_id when checked), block submission if capture_id missing.
- Keep existing FormData fetch submission to Netlify.

No photo should be posted to Netlify.

--------------------------------------------
(4) NETLIFY CONFIG / DEPLOYMENT
netlify.toml:
- Fix [build] publish to "." (relative).
- Add/ensure:
  [functions]
    directory = "netlify/functions"
    node_bundler = "esbuild"   (optional but good)
- Keep existing plugin-emails config unchanged.
- Add package.json at repo root for function deps.

Deploy guidance:
- Recommend Netlify CLI deploy because it uploads static files + functions. :contentReference[oaicite:6]{index=6}
  Example:
    netlify deploy --prod --dir . --functions netlify/functions

--------------------------------------------
(5) iOS APP (SwiftUI, TestFlight internal)
Create a new SwiftUI app project: “AWCS Wound Capture”
- Configure custom URL scheme: awcswoundcapture
- Deep link: awcswoundcapture://start?return_url=<urlencoded>

Capture + measurement:
- Use AVFoundation photo capture with depth data on LiDAR devices.
- Prefer LiDAR depth camera device type when available. :contentReference[oaicite:7]{index=7}
- Use camera intrinsics from AVCameraCalibrationData.intrinsicMatrix for pixel-to-3D mapping. :contentReference[oaicite:8]{index=8}
- UI:
  1) Capture photo
  2) Measurement screen: user taps 2 points for LENGTH, then 2 points for WIDTH
  3) Compute:
     - for each tap: map (u,v) + depth Z -> 3D point using intrinsics
     - distance_m = ||P1 - P2||, then length_cm = distance_m * 100
     - area_cm2_lxw = length_cm * width_cm
  4) Review screen with sharp photo + overlaid lines + numbers; retake option

Upload:
- POST to https://awcs.health/.netlify/functions/capture-init (send x-awcs-capture-key if env enabled)
- Receive capture_id + photo_put_url + summary_put_url
- PUT photo bytes to photo_put_url
- PUT summary.json to summary_put_url
- summary.json minimum schema:
  {
    "capture_id": "...",
    "length_cm": 0.0,
    "width_cm": 0.0,
    "area_cm2_lxw": 0.0,
    "timestamp_iso": "...",
    "device_model": "...",
    "notes": [],
    "needs_manual_review": false
  }

Return:
- Open:
  <return_url>?capture_id=...&length_cm=...&width_cm=...&area_cm2_lxw=...#contact

--------------------------------------------
ACCEPTANCE CHECKLIST
1) Local function:
   - netlify dev
   - curl POST returns capture_id + presigned URLs
2) AWS:
   - photo + summary appear in s3://BUCKET/captures/<capture_id>/
3) Web:
   - returning URL auto-fills hidden inputs and updates status
   - submitting form sends capture_id + numbers
4) iOS:
   - deep link opens app
   - capture -> measurement -> upload -> return works

OUTPUT REQUIREMENTS
- Provide a single cohesive patch/diff (or commits) with all new/changed files.
- Provide README.md “Setup & Runbook” covering:
  - AWS CLI commands executed
  - Netlify env vars required
  - how to run netlify dev
  - how to deploy with netlify deploy --prod (functions included) :contentReference[oaicite:9]{index=9}
  - TestFlight internal distribution steps (internal testers up to 100). :contentReference[oaicite:10]{index=10}

ONLY ASK CLARIFYING QUESTIONS IF BLOCKING
- Which AWS region if none configured?
- Confirm production domain (awcs.health) for function URL and return_url.
- Do we want an API key gate on capture-init (recommended but optional)?