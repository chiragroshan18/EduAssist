"""
State Management Module for EduAssist
Maintains in-memory session history, intent/tone distribution metrics,
demo conversation fixtures, and conversation analysis summary generation.
"""

import time
import uuid
import threading
from datetime import datetime, timezone


class SessionState:
    """Thread-safe in-memory session manager for EduAssist."""

    def __init__(self):
        self._lock = threading.RLock()
        self.reset()

    def reset(self):
        """Reset all runtime state to initial empty state."""
        with self._lock:
            self.conversation = []
            self.intent_counts = {}
            self.tone_counts = {
                "positive": 0,
                "neutral": 0,
                "concerned": 0,
                "frustrated": 0
            }
            self.session_started = time.time()
            self.session_start_iso = datetime.now(timezone.utc).isoformat()
            self.active_context = {}

    def get_context(self) -> dict:
        with self._lock:
            return dict(self.active_context)

    def set_context(self, context: dict | None):
        with self._lock:
            self.active_context = dict(context) if context else {}

    def add_message(
        self,
        sender: str,
        text: str,
        intent: str = None,
        confidence: float = None,
        tone: str = None,
        keywords: list[str] = None,
        follow_ups: list[str] = None
    ) -> dict:
        """Record a new message and update runtime statistics."""
        with self._lock:
            msg_id = f"msg_{uuid.uuid4().hex[:8]}"
            now = datetime.now()
            time_str = now.strftime("%I:%M %p")
            iso_time = now.isoformat()

            message = {
                "id": msg_id,
                "sender": sender,  # "student" | "bot"
                "text": text,
                "timestamp": time_str,
                "iso_timestamp": iso_time,
                "intent": intent,
                "confidence": confidence,
                "tone": tone,
                "keywords": keywords or [],
                "follow_ups": follow_ups or []
            }
            self.conversation.append(message)

            # Update metrics if student message
            if sender == "student":
                if intent:
                    self.intent_counts[intent] = self.intent_counts.get(intent, 0) + 1
                if tone and tone in self.tone_counts:
                    self.tone_counts[tone] += 1

            return message

    def get_conversation(self) -> list[dict]:
        with self._lock:
            return list(self.conversation)

    def get_dashboard(self) -> dict:
        """Compute runtime analytics dynamically from current state."""
        with self._lock:
            total_messages = len(self.conversation)
            student_messages = sum(1 for m in self.conversation if m["sender"] == "student")
            bot_responses = sum(1 for m in self.conversation if m["sender"] == "bot")

            # Determine most common intent
            most_common_intent = "None"
            if self.intent_counts:
                most_common_intent = max(self.intent_counts, key=self.intent_counts.get)

            # Determine dominant/current tone
            current_tone = "neutral"
            non_zero_tones = {k: v for k, v in self.tone_counts.items() if v > 0}
            if non_zero_tones:
                current_tone = max(non_zero_tones, key=non_zero_tones.get)

            # Calculate session duration
            duration_secs = int(time.time() - self.session_started)
            minutes, seconds = divmod(duration_secs, 60)
            duration_str = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"

            return {
                "total_messages": total_messages,
                "student_messages": student_messages,
                "bot_responses": bot_responses,
                "detected_intents_count": len(self.intent_counts),
                "most_common_intent": most_common_intent,
                "current_tone": current_tone,
                "intent_distribution": dict(self.intent_counts),
                "tone_distribution": dict(self.tone_counts),
                "session_duration": duration_str,
                "session_started": self.session_start_iso
            }

    def clear(self):
        """Clear conversation and reset analytics, preserving a backup for restoration."""
        with self._lock:
            if self.conversation:
                self.backup_conversation = list(self.conversation)
                self.backup_intent_counts = dict(self.intent_counts)
                self.backup_tone_counts = dict(self.tone_counts)
            self.conversation = []
            self.intent_counts = {}
            self.tone_counts = {
                "positive": 0,
                "neutral": 0,
                "concerned": 0,
                "frustrated": 0
            }
            self.session_started = time.time()
            self.active_context = {}

    def restore_backup(self, fallback_to_demo: bool = True) -> bool:
        """Restore previously cleared conversation dialogue and analytics from backup, or fall back to demo."""
        with self._lock:
            if hasattr(self, 'backup_conversation') and self.backup_conversation:
                self.conversation = list(self.backup_conversation)
                self.intent_counts = dict(self.backup_intent_counts)
                self.tone_counts = dict(self.backup_tone_counts)
                return True
            if fallback_to_demo:
                self.load_demo()
                return True
            return False

    def load_demo(self):
        """Populate realistic fictional demonstration conversation for viva/evaluation."""
        self.reset()
        demo_items = [
            {
                "sender": "student",
                "text": "Hello, I need some guidance with my upcoming college exams.",
                "intent": "greeting",
                "confidence": 0.94,
                "tone": "neutral",
                "keywords": ["guidance", "upcoming", "college", "exams"]
            },
            {
                "sender": "bot",
                "text": "Hello! Welcome to EduAssist. I can assist you with exam preparation, study planning, assignment structuring, and laboratory guidance. How can I help you today?",
                "intent": "greeting",
                "confidence": None,
                "tone": None,
                "keywords": [],
                "follow_ups": ["How should I prepare for exams?", "Help me create a study plan"]
            },
            {
                "sender": "student",
                "text": "I am really worried about my Computer Networks examination next week.",
                "intent": "exam_preparation",
                "confidence": 0.93,
                "tone": "concerned",
                "keywords": ["worried", "computer", "networks", "examination", "week"]
            },
            {
                "sender": "bot",
                "text": "I understand you might be feeling anxious about this, but you can succeed with a calm, step-by-step strategy. For Computer Networks, focus on OSI/TCP-IP models, packet routing algorithms, and past question papers.",
                "intent": "exam_preparation",
                "confidence": None,
                "tone": None,
                "keywords": [],
                "follow_ups": ["Help me create a study plan", "Lab preparation tips"]
            },
            {
                "sender": "student",
                "text": "Can you help me create a daily study schedule so I don't feel overwhelmed?",
                "intent": "study_planning",
                "confidence": 0.91,
                "tone": "concerned",
                "keywords": ["create", "daily", "study", "schedule", "overwhelmed"]
            },
            {
                "sender": "bot",
                "text": "Use the Pomodoro Technique: 50-minute focused study sprints with 10-minute breaks. Pick your top 3 non-negotiable topics each morning, and leave a 1-hour buffer for revision.",
                "intent": "study_planning",
                "confidence": None,
                "tone": None,
                "keywords": [],
                "follow_ups": ["I need assignment guidance", "How can I improve my attendance?"]
            },
            {
                "sender": "student",
                "text": "Also, what is the required attendance percentage to sit for the final exam?",
                "intent": "attendance",
                "confidence": 0.92,
                "tone": "neutral",
                "keywords": ["required", "attendance", "percentage", "final", "exam"]
            },
            {
                "sender": "bot",
                "text": "Most universities require a minimum of 75% attendance. If you have medical absences, submit certified documents to the department office promptly and check your official portal.",
                "intent": "attendance",
                "confidence": None,
                "tone": None,
                "keywords": [],
                "follow_ups": ["General academic guidance", "Thank you"]
            },
            {
                "sender": "student",
                "text": "Thank you so much! This organized plan makes me feel much more confident.",
                "intent": "goodbye",
                "confidence": 0.95,
                "tone": "positive",
                "keywords": ["thank", "organized", "plan", "feel", "confident"]
            },
            {
                "sender": "bot",
                "text": "Great to see your proactive energy! You're very welcome. Best of luck with your exams — feel free to ask if you need any more academic advice!",
                "intent": "goodbye",
                "confidence": None,
                "tone": None,
                "keywords": [],
                "follow_ups": ["How should I prepare for exams?", "Help me create a study plan"]
            }
        ]

        for item in demo_items:
            self.add_message(
                sender=item["sender"],
                text=item["text"],
                intent=item.get("intent"),
                confidence=item.get("confidence"),
                tone=item.get("tone"),
                keywords=item.get("keywords"),
                follow_ups=item.get("follow_ups")
            )

    def analyze_conversation(self) -> dict:
        """
        Synthesizes conversation analytics, extracts key topic keywords across messages,
        and generates an academic counseling summary.
        """
        with self._lock:
            student_msgs = [m for m in self.conversation if m["sender"] == "student"]
            total = len(self.conversation)

            if not student_msgs:
                return {
                    "has_data": False,
                    "total_messages": total,
                    "summary_text": "No student messages have been recorded yet to analyze.",
                    "primary_intent": "None",
                    "dominant_tone": "neutral",
                    "key_topics": [],
                    "intent_distribution": {}
                }

            # Primary intent
            primary_intent = max(self.intent_counts, key=self.intent_counts.get) if self.intent_counts else "unknown"

            # Dominant tone
            dominant_tone = max(self.tone_counts, key=self.tone_counts.get) if any(self.tone_counts.values()) else "neutral"

            # Aggregate all unique keywords across student messages
            all_keywords = []
            seen_kw = set()
            for msg in student_msgs:
                for kw in msg.get("keywords", []):
                    if kw.lower() not in seen_kw:
                        seen_kw.add(kw.lower())
                        all_keywords.append(kw.title())

            key_topics = all_keywords[:7] if all_keywords else ["General Academic Queries"]

            # Descriptive summary
            summary = (
                f"The student engaged in a {total}-message dialogue primarily focused on "
                f"'{primary_intent.replace('_', ' ').title()}'. "
                f"The overall conversational sentiment was identified as '{dominant_tone.title()}'. "
                f"Key discussion topics centered on {', '.join(key_topics[:4]) if key_topics else 'coursework'}. "
                "Recommendations include structured time-blocking, syllabus pacing, and proactive consultation with faculty."
            )

            return {
                "has_data": True,
                "total_messages": total,
                "student_messages": len(student_msgs),
                "bot_responses": total - len(student_msgs),
                "primary_intent": primary_intent.replace('_', ' ').title(),
                "dominant_tone": dominant_tone.title(),
                "key_topics": key_topics,
                "intent_distribution": dict(self.intent_counts),
                "tone_distribution": dict(self.tone_counts),
                "summary_text": summary,
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }


# Global singleton runtime state instance
session_state = SessionState()
