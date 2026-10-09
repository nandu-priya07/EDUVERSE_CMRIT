import express from "express";

const router = express.Router();

// GET /api/home
router.get("/", async (req, res) => {
  try {
    const homeData = {
      success: true,

      user: {
        name: "Vetrichelvan",
        role: "student",
        department: "Artificial Intelligence and Data Science",
        year: 3,
      },

      stats: {
        enrolledCourses: 8,
        learningHours: 124,
        pendingAssignments: 5,
        learningStreak: 12,
      },

      courses: [
        {
          id: 1,
          title: "Artificial Intelligence",
          code: "AI301",
          instructor: "Dr. Arun Kumar",
          progress: 75,
        },
        {
          id: 2,
          title: "Machine Learning",
          code: "ML302",
          instructor: "Prof. Priya",
          progress: 60,
        },
        {
          id: 3,
          title: "Data Structures",
          code: "CS303",
          instructor: "Dr. Karthik",
          progress: 45,
        },
      ],

      upcomingTasks: [
        {
          id: 1,
          title: "Machine Learning Assignment",
          subject: "ML302",
          dueDate: "2026-10-03",
          status: "pending",
        },
        {
          id: 2,
          title: "AI Unit Test",
          subject: "AI301",
          dueDate: "2026-10-06",
          status: "pending",
        },
        {
          id: 3,
          title: "DS Lab Record",
          subject: "CS303",
          dueDate: "2026-10-09",
          status: "pending",
        },
      ],
    };

    res.status(200).json(homeData);
  } catch (error) {
    console.error("Home API Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
});

export default router;