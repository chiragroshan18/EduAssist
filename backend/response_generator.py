"""
Response Generator for EduAssist
Generates educational, structured responses, manages short-term context transitions,
and supplies contextual follow-up suggestions.
"""

from backend.config import ACADEMIC_SUBJECTS


def generate_response(
    intent: str,
    tone: str,
    raw_text: str,
    tokens: list[str],
    context: dict,
    is_contextual: bool = False
) -> tuple[str, list[str], dict | None]:
    """
    Generates an educational response and follow-up suggestions.
    Returns:
        tuple: (response_text, follow_up_suggestions, next_context)
    """
    text_lower = raw_text.lower()
    next_context = None

    # Handle contextual reply (e.g., user just answered which subject they are preparing for)
    if is_contextual and context and context.get("state") == "awaiting_subject":
        matched_subjects = [s for s in ACADEMIC_SUBJECTS if s.lower() in text_lower]
        subj = matched_subjects[0] if matched_subjects else " ".join(tokens).title()
        
        reply = (
            f"Got it! For **{subj}**, here is a targeted preparation strategy:\n\n"
            "1. **Core Concept Mapping**: Review high-weightage chapters and foundational diagrams first.\n"
            "2. **Previous Year Questions**: Solve the last 3-5 years of past question papers to spot recurring themes.\n"
            "3. **Formula & Summary Sheet**: Maintain a quick one-page cheat sheet for key formulas, algorithms, or definitions.\n"
            "4. **Timed Mock Test**: Practice solving at least one complete unit test without referring to notes."
        )
        follow_ups = ["Help me create a study plan", "How to manage exam stress?", "Assignment guidance"]
        return reply, follow_ups, None

    # Tone-based empathetic prefix
    tone_prefix = ""
    if tone == "concerned":
        tone_prefix = "I understand you might be feeling anxious about this, but you can succeed with a calm, step-by-step strategy. "
    elif tone == "frustrated":
        tone_prefix = "Academic hurdles can definitely be overwhelming. Take a deep breath — let's break this down into clear steps. "
    elif tone == "positive":
        tone_prefix = "Great to see your proactive energy! "

    # Main Intent Dispatches
    if intent == "greeting":
        reply = (
            f"{tone_prefix}Hello! Welcome to **EduAssist**, your academic guidance assistant.\n\n"
            "I can assist you with:\n"
            "• **Exam Preparation** (revision cycles, past papers, test strategy)\n"
            "• **Study Planning** (daily timetable, focus sessions, time management)\n"
            "• **Assignment & Lab Guidance** (structuring reports, viva preparation)\n"
            "• **Attendance & Course Queries** (attendance criteria, syllabus info)\n\n"
            "How can I help you with your studies today?"
        )
        follow_ups = [
            "How should I prepare for exams?",
            "Help me create a study plan",
            "I need assignment guidance",
            "How can I improve my attendance?"
        ]
        return reply, follow_ups, None

    if intent == "exam_preparation":
        # Check if subject was mentioned
        mentioned_subj = [s for s in ACADEMIC_SUBJECTS if s.lower() in text_lower]
        if not mentioned_subj and "subject" not in text_lower:
            reply = (
                f"{tone_prefix}For effective **Exam Preparation**, follow this 4-step framework:\n\n"
                "1. **Divide the Syllabus**: Break modules into manageable subtopics categorized by difficulty.\n"
                "2. **Active Recall**: Test yourself after reading rather than passively highlighting.\n"
                "3. **Solve Past Papers**: Focus on frequently asked question patterns and time constraints.\n"
                "4. **Revision Cycles**: Revise newly learned concepts on Day 1, Day 3, and Day 7.\n\n"
                "**Which subject are you preparing for?** (e.g., Computer Networks, Database Systems, Mathematics)"
            )
            follow_ups = ["Computer Networks", "Database Management Systems", "Help me create a study plan"]
            next_context = {"state": "awaiting_subject", "parent_intent": "exam_preparation"}
            return reply, follow_ups, next_context
        else:
            subj_str = f" for **{mentioned_subj[0]}**" if mentioned_subj else ""
            reply = (
                f"{tone_prefix}Here is a structured preparation plan{subj_str}:\n\n"
                "• **Topic Prioritization**: Dedicate 60% of your initial time to core concepts with high credit weightage.\n"
                "• **Daily Practice**: Allocate 90-minute uninterrupted study blocks with 15-minute breaks.\n"
                "• **Doubt Clarification**: Compile ambiguous topics into a list and consult your instructor or peers early.\n"
                "• **Mock Revision**: Complete a full mock test 48 hours prior to the exam."
            )
            follow_ups = ["Help me create a study plan", "How to manage exam stress?", "Lab preparation tips"]
            return reply, follow_ups, None

    if intent == "study_planning":
        reply = (
            f"{tone_prefix}Here is a practical **Study Planning & Time Management** guide:\n\n"
            "1. **Use Pomodoro Technique**: Work in 25-50 minute focused sprints followed by 5-10 minute rest intervals.\n"
            "2. **Daily 3-Task Rule**: Pick your top 3 non-negotiable academic goals each morning.\n"
            "3. **Buffer Windows**: Keep 1 hour open daily for unexpected delays or quick revisions.\n"
            "4. **Consistent Study Environment**: Keep your workspace free from phone distractions and notifications."
        )
        follow_ups = ["How should I prepare for exams?", "I need assignment guidance", "Feeling stressed"]
        return reply, follow_ups, None

    if intent == "assignment_help":
        reply = (
            f"{tone_prefix}Here are key guidelines for your **Assignment & Project Work**:\n\n"
            "1. **Requirement Analysis**: Carefully read the grading rubric and formatting specifications before writing.\n"
            "2. **Outline First**: Structure your response with Introduction, Core Technical Analysis, Results/Observations, and Conclusion.\n"
            "3. **Academic Integrity**: Always cite external books, research papers, and technical documentations accurately.\n"
            "4. **Proofreading & Formatting**: Check equations, code formatting, and grammar before final submission."
        )
        follow_ups = ["How to format project reports?", "Help me create a study plan", "Lab preparation tips"]
        return reply, follow_ups, None

    if intent == "laboratory_guidance":
        reply = (
            f"{tone_prefix}Here is how to excel in **Laboratory Sessions & Viva Voce**:\n\n"
            "1. **Pre-Lab Preparation**: Understand the aim, underlying theoretical principles, and circuit/code logic prior to entering the lab.\n"
            "2. **Accurate Record Keeping**: Note observations, graphs, and simulation results immediately in your lab record.\n"
            "3. **Viva Anticipation**: Be ready to explain the 'why' behind each step, safety precautions, and potential sources of error.\n"
            "4. **Systematic Debugging**: When an experiment fails, isolate variables methodically rather than making random changes."
        )
        follow_ups = ["Common viva questions", "How should I prepare for exams?", "I need assignment guidance"]
        return reply, follow_ups, None

    if intent == "attendance":
        reply = (
            f"{tone_prefix}Regarding **Attendance & Course Regulations**:\n\n"
            "• **Standard Requirement**: Most universities require a minimum of 75% attendance to qualify for semester examinations.\n"
            "• **Shortage Mitigation**: If you have missed classes due to medical reasons, submit valid doctor certificates to the department office promptly.\n"
            "• **Faculty Consultation**: Speak with your course instructor to verify if makeup assignments, lab remedial hours, or duty leaves apply.\n"
            "• **Official Tracking**: Monitor your institution's official student portal regularly to avoid last-minute condonation issues."
        )
        follow_ups = ["How to calculate attendance percentage?", "General academic guidance", "Course information"]
        return reply, follow_ups, None

    if intent == "course_information":
        reply = (
            f"{tone_prefix}For **Course & Curriculum Inquiries**:\n\n"
            "1. **Syllabus Copy**: Consult your department's published semester curriculum guide for exact module breakdowns.\n"
            "2. **Credits & Prerequisites**: Ensure you have satisfied prerequisite course requirements before selecting departmental electives.\n"
            "3. **Recommended Textbooks**: Review the official references listed at the end of each course syllabus.\n"
            "4. **Academic Advisor**: For elective changes or credit transfers, schedule a brief consultation with your designated faculty advisor."
        )
        follow_ups = ["Academic guidance", "How should I prepare for exams?", "Help me create a study plan"]
        return reply, follow_ups, None

    if intent == "academic_guidance":
        reply = (
            f"{tone_prefix}Here is guidance for **CGPA Improvement & Academic Growth**:\n\n"
            "1. **Target High-Credit Courses**: Focus strategic revision on 4-credit core subjects to boost your overall GPA.\n"
            "2. **Clear Backlogs Early**: Treat arrear exams with immediate priority to prevent semester overload.\n"
            "3. **Continuous Assessment**: Maximize internal midterms, quizzes, and lab scores — they constitute 40-50% of your grade.\n"
            "4. **Seek Mentorship**: Discuss your career trajectory and technical interests with your faculty advisor or senior peers."
        )
        follow_ups = ["How to improve CGPA?", "Help me create a study plan", "Assignment guidance"]
        return reply, follow_ups, None

    if intent == "motivation":
        reply = (
            f"{tone_prefix}Remember that academic stress is common and temporary. You are fully capable of overcoming this:\n\n"
            "• **Step Back**: Take a 15-minute screen-free break, drink water, and take slow, deep breaths.\n"
            "• **Shrink the Mountain**: Don't think about the entire syllabus at once. Pick just **one single topic** for the next 30 minutes.\n"
            "• **Progress Over Perfection**: Even completing 2 practice questions builds momentum.\n"
            "• **Support System**: Talk to a friend, family member, or college counselor if you are feeling overburdened."
        )
        follow_ups = ["Help me create a study plan", "How should I prepare for exams?", "Thank you"]
        return reply, follow_ups, None

    if intent == "goodbye":
        reply = (
            f"{tone_prefix}You're very welcome! Best of luck with your studies and upcoming coursework.\n\n"
            "Feel free to ask anytime you need academic guidance, study planning, or revision tips. Have a productive day!"
        )
        follow_ups = ["How should I prepare for exams?", "Help me create a study plan"]
        return reply, follow_ups, None

    # Fallback for Unknown Intent
    reply = (
        "I'm not completely sure what you're asking about. "
        "Try asking about exams, assignments, study planning, attendance, or laboratory preparation.\n\n"
        "Here are common questions you can try:"
    )
    follow_ups = [
        "How should I prepare for exams?",
        "Help me create a study plan",
        "I need assignment guidance",
        "How can I improve my attendance?",
        "Help me with my lab preparation"
    ]
    return reply, follow_ups, None
