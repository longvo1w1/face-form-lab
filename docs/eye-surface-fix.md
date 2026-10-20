# Eye/mouth surface repair

Base: `585108bf0938f5a8d67ca2efe52eadc3938cb973` (`feat/ai-guided-capture`). Main does not yet contain the capture feature branch.

## Confirmed defect

The repository's existing `docs/qa/view-0.png` visibly shows empty eye and mouth openings. `build()` uses only MediaPipe's `FACE_LANDMARKS_TESSELATION`; all 16 edges of each inner-eyelid contour and all 20 inner-mouth edges have only one incident triangle. Those openings therefore show the viewer background rather than the source photo. Landmark detection succeeds; the renderer has no surfaces on which to map those pixels.

## Change

`buildFaceSurface()` preserves the upstream face triangles and appends a center and triangular fan for each opening. The fan shares the exact original boundary vertices; its center averages original x/y/z, and receives the same x/1-y photo mapping as every existing vertex. Position, UV and deformation arrays include the three added centers. They participate in the existing rotate/deform/reset/original/export pipeline because this is a single mesh. No stock/generated eyes, eye recoloring, independent overlay sprites or arbitrary eyeball anatomy are added.

With 478 input landmarks the mesh now has 481 points and 904 triangles (852 existing + 32 eyes + 20 mouth). With closed eyelids the patch follows the collapsed eyelid contour rather than forcing the eye open. Hidden/profile anatomy remains approximate and is not reconstructed by this fix.

## Executed validation

- `npm run check`: passed.
- `node tests/face-surface.mjs`: passed against the actual vendored MediaPipe tessellation; all 52 former boundary edges go from one to two incident triangles, radial fan edges have two incident triangles, indices are valid, source landmarks remain unchanged, UV interpolation remains source-photo x/1-y, and legacy 468-point/closed-lid cases pass.
- `node tests/capture-quality.mjs`: passed.

Historical screenshots and browser results in `docs/qa.md` predate this fix. No new browser visual result is claimed here: this environment's earlier managed-browser access was blocked by URL policy. Re-run the repo's browser suite on a supported machine and inspect unmodified and deformed 0/45/90-degree views plus comparison export. iOS physical camera/Safari verification remains outstanding. No hosting deployment or main-branch merge is included.
