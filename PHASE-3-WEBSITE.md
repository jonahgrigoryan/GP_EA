# Phase 3: Website Changes

Date: 2026-02-28  
Status: Pending

## Objective
Implement only website capture flow wiring for v0.

- Remove website file upload from Netlify form flow.
- Add optional capture toggle + launch CTA for iOS app deep link.
- Surface capture return values into hidden form fields and show capture status.
- Keep existing contact form submission path (`fetch('/', { method: 'POST', body: new FormData(form) })`) intact.

## Scope (Do Not Do in This Phase)
- Do not edit `deploy/assets/js/script.js` form logic outside contact form behavior.
- Do not edit Netlify config or function code.
- Do not touch AWS provisioning/Netlify env vars.
- Do not implement iOS deep-link handling; this phase only builds the website UI + form payload behavior.

## Decisions Locked for Phase 3
- Submit behavior is manual only.
  - Do not auto-submit when capture params are present in the URL.
  - User must still complete/confirm form fields and click `Send Message`.
- URL cleanup behavior for v0 strips all query params after capture hydration.
  - Keep `window.location.pathname + window.location.hash` behavior to prevent stale capture param resubmission.
  - Preserving non-capture query params (for example `utm_*`) is deferred to a later phase.

## Required Outputs
1. Updated `deploy/index.html`:
   - Remove image upload UI block (`label`, `input id="image" name="image"`, `.form-hint` file text).
   - Add checkbox:
     - `id="include-capture"` (capture optional)
   - Add button:
     - `id="launch-capture"` with label `Launch iPhone Capture`
   - Add status text:
     - `id="capture-status"` default text `No capture attached.`
   - Add hidden inputs in the form:
     - `capture_id`, `length_cm`, `width_cm`, `area_cm2_lxw`
2. Updated `deploy/assets/js/script.js`:
   - Remove file validation block tied to `#image`.
   - Add launch button handler to open:
     - `awcswoundcapture://start?return_url=<urlencoded return_url>`
   - Add URL query parse on page load to populate hidden fields.
   - Add submit guard: if `#include-capture` checked and `capture_id` missing, block with `Launch capture first.`

## Preflight Checklist
1. Confirm handoff prerequisites.
   - Phase 1 complete (AWS values available).
   - Phase 2 complete (`capture-init` implemented and Netlify function working).
2. Confirm working paths.
   - `cd /Users/jonahgrigoryan/GP_EA`
   - `ls deploy`
3. Confirm baseline contact form state.
   - `rg -n 'id="contact-form"|name="contact"|id="image"|name="image"' deploy/index.html`
   - Confirm `netlify` attributes are intact: `id="contact-form"`, `name="contact"`, `data-netlify="true"`.
4. Confirm JS entrypoint.
   - `rg -n 'initContactForm|function initContactForm|FormData(form)' deploy/assets/js/script.js`
5. Confirm running from expected directory for smoke test.
   - `pwd`
   - expected: `/Users/jonahgrigoryan/GP_EA`

## Step 1 — Update `deploy/index.html` contact form markup
1. Open `deploy/index.html` and locate the contact form section (`id="contact-form"`).
2. Replace the existing file-upload block (label + file input + hint) with:
   - optional capture checkbox
   - launch button
   - status text
   - hidden capture fields

### Replace this block

```html
<div class="form-group">
    <label for="image">Attach Image <span class="optional">(optional)</span></label>
    <input type="file" id="image" name="image" accept="image/*">
    <span class="form-hint">Max file size: 10MB. Accepted formats: JPG, PNG, GIF, WebP.</span>
</div>
<button type="submit" class="btn btn--primary btn--full">Send Message</button>
<p class="form-disclaimer">By submitting this form, you consent to being contacted regarding wound care services. Your information will be kept confidential in accordance with our <a href='/privacy-policy'>Privacy Policy</a>.</p>
```

### With this block

```html
<div class="form-group">
    <label>
        <input type="checkbox" id="include-capture" name="include_capture" value="1">
        Add wound capture (optional)
    </label>
</div>
<div class="form-group">
    <button type="button" id="launch-capture" class="btn btn--secondary btn--full">Launch iPhone Capture</button>
    <p id="capture-status" class="form-hint">No capture attached.</p>
</div>
<input type="hidden" id="capture-id" name="capture_id" value="">
<input type="hidden" id="length-cm" name="length_cm" value="">
<input type="hidden" id="width-cm" name="width_cm" value="">
<input type="hidden" id="area-cm2" name="area_cm2_lxw" value="">
<button type="submit" class="btn btn--primary btn--full">Send Message</button>
<p class="form-disclaimer">By submitting this form, you consent to being contacted regarding wound care services. Your information will be kept confidential in accordance with our <a href='/privacy-policy'>Privacy Policy</a>.</p>
```

3. Keep the existing form attributes untouched:
   - `id="contact-form"`
   - `name="contact"`
   - `method="POST"`
   - `data-netlify="true"`
   - `form-name` hidden input must remain:
     - `<input type="hidden" name="form-name" value="contact">`
     - Keep it as the first child of the form.
   - existing `enctype="multipart/form-data"` may remain for backward compatibility (optional removal later if desired).
   - CRITICAL: do not remove `form-name`; Netlify Forms uses it to identify the form submission.

## Step 2 — Update `deploy/assets/js/script.js` contact form logic
1. Edit `initContactForm()` only. Keep existing name/email/phone/message validation and Netlify POST submission intact.
2. Add capture utility variables at start of `initContactForm()`:
   - form refs for `#include-capture`, `#launch-capture`, `#capture-status`
   - hidden input refs for capture payload
3. Remove the entire file-validation block:
   - lines containing `var fileInput = form.querySelector('input[type="file"]');`
   - its size/type checks

4. Add a loader for URL params on page load:
   - parse `capture_id`, `length_cm`, `width_cm`, `area_cm2_lxw`
   - populate corresponding hidden fields
   - update `#capture-status` to indicate attached capture
   - clean URL after hydration so users don’t resubmit with old params
   - for v0, strip all query params intentionally (`window.location.pathname + window.location.hash`)

5. Add launch handler:
   - construct `return_url` as:
     - `window.location.origin + window.location.pathname + "#contact"`
   - encode and navigate:
     - `awcswoundcapture://start?return_url=${encodeURIComponent(return_url)}`

6. Add submit guard:
   - if capture checkbox is checked and `capture_id` is empty -> message `Launch capture first.` and abort submit.

### Example replacement for the `initContactForm()` function

```js
function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const includeCaptureCheckbox = document.getElementById('include-capture');
    const launchCaptureButton = document.getElementById('launch-capture');
    const captureStatus = document.getElementById('capture-status');
    const captureIdInput = document.getElementById('capture-id');
    const lengthCmInput = document.getElementById('length-cm');
    const widthCmInput = document.getElementById('width-cm');
    const areaCm2Input = document.getElementById('area-cm2');

    if (includeCaptureCheckbox) {
        includeCaptureCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                // Keep any previously returned capture data if user unchecks.
                // Submission is optional unless checkbox is checked.
            }
        });
    }

    function updateCaptureStatus() {
        if (!captureStatus) return;
        const idVal = (captureIdInput && captureIdInput.value || '').trim();
        captureStatus.textContent = idVal ? 'Capture attached.' : 'No capture attached.';
    }

    function setCaptureFromQuery() {
        var params = new URLSearchParams(window.location.search);
        var captureId = params.get('capture_id') || '';
        var lengthCm = params.get('length_cm') || '';
        var widthCm = params.get('width_cm') || '';
        var areaCm2 = params.get('area_cm2_lxw') || '';

        if (captureIdInput) captureIdInput.value = captureId;
        if (lengthCmInput) lengthCmInput.value = lengthCm;
        if (widthCmInput) widthCmInput.value = widthCm;
        if (areaCm2Input) areaCm2Input.value = areaCm2;

        if (captureId || lengthCm || widthCm || areaCm2) {
            updateCaptureStatus();
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
            if (includeCaptureCheckbox && !includeCaptureCheckbox.checked) {
                includeCaptureCheckbox.checked = true;
            }
        }
    }

    function launchCaptureApp() {
        var returnUrl = window.location.origin + window.location.pathname + "#contact";
        var deepLink = 'awcswoundcapture://start?return_url=' + encodeURIComponent(returnUrl);
        window.location.href = deepLink;
    }

    if (launchCaptureButton) {
        launchCaptureButton.addEventListener('click', function(e) {
            e.preventDefault();
            launchCaptureApp();
        });
    }

    // Auto-format phone number as (XXX) XXX-XXXX
    var phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            var digits = this.value.replace(/\D/g, '');
            if (digits.length > 10) digits = digits.substring(0, 10);
            var formatted = '';
            if (digits.length > 0) formatted = '(' + digits.substring(0, 3);
            if (digits.length >= 3) formatted += ') ';
            if (digits.length > 3) formatted += digits.substring(3, 6);
            if (digits.length >= 6) formatted += '-';
            if (digits.length > 6) formatted += digits.substring(6, 10);
            this.value = formatted;
        });
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const data = {};
        formData.forEach(function(value, key) {
            data[key] = value;
        });

        // Basic validation
        if (!data.name || !data.email || !data.phone || !data.message) {
            showFormMessage('Please fill in all required fields.', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showFormMessage('Please enter a valid email address.', 'error');
            return;
        }

        // Phone validation - expects (XXX) XXX-XXXX format
        const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
        if (!phoneRegex.test(data.phone)) {
            showFormMessage('Please enter a complete 10-digit phone number.', 'error');
            return;
        }

        const wantsCapture = includeCaptureCheckbox ? includeCaptureCheckbox.checked : false;
        const captureId = (captureIdInput && captureIdInput.value || '').trim();
        if (wantsCapture && !captureId) {
            showFormMessage('Launch capture first.', 'error');
            return;
        }

        // Disable submit button while sending
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        // Submit to Netlify Forms
        fetch('/', {
            method: 'POST',
            body: new FormData(form)
        })
        .then(function(response) {
            if (response.ok) {
                showFormMessage('Thank you for your message! We will contact you shortly.', 'success');
                form.reset();
                updateCaptureStatus();
            } else {
                showFormMessage('Something went wrong. Please try again or call us directly.', 'error');
            }
        })
        .catch(function(error) {
            showFormMessage('Something went wrong. Please try again or call us directly at (916) 250-1737.', 'error');
        })
        .finally(function() {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });

    setCaptureFromQuery();
}
```

7. Ensure there is no remaining `#image` validation logic:

```bash
rg -n "input[type=\"file\"]|fileInput|Attach Image|Max file size" deploy/assets/js/script.js
```

No output should include active submission-blocking file validation after this step.

## Step 3 — Local verification (`npx netlify dev`), no deploy
Run from repo root (consistent with Phase 0 entrypoints):

```bash
cd /Users/jonahgrigoryan/GP_EA
npx netlify dev --dir deploy --functions deploy/netlify/functions
```

1. Open `http://localhost:8888/#contact` and validate form UI:
   - `#include-capture` checkbox exists.
   - `#launch-capture` button text is `Launch iPhone Capture`.
   - `#capture-status` default text is `No capture attached.`
2. Manual launch-button check:
   - Toggle capture checkbox (optional).
   - Click Launch.
   - On desktop this may fail to open because app is unavailable; verify button click attempts deep link with:
     - `awcswoundcapture://start?return_url=http%3A%2F%2Flocalhost%3A8888%2F%23contact`
   - In DevTools Console, optionally log by temporarily adding `console.log` in launch handler if needed.
3. Manual return-param test:
   - Visit:
     - `http://localhost:8888/?capture_id=demo123&length_cm=7.2&width_cm=3.1&area_cm2_lxw=22.3#contact`
   - Confirm:
     - `capture-status` changes from “No capture attached.” to “Capture attached.”
     - hidden fields contain values for:
       - `capture_id`
       - `length_cm`
       - `width_cm`
       - `area_cm2_lxw`
     - URL no longer shows those query params after load (expected if implemented via `history.replaceState`).
4. Form validation check:
   - Check `include-capture` checkbox ON.
   - Clear/remove `capture_id`.
   - Submit form.
   - Confirm inline message is exactly “Launch capture first.” and request is not sent.
5. Form success path check:
   - Ensure all required fields filled.
   - Submit with either capture optional OFF, or optional ON + valid capture fields.
   - Verify fetch still goes to `/` and no direct file field is submitted.

## Failure and recovery
- File upload input still visible after edit.
  - Re-run `rg -n 'name="image"|id="image"|input\[type="file"\]' deploy/index.html` and remove any leftover file block.
- `Launch capture first.` still not shown when checkbox ON + no capture:
  - Confirm `#include-capture`, `#capture-id` exist and `initContactForm()` runs (put temporary `console.log('initContactForm')`).
  - Confirm submit handler uses checked state from `includeCaptureCheckbox`.
- `capture-status` not updating:
  - Verify function calls `setCaptureFromQuery()` after `form.addEventListener(...)` setup.
  - Verify IDs in HTML exactly match script:
    - `include-capture`
    - `capture-status`
    - `capture-id`, `length-cm`, `width-cm`, `area-cm2`
- Query params persist in URL after return:
  - Verify `window.history.replaceState(...)` is called in the query parser.
  - Confirm parser function runs from `initContactForm`.
- Netlify-style submission breaks after edits:
  - Confirm `fetch('/', { method: 'POST', body: new FormData(form) })` remains unchanged.
  - Keep hidden inputs inside the same form so they are submitted automatically.
- Form submits but does not appear in Netlify:
  - Confirm `<input type="hidden" name="form-name" value="contact">` still exists and remains the first form child.
- `npx netlify dev` path mismatch / 404:
  - Ensure run command uses `--dir deploy --functions deploy/netlify/functions`.
  - Confirm no stale `deploy/netlify/` directory conflicts from previous runs; restart dev server after edits.

## Handoff to Phase 4
Complete these checks before moving to iOS tasks:
1. `deploy/index.html` is updated with:
   - no file upload input for image
   - optional checkbox `id="include-capture"`
   - launch button `id="launch-capture"`
   - status text `id="capture-status"` with default “No capture attached.”
   - hidden form inputs: `capture_id`, `length_cm`, `width_cm`, `area_cm2_lxw`
2. `deploy/assets/js/script.js` includes:
   - removed file validation tied to image input
   - launch deep-link handler
   - query-param hydration of capture fields
   - submit guard with exact error text `Launch capture first.`
3. Manual smoke checks from Step 3 pass:
   - launch action produces deep-link attempt
   - query params autopopulate hidden fields and status
   - form submission blocked when capture is required but missing
   - form still posts via existing Netlify FormData path
4. Pre-setup items for Phase 4:
   - Confirm deep-link contract that iOS app expects:
     - scheme `awcswoundcapture`
     - path `start`
     - `return_url` parameter
   - Confirm return anchor is `#contact` in production and dev.
   - Confirm iOS return writes:
     - `capture_id`
     - `length_cm`
     - `width_cm`
     - `area_cm2_lxw`
5. Only after phase 3 checks pass, proceed to `PHASE-4-IOS.md`.
