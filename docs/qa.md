# Capture / estimated 3D QA — 2026-10-20

Base: `0cf9315`. Fresh clone, clean main; no existing edits were overwritten.

## Findings and cause

The reported inability to open a camera/picker in the original embedded browser cannot be reproduced without that browser/device. We do **not** claim a confirmed iOS fix. Direct camera requires a secure context, browser support and permission; embedded browsers can block it independently of the page. Native file/camera inputs remain the alternative, with Safari guidance.

A defect reproduced in real Chromium on the handoff commit: select a portrait, revoke consent, and the customer preview remains visible. The original consent handler only stopped the camera. File decoding and camera permission promises also lacked session cancellation guards; late completion could restore data or acquire a stream after clearing/revoking. During reconstruction, only some controls were locked; finally blocks unconditionally re-enabled upload, and the angle could change independently of the selected operation. Canceling a picker had no explanation. Reference-only photos still had a misleading reconstruction button label.

The repair centralizes control state, adds session/file/camera request guards, discards stale results and stops late streams. Consent revocation clears the session. Failed reconstruction preserves the selected preview and enables retry; failed model initialization resets its promise. Clear also resets angle, zoom, wireframe and undo history. The same guarded decoding path serves native capture and library selection. Camera errors explain HTTPS, denied permission and embedded-browser alternatives. A bounded gesture undo history supplements reset and hold-to-view original. Pending PNG export is canceled when the session is cleared.

## Executed evidence

Windows, Node 24.11.0, Playwright 1.64.1, installed Chromium headless build 1243, SwiftShader WebGL. This is a real browser engine with real MediaPipe CPU/WASM inference, **not** a DOM stub. No physical camera was available; the native camera attempt returned `Not supported`. Camera denial and capture state tests therefore use explicitly controlled `getUserMedia` adapters/canvas streams. They do not prove physical camera operation.

- `npm run setup`: all pinned assets downloaded/verified with SHA-256.
- `npm run check`: passed.
- `npm test`: passed, including reproduction of the historical consent defect and verification of repaired behavior.
- Photo decode → preview → separate build → 478 landmarks → real textured mesh.
- All seven nose/chin/lip controls; rendered pixels change; keyboard gesture undo; reset; hold original; 0/45/90 presets; reference dialog; PNG download.
- Invalid image, no-face image, picker cancel event, injected model request failure followed by successful retry, clear during delayed model loading, revoke consent, phone-width overflow check.
- Module, model and WASM HTTP status/MIME checked; no uncaught page JavaScript errors. The model-failure case intentionally produces one browser network error.
- Runtime HTTP requests were local GETs only; no photo upload or remote inference. `data:`/`blob:` URLs are local previews/downloads.

The portrait is the public [MediaPipe test fixture](https://storage.googleapis.com/mediapipe-assets/portrait.jpg), SHA-256 `a6f11efaa834706db23f275b6115058fa87fc7f14362681e6abe14e82749de3e`. It is fetched only by the test runner; the application never fetches it. It is a real photograph, not AI imagery or replacement mesh. Screenshots show actual inference output:

[Front](qa/view-0.png) · [45°](qa/view-45.png) · [90°](qa/view-90.png) · [Export](qa/comparison.png) · [390px layout](qa/phone.png)

The surface has open eye/mouth regions and stretched/uncertain side textures. It is an estimated facial surface, not a depth scan, full head or treatment prediction.

## Repeat locally

Run `npm ci`, `npm run setup`, `npx playwright install chromium`, then `npm start` in one terminal and `npm test` in another. Tests fetch the pinned public portrait into ignored `artifacts/` if absent. Optional `BROWSER_EXECUTABLE` selects an installed compatible Chromium. Screenshots and PNG download are written to ignored `artifacts/`. Tests require the git history containing `0cf9315` for historical reproduction.

## Still required on real iPhone / iPad

Use HTTPS in Safari and the actual embedded browser. Test native camera/library invocation and cancellation, real permission denial/regrant, front-camera playback and snapshot, orientation/EXIF, HEIC decode or clear JPEG fallback, memory pressure, WebGL context loss, touch drag/hold, download/save-to-Photos behavior and landscape/portrait layout. A simulated viewport or controlled camera stream does not establish any of those. No production deployment was performed.
