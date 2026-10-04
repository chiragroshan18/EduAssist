/**
 * EduAssist Client-Side TSA (Text, Speech and Analysis) Engine
 * 
 * Provides 100% parity with the Python backend for standalone browser execution,
 * offline usage, and static GitHub Pages demonstration.
 * 
 * Centralized In-Memory Runtime State stored cleanly in Lists & Dictionaries
 * with transparent LocalStorage persistence.
 */

(function (window) {
  'use strict';

  // Universal English stop words
  const STOP_WORDS = new Set([
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
  ]);

  // Rule-based intent definitions
  const INTENT_PATTERNS = {
    greeting: {
      label: "Greeting",
      keywords: ["hello", "hi", "hey", "greetings", "morning", "afternoon", "evening", "welcome", "sup", "howdy"],
      phrases: ["good morning", "good afternoon", "good evening", "how are you", "what's up", "hey there", "hello there"],
      weight: 1.2
    },
    exam_preparation: {
      label: "Exam Preparation",
      keywords: ["exam", "exams", "examination", "midterm", "midterms", "finals", "test", "tests", "quiz", "revision", "revise", "scoring", "marks", "paper", "papers", "syllabus", "question"],
      phrases: ["exam preparation", "prepare for exam", "prepare for exams", "upcoming exam", "study for exam", "past papers", "revision strategy", "exam tips", "midterm exam", "final exam"],
      weight: 1.0
    },
    study_planning: {
      label: "Study Planning",
      keywords: ["schedule", "plan", "planning", "routine", "timetable", "time", "management", "organize", "pomodoro", "hours", "focus", "distraction", "procrastination", "habit"],
      phrases: ["study plan", "create a plan", "study schedule", "time management", "daily routine", "how to plan", "study timetable", "manage my time", "how to focus"],
      weight: 1.0
    },
    assignment_help: {
      label: "Assignment Help",
      keywords: ["assignment", "assignments", "homework", "project", "submission", "submit", "report", "deadline", "citation", "referencing", "plagiarism", "rubric", "draft"],
      phrases: ["assignment guidance", "assignment help", "how to write", "submit assignment", "project report", "assignment deadline", "citation format", "assignment structure"],
      weight: 1.0
    },
    laboratory_guidance: {
      label: "Laboratory Guidance",
      keywords: ["lab", "labs", "laboratory", "experiment", "experiments", "practical", "practicals", "manual", "viva", "apparatus", "record", "observation", "simulation", "procedure", "hardware", "software"],
      phrases: ["lab preparation", "lab manual", "practical exam", "viva questions", "lab record", "experimental setup", "practical session", "laboratory work"],
      weight: 1.0
    },
    attendance: {
      label: "Attendance",
      keywords: ["attendance", "absent", "presence", "leave", "medical", "shortage", "percentage", "criteria", "condonation", "bunk", "missed", "classes", "portal"],
      phrases: ["improve attendance", "attendance criteria", "attendance shortage", "medical leave", "minimum attendance", "low attendance", "attendance percentage", "missed classes"],
      weight: 1.1
    },
    course_information: {
      label: "Course Information",
      keywords: ["course", "courses", "syllabus", "subject", "subjects", "credit", "credits", "prerequisite", "curriculum", "elective", "electives", "semester", "module", "department", "degree"],
      phrases: ["course details", "course syllabus", "subject credits", "elective choices", "prerequisite subjects", "course structure", "curriculum details"],
      weight: 0.95
    },
    academic_guidance: {
      label: "General Academic Guidance",
      keywords: ["gpa", "cgpa", "grade", "grades", "backlog", "backlogs", "arrear", "arrears", "improvement", "advisor", "counselor", "career", "internship", "academics", "score"],
      phrases: ["improve cgpa", "improve grades", "academic advisor", "clear backlogs", "academic performance", "career guidance", "academic support", "grade improvement"],
      weight: 1.0
    },
    motivation: {
      label: "Motivation & Well-being",
      keywords: ["stressed", "anxious", "nervous", "scared", "overwhelmed", "hopeless", "tired", "exhausted", "burnout", "burnt", "confidence", "panic", "depressed", "failure", "fear", "giving", "give"],
      phrases: ["feeling stressed", "give up", "feeling overwhelmed", "cannot focus", "lost motivation", "fear of failing", "too much pressure", "feeling anxious"],
      weight: 1.1
    },
    goodbye: {
      label: "Goodbye & Closure",
      keywords: ["bye", "goodbye", "farewell", "cya", "thanks", "thank", "appreciated", "later"],
      phrases: ["see you", "thank you", "thanks a lot", "have a good day", "good night", "that is all", "that's all", "bye bye"],
      weight: 1.2
    }
  };

  // Tone Lexicons (Rule-based lexical matching)
  const TONE_LEXICONS = {
    positive: [
      "great", "good", "thank", "thanks", "awesome", "excellent", "happy", "relieved",
      "excited", "appreciate", "helpful", "perfect", "clear", "solved", "understood",
      "wonderful", "glad", "best", "brilliant", "enjoy", "love", "confident"
    ],
    concerned: [
      "worried", "worry", "worries", "nervous", "scared", "anxious", "stress", "stressed",
      "panic", "panicking", "fail", "failing", "tension", "difficult", "hard", "afraid",
      "confused", "struggling", "behind", "shortage", "lost", "doubt", "trouble", "low"
    ],
    frustrated: [
      "angry", "annoyed", "terrible", "awful", "ridiculous", "unfair", "worst", "hate",
      "exhausted", "irritated", "fed up", "stuck", "mess", "horrible", "sick of", "useless",
      "impossible", "unacceptable"
    ]
  };

  const ACADEMIC_SUBJECTS = [
    "Computer Networks", "Database Management Systems", "Data Structures",
    "Operating Systems", "Software Engineering", "Machine Learning",
    "Discrete Mathematics", "Digital Signal Processing", "Cloud Computing",
    "Compiler Design", "Cybersecurity", "Artificial Intelligence",
    "Algorithms", "Computer Organization", "Object Oriented Programming"
  ];

  // ============================================================================
  // Text Preprocessing
  // ============================================================================

  function normalizeWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  function removePunctuation(text) {
    return text.replace(/[^\w\s\-]/g, ' ');
  }

  function tokenize(text) {
    const cleaned = removePunctuation(text.toLowerCase());
    return cleaned.split(/\s+/)
      .map(tok => tok.replace(/^-+|-+$/g, ''))
      .filter(tok => tok.length > 0);
  }

  function extractKeywords(tokens, topN = 6) {
    const seen = new Set();
    const keywords = [];
    for (const tok of tokens) {
      if (tok.length > 2 && !STOP_WORDS.has(tok) && !seen.has(tok)) {
        seen.add(tok);
        keywords.push(tok);
        if (keywords.length >= topN) break;
      }
    }
    return keywords;
  }

  function preprocess(text) {
    if (!text || typeof text !== 'string') {
      throw new Error("Message cannot be empty");
    }
    const clean = normalizeWhitespace(text);
    if (!clean) {
      throw new Error("Message cannot be empty or whitespace only");
    }
    if (clean.length > 1000) {
      throw new Error("Message exceeds maximum length of 1000 characters");
    }
    const tokens = tokenize(clean);
    const keywords = extractKeywords(tokens);
    return {
      rawText: text,
      normalizedText: clean.toLowerCase(),
      tokens: tokens,
      keywords: keywords
    };
  }

  // ============================================================================
  // Tone Analysis
  // ============================================================================

  function analyzeTone(tokens, rawText) {
    const tokenSet = new Set(tokens);
    const textLower = rawText.toLowerCase();

    const posMatches = TONE_LEXICONS.positive.filter(w => tokenSet.has(w) || textLower.includes(w));
    const conMatches = TONE_LEXICONS.concerned.filter(w => tokenSet.has(w) || textLower.includes(w));
    const fruMatches = TONE_LEXICONS.frustrated.filter(w => tokenSet.has(w) || textLower.includes(w));

    let posScore = posMatches.length;
    let conScore = conMatches.length;
    let fruScore = fruMatches.length;

    const hasExclamation = rawText.includes("!") || rawText.includes("?!");
    if (hasExclamation && fruScore > 0) fruScore += 0.5;
    if (hasExclamation && conScore > 0) conScore += 0.3;

    const maxScore = Math.max(posScore, conScore, fruScore);

    if (maxScore === 0) {
      return { tone: "neutral", score: 1.0, matchedIndicators: [] };
    }
    if (fruScore === maxScore && fruScore > 0) {
      return { tone: "frustrated", score: Math.min(0.65 + fruScore * 0.15, 0.98), matchedIndicators: fruMatches };
    }
    if (conScore === maxScore && conScore > 0) {
      return { tone: "concerned", score: Math.min(0.65 + conScore * 0.15, 0.98), matchedIndicators: conMatches };
    }
    return { tone: "positive", score: Math.min(0.70 + posScore * 0.12, 0.99), matchedIndicators: posMatches };
  }

  // ============================================================================
  // Intent Detection & Rule-Based Confidence
  // ============================================================================

  function checkContextual(textLower, tokens, context) {
    if (!context || !context.state) return null;

    if (context.state === "awaiting_subject") {
      const matched = ACADEMIC_SUBJECTS.filter(s => textLower.includes(s.toLowerCase()));
      const subjectName = matched.length > 0 ? matched[0] : tokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' ');
      return {
        intent: "exam_preparation",
        label: "Exam Preparation",
        confidence: 0.91,
        matchedKeywords: [subjectName],
        isContextual: true
      };
    }
    return null;
  }

  function detectIntent(tokens, rawText, context) {
    const textLower = rawText.toLowerCase().trim();
    const tokenSet = new Set(tokens);

    // 1. Check conversational context
    const contextual = checkContextual(textLower, tokens, context);
    if (contextual) return contextual;

    // 2. Evaluate all intents
    const scores = {};
    const matchedData = {};

    for (const [intentKey, rule] of Object.entries(INTENT_PATTERNS)) {
      const phraseMatches = rule.phrases.filter(p => textLower.includes(p));
      const keywordMatches = rule.keywords.filter(k => tokenSet.has(k));
      const weight = rule.weight || 1.0;

      const score = (phraseMatches.length * 2.5 + keywordMatches.length * 1.0) * weight;
      const allMatches = [...phraseMatches, ...keywordMatches.filter(k => !phraseMatches.join(' ').includes(k))];

      scores[intentKey] = score;
      matchedData[intentKey] = allMatches;
    }

    let bestIntent = null;
    let bestScore = -1;
    for (const [key, val] of Object.entries(scores)) {
      if (val > bestScore) {
        bestScore = val;
        bestIntent = key;
      }
    }

    if (bestScore <= 0) {
      return {
        intent: "unknown",
        label: "Unknown / Unclassified",
        confidence: 0.20,
        matchedKeywords: [],
        isContextual: false
      };
    }

    const baseConf = Math.min(0.55 + bestScore * 0.12, 0.96);

    if (baseConf < 0.30 || matchedData[bestIntent].length === 0) {
      return {
        intent: "unknown",
        label: "Unknown / Unclassified",
        confidence: parseFloat(baseConf.toFixed(2)),
        matchedKeywords: matchedData[bestIntent],
        isContextual: false
      };
    }

    return {
      intent: bestIntent,
      label: INTENT_PATTERNS[bestIntent].label,
      confidence: parseFloat(baseConf.toFixed(2)),
      matchedKeywords: matchedData[bestIntent],
      isContextual: false
    };
  }

  // ============================================================================
  // Response Generation
  // ============================================================================

  function generateResponse(intent, tone, rawText, tokens, context, isContextual) {
    const textLower = rawText.toLowerCase();

    if (isContextual && context && context.state === "awaiting_subject") {
      const matched = ACADEMIC_SUBJECTS.filter(s => textLower.includes(s.toLowerCase()));
      const subj = matched.length > 0 ? matched[0] : tokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' ');
      const reply = 
        `Got it! For **${subj}**, here is a targeted preparation strategy:\n\n` +
        `1. **Core Concept Mapping**: Review high-weightage chapters and foundational diagrams first.\n` +
        `2. **Previous Year Questions**: Solve the last 3-5 years of past question papers to spot recurring themes.\n` +
        `3. **Formula & Summary Sheet**: Maintain a quick one-page cheat sheet for key formulas, algorithms, or definitions.\n` +
        `4. **Timed Mock Test**: Practice solving at least one complete unit test without referring to notes.`;
      const followUps = ["Help me create a study plan", "How to manage exam stress?", "Assignment guidance"];
      return { reply, followUps, nextContext: null };
    }

    let tonePrefix = "";
    if (tone === "concerned") {
      tonePrefix = "I understand you might be feeling anxious about this, but you can succeed with a calm, step-by-step strategy. ";
    } else if (tone === "frustrated") {
      tonePrefix = "Academic hurdles can definitely be overwhelming. Take a deep breath — let's break this down into clear steps. ";
    } else if (tone === "positive") {
      tonePrefix = "Great to see your proactive energy! ";
    }

    if (intent === "greeting") {
      const reply = 
        `${tonePrefix}Hello! Welcome to **EduAssist**, your academic guidance assistant.\n\n` +
        `I can assist you with:\n` +
        `• **Exam Preparation** (revision cycles, past papers, test strategy)\n` +
        `• **Study Planning** (daily timetable, focus sessions, time management)\n` +
        `• **Assignment & Lab Guidance** (structuring reports, viva preparation)\n` +
        `• **Attendance & Course Queries** (attendance criteria, syllabus info)\n\n` +
        `How can I help you with your studies today?`;
      const followUps = [
        "How should I prepare for exams?",
        "Help me create a study plan",
        "I need assignment guidance",
        "How can I improve my attendance?"
      ];
      return { reply, followUps, nextContext: null };
    }

    if (intent === "exam_preparation") {
      const matchedSubj = ACADEMIC_SUBJECTS.filter(s => textLower.includes(s.toLowerCase()));
      if (matchedSubj.length === 0 && !textLower.includes("subject")) {
        const reply = 
          `${tonePrefix}For effective **Exam Preparation**, follow this 4-step framework:\n\n` +
          `1. **Divide the Syllabus**: Break modules into manageable subtopics categorized by difficulty.\n` +
          `2. **Active Recall**: Test yourself after reading rather than passively highlighting.\n` +
          `3. **Solve Past Papers**: Focus on frequently asked question patterns and time constraints.\n` +
          `4. **Revision Cycles**: Revise newly learned concepts on Day 1, Day 3, and Day 7.\n\n` +
          `**Which subject are you preparing for?** (e.g., Computer Networks, Database Systems, Mathematics)`;
        const followUps = ["Computer Networks", "Database Management Systems", "Help me create a study plan"];
        const nextContext = { state: "awaiting_subject", parentIntent: "exam_preparation" };
        return { reply, followUps, nextContext };
      } else {
        const subjStr = matchedSubj.length > 0 ? ` for **${matchedSubj[0]}**` : "";
        const reply = 
          `${tonePrefix}Here is a structured preparation plan${subjStr}:\n\n` +
          `• **Topic Prioritization**: Dedicate 60% of your initial time to core concepts with high credit weightage.\n` +
          `• **Daily Practice**: Allocate 90-minute uninterrupted study blocks with 15-minute breaks.\n` +
          `• **Doubt Clarification**: Compile ambiguous topics into a list and consult your instructor or peers early.\n` +
          `• **Mock Revision**: Complete a full mock test 48 hours prior to the exam.`;
        const followUps = ["Help me create a study plan", "How to manage exam stress?", "Lab preparation tips"];
        return { reply, followUps, nextContext: null };
      }
    }

    if (intent === "study_planning") {
      const reply = 
        `${tonePrefix}Here is a practical **Study Planning & Time Management** guide:\n\n` +
        `1. **Use Pomodoro Technique**: Work in 25-50 minute focused sprints followed by 5-10 minute rest intervals.\n` +
        `2. **Daily 3-Task Rule**: Pick your top 3 non-negotiable academic goals each morning.\n` +
        `3. **Buffer Windows**: Keep 1 hour open daily for unexpected delays or quick revisions.\n` +
        `4. **Consistent Study Environment**: Keep your workspace free from phone distractions and notifications.`;
      const followUps = ["How should I prepare for exams?", "I need assignment guidance", "Feeling stressed"];
      return { reply, followUps, nextContext: null };
    }

    if (intent === "assignment_help") {
      const reply = 
        `${tonePrefix}Here are key guidelines for your **Assignment & Project Work**:\n\n` +
        `1. **Requirement Analysis**: Carefully read the grading rubric and formatting specifications before writing.\n` +
        `2. **Outline First**: Structure your response with Introduction, Core Technical Analysis, Results/Observations, and Conclusion.\n` +
        `3. **Academic Integrity**: Always cite external books, research papers, and technical documentations accurately.\n` +
        `4. **Proofreading & Formatting**: Check equations, code formatting, and grammar before final submission.`;
      const followUps = ["How to format project reports?", "Help me create a study plan", "Lab preparation tips"];
      return { reply, followUps, nextContext: null };
    }

    if (intent === "laboratory_guidance") {
      const reply = 
        `${tonePrefix}Here is how to excel in **Laboratory Sessions & Viva Voce**:\n\n` +
        `1. **Pre-Lab Preparation**: Understand the aim, underlying theoretical principles, and circuit/code logic prior to entering the lab.\n` +
        `2. **Accurate Record Keeping**: Note observations, graphs, and simulation results immediately in your lab record.\n` +
        `3. **Viva Anticipation**: Be ready to explain the 'why' behind each step, safety precautions, and potential sources of error.\n` +
        `4. **Systematic Debugging**: When an experiment fails, isolate variables methodically rather than making random changes.`;
      const followUps = ["Common viva questions", "How should I prepare for exams?", "I need assignment guidance"];
      return { reply, followUps, nextContext: null };
    }

    if (intent === "attendance") {
      const reply = 
        `${tonePrefix}Regarding **Attendance & Course Regulations**:\n\n` +
        `• **Standard Requirement**: Most universities require a minimum of 75% attendance to qualify for semester examinations.\n` +
        `• **Shortage Mitigation**: If you have missed classes due to medical reasons, submit valid doctor certificates to the department office promptly.\n` +
        `• **Faculty Consultation**: Speak with your course instructor to verify if makeup assignments, lab remedial hours, or duty leaves apply.\n` +
        `• **Official Tracking**: Monitor your institution's official student portal regularly to avoid last-minute condonation issues.`;
      const followUps = ["How to calculate attendance percentage?", "General academic guidance", "Course information"];
      return { reply, followUps, nextContext: null };
    }

    if (intent === "course_information") {
      const reply = 
        `${tonePrefix}For **Course & Curriculum Inquiries**:\n\n` +
        `1. **Syllabus Copy**: Consult your department's published semester curriculum guide for exact module breakdowns.\n` +
        `2. **Credits & Prerequisites**: Ensure you have satisfied prerequisite course requirements before selecting departmental electives.\n` +
        `3. **Recommended Textbooks**: Review the official references listed at the end of each course syllabus.\n` +
        `4. **Academic Advisor**: For elective changes or credit transfers, schedule a brief consultation with your designated faculty advisor.`;
      const followUps = ["Academic guidance", "How should I prepare for exams?", "Help me create a study plan"];
      return { reply, followUps, nextContext: null };
    }

    if (intent === "academic_guidance") {
      const reply = 
        `${tonePrefix}Here is guidance for **CGPA Improvement & Academic Growth**:\n\n` +
        `1. **Target High-Credit Courses**: Focus strategic revision on 4-credit core subjects to boost your overall GPA.\n` +
        `2. **Clear Backlogs Early**: Treat arrear exams with immediate priority to prevent semester overload.\n` +
        `3. **Continuous Assessment**: Maximize internal midterms, quizzes, and lab scores — they constitute 40-50% of your grade.\n` +
        `4. **Seek Mentorship**: Discuss your career trajectory and technical interests with your faculty advisor or senior peers.`;
      const followUps = ["How to improve CGPA?", "Help me create a study plan", "Assignment guidance"];
      return { reply, followUps, nextContext: null };
    }

    if (intent === "motivation") {
      const reply = 
        `${tonePrefix}Remember that academic stress is common and temporary. You are fully capable of overcoming this:\n\n` +
        `• **Step Back**: Take a 15-minute screen-free break, drink water, and take slow, deep breaths.\n` +
        `• **Shrink the Mountain**: Don't think about the entire syllabus at once. Pick just **one single topic** for the next 30 minutes.\n` +
        `• **Progress Over Perfection**: Even completing 2 practice questions builds momentum.\n` +
        `• **Support System**: Talk to a friend, family member, or college counselor if you are feeling overburdened.`;
      const followUps = ["Help me create a study plan", "How should I prepare for exams?", "Thank you"];
      return { reply, followUps, nextContext: null };
    }

    if (intent === "goodbye") {
      const reply = 
        `${tonePrefix}You're very welcome! Best of luck with your studies and upcoming coursework.\n\n` +
        `Feel free to ask anytime you need academic guidance, study planning, or revision tips. Have a productive day!`;
      const followUps = ["How should I prepare for exams?", "Help me create a study plan"];
      return { reply, followUps, nextContext: null };
    }

    // Fallback unknown
    const reply = 
      `I'm not completely sure what you're asking about. ` +
      `Try asking about exams, assignments, study planning, attendance, or laboratory preparation.\n\n` +
      `Here are common questions you can try:`;
    const followUps = [
      "How should I prepare for exams?",
      "Help me create a study plan",
      "I need assignment guidance",
      "How can I improve my attendance?",
      "Help me with my lab preparation"
    ];
    return { reply, followUps, nextContext: null };
  }

  // ============================================================================
  // Client-Side Session State Manager with Persistent Memory
  // ============================================================================

  class ClientSessionState {
    constructor() {
      this.storageKey = 'eduassist_client_session';
      if (!this.loadFromStorage()) {
        this.reset();
      }
    }

    saveToStorage() {
      try {
        const payload = {
          conversation: this.conversation,
          intentCounts: this.intentCounts,
          toneCounts: this.toneCounts,
          sessionStarted: this.sessionStarted,
          sessionStartIso: this.sessionStartIso
        };
        localStorage.setItem(this.storageKey, JSON.stringify(payload));
      } catch (e) {
        // localStorage unavailable in some sandboxes
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const data = JSON.parse(raw);
          if (data && Array.isArray(data.conversation)) {
            this.conversation = data.conversation;
            this.intentCounts = data.intentCounts || {};
            this.toneCounts = data.toneCounts || { positive: 0, neutral: 0, concerned: 0, frustrated: 0 };
            this.sessionStarted = data.sessionStarted || Date.now();
            this.sessionStartIso = data.sessionStartIso || new Date().toISOString();
            this.activeContext = null;
            return true;
          }
        }
      } catch (e) {
        // Fallback to fresh reset
      }
      return false;
    }

    reset() {
      this.conversation = [];
      this.intentCounts = {};
      this.toneCounts = { positive: 0, neutral: 0, concerned: 0, frustrated: 0 };
      this.sessionStarted = Date.now();
      this.sessionStartIso = new Date().toISOString();
      this.activeContext = null;
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e) {}
    }

    addMessage(sender, text, intent = null, confidence = null, tone = null, keywords = [], followUps = []) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = {
        id: `msg_${Math.random().toString(36).substring(2, 10)}`,
        sender: sender,
        text: text,
        timestamp: timeStr,
        iso_timestamp: now.toISOString(),
        intent: intent,
        confidence: confidence,
        tone: tone,
        keywords: keywords,
        follow_ups: followUps
      };
      this.conversation.push(msg);

      if (sender === "student") {
        if (intent) {
          this.intentCounts[intent] = (this.intentCounts[intent] || 0) + 1;
        }
        if (tone && this.toneCounts[tone] !== undefined) {
          this.toneCounts[tone]++;
        }
      }

      this.saveToStorage();
      return msg;
    }

    getConversation() {
      return [...this.conversation];
    }

    getDashboard() {
      const totalMessages = this.conversation.length;
      const studentMessages = this.conversation.filter(m => m.sender === "student").length;
      const botResponses = this.conversation.filter(m => m.sender === "bot").length;

      let mostCommonIntent = "None";
      let highestIntentCount = 0;
      for (const [intKey, count] of Object.entries(this.intentCounts)) {
        if (count > highestIntentCount) {
          highestIntentCount = count;
          mostCommonIntent = intKey;
        }
      }

      let currentTone = "neutral";
      let highestToneCount = 0;
      for (const [tKey, count] of Object.entries(this.toneCounts)) {
        if (count > highestToneCount) {
          highestToneCount = count;
          currentTone = tKey;
        }
      }

      const diffSecs = Math.floor((Date.now() - this.sessionStarted) / 1000);
      const minutes = Math.floor(diffSecs / 60);
      const seconds = diffSecs % 60;
      const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      return {
        total_messages: totalMessages,
        student_messages: studentMessages,
        bot_responses: botResponses,
        detected_intents_count: Object.keys(this.intentCounts).length,
        most_common_intent: mostCommonIntent,
        current_tone: currentTone,
        intent_distribution: { ...this.intentCounts },
        tone_distribution: { ...this.toneCounts },
        session_duration: durationStr,
        session_started: this.sessionStartIso
      };
    }

    loadDemo() {
      this.reset();
      const demoItems = [
        {
          sender: "student",
          text: "Hello, I need some guidance with my upcoming college exams.",
          intent: "greeting",
          confidence: 0.94,
          tone: "neutral",
          keywords: ["guidance", "upcoming", "college", "exams"]
        },
        {
          sender: "bot",
          text: "Hello! Welcome to EduAssist. I can assist you with exam preparation, study planning, assignment structuring, and laboratory guidance. How can I help you today?",
          intent: "greeting",
          confidence: null,
          tone: null,
          keywords: [],
          follow_ups: ["How should I prepare for exams?", "Help me create a study plan"]
        },
        {
          sender: "student",
          text: "I am really worried about my Computer Networks examination next week.",
          intent: "exam_preparation",
          confidence: 0.93,
          tone: "concerned",
          keywords: ["worried", "computer", "networks", "examination", "week"]
        },
        {
          sender: "bot",
          text: "I understand you might be feeling anxious about this, but you can succeed with a calm, step-by-step strategy. For Computer Networks, focus on OSI/TCP-IP models, packet routing algorithms, and past question papers.",
          intent: "exam_preparation",
          confidence: null,
          tone: null,
          keywords: [],
          follow_ups: ["Help me create a study plan", "Lab preparation tips"]
        },
        {
          sender: "student",
          text: "Can you help me create a daily study schedule so I don't feel overwhelmed?",
          intent: "study_planning",
          confidence: 0.91,
          tone: "concerned",
          keywords: ["create", "daily", "study", "schedule", "overwhelmed"]
        },
        {
          sender: "bot",
          text: "Use the Pomodoro Technique: 50-minute focused study sprints with 10-minute breaks. Pick your top 3 non-negotiable topics each morning, and leave a 1-hour buffer for revision.",
          intent: "study_planning",
          confidence: null,
          tone: null,
          keywords: [],
          follow_ups: ["I need assignment guidance", "How can I improve my attendance?"]
        },
        {
          sender: "student",
          text: "Also, what is the required attendance percentage to sit for the final exam?",
          intent: "attendance",
          confidence: 0.92,
          tone: "neutral",
          keywords: ["required", "attendance", "percentage", "final", "exam"]
        },
        {
          sender: "bot",
          text: "Most universities require a minimum of 75% attendance. If you have medical absences, submit certified documents to the department office promptly and check your official portal.",
          intent: "attendance",
          confidence: null,
          tone: null,
          keywords: [],
          follow_ups: ["General academic guidance", "Thank you"]
        },
        {
          sender: "student",
          text: "Thank you so much! This organized plan makes me feel much more confident.",
          intent: "goodbye",
          confidence: 0.95,
          tone: "positive",
          keywords: ["thank", "organized", "plan", "feel", "confident"]
        },
        {
          sender: "bot",
          text: "Great to see your proactive energy! You're very welcome. Best of luck with your exams — feel free to ask if you need any more academic advice!",
          intent: "goodbye",
          confidence: null,
          tone: null,
          keywords: [],
          follow_ups: ["How should I prepare for exams?", "Help me create a study plan"]
        }
      ];

      for (const item of demoItems) {
        this.addMessage(
          item.sender,
          item.text,
          item.intent,
          item.confidence,
          item.tone,
          item.keywords,
          item.follow_ups
        );
      }
      this.saveToStorage();
    }

    analyzeConversation() {
      const studentMsgs = this.conversation.filter(m => m.sender === "student");
      const total = this.conversation.length;

      if (studentMsgs.length === 0) {
        return {
          has_data: false,
          total_messages: total,
          summary_text: "No student messages have been recorded yet to analyze.",
          primary_intent: "None",
          dominant_tone: "Neutral",
          key_topics: [],
          intent_distribution: {}
        };
      }

      let primaryIntent = "unknown";
      let highestIntentCount = 0;
      for (const [key, val] of Object.entries(this.intentCounts)) {
        if (val > highestIntentCount) {
          highestIntentCount = val;
          primaryIntent = key;
        }
      }

      let dominantTone = "neutral";
      let highestToneCount = 0;
      for (const [key, val] of Object.entries(this.toneCounts)) {
        if (val > highestToneCount) {
          highestToneCount = val;
          dominantTone = key;
        }
      }

      const seenKw = new Set();
      const allKeywords = [];
      for (const m of studentMsgs) {
        for (const kw of (m.keywords || [])) {
          const lower = kw.toLowerCase();
          if (!seenKw.has(lower)) {
            seenKw.add(lower);
            allKeywords.push(kw.charAt(0).toUpperCase() + kw.slice(1));
          }
        }
      }

      const keyTopics = allKeywords.slice(0, 7);
      const summaryText = 
        `The student engaged in a ${total}-message dialogue primarily focused on ` +
        `'${primaryIntent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}'. ` +
        `The overall conversational sentiment was identified as '${dominantTone.charAt(0).toUpperCase() + dominantTone.slice(1)}'. ` +
        `Key discussion topics centered on ${keyTopics.slice(0, 4).join(', ') || 'coursework'}. ` +
        `Recommendations include structured time-blocking, syllabus pacing, and proactive consultation with faculty.`;

      const now = new Date();
      return {
        has_data: true,
        total_messages: total,
        student_messages: studentMsgs.length,
        bot_responses: total - studentMsgs.length,
        primary_intent: primaryIntent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        dominant_tone: dominantTone.charAt(0).toUpperCase() + dominantTone.slice(1),
        key_topics: keyTopics,
        intent_distribution: { ...this.intentCounts },
        tone_distribution: { ...this.toneCounts },
        summary_text: summaryText,
        generated_at: now.toLocaleString()
      };
    }
  }

  // Export to Global Scope
  window.EduAssistTSA = {
    preprocess,
    analyzeTone,
    detectIntent,
    generateResponse,
    ClientSessionState,
    INTENT_PATTERNS
  };

})(window);
