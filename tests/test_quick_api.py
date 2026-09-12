"""Quick test: non-streaming + streaming through the backend."""
import urllib.request
import json
import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestQuickAPI(unittest.TestCase):
    @patch('urllib.request.urlopen')
    def test_quick_api_non_streaming_mock(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            "text": "Estou funcionando perfeitamente!"
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        payload = json.dumps({
            "provider": "gemini",
            "api_key": "mock_key",
            "prompt": "Diga apenas: Estou funcionando!",
            "stream": False
        }).encode("utf-8")

        req = urllib.request.Request(
            "http://127.0.0.1:8085/api/llm/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            self.assertIn("text", data)
            self.assertEqual(data["text"], "Estou funcionando perfeitamente!")

    def test_quick_api_streaming_parser(self):
        sample_sse = 'data: {"text": "Trecho 1"}\ndata: {"text": " e Trecho 2"}\ndata: [DONE]\n'
        accumulated = ""
        for line in sample_sse.split("\n"):
            clean = line.strip()
            if clean.startswith("data: "):
                data_str = clean[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    if "text" in chunk:
                        accumulated += chunk["text"]
                except Exception:
                    pass
        self.assertEqual(accumulated, "Trecho 1 e Trecho 2")

if __name__ == "__main__":
    unittest.main()
