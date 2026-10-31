# Lip and brow consultation module

Original, dependency-free implementation for this repository's MediaPipe landmark + Three.js CanvasTexture pipeline. No external makeup SDK, parsing weights, new cloud service or additional image upload is introduced.

## Use

1. Obtain consent, select a well-lit frontal photo and build the existing surface.
2. Open **Màu môi & dáng mày**. Both effects start disabled.
3. Lips: enable, select one of six colors or a custom color; adjust intensity, upper/lower coverage and edge softness. The inner mouth is excluded and both edges feather inward. This is recoloring, not pigment removal or a prediction of healed color.
4. Brows: enable, choose soft/straight/arched and powder/illustrative strokes, color and intensity. Open each side to adjust thickness, length, arch, position and rotation. Left/right mean the customer's anatomical sides. Linked mode mirrors horizontal movement/rotation; switching it on preserves existing asymmetry until the next adjustment. Outline mode displays the proposed boundary. Overlay mode retains original hairs. The later template engine also provides opt-in skin approximation for replacement previews; see [brow template engine](brow-template-engine.md).
5. Save A/B, then view either at the same current rotation and zoom. Slots include geometric morphs and cosmetic settings. Changes after saving do not overwrite a slot. Hold the original button to remove both geometry and cosmetic edits temporarily.
6. Undo affects geometry and cosmetics; group reset affects only that group. Global reset clears current edits but preserves A/B proposals. Rebuilding or clearing the session removes proposals and edit history. Export downloads a labeled original/adjusted comparison without stretching the rendered image.

## Architecture and limits

`dist/cosmetics.js` computes lip masks from outer/inner landmark contours, generates adjustable brow polygons, and blends color while retaining source luminance. It rebuilds the cosmetic canvas from the untouched source for every update. `dist/cosmetics-panel.js` provides controls. `app.js` shares snapshot history and switches the texture for original view/export.

All masks are painted in source-photo UV space. They remain attached to the existing mesh through rotation and morphing, including the optional dense mesh's source-photo UVs. Existing single-view limitations at 45°/90° remain: this does not reconstruct occluded anatomy or improve mesh accuracy. Large shape changes can stretch the photograph.

The original brow presets modified landmark-derived shapes; the template engine now supplies distinct canonical silhouettes. Neither version provides an artist-drawn anchor editor. Strokes are a procedural visual approximation, not a microblading stroke plan. Lighting, existing lipstick, hair occlusion and incorrect landmarks affect the result. No facial scoring, diagnosis, suitability recommendation or treatment parameter is generated.

Processing stays in the browser. Nothing is stored in localStorage or sent by this module. Explicit export saves an image to the user's device. The separately gated dense engine retains its existing independent opt-in behavior.

## Validation

`npm run check` and `npm run test:unit` cover syntax, existing capture/mesh/reconstruction regressions, cosmetic identity when disabled, mouth/skin exclusion, feathering, alpha preservation, zero coverage, independent settings, brow position, source redraw and cleanup. `npm run setup` verifies seven existing model/library assets.

Browser QA for this change remains pending: the managed browser failed to initialize in this workspace (read-only sessions directory). Do not treat unit tests as proof of visual realism, working camera access or mobile compatibility.

Before a customer demo, test a consented/licensed portrait in Chrome and Safari: open/closed mouth, teeth visible, asymmetric brows, zero/full intensity, independent/linked adjustments, morph + color, original hold, A/B, undo/reset, all view angles, export aspect ratio and clear/rebuild. Check that all slots and textures disappear when consent is withdrawn. Measure slider response on the actual demo phone; CPU mask work is bounded to each feature region but not yet benchmarked on mobile.
