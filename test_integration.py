import urllib.request
import urllib.parse
import json
import unittest

PORT = 8085
BASE_URL = f"http://127.0.0.1:{PORT}"

class TestServerEndpoints(unittest.TestCase):
    def test_search_web_editais(self):
        url = f"{BASE_URL}/api/search-web-editais"
        payload = json.dumps({"query": "editais cultura lei rouanet"}).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                self.assertEqual(response.status, 200)
                data = json.loads(response.read().decode('utf-8'))
                self.assertIn("results", data)
                self.assertIsInstance(data["results"], list)
                print(f"[OK] test_search_web_editais returned {len(data['results'])} results.")
        except Exception as e:
            self.fail(f"Failed to connect to search API: {e}")

    def test_invalid_route(self):
        url = f"{BASE_URL}/api/invalid-route"
        req = urllib.request.Request(url, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                self.assertEqual(response.status, 404)
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 404)

if __name__ == "__main__":
    unittest.main()
