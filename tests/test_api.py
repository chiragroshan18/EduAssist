"""
Integration and API endpoint tests for EduAssist Flask application
"""

import unittest
import json
from app import app
from backend.state_manager import session_state


class TestEduAssistAPI(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        session_state.reset()

    def tearDown(self):
        session_state.reset()

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "EduAssist API")

    def test_chat_success_exam(self):
        payload = {"message": "How should I prepare for my upcoming exam?"}
        response = self.client.post(
            "/api/chat",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["intent"], "exam_preparation")
        self.assertGreater(data["confidence"], 0.70)
        self.assertIn("response", data)
        self.assertTrue(len(data["keywords"]) > 0)
        self.assertTrue(len(data["follow_ups"]) > 0)

    def test_chat_tone_concerned(self):
        payload = {"message": "I am so worried and anxious about failing my test."}
        response = self.client.post(
            "/api/chat",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["tone"], "concerned")

    def test_chat_unknown_intent(self):
        payload = {"message": "Fluffy purple kangaroos jumping over the rainbow"}
        response = self.client.post(
            "/api/chat",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["intent"], "unknown")
        self.assertIn("I'm not completely sure", data["response"])

    def test_chat_empty_message_validation(self):
        payload = {"message": ""}
        response = self.client.post(
            "/api/chat",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data["success"])

    def test_chat_whitespace_message_validation(self):
        payload = {"message": "   \n\t   "}
        response = self.client.post(
            "/api/chat",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data["success"])

    def test_chat_missing_message_field(self):
        payload = {"text": "Hello"}
        response = self.client.post(
            "/api/chat",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_chat_invalid_json(self):
        response = self.client.post(
            "/api/chat",
            data="not valid json",
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_chat_excessive_length(self):
        payload = {"message": "a" * 1050}
        response = self.client.post(
            "/api/chat",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_conversation_and_dashboard_lifecycle(self):
        # 1. Send first message
        self.client.post(
            "/api/chat",
            data=json.dumps({"message": "Hello"}),
            content_type="application/json"
        )

        # 2. Check conversation
        conv_res = self.client.get("/api/conversation")
        self.assertEqual(conv_res.status_code, 200)
        conv_data = conv_res.get_json()
        # Student + Bot = 2 messages
        self.assertEqual(conv_data["count"], 2)

        # 3. Check dashboard
        dash_res = self.client.get("/api/dashboard")
        self.assertEqual(dash_res.status_code, 200)
        dash_data = dash_res.get_json()["analytics"]
        self.assertEqual(dash_data["total_messages"], 2)
        self.assertEqual(dash_data["student_messages"], 1)
        self.assertEqual(dash_data["bot_responses"], 1)

    def test_clear_conversation(self):
        self.client.post(
            "/api/chat",
            data=json.dumps({"message": "Hello"}),
            content_type="application/json"
        )
        clear_res = self.client.post("/api/conversation/clear")
        self.assertEqual(clear_res.status_code, 200)

        dash_data = self.client.get("/api/dashboard").get_json()["analytics"]
        self.assertEqual(dash_data["total_messages"], 0)
        self.assertEqual(dash_data["student_messages"], 0)

    def test_demo_conversation(self):
        demo_res = self.client.post("/api/demo")
        self.assertEqual(demo_res.status_code, 200)
        data = demo_res.get_json()
        self.assertTrue(len(data["messages"]) > 5)

        dash_data = self.client.get("/api/dashboard").get_json()["analytics"]
        self.assertGreater(dash_data["total_messages"], 5)
        self.assertIn("exam_preparation", dash_data["intent_distribution"])

    def test_analyze_conversation(self):
        # Load demo first so we have rich dialogue
        self.client.post("/api/demo")
        analyze_res = self.client.post("/api/analyze")
        self.assertEqual(analyze_res.status_code, 200)
        data = analyze_res.get_json()["analysis"]
        self.assertTrue(data["has_data"])
        self.assertIn("summary_text", data)
        self.assertTrue(len(data["key_topics"]) > 0)
        self.assertIn("primary_intent", data)

    def test_invalid_route_404(self):
        response = self.client.get("/api/nonexistent_route")
        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertFalse(data["success"])


if __name__ == "__main__":
    unittest.main()
