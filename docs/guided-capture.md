# Guided capture — implementation and QA, 2026-10-20

Built on `ca05dd9` (`fix/capture-3d-flow`, PR #1). Remote main was checked before work and was still `0cf9315`; no uncommitted changes existed. This feature PR targets the capture-fix branch so it reviews only the new module.

## Behavior and structure

- `capture-quality.js`: pure matrix/landmark analysis, independent pixel metrics, one prioritized instruction, and a deterministic stability/countdown gate. Priority is no/multiple faces → position → size → pitch/roll → target yaw → brightness → sharpness → hold. Manual 90° never requires successful landmarks and never auto-captures.
- `capture-worker.js`: local MediaPipe 0.10.21, two-face limit, CPU delegate, transformation matrices enabled. One detector switches IMAGE/VIDEO modes serially. Classic worker is intentional because the WASM loader uses `importScripts`. Model and WASM remain same-origin.
- `capture-analyzer.js`: serialized worker client, timeout/error recovery, ImageBitmap transfer/close. Longest input edge is 640px; pixel quality is measured on the detected face ROI normalized to 128×128. No-face images use the whole image for diagnostic metrics.
- `guided-capture.js`: front/left/right review workflow, optional profile, configurable trial rules, stable hold and countdown progress, retake and exactly-once auto-capture per stored step. A still snapshot is rechecked before automatic storage, so a newly degraded frame cancels the shot. Manual shots/uploads can be kept with explicit review warnings; saving three images is not presented as three valid images or completed reconstruction.
- Existing `app.js`: consent, native/library fallback, full-resolution camera PNG or original uploaded File retained as `originalBlob` in each in-memory record alongside derived canvas, quality, rule configuration, step and timestamp. Rendering still uses a capped 1600px canvas. Session clear/revoke discards originals, previews, records, model worker and old tasks. No localStorage/IndexedDB or upload was added.

Live polling waits at least 250ms (configurable), then waits longer when inference is slow (`max(interval, 2 × processing duration)`). It never queues realtime frames, does not process unchanged/paused/hidden video, and stops processing stored steps. There is no claim that this proves acceptable heat/battery use on iPad.

Native camera/library mode explicitly checks **after receipt** and cannot give realtime guidance. If Worker/OffscreenCanvas/WASM are unsupported, the UI explains that quality is unverified, retains the manual reconstruction path and suggests a newer Safari. It does not invent a successful quality result.

## Pose and mirror convention

Matrices use column-major packing, with Euler YXZ extraction and scale removed from pitch. Positive yaw is used for the customer's left (+45°); negative for the customer's right (−45°), measured on unmirrored input. Only the `<video>` CSS is mirrored; inference, original blobs and stored previews use raw pixels. The symmetric oval follows the video's aspect ratio with `object-fit: contain`, avoiding hidden crop coordinates.

Checked: synthetic known Euler matrices at ±45°, pitch ±10° and roll ±8°; raw/reflective projection convention; actual model output on a photograph and its horizontally reflected pixels (yaw +2.46° vs −0.75°, roll +0.62° vs −0.78°). This establishes implementation/reflection behavior but **does not replace a person turning to a labeled side in a physical selfie camera**. That final physical left/right check, and error at real ±45°, remain required on iPhone/iPad. Arbitrary mirrored uploads have no reliable provenance; review them manually.

References: [MediaPipe Web guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js), [MatrixData packing](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/framework/formats/matrix_data.proto), [FaceLandmarker source](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/face_landmarker/face_landmarker.ts).

## Initial threshold measurements — not validated quality standards

Actual public MediaPipe portrait, same pinned SHA-256 as the earlier QA. Cropped around real detected landmarks so face height is about 0.63 of frame. Variants are deliberately transformed **test fixtures**, never replacement reconstruction results. Actual worker CPU/WASM inference produced:

| Fixture | Face count / priority | Mean face luminance | Laplacian variance |
|---|---|---:|---:|
| Real frontal crop | 1 / ready under trial rules | 147.04 | 1602.24 |
| Darkened crop, 85% black overlay | 1 / dark | 21.84 | 36.38 |
| Crop with 9px Gaussian blur | 1 / blur | 146.21 | 3.76 |
| Two copies, separate faces | 2 / multiple | 60.92 | 3476.49 |
| Blank image | 0 / no face | 0 | 0 |
| Crop moved off center | 1 / position | 147.87 | 1337.00 |

The dark threshold 55 lies conservatively between this dark fixture and clear fixture (about one quarter of their observed gap). The sharpness trial cutoff was adjusted to **75**, near the geometric midpoint (~78) of measured blurred/clear values. These two samples justify separating these test fixtures only. They do not establish sensitivity/specificity, natural motion-blur behavior, skin-tone fairness or general accuracy. Laplacian variance can be fooled by noise, texture, makeup, compression and resolution. Brightness can be fooled by lighting/background and overexposure.

Other defaults are **provisional operating settings**, not empirically validated acceptance limits: yaw ±12° around 0/+45/−45, pitch 14°, roll 10°, face height 0.38–0.82, center offset 0.16, maximum luminance 225, 1200ms hold + 1800ms countdown, angle drift 4°, center/scale drift 0.025 and max frame gap 900ms. All are adjustable in the UI. The gate compares both adjacent samples and the original stability anchor, preventing slow cumulative drift from passing. Any failing rule, excessive movement or sampling gap resets the countdown.

No natural multi-angle video or physical phone footage was available. We used a controlled browser canvas stream containing the real photograph, moved/darkened during the countdown, with **real VIDEO inference**. This tests the algorithm/UI and initial image heuristics, not physical acquisition. Calibration across actual labeled multi-angle captures remains unfinished; the product consistently labels these as trial thresholds and requires staff review instead of claiming “AI-certified quality.”

## Executed tests and evidence

Windows / Node 24.11.0 / Playwright 1.64.1 / installed Chromium headless build 1243 / SwiftShader. `npm run check`, `git diff --check` and `npm test` passed.

- Pure tests: no/multiple faces, dark/blur priority, frame/size checks, Euler extraction and subject-side convention, front/left/right transitions, motion/quality/gap cancellation and exactly-once capture.
- Actual worker IMAGE and VIDEO: matrices returned, real crop and mirror, two-face composite, blank, dark, blurred and off-center fixtures.
- Actual UI: library and native-input file receipt, reason for wrong-angle photo, three manually stored steps with warning labels, next-angle selection, retake/review, front reconstruction, erase/revoke.
- Actual VIDEO-driven UI using a controlled stream: visible hold/countdown; moving the image cancels; darkening cancels; restoring it triggers capture; no repeat on the same stored step; next left step rejects the frontal pose; retake rearms and captures again; revoke clears thumbnails and hides the oval.
- Existing reconstruction regression remains passing: seven edits, undo/reset, original, 0/45/90, PNG export, model failure/retry, clear while loading, camera denial (controlled adapter), invalid image, no-face input and MIME checks. App HTTP requests were same-origin GETs only. The intentional failed model request emits an expected network error; no uncaught page errors.
- 390px viewport overflow checked. This is layout evidence, not Mobile Safari evidence.

[Review and real reconstruction](guided-qa/guided-review.png) · [Live stream / oval](guided-qa/guided-live.png) · [Phone-width layout](guided-qa/guided-phone.png) · [Measured outputs](guided-qa/guided-metrics.json)

Repeat: `npm ci`, `npm run setup`, `npx playwright install chromium`, `npm start`, then `npm test` in another terminal. Tests download the public portrait to ignored `artifacts/` via the existing test runner; application runtime never downloads that portrait. Optional `BROWSER_EXECUTABLE` selects a compatible installed Chromium. Results are written under `artifacts/`.

## Device work still needed

On real iPhone and iPad, test Safari and the intended embedded browser over HTTPS: permissions, native picker cancel/HEIC/orientation, physical left/right labels, natural motion at ±45°, optional 90° landmark loss, hand movement/blur, differing skin tones/lighting/camera models, long sessions/heat/memory, Worker/OffscreenCanvas support, touch UI and download behavior. Collect labeled pass/fail examples and record false accepts/rejects before changing trial wording or trusting automatic capture in consultation. Three captured photos still do not create a fused multi-view head, depth scan or clinical prediction. No production deployment was performed.
