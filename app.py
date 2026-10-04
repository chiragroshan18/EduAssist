"""
EduAssist - Intelligent Student Support & Academic Guidance Chatbot
Flask REST API & Web Application Entry Point
"""

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from backend.preprocessor import preprocess_text
from backend.intent_engine import detect_intent
from backend.tone_analyzer import analyze_tone
from backend.response_generator import generate_response
from backend.state_manager import session_state

# Determine paths for static assets
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")
CORS(app)


# ==============================================================================
# Web UI Routes
# ==============================================================================

@app.route("/")
def index():
    """Serve the single-page application interface."""
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    """Serve static CSS, JS, and asset files."""
    return send_from_directory(STATIC_DIR, filename)


# ==============================================================================
# REST API Endpoints
# ==============================================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """Backend health and service identity endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "EduAssist API",
        "version": "1.0.0",
        "domain": "Text, Speech and Analysis (TSA) / Natural Language Processing"
    }), 200


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Primary chat processing endpoint.
    Executes: Input validation -> Text preprocessing -> Intent detection ->
              Tone analysis -> Keyword extraction -> Response generation ->
              Runtime state recording -> JSON response.
    """
    if not request.is_json:
        return jsonify({
            "success": False,
            "error": "Request body must be valid JSON with Content-Type: application/json"
        }), 400

    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({
            "success": False,
            "error": "Missing required 'message' field in JSON payload"
        }), 400

    raw_message = data.get("message")
    if not isinstance(raw_message, str):
        return jsonify({
            "success": False,
            "error": "Field 'message' must be a string"
        }), 400

    # Execute text preprocessing with validation
    try:
        preprocessed = preprocess_text(raw_message)
    except ValueError as val_err:
        return jsonify({
            "success": False,
            "error": str(val_err)
        }), 400

    # Retrieve short-term conversational context
    context = session_state.get_context()

    # Detect user intent and calculate rule-based confidence
    tokens = preprocessed["tokens"]
    normalized_text = preprocessed["normalized_text"]
    intent_result = detect_intent(tokens, normalized_text, context)

    # Perform rule-based tone analysis
    tone_result = analyze_tone(tokens, raw_message)

    # Generate educational response and follow-up suggestion chips
    reply_text, follow_ups, next_context = generate_response(
        intent=intent_result["intent"],
        tone=tone_result["tone"],
        raw_text=raw_message,
        tokens=tokens,
        context=context,
        is_contextual=intent_result.get("is_contextual", False)
    )

    # Update runtime conversational context
    session_state.set_context(next_context)

    # Record student message in centralized state
    session_state.add_message(
        sender="student",
        text=raw_message,
        intent=intent_result["intent"],
        confidence=intent_result["confidence"],
        tone=tone_result["tone"],
        keywords=preprocessed["keywords"]
    )

    # Record bot response in centralized state
    session_state.add_message(
        sender="bot",
        text=reply_text,
        intent=intent_result["intent"],
        confidence=None,
        tone=None,
        keywords=[],
        follow_ups=follow_ups
    )

    return jsonify({
        "success": true_bool(),
        "response": reply_text,
        "intent": intent_result["intent"],
        "intent_label": intent_result["label"],
        "confidence": intent_result["confidence"],
        "tone": tone_result["tone"],
        "keywords": preprocessed["keywords"],
        "follow_ups": follow_ups,
        "is_contextual": intent_result.get("is_contextual", False)
    }), 200


def true_bool():
    return True


@app.route("/api/conversation", methods=["GET"])
def get_conversation():
    """Retrieve full chronological conversation message log."""
    messages = session_state.get_conversation()
    return jsonify({
        "success": True,
        "messages": messages,
        "count": len(messages)
    }), 200


@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    """Compute and return live runtime analytics and statistics."""
    analytics = session_state.get_dashboard()
    return jsonify({
        "success": True,
        "analytics": analytics
    }), 200


@app.route("/api/conversation/clear", methods=["POST"])
def clear_conversation():
    """Clear active conversation log and reset analytics counters."""
    session_state.clear()
    return jsonify({
        "success": True,
        "message": "Conversation history and analytics successfully reset"
    }), 200


@app.route("/api/conversation/restore", methods=["POST"])
def restore_conversation():
    """Restore previously cleared conversation dialogue and analytics from runtime backup, or restore baseline."""
    session_state.restore_backup(fallback_to_demo=True)
    return jsonify({
        "success": True,
        "message": "Conversation history successfully restored",
        "messages": session_state.get_conversation(),
        "analytics": session_state.get_dashboard()
    }), 200


@app.route("/api/demo", methods=["POST"])
def load_demo():
    """Load fictional demonstration dialogue into runtime state."""
    session_state.load_demo()
    return jsonify({
        "success": True,
        "message": "Demo conversation loaded successfully",
        "messages": session_state.get_conversation(),
        "analytics": session_state.get_dashboard()
    }), 200


@app.route("/api/analyze", methods=["POST"])
def analyze_conversation():
    """Generate in-depth conversation analysis and synthesis report."""
    summary = session_state.analyze_conversation()
    return jsonify({
        "success": True,
        "analysis": summary
    }), 200


# ==============================================================================
# Error Handlers
# ==============================================================================

@app.errorhandler(404)
def handle_not_found(err):
    return jsonify({
        "success": False,
        "error": "The requested API endpoint or resource was not found"
    }), 404


@app.errorhandler(500)
def handle_server_error(err):
    return jsonify({
        "success": False,
        "error": "An internal server error occurred while processing the request"
    }), 500


if __name__ == "__main__":
    # Local development server
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=True)
