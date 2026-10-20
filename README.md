# Face Form — technology proof of concept

Vietnamese browser-based cosmetic consultation experiment. Static app, private Sites hosting.

## Implemented
- Consent gate; camera still capture or local image upload.
- MediaPipe FaceLandmarker 0.10.21 CPU inference with locally hosted task and WASM.
- A textured 852-triangle facial surface from frontal estimated landmarks.
- Smooth region-weighted nose bridge/tip/width, chin projection/length, upper/lower lip deformation.
- Orbit drag, wheel zoom, preset 0/45/90-degree views, wireframe and hold-to-view original.
- Local reference images at 45/90 degrees, comparison PNG export, clear working memory.

## Limits
Not a depth scan, complete head reconstruction, multi-view fusion, surgical prediction, or metric/clinical measurement. Side views expose missing and uncertain regions. Frontal view is required for reconstruction; side photos are visual references only. No patient identity, durable records, medical records, server image uploads, or sharing workflow. Runtime errors are displayed in Vietnamese.

## Validation
See [browser QA and remaining device checks](docs/qa.md). Real Chromium now runs the local model/WASM, detects 478 landmarks on the public MediaPipe portrait, renders and deforms the actual mesh, and downloads a comparison PNG. Physical camera, native iOS pickers and Safari remain device-unverified.

## AI guided capture
Front → customer's left 45° → customer's right 45°, with per-photo review/retake and optional manual 90° reference. A local worker runs FaceLandmarker VIDEO/matrices for live guidance; library/native-camera photos are checked after receipt. Brightness and blur are pixel heuristics. Configurable trial thresholds, stability progress/countdown, cancellation and manual capture are included. Photos/original blobs and quality metadata stay in session memory. Only the front image reconstructs the existing surface; there is no multi-view fusion or identity recognition.

See [implementation, measured thresholds and device limitations](docs/guided-capture.md). `npm test` runs unit tests plus actual Chromium IMAGE/VIDEO inference and countdown/capture UI tests. Thresholds and physical selfie left/right still need validation across real people/devices; passing the trial rules is not a guarantee of reconstruction quality.

## Local preview
Serve dist using an HTTP server. Camera requires HTTPS or localhost. MediaPipe inference requires supported WebAssembly; rendering requires WebGL. No remote CDN is required at runtime.

## Third party
Three.js 0.170.0 — MIT; https://github.com/mrdoob/three.js
MediaPipe Tasks Vision 0.10.21 — Apache 2.0; https://github.com/google-ai-edge/mediapipe
Face landmarker model: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

## Capture repair — revision 2
Native file capture (`capture=user`) and photo-library inputs provide alternatives when embedded camera permission is unavailable. Consent explicitly disables and enables controls. Photo decoding now shows a preview and requires a separate build action, so inference failure does not discard the selected image. Three.js loads only when rendering is needed; boot error reporting stays separate. HEIC decode failures request JPEG/PNG or a fresh camera image. Syntax and Node DOM-stub regression checks passed for consent gating, both native pickers, preview-before-inference and consent revocation. Real iOS camera and picker behavior remains device-unverified; previous managed browser policy restriction still applies.

## Chạy mã nguồn từ GitHub

Yêu cầu Node.js 18 trở lên. Không cần API key hay cơ sở dữ liệu.

```sh
git clone https://github.com/longvo1w1/face-form-lab.git
cd face-form-lab
npm run setup
npm run check
npm start
```

Mở http://localhost:8080 trên máy đang chạy. `setup` tải Three.js, MediaPipe, WASM và mô hình theo `scripts/assets.json`, kiểm tra SHA-256 trước khi sử dụng. Các dependency tải về nằm trong `dist/assets/` và không commit vào Git. Không cần `npm install` vì script chỉ dùng thư viện có sẵn của Node.js.

Để thử camera trên iPhone/iPad, host thư mục `dist/` qua HTTPS sau khi setup. HTTP qua IP LAN không đủ điều kiện truy cập camera trực tiếp. Nút chụp bằng camera điện thoại/chọn ảnh là luồng thay thế tùy trình duyệt hỗ trợ.

Mã app: `dist/app.js`. Giao diện: `dist/index.html`, `dist/style.css`. Báo lỗi khởi động: `dist/boot.js`. Không kèm cấu hình định danh hosting Sites, ảnh khách hoặc dữ liệu cá nhân.
