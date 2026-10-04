"""
Unit tests for EduAssist NLP and Rule-Based TSA Components
"""

import unittest
from backend.preprocessor import preprocess_text, tokenize, extract_keywords, normalize_whitespace
from backend.intent_engine import detect_intent
from backend.tone_analyzer import analyze_tone
from backend.response_generator import generate_response


class TestNLPComponents(unittest.TestCase):

    def test_whitespace_normalization(self):
        raw = "  Hello    world  \n\t from   college! "
        normalized = normalize_whitespace(raw)
        self.assertEqual(normalized, "Hello world from college!")

    def test_tokenization_and_cleaning(self):
        raw = "How should I PREPARE for my mid-term exam???"
        tokens = tokenize(raw)
        self.assertIn("prepare", tokens)
        self.assertIn("mid-term", tokens)
        self.assertIn("exam", tokens)

    def test_keyword_extraction(self):
        tokens = ["how", "should", "i", "prepare", "for", "my", "computer", "networks", "exam"]
        keywords = extract_keywords(tokens)
        self.assertIn("prepare", keywords)
        self.assertIn("computer", keywords)
        self.assertIn("networks", keywords)
        self.assertIn("exam", keywords)
        self.assertNotIn("how", keywords)
        self.assertNotIn("for", keywords)

    def test_preprocessor_validation_empty(self):
        with self.assertRaises(ValueError):
            preprocess_text("")
        with self.assertRaises(ValueError):
            preprocess_text("   \n\t  ")

    def test_preprocessor_validation_excessive_length(self):
        long_text = "a" * 1005
        with self.assertRaises(ValueError):
            preprocess_text(long_text)

    # Intent Detection Tests
    def test_intent_greeting(self):
        prep = preprocess_text("Hello there! Good morning.")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "greeting")
        self.assertGreaterEqual(res["confidence"], 0.70)

    def test_intent_exam_preparation(self):
        prep = preprocess_text("How should I prepare for my upcoming exam next week?")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "exam_preparation")
        self.assertGreaterEqual(res["confidence"], 0.80)

    def test_intent_study_planning(self):
        prep = preprocess_text("Help me create a daily study schedule and timetable.")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "study_planning")
        self.assertGreaterEqual(res["confidence"], 0.80)

    def test_intent_assignment_help(self):
        prep = preprocess_text("I need guidance on how to write my project report and format citations.")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "assignment_help")
        self.assertGreaterEqual(res["confidence"], 0.75)

    def test_intent_laboratory_guidance(self):
        prep = preprocess_text("What are common viva questions for the data structures lab practical?")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "laboratory_guidance")
        self.assertGreaterEqual(res["confidence"], 0.75)

    def test_intent_attendance(self):
        prep = preprocess_text("What is the minimum attendance percentage required to sit for semester finals?")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "attendance")
        self.assertGreaterEqual(res["confidence"], 0.80)

    def test_intent_course_information(self):
        prep = preprocess_text("Where can I find the curriculum syllabus and elective credits for this semester?")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "course_information")
        self.assertGreaterEqual(res["confidence"], 0.75)

    def test_intent_academic_guidance(self):
        prep = preprocess_text("How can I improve my CGPA and clear backlogs effectively?")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "academic_guidance")
        self.assertGreaterEqual(res["confidence"], 0.80)

    def test_intent_motivation(self):
        prep = preprocess_text("I am feeling stressed and overwhelmed with all the pressure.")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "motivation")
        self.assertGreaterEqual(res["confidence"], 0.75)

    def test_intent_goodbye(self):
        prep = preprocess_text("Thank you very much, that is all for today! Goodbye.")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "goodbye")
        self.assertGreaterEqual(res["confidence"], 0.80)

    def test_intent_unknown_fallback(self):
        prep = preprocess_text("Xylophone pineapple quantum baking recipe.")
        res = detect_intent(prep["tokens"], prep["normalized_text"])
        self.assertEqual(res["intent"], "unknown")
        self.assertLess(res["confidence"], 0.35)

    # Tone Analysis Tests
    def test_tone_positive(self):
        prep = preprocess_text("Great, thank you! That was really helpful and clear.")
        tone = analyze_tone(prep["tokens"], prep["raw_text"])
        self.assertEqual(tone["tone"], "positive")

    def test_tone_concerned(self):
        prep = preprocess_text("I am really worried and anxious that I might fail this exam.")
        tone = analyze_tone(prep["tokens"], prep["raw_text"])
        self.assertEqual(tone["tone"], "concerned")

    def test_tone_frustrated(self):
        prep = preprocess_text("This syllabus is terrible and ridiculous! I am so angry and sick of it!")
        tone = analyze_tone(prep["tokens"], prep["raw_text"])
        self.assertEqual(tone["tone"], "frustrated")

    def test_tone_neutral(self):
        prep = preprocess_text("What time does the university library open tomorrow?")
        tone = analyze_tone(prep["tokens"], prep["raw_text"])
        self.assertEqual(tone["tone"], "neutral")

    # Conversational Context Test
    def test_contextual_follow_up(self):
        context = {"state": "awaiting_subject", "parent_intent": "exam_preparation"}
        prep = preprocess_text("Computer Networks")
        res = detect_intent(prep["tokens"], prep["normalized_text"], context=context)
        self.assertEqual(res["intent"], "exam_preparation")
        self.assertTrue(res["is_contextual"])

        reply, follow_ups, next_ctx = generate_response(
            intent=res["intent"],
            tone="neutral",
            raw_text="Computer Networks",
            tokens=prep["tokens"],
            context=context,
            is_contextual=True
        )
        self.assertIn("Computer Networks", reply)
        self.assertIsNone(next_ctx)


if __name__ == "__main__":
    unittest.main()
