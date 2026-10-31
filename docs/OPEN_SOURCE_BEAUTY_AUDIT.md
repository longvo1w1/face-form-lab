# Face Form – open-source integration audit (2026-11-01)

## Product and compatibility baseline

Face Form currently uses plain ES modules, Three.js CanvasTexture, MediaPipe face landmarks, local-only photo processing and client-side export. **Do not embed another full camera app or replace the current 3D pipeline** without a spike. Only **Môi → Xăm môi** and **Mày → Thiết kế dáng mày** have actual interactive simulations today. This audit is engineering research, **not a claim that named tattoo technologies have been reproduced**.

## Candidate repositories / reuse decisions

| Candidate | URL | License evidence / dependencies | Fit | Decision |
|---|---|---|---|---|
| OpenMakeupSDK | https://github.com/ehsanwwe/OpenMakeupSDK | README and repo identify MIT; verify license file and bundled 73 pattern asset origins before vendoring | Web/MediaPipe + WebGL lipstick, eyeliner, shaders, face morph | **Pilot first**: extract testable shader/look ideas or integrate the MIT library as an isolated optional engine. Preserve copyright and license text. No full SDK copied yet. |
| virtual-makeup (otdnnc) | https://github.com/otdnnc/virtual-makeup | MIT in README; separately verify MediaPipe model assets | Browser OpenCV.js soft blending of lip/brow/eye regions; React architecture is heavier than ours | **Adapt only utility logic** with attribution; do not copy the React frontend wholesale. |
| face-parsing | https://github.com/yakhyo/face-parsing | MIT repository; model weights/data need separate provenance and commercial-use verification | Better lip and eyebrow pixel masks; ONNX export | **Research prototype** behind optional feature flag, benchmark on iPhone; do not ship weights until their rights are checked. |
| visage | https://github.com/hriddhidey/visage | MIT; Python/OpenCV rather than browser ES modules | Classic lip color segmentation/blending references | **Reference only**; port selected calculations if evidence and attribution checked. |
| UpscalerJS | https://github.com/thekevinscott/UpscalerJS | MIT, weights and performance to review | Optional sharpening/export image resolution | **Optional isolated post-process** only, not a substitute for high-resolution landmarks. |
| cv5rust | https://github.com/punnerud/cv5rust | MIT code, includes model assets with differing BSD-2/AGPL obligations | WASM diffusion inpainting to reduce smudging when covering brow | **Research algorithm only**, keep machine learning weights excluded; benchmark memory/performance. |
| inpaint-web | https://github.com/lxfater/inpaint-web | GPL-3.0 | Browser inpainting | **Do not copy** into proprietary Face Form without accepting GPL obligations or separate permission. |
| Commercial offerings | https://www.banuba.com/tint-makeup-virtual-try-on , https://www.maybelline.com/virtual-makeover-makeup-tools | Closed-source/proprietary | Reference UX: category first, try-on options, before/after | **UX reference only, never copy code/assets**. |

Sources: official GitHub repositories, documented license listings, project READMEs and official vendor feature pages. This matrix does not independently certify rights to every nested asset; **license verification remains a required implementation step for each imported file/model/texture**. No third-party files or model weights were copied by this audit.

## Recommended implementation milestones

1. **P1 – Brow fidelity (Mày):** retain existing procedural brow designer; use a bounded segmentation mask for real brow removal, preserve pores and skin edges, ensure new brow is sharp; A/B, original, undo, exports work. Prototype optional OpenCV.js inpaint on a bounded crop before evaluating ONNX parsing. No unlicensed model weights.
2. **P1 – Lip color fidelity (Môi → Xăm môi):** reuse browser-local luminance-preserving color blend patterns. Make swatches depend on source lip luminance rather than flat fill, respect open-mouth mask; add natural/defined finishes and real-photo QA across tones. Existing controls remain under Xăm môi only.
3. **P2 – Eyeliner (Mí):** when the product adds a dedicated Mí tab, prototype paths following MediaPipe upper eyelid points and compare against OpenMakeupSDK's MIT eyeliner implementation. Do not put eyelid controls in the Mày tab.
4. **P2 – Existing tattoo repairs:** manually select pigmented region; mask preview and color correction only. Do not claim to simulate Pico laser removal or healing.
5. **P3 – Skin:** texture comparison of photographic smoothing under explicit labels; Nano Plasma Fibroblast treatment outcomes cannot be inferred from single image.

## Reuse checklist (mandatory before copying)

- Save exact upstream repo URL, revision/commit, source path and SPDX license in `docs/THIRD_PARTY_ATTRIBUTION.md`.
- Preserve MIT copyright notices; verify texture copyright and model weight/data grants separately.
- Prefer selective pure functions/modules to entire UI frameworks, cameras or proprietary textures.
- Keep all image buffers local; no new upload APIs, analytics payloads or CDN that receives photos.
- Test on iPhone Safari and desktop, portraits with thick/thin/asymmetric brows and different skin tones; track latency, RAM and visual regressions.
- Keep clinical wording honest: **simulated design**, not healed pigment, laser outcomes or efficacy of branded methods.

## Current status

- Research and phased integration criteria completed.
- **No external code/assets have been vendored**: do not mark any repository as “integrated” yet.
- Recommended first integration PR: isolate and adapt MIT-licensed color compositing or eyebrow mask utility with license attribution, test against current `CosmeticTexture`, then perform device QA before merge.
