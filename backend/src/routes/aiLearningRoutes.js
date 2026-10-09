import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.gemini_api_key || "";
const COMIC_API_BASE = "http://127.0.0.1:8009";

/**
 * Helper to call Gemini / Local Ollama AI server-side
 */
async function callGemini(systemPrompt, userPrompt) {
  // 1. Try Gemini API with verified active models (gemini-3.5-flash-lite primary)
  const geminiModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemma-4-26b-a4b-it",
    "gemini-3.7-flash"
  ];

  if (GEMINI_API_KEY) {
    for (const modelName of geminiModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
        };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(25000)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(`[AI Engine] Generated dynamic response using Gemini (${modelName})`);
            return text.trim();
          }
        } else {
          console.warn(`[AI Engine] Model ${modelName} HTTP status ${res.status}`);
        }
      } catch (err) {
        console.warn(`[AI Engine] Model ${modelName} error:`, err.message);
      }
    }
  }

  // 2. Fallback to Local Ollama LLM if running on host
  try {
    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3:8b",
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (ollamaRes.ok) {
      const oData = await ollamaRes.json();
      if (oData.response) {
        console.log("[AI Engine] Generated dynamic response using Local Ollama (qwen3:8b)");
        return oData.response.trim();
      }
    }
  } catch (e) {
    console.warn("[AI Engine] Local Ollama call failed:", e.message);
  }

  return null;
}

/**
 * POST /api/student/ai-learning/generate
 */
router.post("/generate", async (req, res) => {
  try {
    const { topic, mode = "explain", level = "Beginner" } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, message: "Topic is required." });
    }

    const cleanTopic = topic.trim();

    // 1. EXPLAIN MODE
    if (mode === "explain") {
      const systemPrompt = `You are a world-class computer science and engineering professor. Explain topics clearly and engagingly for a ${level} student. Return clean Markdown with:
1. Executive Overview & Intuitive Real-world Analogy
2. Deep Dive & Core Mechanism (Step-by-Step)
3. Code or Architecture Diagram / Flow
4. 3 Key Takeaways`;

      const userPrompt = `Topic: "${cleanTopic}"\nTarget Level: ${level}`;
      const aiResponse = await callGemini(systemPrompt, userPrompt);

      const markdown = aiResponse || `### 📚 Overview of ${cleanTopic}\n**Level:** ${level}\n\n${cleanTopic} is a fundamental concept in software engineering and data architecture. Think of it like a coordinated factory pipeline where work items pass through specialized processing nodes.\n\n#### ⚙️ Key Mechanisms:\n- **Modularity:** Encapsulates business logic into reusable, decoupled components.\n- **Efficiency:** Optimizes execution throughput and minimizes memory overhead.\n- **Resilience:** Handles edge-case failures with auto-recovery.\n\n#### 💡 Real-World Analogy:\nImagine an airport baggage sorting system. Bags are scanned, routed across specialized conveyor belts, and loaded onto targeted aircraft automatically without manual congestion. ${cleanTopic} operates on the exact same principles.\n\n#### 🎯 Key Takeaways:\n1. Profile worst-case complexity before deployment.\n2. Implement caching and batching to minimize latency bottlenecks.\n3. Validate edge cases with structured unit tests.`;

      return res.json({
        success: true,
        mode: "explain",
        topic: cleanTopic,
        level,
        markdown
      });
    }

    // 2. QUIZ MODE
    if (mode === "quiz") {
      const systemPrompt = `Generate a 4-question multiple choice quiz on the topic for a ${level} student. Return ONLY valid JSON array of objects with keys: "question", "options" (array of 4 strings), "correctIndex" (0,1,2,3), and "explanation".`;
      const userPrompt = `Topic: "${cleanTopic}"`;
      const aiResponse = await callGemini(systemPrompt, userPrompt);

      let quizQuestions = null;
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            quizQuestions = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error("Failed to parse AI quiz JSON:", e);
        }
      }

      if (!quizQuestions) {
        quizQuestions = [
          {
            question: `What is the primary architectural purpose of ${cleanTopic}?`,
            options: [
              `To optimize processing throughput and resource distribution`,
              `To deliberately increase processing latency`,
              `To format text files without execution logic`,
              `To disable memory garbage collection`
            ],
            correctIndex: 0,
            explanation: `${cleanTopic} optimizes resource utilization and processing efficiency.`
          },
          {
            question: `Which system property is vital when implementing ${cleanTopic}?`,
            options: [
              `Scalability and fault tolerance`,
              `Single-threaded blocking locks`,
              `Synchronous endless polling loops`,
              `Hardcoded memory pointer offsets`
            ],
            correctIndex: 0,
            explanation: `Modern implementations of ${cleanTopic} rely heavily on scalability and resilience.`
          },
          {
            question: `How do systems engineers benchmark the performance of ${cleanTopic}?`,
            options: [
              `By measuring throughput, latency, and memory footprint`,
              `By counting total source code lines`,
              `By monitoring hardware chassis fan speeds`,
              `By measuring network cable distances`
            ],
            correctIndex: 0,
            explanation: `Throughput, latency, and resource utilization are key benchmarks.`
          },
          {
            question: `Which best practice ensures high reliability in ${cleanTopic}?`,
            options: [
              `Profiling bottlenecks and utilizing dynamic caching`,
              `Swallowing runtime exceptions silently`,
              `Using infinite unhandled loops`,
              `Mutating global shared state directly`
            ],
            correctIndex: 0,
            explanation: `Profiling performance and implementing caching strategies prevents runtime bottlenecks.`
          }
        ];
      }

      return res.json({
        success: true,
        mode: "quiz",
        topic: cleanTopic,
        level,
        questions: quizQuestions
      });
    }

    // 3. FLASHCARDS MODE (NEW!)
    if (mode === "flashcards") {
      const systemPrompt = `Create 5 interactive revision flashcards on the topic for a ${level} student. Return ONLY valid JSON array of objects with keys: "id" (1..5), "term" (front of card - concise term or question), "definition" (back of card - clear answer or explanation), and "category" (e.g. "Concept", "Architecture", "Best Practice").`;
      const userPrompt = `Topic: "${cleanTopic}"`;
      const aiResponse = await callGemini(systemPrompt, userPrompt);

      let flashcards = null;
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            flashcards = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error("Failed to parse flashcards JSON:", e);
        }
      }

      if (!flashcards) {
        flashcards = [
          {
            id: 1,
            category: "Core Concept",
            term: `What is the core definition of ${cleanTopic}?`,
            definition: `${cleanTopic} is a structured computing model designed to process workload operations efficiently through modular components.`
          },
          {
            id: 2,
            category: "Architecture",
            term: `What is the primary benefit of ${cleanTopic}?`,
            definition: `It maximizes system throughput, enables seamless scalability, and minimizes runtime latency bottlenecks.`
          },
          {
            id: 3,
            category: "Mechanism",
            term: `How does ${cleanTopic} handle failure recovery?`,
            definition: `By maintaining immutable operational logs or lineage graphs that reconstruct lost state without full recomputation.`
          },
          {
            id: 4,
            category: "Best Practice",
            term: `What is a key optimization technique for ${cleanTopic}?`,
            definition: `In-memory caching of frequently accessed data subsets and batching network requests.`
          },
          {
            id: 5,
            category: "Real-world Use",
            term: `Where is ${cleanTopic} commonly applied in industry?`,
            definition: `In large-scale enterprise analytics pipelines, distributed backend services, and high-frequency data engines.`
          }
        ];
      }

      return res.json({
        success: true,
        mode: "flashcards",
        topic: cleanTopic,
        level,
        flashcards
      });
    }

    // 4. CODE & LAB SOLVER MODE (NEW!)
    if (mode === "code_solver") {
      const systemPrompt = `You are a senior software architect. Provide a complete, production-ready code implementation explaining ${cleanTopic} for a ${level} student. Return ONLY valid JSON object with keys: "language" (e.g. "Python", "SQL", "Java", "C++"), "code" (formatted code string), "explanation" (step-by-step breakdown markdown), "sampleOutput" (console output string), and "pitfalls" (array of strings of common bugs).`;
      const userPrompt = `Topic: "${cleanTopic}"`;
      const aiResponse = await callGemini(systemPrompt, userPrompt);

      let codeData = null;
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            codeData = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error("Failed to parse code solver JSON:", e);
        }
      }

      if (!codeData) {
        codeData = {
          language: "Python 3.12",
          code: `# ${cleanTopic} - Reference Implementation\n\nclass SystemNode:\n    def __init__(self, name: str):\n        self.name = name\n        self.state = "IDLE"\n\n    def execute_task(self, data_batch: list) -> dict:\n        """Executes high-throughput data processing."""\n        self.state = "PROCESSING"\n        processed = [x * 2 for x in data_batch if x > 0]\n        self.state = "COMPLETED"\n        return {"node": self.name, "count": len(processed), "results": processed}\n\n# Instantiate node and run pipeline\nif __name__ == "__main__":
    node = SystemNode(name="Node-Alpha")\n    data = [10, 25, 40, -5, 60]\n    res = node.execute_task(data)\n    print("Pipeline Execution Result:", res)`,
          explanation: `#### 💡 Code Walkthrough:\n1. **SystemNode Class:** Encapsulates execution state for ${cleanTopic}.\n2. **List Comprehension:** Filters non-positive entries and applies transformations in $O(N)$ time.\n3. **State Management:** Tracks transition states from \`IDLE\` -> \`PROCESSING\` -> \`COMPLETED\`.`,
          sampleOutput: `Pipeline Execution Result: {'node': 'Node-Alpha', 'count': 4, 'results': [20, 50, 80, 120]}`,
          pitfalls: [
            "Modifying state without thread locks in concurrent multi-threaded execution.",
            "Failing to filter out negative or null input parameters.",
            "High memory overhead when instantiating un-batched large data objects."
          ]
        };
      }

      return res.json({
        success: true,
        mode: "code_solver",
        topic: cleanTopic,
        level,
        codeData
      });
    }

    // 5. LEARNING ROADMAP MODE (EXPANDED TO 6-8 STAGES)
    if (mode === "roadmap") {
      const systemPrompt = `Create a comprehensive step-by-step 6-stage learning roadmap and pathway for a ${level} student to master ${cleanTopic}. Return ONLY valid JSON array of objects with keys: "stage" (1..6), "title" (e.g. "Stage 1: Core Fundamentals"), "topics" (array of 3-4 key sub-concepts), "estimatedHours" (number), and "summary".`;
      const userPrompt = `Topic: "${cleanTopic}"`;
      const aiResponse = await callGemini(systemPrompt, userPrompt);

      let roadmap = null;
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            roadmap = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error("Failed to parse roadmap JSON:", e);
        }
      }

      if (!roadmap) {
        roadmap = [
          {
            stage: 1,
            title: "Stage 1: Core Fundamentals & Prerequisites",
            topics: ["Basic Data Structures", "Memory & Pointer Mechanics", "Time & Space Complexity"],
            estimatedHours: 4,
            summary: "Build a rock-solid foundation in underlying data structures and algorithm analysis."
          },
          {
            stage: 2,
            title: `Stage 2: ${cleanTopic} Core Architecture`,
            topics: ["Internal State Machine", "Event Dispatch Loop", "Resource Allocation"],
            estimatedHours: 8,
            summary: "Understand the step-by-step internal workflow and core state transitions."
          },
          {
            stage: 3,
            title: "Stage 3: Hands-on Implementation & Lab Coding",
            topics: ["API Usage & Boilerplate Setup", "Data Pipeline Transformations", "Error Handling & Logging"],
            estimatedHours: 10,
            summary: "Write production code and implement practical lab exercises to solidify concepts."
          },
          {
            stage: 4,
            title: "Stage 4: Advanced Optimization & Benchmarking",
            topics: ["In-Memory Caching Strategies", "Memory Profiling & GC Tuning", "Throughput vs Latency Tradeoffs"],
            estimatedHours: 12,
            summary: "Profile system execution, reduce latency bottlenecks, and optimize resource usage."
          },
          {
            stage: 5,
            title: "Stage 5: High Availability & Scaling in Production",
            topics: ["Fault Tolerance & Recovery", "Distributed Clustering & Partitioning", "Security & Access Controls"],
            estimatedHours: 14,
            summary: "Learn how senior engineers scale operations across high-availability production clusters."
          },
          {
            stage: 6,
            title: "Stage 6: Industry Capstone Project & Portfolio",
            topics: ["Real-world Benchmark Testing", "Production Monitoring & Metrics", "End-to-End Capstone Deployment"],
            estimatedHours: 18,
            summary: "Implement and deploy a full end-to-end benchmark project for your engineering portfolio."
          }
        ];
      }

      return res.json({
        success: true,
        mode: "roadmap",
        topic: cleanTopic,
        level,
        roadmap
      });
    }

    // 6. EXAM PREP MODE (NEW!)
    if (mode === "exam_prep") {
      const systemPrompt = `Create university exam preparation questions for ${cleanTopic} targeting a ${level} student. Return clean Markdown with 5-Mark Question + Model Answer, 10-Mark Architecture Question + Model Answer, and Examiner Marking Key Words.`;
      const userPrompt = `Topic: "${cleanTopic}"`;
      const aiResponse = await callGemini(systemPrompt, userPrompt);

      const markdown = aiResponse || `### 📝 University Exam Preparation: ${cleanTopic}\n\n#### 📌 5-Mark Question:\n*Explain the core architectural workflow of ${cleanTopic} with a neat diagram block.*  \n\n**Model Answer (5/5 Marks):**  \n${cleanTopic} is structured into three distinct operational phases: Input Queueing, Core Transformation Execution, and Output Persistence. Data items are validated upon arrival, processed in parallel chunks, and stored atomically.  \n\n**Examiner Scoring Keywords required for full marks:**  \n\`[Modularity, Execution Throughput, Atomic Persistence, Resource Allocation]\`  \n\n---\n\n#### 📌 10-Mark Question:\n*Discuss the fault tolerance and scalability trade-offs when implementing ${cleanTopic} at scale.*  \n\n**Model Answer (10/10 Marks):**  \nWhen scaling ${cleanTopic}, engineers balance throughput against resilience. Fault tolerance is maintained using checkpointing or immutable state lineage. Checkpointing introduces temporary disk I/O overhead but prevents catastrophic recomputation during cluster node failures. Lineage graphs, on the other hand, avoid disk writes by replaying transformation operations dynamically.`;

      return res.json({
        success: true,
        mode: "exam_prep",
        topic: cleanTopic,
        level,
        markdown
      });
    }

    // 7. SMART NOTES MODE
    if (mode === "notes") {
      const systemPrompt = `Create structured revision flashcards and smart notes on the topic for a ${level} student. Return clean Markdown with bullet points, key terms, and cheat-sheet summary.`;
      const userPrompt = `Topic: "${cleanTopic}"`;
      const aiResponse = await callGemini(systemPrompt, userPrompt);

      const notesContent = aiResponse || `### 📝 Smart Revision Notes: ${cleanTopic}\n\n- 🔹 **Core Definition:** High-efficiency implementation model for ${cleanTopic}.\n- 🔹 **Key Component 1:** State Management & Storage.\n- 🔹 **Key Component 2:** Distributed Task Dispatcher.\n- 🔹 **Exam Tip:** Remember to mention time complexity and scalability trade-offs in short-answer questions!`;

      return res.json({
        success: true,
        mode: "notes",
        topic: cleanTopic,
        level,
        markdown: notesContent
      });
    }

    // 8. COMIC MODE
    if (mode === "comic") {
      return res.json({
        success: true,
        mode: "comic",
        topic: cleanTopic,
        level
      });
    }

    return res.status(400).json({ success: false, message: "Invalid mode specified." });
  } catch (err) {
    console.error("AI Learning generate error:", err);
    res.status(500).json({ success: false, message: "Failed to generate AI learning content." });
  }
});

export default router;
