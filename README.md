You are the primary coding agent. Build AWCS “Staff Wound Capture” v0.

CONTEXT
- You will be given a ZIP of the current awcs.health Netlify static site.
- The current site has a Netlify form in index.html (#contact, form id="contact-form", name="contact") and a file input name="image".
- Current JS is assets/js/script.js which submits the form via fetch("/", { method:"POST", body:new FormData(form) }).

GOAL (END-TO-END WORKFLOW)
From awcs.health → Contact Us section:
1) Staff optionally chooses “Add wound capture”.
2) Website launches an internal iOS app (TestFlight).
3) iOS app captures a sharp high-res wound photo + uses LiDAR depth to measure:
   - length_cm
   - width_cm
   - area_cm2_lxw = length_cm * width_cm
4) iOS app uploads photo + summary.json to a PRIVATE S3 bucket via pre-signed PUT URLs (no AWS creds in app).
5) iOS app returns to awcs.health with capture_id + measurements in the URL.
6) Website auto-fills hidden inputs and submits the Netlify form.
7) Netlify submission/email includes only: capture_id, length_cm, width_cm, area_cm2_lxw. (NO photo in Netlify form.)
8) Replace/remove the existing “Attach Image” file input on the website once app flow exists.

NON-GOALS / SAFETY
- Do NOT show diagnosis, treatment recommendations, or any medical claims on the public website.
- Keep all measurement output internal/staff-only. The site should only submit numeric fields + capture_id.
- Keep S3 bucket private (block public access). Store PHI in S3 only.

DELIVERABLES
A) Website changes:
   - index.html: remove <input type="file" name="image"> and its label/hint.
   - Add a “Launch iPhone Capture” button and a checkbox toggle (capture optional).
   - Add hidden inputs to the form:
        capture_id, length_cm, width_cm, area_cm2_lxw
   - script.js:
        - Remove file validation code.
        - Add handler for launch button that opens the iOS app via custom URL scheme (see below).
        - On page load, parse URL query params (capture_id, length_cm, width_cm, area_cm2_lxw). If present, populate hidden inputs and update UI “Capture attached”.
        - In form submit: if capture toggle is ON but capture_id missing -> block submit with message “Launch capture first.”
        - Keep existing name/email/phone/message validation and Netlify fetch submission.

B) Netlify Function:
   - Add netlify/functions/capture-init.js (Node runtime).
   - This function returns:
        capture_id (uuidv4),
        presigned PUT URL for photo (captures/<capture_id>/photo.jpg),
        presigned PUT URL for summary (captures/<capture_id>/summary.json)
     Optional: overlay upload URL if you implement overlay, but NOT required for v0.
   - Use AWS SDK v3 (@aws-sdk/client-s3 and @aws-sdk/s3-request-presigner).
   - Read env vars:
        AWS_REGION
        AWS_ACCESS_KEY_ID
        AWS_SECRET_ACCESS_KEY
        AWCS_S3_BUCKET
        (optional) AWCS_CAPTURE_API_KEY
   - Implement CORS for POST + OPTIONS.
   - If AWCS_CAPTURE_API_KEY is set, require header `x-awcs-capture-key` to match.

C) Netlify config:
   - netlify.toml: fix [build] publish to a RELATIVE path (use publish="." unless you introduce a build dir).
   - Add [functions] directory = "netlify/functions".
   - Keep existing plugin-emails config unchanged.
   - Add package.json at repo root if none exists, with dependencies for the function.

D) AWS CLI provisioning (you can run AWS commands):
   1) Determine region: `aws configure get region` (if empty, choose us-west-2).
   2) Create private S3 bucket (unique name):
        awcs-wound-capture-prod-<random>
      - Block public access
      - Enable default encryption (SSE-S3)
      - Optional: lifecycle to expire objects after N days (ask if needed).
   3) Create IAM user (e.g., awcs-wound-capture-signer) with least-privilege policy:
      - Allow s3:PutObject, s3:GetObject for arn:aws:s3:::BUCKET/captures/*
      - (If needed for some SDK flows) allow s3:ListBucket on arn:aws:s3:::BUCKET with prefix condition captures/*
   4) Create access key for that user.
   5) Set Netlify site env vars (either Netlify UI or CLI if available):
        AWCS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWCS_CAPTURE_API_KEY

E) iOS app (SwiftUI, TestFlight-ready):
   - App name: “AWCS Wound Capture”
   - Register custom URL scheme: `awcswoundcapture`
   - Deep link format from website:
        awcswoundcapture://start?return_url=<urlencoded https://awcs.health/?...#contact>
   - App behavior:
     1) Parse return_url from deep link.
     2) Capture high-res still photo + depth using LiDAR depth camera.
        - Prefer AVCapturePhotoOutput with depth data delivery enabled when supported.
        - Use AVCameraCalibrationData intrinsicMatrix to map pixel+depth → 3D for measurement.
     3) Measurement UI (v0 simplest & reliable):
        - After capture, show still image.
        - User taps 2 points for LENGTH endpoints.
        - User taps 2 points for WIDTH endpoints.
        - For each tapped point: sample depth (average a small NxN window) and map to 3D using intrinsics.
        - Compute length_cm and width_cm as Euclidean distance in 3D; area_cm2_lxw = length_cm*width_cm.
        - Display results; allow retake.
     4) Upload:
        - POST to https://awcs.health/.netlify/functions/capture-init with header x-awcs-capture-key if enabled.
        - Receive capture_id + presigned PUT URLs.
        - PUT photo.jpg and summary.json to S3.
     5) Return:
        - Open return_url in Safari with query params:
            capture_id, length_cm, width_cm, area_cm2_lxw
        - Ensure it lands at #contact.

   - summary.json schema (minimum):
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

ACCEPTANCE TESTS
1) Local web:
   - Load site, scroll to contact, toggle capture ON, click Launch -> attempts to open app scheme URL.
   - If return params present in URL, hidden inputs populate and UI shows “Capture attached”.
2) Local function:
   - netlify dev runs function at /.netlify/functions/capture-init.
   - curl POST returns capture_id + presigned URLs.
3) AWS:
   - Uploads land in S3 under captures/<capture_id>/photo.jpg and summary.json.
4) End-to-end:
   - After app returns to site with query params, submit form successfully.
   - Netlify submission contains capture_id + numeric fields (and NO file upload field).

IMPLEMENTATION ORDER (MUST FOLLOW)
1) AWS bucket + IAM + credentials first (function needs them).
2) Netlify function + local test via netlify dev.
3) Website changes (remove file field, add hidden fields, parse query params).
4) iOS app capture + measurement + upload + return.
5) Final integrated test + packaging for deployment.

QUESTIONS YOU SHOULD ASK ONLY IF BLOCKING
- What AWS region to use if none configured?
- Confirm Netlify site URL (awcs.health) and whether to use a different base for functions during dev.
- Decide retention/lifecycle (how long to keep capture objects in S3).

OUTPUT FORMAT
- Provide a clean patch/diff (or PR) with all changed/added files.
- Provide a short README with setup commands:
  - AWS CLI commands used
  - Netlify env vars required
  - How to run netlify dev
  - How to build/archive iOS app for TestFlight upload