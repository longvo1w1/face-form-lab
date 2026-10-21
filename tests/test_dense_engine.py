import base64
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from dense_engine import DenseEngine, validate_payload


class DenseContractTests(unittest.TestCase):
    def test_disabled_without_model_rights(self):
        engine = DenseEngine()
        self.assertFalse(engine.ready)
        with self.assertRaises(RuntimeError):
            engine.reconstruct(b'photo', [.2,.2,.8,.8])

    def test_manifest_does_not_imply_license(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'manifest.json'
            path.write_text(json.dumps({'files': {}}))
            engine = DenseEngine(path)
            self.assertFalse(engine.ready)
            self.assertIn('quyền', engine.reason)

    def test_input_validation(self):
        raw = base64.b64encode(b'test').decode()
        self.assertEqual(validate_payload({'image':raw,'bounds':[.2,.2,.8,.8]})[0],b'test')
        for bounds in ([.8,.2,.2,.8], [0,0,1,float('nan')], [True,0,1,1], [0,0,2,1], []):
            with self.assertRaises(ValueError):
                validate_payload({'image':raw,'bounds':bounds})
        with self.assertRaises(ValueError):
            validate_payload({'image':'%%not-base64','bounds':[.2,.2,.8,.8]})


if __name__ == '__main__':
    unittest.main()
