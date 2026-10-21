"""Optional CPU service. Static Cloudflare Pages continues to use local mode.
No patient images are saved, logged, forwarded, or used for training here.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from dense_engine import DenseEngine, MAX_BODY, validate_payload

ENGINE = DenseEngine(os.environ.get('FACE_FORM_MODEL_MANIFEST'))
ORIGIN = os.environ.get('FACE_FORM_ORIGIN', 'http://localhost:8080')


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def log_message(self, *args):
        pass

    def send_json(self, code, body):
        raw = json.dumps(body, allow_nan=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if self.headers.get('Origin') == ORIGIN:
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.send_header('Vary', 'Origin')
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        if self.headers.get('Origin') != ORIGIN:
            return self.send_json(403, {'error': 'Origin không được phép.'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path != '/health':
            return self.send_json(404, {'error': 'Not found'})
        self.send_json(200, {'engine': '3ddfa-v2', 'ready': ENGINE.ready, 'message': ENGINE.reason})

    def do_POST(self):
        if self.path != '/reconstruct':
            return self.send_json(404, {'error': 'Not found'})
        if self.headers.get('Origin') != ORIGIN:
            return self.send_json(403, {'error': 'Origin không được phép.'})
        if not ENGINE.ready:
            return self.send_json(503, {'error': ENGINE.reason})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= MAX_BODY:
                return self.send_json(413, {'error': 'Payload quá lớn hoặc rỗng.'})
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.send_json(415, {'error': 'Chỉ nhận application/json.'})
            image, bounds = validate_payload(json.loads(self.rfile.read(size)))
            self.send_json(200, ENGINE.reconstruct(image, bounds))
        except (ValueError, KeyError, TypeError):
            self.send_json(400, {'error': 'Ảnh, khung mặt hoặc dữ liệu không hợp lệ.'})
        except Exception:
            self.send_json(500, {'error': 'Không dựng được ảnh. Có thể thử lại hoặc dùng bộ dựng trên thiết bị.'})


if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', int(os.environ.get('PORT', '8090'))), Handler)
    server.timeout = 30
    print('Dense service: http://127.0.0.1:%s (ready=%s)' % (server.server_port, ENGINE.ready))
    server.serve_forever()
