# Original brow template engine

## What changed

The old brow effect tinted landmark polygons and preserved image luminance. This made dark natural brows dominate even after choosing another shape. The new engine renders six independent canonical shapes (soft, straight, arched, lifted-tail, full and slim) with deterministic procedural fiber/powder alpha textures and direct pigment compositing. It uses the same photo-space CanvasTexture, so the pattern follows existing 3D rotation and morphing. No external code, model weights, PNG assets or reference-repo license is required.

Choosing a preview card enables brows, records the prior state for shared undo, and applies its template. Select **Phủ mẫu trên mày thật** to keep the original photo under the pattern. Select **Làm mờ mày gốc & thay dáng** to approximate skin over the original brow region first. The second mode is opt-in; its separate strength slider appears only in that mode. Original view, A/B, reset and clear continue using the existing source/snapshot lifecycle. Zero pigment opacity does not conceal the original brow. Outline mode never conceals it either.

Each side is positioned using its own inner/outer MediaPipe brow landmarks. Its frame uses pixel coordinates to avoid aspect-ratio distortion, has anatomically mirrored orientation, and supports the existing position/rotation/width/thickness/arch controls. Linked edits retain the existing mirrored horizontal/rotation behavior. Templates are procedural designs rather than photographed hairs or tattoo technique plans.

## Concealment limits

This implementation samples nearby skin above the original landmark region and feathers a bounded ellipse over the original brow. It is a local skin approximation, **not OpenCV Navier–Stokes inpainting, generative inpainting, or removal of real tattoo pigment**. It may flatten texture, leave hairs outside the mask, or sample unwanted forehead hair/shadow. Toggle back to overlay or original to inspect the real image. Do not interpret the replacement preview as a prediction of tattoo removal or healed results. Export labels replacement mode as an illustrative change.

No uploads or persistent photo storage are introduced. New files are `dist/brow-templates.js`, `tests/brow-templates.mjs`, and `tests/brow-panel.mjs`. LinkeDOM is a test-only dependency.

## Verification

Run `npm ci`, `npm run check`, and `npm run test:unit`. Pixel tests cover distinct results for all six silhouettes, clipping, a synthetic untouched eye/lower-face region, coordinate mirroring, deterministic fibers, zero opacity, outline behavior and local concealment. DOM tests cover card selection after moving controls beside the viewer, enabled state, history snapshots, mode input, mirrored adjustments and reset sync. These are not a substitute for portrait/camera QA on iOS.

Before a customer demo, visually check consented portraits with light/dark, thick/thin and asymmetric brows; portrait/landscape photos; glasses/fringe; all six templates; overlay vs replacement; both sides; original/undo/A-B/reset/clear; front/45°/90° and exported comparison. Existing single-view mesh limitations remain. Check responsiveness on the actual iPhone; no physical-device performance claim is made.
