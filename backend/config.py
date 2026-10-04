"""
Configuration and Lexical Knowledge Base for EduAssist
Defines intent patterns, tone keywords, stop words, and thresholds.
"""

MAX_MESSAGE_LENGTH = 1000
CONFIDENCE_THRESHOLD = 0.30

# Universal English stop words to filter out during keyword extraction
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what",
    "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
    "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd",
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
}

# Rule-based intent patterns and weighted vocabulary
INTENT_PATTERNS = {
    "greeting": {
        "label": "Greeting",
        "keywords": ["hello", "hi", "hey", "greetings", "morning", "afternoon", "evening", "welcome", "sup", "howdy"],
        "phrases": ["good morning", "good afternoon", "good evening", "how are you", "what's up", "hey there", "hello there"],
        "weight": 1.2
    },
    "exam_preparation": {
        "label": "Exam Preparation",
        "keywords": ["exam", "exams", "examination", "midterm", "midterms", "finals", "test", "tests", "quiz", "revision", "revise", "scoring", "marks", "paper", "papers", "syllabus", "question"],
        "phrases": ["exam preparation", "prepare for exam", "prepare for exams", "upcoming exam", "study for exam", "past papers", "revision strategy", "exam tips", "midterm exam", "final exam"],
        "weight": 1.0
    },
    "study_planning": {
        "label": "Study Planning",
        "keywords": ["schedule", "plan", "planning", "routine", "timetable", "time", "management", "organize", "pomodoro", "hours", "focus", "distraction", "procrastination", "habit"],
        "phrases": ["study plan", "create a plan", "study schedule", "time management", "daily routine", "how to plan", "study timetable", "manage my time", "how to focus"],
        "weight": 1.0
    },
    "assignment_help": {
        "label": "Assignment Help",
        "keywords": ["assignment", "assignments", "homework", "project", "submission", "submit", "report", "deadline", "citation", "referencing", "plagiarism", "rubric", "draft"],
        "phrases": ["assignment guidance", "assignment help", "how to write", "submit assignment", "project report", "assignment deadline", "citation format", "assignment structure"],
        "weight": 1.0
    },
    "laboratory_guidance": {
        "label": "Laboratory Guidance",
        "keywords": ["lab", "labs", "laboratory", "experiment", "experiments", "practical", "practicals", "manual", "viva", "apparatus", "record", "observation", "simulation", "procedure", "hardware", "software"],
        "phrases": ["lab preparation", "lab manual", "practical exam", "viva questions", "lab record", "experimental setup", "practical session", "laboratory work"],
        "weight": 1.0
    },
    "attendance": {
        "label": "Attendance",
        "keywords": ["attendance", "absent", "presence", "leave", "medical", "shortage", "percentage", "criteria", "condonation", "bunk", "missed", "classes", "portal"],
        "phrases": ["improve attendance", "attendance criteria", "attendance shortage", "medical leave", "minimum attendance", "low attendance", "attendance percentage", "missed classes"],
        "weight": 1.1
    },
    "course_information": {
        "label": "Course Information",
        "keywords": ["course", "courses", "syllabus", "subject", "subjects", "credit", "credits", "prerequisite", "curriculum", "elective", "electives", "semester", "module", "department", "degree"],
        "phrases": ["course details", "course syllabus", "subject credits", "elective choices", "prerequisite subjects", "course structure", "curriculum details"],
        "weight": 0.95
    },
    "academic_guidance": {
        "label": "General Academic Guidance",
        "keywords": ["gpa", "cgpa", "grade", "grades", "backlog", "backlogs", "arrear", "arrears", "improvement", "advisor", "counselor", "career", "internship", "academics", "score"],
        "phrases": ["improve cgpa", "improve grades", "academic advisor", "clear backlogs", "academic performance", "career guidance", "academic support", "grade improvement"],
        "weight": 1.0
    },
    "motivation": {
        "label": "Motivation & Well-being",
        "keywords": ["stressed", "anxious", "nervous", "scared", "overwhelmed", "hopeless", "tired", "exhausted", "burnout", "burnt", "confidence", "panic", "depressed", "failure", "fear", "giving", "give"],
        "phrases": ["feeling stressed", "give up", "feeling overwhelmed", "cannot focus", "lost motivation", "fear of failing", "too much pressure", "feeling anxious"],
        "weight": 1.1
    },
    "goodbye": {
        "label": "Goodbye & Closure",
        "keywords": ["bye", "goodbye", "farewell", "cya", "thanks", "thank", "appreciated", "later"],
        "phrases": ["see you", "thank you", "thanks a lot", "have a good day", "good night", "that is all", "that's all", "bye bye"],
        "weight": 1.2
    }
}

# Tone Analysis Lexicons (Strictly rule-based text analysis)
TONE_LEXICONS = {
    "positive": [
        "great", "good", "thank", "thanks", "awesome", "excellent", "happy", "relieved",
        "excited", "appreciate", "helpful", "perfect", "clear", "solved", "understood",
        "wonderful", "glad", "best", "brilliant", "enjoy", "love", "confident"
    ],
    "concerned": [
        "worried", "worry", "worries", "nervous", "scared", "anxious", "stress", "stressed",
        "panic", "panicking", "fail", "failing", "tension", "difficult", "hard", "afraid",
        "confused", "struggling", "behind", "shortage", "lost", "doubt", "trouble", "low"
    ],
    "frustrated": [
        "angry", "annoyed", "terrible", "awful", "ridiculous", "unfair", "worst", "hate",
        "exhausted", "irritated", "fed up", "stuck", "mess", "horrible", "sick of", "useless",
        "impossible", "unacceptable"
    ]
}

# Academic subject entities recognized in conversation context
ACADEMIC_SUBJECTS = [
    "Computer Networks", "Database Management Systems", "Data Structures",
    "Operating Systems", "Software Engineering", "Machine Learning",
    "Discrete Mathematics", "Digital Signal Processing", "Cloud Computing",
    "Compiler Design", "Cybersecurity", "Artificial Intelligence",
    "Algorithms", "Computer Organization", "Object Oriented Programming"
]
