# Capture framing and optional 3DDFA_V2 integration

## Default: local capture and reconstruction

MediaPipe FaceLandmarker and Three.js remain the active, on-device pipeline. No new heavy browser library is needed for brightness and Laplacian sharpness checks: these already run in the capture worker. The new capture overlay shows a dimmed outer area, an oval, eye-height guide, current angle, amber adjustment and green readiness states. Full-face checks reserve additional estimated forehead/chin/side margins. They use the visible video crop after centered `object-fit: cover`, not the uncropped source rectangle. Customer-left/right prompts account for the mirrored preview. Instructions have a short debounce; capture quality and countdown cancellation still act immediately. Landmark-derived padding is an estimate and cannot prove a covered forehead is visible.

## Optional dense engine: code integrated, model inference not yet validated

`server/dense_engine.py` adds a CPU ONNX 62-parameter 3DDFA_V2 adapter with OpenCV preprocessing and NumPy dense BFM reconstruction. It returns normalized projected vertices and topology; Three.js uses the same original-photo texture and existing nose/chin/lip deformations. Deformation anchors remain tied to the MediaPipe landmarks even when the returned dense topology uses different indices.

The adapter is disabled by default. No BFM data, regressor weights or upstream binaries are bundled or downloaded by this repo. The official upstream `bfm/readme.md` says its modified BFM2009 is **only for academic use** and requires a separate commercial license. MIT for the source is not permission to deploy those artifacts in a spa. Sources checked:

- https://github.com/cleardusk/3DDFA_V2
- https://github.com/cleardusk/3DDFA_V2/blob/master/bfm/readme.md
- https://github.com/cleardusk/3DDFA_V2/blob/master/weights/readme.md

A manifest gate records the operator's deployment-rights reference and verifies the supplied files' hashes; it is an operational gate, not independent license verification. Do not mark the gate true without actual rights. Source adaptation notice is in `server/3DDFA-LICENSE.txt`.

### When authorized model assets are available

1. Install Python 3.10+ dependencies in an isolated environment:

   ```sh
   python -m venv .venv
   # Activate the environment using your OS's standard command.
   python -m pip install -r server/requirements.txt
   ```

2. Supply trusted, authorized BFM/tri/normalization pickle files and the compatible 120x120/62-parameter ONNX regressor in `server/models/`. These are ignored by Git. Use existing ONNX weights; the service does not auto-convert or fetch weights. Check the exact artifact rights independently.
3. Copy `server/model-manifest.example.json` to ignored `server/model-manifest.json`; enter verified SHA-256 hashes and a deployment-rights reference. Set `deployment_rights_confirmed` only after those rights are obtained.
4. Set `FACE_FORM_MODEL_MANIFEST` to that manifest's absolute path and `FACE_FORM_ORIGIN` to the exact frontend origin. Run `python server/app.py`; default binding is 127.0.0.1:8090. `/health` reports readiness. Without licensed model configuration `/reconstruct` returns 503 and does not consume an image for inference.
5. For a localhost test, enable `dist/reconstruction-config.json` with endpoint `http://127.0.0.1:8090`. For a hosted frontend, use an authenticated HTTPS backend under your control and set CORS to the frontend's exact origin. This service is a local prototype, not an internet-facing authenticated production API. CORS is not authentication; the service intentionally binds loopback only.
6. The optional selector then appears in the controls. Default remains on-device. Choosing advanced reconstruction requires a **separate checkbox naming the destination origin** before a POST sends the frontal photo. No silent fallback upload occurs. Switching modes, clearing, revoking consent or leaving cancels the client request. Cancellation does not promise to stop a request already being processed by the server.

Cloudflare Pages hosts the static UI and local WASM; it does not run this Python service. The current hosted demo must keep advanced mode disabled until a licensed, tested backend is provisioned. Photos are processed in memory by the included service, not written to disk or logged. Any reverse proxy/operator logs must follow that same intent.

## Validation executed in this change

- Syntax checks for the complete JS app and Python compilation.
- Existing mesh closure and capture-quality tests.
- New cover-crop, framing, forehead/chin/mirror direction and hint-debounce tests.
- Dense output schema/index validation, default local mode sends no photo, separate upload consent gate, clear cancels request.
- Python tests for disabled model gate and input validation; HTTP smoke checks for health, rejected origins, preflight and disabled reconstruct.

Actual ONNX/BFM inference has **not** run: authorized model artifacts are not available. Contract fixtures are not proof of reconstruction quality. New live browser/Safari/device QA has **not** run in this environment because earlier managed-browser access was blocked. The historical browser screenshots are not validation of this change. Do not describe the gated dense engine as ready for a customer demo.
