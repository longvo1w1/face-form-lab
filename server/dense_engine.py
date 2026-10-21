"""3DDFA_V2 62-parameter CPU adapter; no model download or license acceptance.
Pre/postprocessing adapted from cleardusk/3DDFA_V2 (MIT, see 3DDFA-LICENSE.txt).
BFM and weight rights are independent of that code license.
"""
import base64
import hashlib
import json
import math
import os
os.environ.setdefault('OPENCV_IO_MAX_IMAGE_PIXELS', '4000000')
from pathlib import Path

MAX_BODY = 4 * 1024 * 1024


def validate_payload(payload):
    image = payload.get('image') if isinstance(payload, dict) else None
    bounds = payload.get('bounds') if isinstance(payload, dict) else None
    if not isinstance(image, str) or len(image) > MAX_BODY:
        raise ValueError('Ảnh không hợp lệ hoặc quá lớn.')
    if not isinstance(bounds, list) or len(bounds) != 4 or not all(
        isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and 0 <= v <= 1 for v in bounds
    ) or bounds[0] >= bounds[2] or bounds[1] >= bounds[3]:
        raise ValueError('Khung mặt không hợp lệ.')
    try:
        decoded = base64.b64decode(image, validate=True)
    except Exception as exc:
        raise ValueError('Ảnh không đúng base64.') from exc
    if not decoded:
        raise ValueError('Ảnh rỗng.')
    return decoded, bounds


class DenseEngine:
    def __init__(self, manifest_path=None):
        self.ready = False
        self.reason = 'Bộ dựng nâng cao chưa có model được cấp quyền và cấu hình.'
        if not manifest_path:
            return
        try:
            manifest_path = Path(manifest_path).resolve()
            manifest = json.loads(manifest_path.read_text())
            if manifest.get('deployment_rights_confirmed') is not True or not manifest.get('rights_reference'):
                raise ValueError('Cần hồ sơ xác nhận quyền triển khai model/weights trước khi bật.')
            self.paths = {}
            for name in ('regressor', 'bfm', 'triangles', 'normalization'):
                item = manifest['files'][name]
                path = (manifest_path.parent / item['path']).resolve()
                if hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
                    raise ValueError('Mã SHA-256 của model không khớp: ' + name)
                self.paths[name] = path
            self._load()
            self.ready = True
            self.reason = ''
        except Exception as exc:
            self.reason = 'Không khởi tạo được bộ dựng: ' + str(exc)

    def _load(self):
        # Local pickle files must be trusted artifacts owned/licensed by operator.
        import pickle
        import numpy as np
        import onnxruntime as ort
        self.np = np
        with self.paths['bfm'].open('rb') as source:
            bfm = pickle.load(source, encoding='latin1')
        with self.paths['normalization'].open('rb') as source:
            norm = pickle.load(source, encoding='latin1')
        with self.paths['triangles'].open('rb') as source:
            tri = pickle.load(source, encoding='latin1')
        self.mean = np.asarray(norm['mean'], dtype=np.float32).reshape(62)
        self.std = np.asarray(norm['std'], dtype=np.float32).reshape(62)
        self.u = np.asarray(bfm['u'], dtype=np.float32).reshape(-1, 1)
        self.shape = np.asarray(bfm['w_shp'], dtype=np.float32)[:, :40]
        self.expression = np.asarray(bfm['w_exp'], dtype=np.float32)[:, :10]
        self.tri = np.asarray(tri, dtype=np.int64).T
        count = self.u.size // 3
        if not 468 <= count <= 100000 or self.tri.ndim != 2 or self.tri.shape[1] != 3 or self.tri.min() < 0 or self.tri.max() >= count:
            raise ValueError('BFM/topology không tương thích.')
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        self.session = ort.InferenceSession(str(self.paths['regressor']), sess_options=options, providers=['CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name

    def reconstruct(self, decoded, bounds):
        if not self.ready:
            raise RuntimeError(self.reason)
        import cv2
        np = self.np
        image = cv2.imdecode(np.frombuffer(decoded, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError('Không đọc được ảnh JPG/PNG.')
        h, w = image.shape[:2]
        if min(h, w) < 64 or max(h, w) > 2000:
            raise ValueError('Ảnh cần có kích thước từ 64 đến 2000 px.')
        left, top, right, bottom = [v * (w if i % 2 == 0 else h) for i, v in enumerate(bounds)]
        old_size = (right - left + bottom - top) / 2
        size = int(old_size * 1.58)
        if size < 16 or size > 4000:
            raise ValueError('Khung mặt quá nhỏ hoặc không hợp lệ.')
        cx, cy = (left + right) / 2, (top + bottom) / 2 + old_size * .14
        sx, sy = cx - size / 2, cy - size / 2
        ex, ey = sx + size, sy + size
        x0, y0, x1, y1 = map(round, (sx, sy, ex, ey))
        crop = np.zeros((y1 - y0, x1 - x0, 3), dtype=np.uint8)
        ax, ay, bx, by = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
        crop[ay-y0:by-y0, ax-x0:bx-x0] = image[ay:by, ax:bx]
        inp = cv2.resize(crop, (120, 120)).astype(np.float32).transpose(2, 0, 1)[None]
        param = self.session.run(None, {self.input_name: (inp - 127.5) / 128})[0].reshape(62)
        param = param * self.std + self.mean
        pose = param[:12].reshape(3, 4)
        shape = self.u + self.shape @ param[12:52, None] + self.expression @ param[52:62, None]
        vertices = pose[:, :3] @ shape.reshape(3, -1, order='F') + pose[:, 3:4]
        vertices[0] = (vertices[0] - 1) * (ex - sx) / 120 + sx
        vertices[1] = (120 - vertices[1]) * (ey - sy) / 120 + sy
        vertices[2] = (vertices[2] - 1) * ((ex - sx) + (ey - sy)) / 240
        vertices[2] -= vertices[2].min()
        vertices = (vertices.T / np.array([w, h, -w])).astype(float)
        if not np.isfinite(vertices).all():
            raise ValueError('Model trả hình học không hợp lệ.')
        return {'engine': '3ddfa-v2', 'coordinateSystem': 'normalized-image-mediapipe-z',
                'vertices': [dict(zip(('x', 'y', 'z'), row)) for row in vertices.tolist()],
                'triangles': self.tri.reshape(-1).tolist()}
