import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const departmentsData = [
  {
    name: "Artificial Intelligence and Data Science",
    code: "AIDS",
    description:
      "Focuses on artificial intelligence algorithms, data engineering, machine learning pipelines, and big data analytics for modern intelligent applications.",
    courses: [
      {
        name: "Python Programming for Data Science",
        code: "AD101",
        description: "Foundational programming course using Python, NumPy, Pandas, and Matplotlib for data manipulation.",
        credit: 3.0,
        category: "Core",
        sem: 1,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD101.pdf",
        learning_objectives: "Master Python syntax, understand data structures, manipulate datasets with Pandas, and create clear data visualizations.",
      },
      {
        name: "Data Science Laboratory",
        code: "AD103L",
        description: "Hands-on lab experiments for data cleaning, EDA, feature scaling, and statistical analysis.",
        credit: 1.5,
        category: "Lab",
        sem: 1,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD103L.pdf",
        learning_objectives: "Apply hands-on skills in data processing pipelines and exploratory data analysis.",
      },
      {
        name: "Data Structures & Algorithms",
        code: "AD102",
        description: "Implementation and time complexity analysis of stacks, queues, trees, graphs, sorting, and searching.",
        credit: 4.0,
        category: "Core",
        sem: 2,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1516116211223-425826889815?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD102.pdf",
        learning_objectives: "Evaluate asymptotic algorithm efficiency and construct optimal computational data structures.",
      },
      {
        name: "Applied Statistics & Probability",
        code: "AD201",
        description: "Probability distribution theory, hypothesis testing, ANOVA, Bayesian inference, and regression analysis.",
        credit: 3.5,
        category: "Core",
        sem: 3,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD201.pdf",
        learning_objectives: "Apply probability models and statistical tests to draw data-driven conclusions.",
      },
      {
        name: "Data Mining & Data Warehousing",
        code: "AD202",
        description: "ETL processes, dimensional modeling, association rule mining, clustering, and data warehouse architecture.",
        credit: 3.0,
        category: "Core",
        sem: 4,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD202.pdf",
        learning_objectives: "Design data warehouse schemes and mine actionable patterns from large enterprise repositories.",
      },
      {
        name: "Machine Learning Techniques",
        code: "AD301",
        description: "Supervised and unsupervised learning, decision trees, SVM, ensemble methods, and cross-validation.",
        credit: 4.0,
        category: "Core",
        sem: 5,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD301.pdf",
        learning_objectives: "Train and evaluate supervised and unsupervised ML models using Scikit-Learn.",
      },
      {
        name: "Machine Learning & Deep Learning Lab",
        code: "AD303L",
        description: "Practical implementations of Scikit-Learn, PyTorch, model optimization, and hyperparameter tuning.",
        credit: 1.5,
        category: "Lab",
        sem: 5,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD303L.pdf",
        learning_objectives: "Build, tune, and deploy predictive models and neural network models in GPU environments.",
      },
      {
        name: "Deep Learning & Neural Networks",
        code: "AD302",
        description: "Perceptrons, backpropagation, Convolutional Networks (CNNs), Recurrent Networks (RNNs), and Transformers.",
        credit: 4.0,
        category: "Core",
        sem: 6,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD302.pdf",
        learning_objectives: "Design deep neural network architectures for computer vision and sequence processing tasks.",
      },
      {
        name: "Big Data Analytics & Tools",
        code: "AD401",
        description: "Distributed computing using Apache Spark, Hadoop HDFS, PySpark, and real-time streaming architectures.",
        credit: 3.0,
        category: "Elective",
        sem: 7,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD401.pdf",
        learning_objectives: "Construct big data ETL pipelines using PySpark and distributed cluster technology.",
      },
      {
        name: "Natural Language Processing",
        code: "AD402",
        description: "Text tokenization, sentiment analysis, word embeddings (Word2Vec, GloVe), and LLM fine-tuning.",
        credit: 3.0,
        category: "Elective",
        sem: 8,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AD402.pdf",
        learning_objectives: "Develop NLP classification, translation, and text generation systems using pre-trained transformers.",
      },
    ],
  },
  {
    name: "Artificial Intelligence and Machine Learning",
    code: "AIML",
    description:
      "Dedicated to cognitive systems, intelligent agent design, deep learning algorithms, computer vision, and reinforcement learning.",
    courses: [
      {
        name: "Fundamentals of Artificial Intelligence",
        code: "AI101",
        description: "Problem-solving agents, state-space search algorithms (A*, Minimax), knowledge representation, and logic.",
        credit: 3.0,
        category: "Core",
        sem: 1,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI101.pdf",
        learning_objectives: "Understand intelligent agent architectures and heuristic state-space search algorithms.",
      },
      {
        name: "Programming Fundamentals in Python",
        code: "CS101",
        description: "Introductory course in modular programming, control flow, functions, OOP concepts, and file handling.",
        credit: 3.0,
        category: "Core",
        sem: 1,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS101_AIML.pdf",
        learning_objectives: "Write modular, reusable Python programs using object-oriented principles.",
      },
      {
        name: "Linear Algebra & Optimization for ML",
        code: "AI201",
        description: "Vector spaces, matrices, SVD, Eigen-decomposition, gradient descent, and convex optimization.",
        credit: 4.0,
        category: "Core",
        sem: 3,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI201.pdf",
        learning_objectives: "Solve matrix equations and formulate loss optimization problems numerically.",
      },
      {
        name: "Computer Vision & Pattern Recognition",
        code: "AI202",
        description: "Image processing, edge detection, feature extraction, object detection (YOLO), and image segmentation.",
        credit: 3.5,
        category: "Core",
        sem: 4,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI202.pdf",
        learning_objectives: "Implement OpenCV image algorithms and CNN object detection pipelines.",
      },
      {
        name: "AI & Robotics Laboratory",
        code: "AI203L",
        description: "Lab course exploring ROS (Robot Operating System), sensor integration, and vision-guided robotic motion.",
        credit: 1.5,
        category: "Lab",
        sem: 4,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI203L.pdf",
        learning_objectives: "Simulate and control autonomous agents using ROS and computer vision inputs.",
      },
      {
        name: "Reinforcement Learning",
        code: "AI301",
        description: "Markov Decision Processes, Q-Learning, SARSA, Deep Q-Networks (DQN), and policy gradient methods.",
        credit: 3.0,
        category: "Core",
        sem: 5,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1516116211223-425826889815?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI301.pdf",
        learning_objectives: "Develop autonomous decision-making agents using Q-learning and Policy Gradient techniques.",
      },
      {
        name: "Generative AI & Large Language Models",
        code: "AI302",
        description: "GANs, Diffusion Models, Transformer attention mechanisms, prompt engineering, and RAG pipelines.",
        credit: 3.5,
        category: "Elective",
        sem: 6,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI302.pdf",
        learning_objectives: "Build generative vision and text applications using state-of-the-art foundation models.",
      },
      {
        name: "Deep Reinforcement Learning Lab",
        code: "AI303L",
        description: "Gymnasium environment design, PPO algorithm implementation, and multi-agent simulation.",
        credit: 1.5,
        category: "Lab",
        sem: 6,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI303L.pdf",
        learning_objectives: "Train agents in custom OpenAI Gymnasium environments with Deep Q-Networks.",
      },
      {
        name: "AI Ethics & Governance",
        code: "AI401",
        description: "Algorithmic bias, explainable AI (XAI with SHAP/LIME), privacy-preserving ML, and regulatory frameworks.",
        credit: 2.0,
        category: "Core",
        sem: 7,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI401.pdf",
        learning_objectives: "Evaluate fairness, accountability, and explainability metrics in production AI deployments.",
      },
      {
        name: "Autonomous Systems & Robotics",
        code: "AI402",
        description: "Localization and mapping (SLAM), path planning algorithms, LIDAR processing, and autonomous vehicle control.",
        credit: 3.0,
        category: "Elective",
        sem: 8,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/AI402.pdf",
        learning_objectives: "Design path planning and SLAM algorithms for autonomous mobile robots.",
      },
    ],
  },
  {
    name: "Computer Science and Engineering",
    code: "CSE",
    description:
      "Covers fundamental and advanced computer engineering concepts including software development, operating systems, databases, and networks.",
    courses: [
      {
        name: "C Programming & Problem Solving",
        code: "CS101",
        description: "Core concepts of structured programming in C, pointers, memory allocation, structures, and file IO.",
        credit: 4.0,
        category: "Core",
        sem: 1,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS101_CSE.pdf",
        learning_objectives: "Master C language syntax, pointer arithmetic, memory management, and structured logic.",
      },
      {
        name: "Object Oriented Programming with C++",
        code: "CS102",
        description: "Classes, encapsulation, inheritance, polymorphism, templates, and Standard Template Library (STL).",
        credit: 3.5,
        category: "Core",
        sem: 2,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS102.pdf",
        learning_objectives: "Build complex C++ applications using OOP design patterns and STL containers.",
      },
      {
        name: "Data Structures & Algorithms",
        code: "CS201",
        description: "Linear and non-linear data structures, dynamic programming, greedy algorithms, and complexity analysis.",
        credit: 4.0,
        category: "Core",
        sem: 3,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1516116211223-425826889815?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS201.pdf",
        learning_objectives: "Design high-performance algorithms using suitable data structures.",
      },
      {
        name: "Database Management Systems",
        code: "CS202",
        description: "Relational database design, ER modeling, SQL, normalization (1NF-3NF/BCNF), indexing, and transactions.",
        credit: 4.0,
        category: "Core",
        sem: 4,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS202.pdf",
        learning_objectives: "Construct normalized relational schemas and write optimized SQL queries.",
      },
      {
        name: "DBMS & Networking Lab",
        code: "CS203L",
        description: "Practical PostgreSQL database queries, stored procedures, packet tracing with Wireshark, and socket programming.",
        credit: 1.5,
        category: "Lab",
        sem: 4,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS203L.pdf",
        learning_objectives: "Write complex SQL triggers and execute TCP/UDP socket programming in C/Python.",
      },
      {
        name: "Operating Systems",
        code: "CS301",
        description: "Process management, CPU scheduling, inter-process communication, deadlocks, memory management, and file systems.",
        credit: 3.5,
        category: "Core",
        sem: 5,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS301.pdf",
        learning_objectives: "Understand OS kernel internals, process synchronization primitives, and virtual memory mechanics.",
      },
      {
        name: "Full-Stack Web Development Lab",
        code: "CS303L",
        description: "Building responsive web applications using React, Node.js, Express, PostgreSQL, and RESTful API design.",
        credit: 2.0,
        category: "Lab",
        sem: 5,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS303L.pdf",
        learning_objectives: "Create end-to-end full stack web portals with modern frontend and backend frameworks.",
      },
      {
        name: "Computer Networks",
        code: "CS302",
        description: "OSI and TCP/IP protocol stack, routing algorithms, IP addressing/CIDR, TCP congestion control, and network security.",
        credit: 3.5,
        category: "Core",
        sem: 6,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS302.pdf",
        learning_objectives: "Analyze network layer routing, transport layer reliability, and application layer protocols.",
      },
      {
        name: "Software Engineering & Agile Methodology",
        code: "CS401",
        description: "Software development lifecycles, UML modeling, requirements engineering, CI/CD pipelines, and Scrum practices.",
        credit: 3.0,
        category: "Core",
        sem: 7,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS401.pdf",
        learning_objectives: "Apply Agile/Scrum principles, system architectural design, and continuous integration tooling.",
      },
      {
        name: "Cloud Computing & DevOps",
        code: "CS402",
        description: "Cloud architecture (AWS/GCP), containerization with Docker, orchestration with Kubernetes, and infrastructure as code.",
        credit: 3.0,
        category: "Elective",
        sem: 8,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/CS402.pdf",
        learning_objectives: "Deploy microservice applications using Docker containers and Kubernetes on cloud platforms.",
      },
    ],
  },
  {
    name: "Electronics and Communication Engineering",
    code: "ECE",
    description:
      "Emphasizes microprocessors, VLSI design, digital signal processing, wireless communication systems, and embedded hardware.",
    courses: [
      {
        name: "Electronic Circuits & Devices",
        code: "EC101",
        description: "Semiconductor physics, PN junction diodes, BJT and MOSFET biasing, small-signal amplifiers, and frequency response.",
        credit: 4.0,
        category: "Core",
        sem: 1,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC101.pdf",
        learning_objectives: "Analyze diode circuits, transistor biasing states, and amplifier operational characteristics.",
      },
      {
        name: "Digital Logic & System Design",
        code: "EC102",
        description: "Boolean algebra, logic gates, K-map minimization, combinational logic, flip-flops, counters, and Verilog HDL basics.",
        credit: 3.5,
        category: "Core",
        sem: 2,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC102.pdf",
        learning_objectives: "Synthesize sequential digital circuits and write introductory Verilog HDL modules.",
      },
      {
        name: "Digital Electronics Lab",
        code: "EC103L",
        description: "Hardware breadboard experiments for digital logic gates, multiplexers, shift registers, and FPGA prototyping.",
        credit: 1.5,
        category: "Lab",
        sem: 2,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC103L.pdf",
        learning_objectives: "Test logic gate ICs and implement digital state machines on FPGA hardware kits.",
      },
      {
        name: "Signals & Systems",
        code: "EC201",
        description: "Continuous and discrete-time signals, LTI systems, Fourier series, Fourier Transform, Laplace Transform, and Z-Transform.",
        credit: 4.0,
        category: "Core",
        sem: 3,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC201.pdf",
        learning_objectives: "Transform continuous and discrete time signals across frequency domains.",
      },
      {
        name: "Analog & Digital Communications",
        code: "EC202",
        description: "AM, FM, PM modulation techniques, PCM, ASK, FSK, PSK, QAM, noise analysis, and error control coding.",
        credit: 3.5,
        category: "Core",
        sem: 4,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC202.pdf",
        learning_objectives: "Calculate signal-to-noise ratios and design digital modulation/demodulation circuits.",
      },
      {
        name: "Microprocessors & Microcontrollers",
        code: "EC301",
        description: "8086 architecture, ARM Cortex microcontrollers, assembly language programming, timers, interrupts, and peripheral interfacing.",
        credit: 4.0,
        category: "Core",
        sem: 5,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC301.pdf",
        learning_objectives: "Program microcontrollers in C/Assembly for hardware sensor reading and motor control.",
      },
      {
        name: "VLSI Design",
        code: "EC302",
        description: "CMOS inverter technology, stick diagrams, floorplanning, static and dynamic CMOS logic, and ASIC design flow.",
        credit: 3.5,
        category: "Core",
        sem: 6,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC302.pdf",
        learning_objectives: "Design CMOS integrated circuits, layout stick diagrams, and run Cadence/Spice simulations.",
      },
      {
        name: "VLSI & Embedded Systems Lab",
        code: "EC303L",
        description: "FPGA synthesis using Xilinx Vivado, Cadence EDA tool IC layout design, and STM32 microcontroller programming.",
        credit: 1.5,
        category: "Lab",
        sem: 6,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC303L.pdf",
        learning_objectives: "Synthesize Verilog code onto FPGA evaluation boards and debug hardware peripherals.",
      },
      {
        name: "Wireless & Mobile Communication",
        code: "EC401",
        description: "Cellular concepts, multipath fading channels, 4G LTE, 5G NR architecture, MIMO antenna systems, and beamforming.",
        credit: 3.0,
        category: "Elective",
        sem: 7,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC401.pdf",
        learning_objectives: "Understand 5G cellular network topologies and wireless channel propagation models.",
      },
      {
        name: "Embedded Systems & IoT",
        code: "EC402",
        description: "Real-time operating systems (FreeRTOS), ESP32 Wi-Fi/BLE interfacing, MQTT protocol, and cloud IoT integration.",
        credit: 3.5,
        category: "Elective",
        sem: 8,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EC402.pdf",
        learning_objectives: "Build connected Internet of Things nodes running FreeRTOS tasks connected to cloud brokers.",
      },
    ],
  },
  {
    name: "Electrical and Electronics Engineering",
    code: "EEE",
    description:
      "Focuses on electrical power generation, power electronics, electric drives, control theory, smart grid technology, and electric vehicles.",
    courses: [
      {
        name: "Electric Circuit Theory",
        code: "EE101",
        description: "Mesh and nodal analysis, Thevenin and Norton theorems, AC steady-state analysis, resonance, and 3-phase circuits.",
        credit: 4.0,
        category: "Core",
        sem: 1,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE101.pdf",
        learning_objectives: "Solve linear and non-linear electrical networks using fundamental circuit theorems.",
      },
      {
        name: "Electrical Machines - I",
        code: "EE102",
        description: "Transformers (single-phase & 3-phase), DC generators, DC motors, speed control, and efficiency testing.",
        credit: 4.0,
        category: "Core",
        sem: 2,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE102.pdf",
        learning_objectives: "Analyze transformer equivalent circuits and DC machine operational performance.",
      },
      {
        name: "Electrical Machines Lab",
        code: "EE103L",
        description: "Open-circuit and short-circuit tests on transformers, load characteristics of DC shunt and series motors.",
        credit: 1.5,
        category: "Lab",
        sem: 2,
        year: 1,
        thumbnail_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE103L.pdf",
        learning_objectives: "Perform practical load tests and efficiency calculations on physical electrical machinery.",
      },
      {
        name: "Power Electronics",
        code: "EE201",
        description: "SCRs, MOSFETs, IGBTs, controlled rectifiers, DC-DC buck/boost converters, voltage source inverters, and PWM.",
        credit: 3.5,
        category: "Core",
        sem: 3,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE201.pdf",
        learning_objectives: "Design solid-state power conversion circuits and PWM switching control schemes.",
      },
      {
        name: "Control Systems Engineering",
        code: "EE202",
        description: "Transfer functions, block diagram reduction, Signal Flow Graphs, Root Locus, Bode plots, and PID controller design.",
        credit: 4.0,
        category: "Core",
        sem: 4,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE202.pdf",
        learning_objectives: "Evaluate feedback control system stability and tune PID controllers.",
      },
      {
        name: "Power Electronics & Drives Lab",
        code: "EE203L",
        description: "MATLAB/Simulink and hardware experiments for DC-DC converters, single-phase inverters, and induction motor drives.",
        credit: 1.5,
        category: "Lab",
        sem: 4,
        year: 2,
        thumbnail_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE203L.pdf",
        learning_objectives: "Simulate and trigger power electronic switches for variable speed motor control.",
      },
      {
        name: "Power System Analysis & Protection",
        code: "EE301",
        description: "Transmission line parameters, bus admittance matrix, Gauss-Seidel load flow, symmetrical faults, and protective relays.",
        credit: 4.0,
        category: "Core",
        sem: 5,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE301.pdf",
        learning_objectives: "Execute power flow studies and select circuit breakers for power system fault protection.",
      },
      {
        name: "Renewable Energy Systems",
        code: "EE302",
        description: "Solar PV system modeling, MPPT algorithms, wind turbine generators, energy storage systems, and grid integration.",
        credit: 3.0,
        category: "Elective",
        sem: 6,
        year: 3,
        thumbnail_url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE302.pdf",
        learning_objectives: "Design solar PV and wind generation systems with maximum power point tracking.",
      },
      {
        name: "Smart Grid Technology & Microgrids",
        code: "EE401",
        description: "Smart meters, SCADA systems, wide area monitoring, microgrid controller architectures, and demand-side management.",
        credit: 3.0,
        category: "Elective",
        sem: 7,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE401.pdf",
        learning_objectives: "Understand smart grid communications, synchrophasors, and microgrid power balance.",
      },
      {
        name: "Electric Vehicles & Battery Management",
        code: "EE402",
        description: "EV powertrain dynamics, BLDC & PMSM motors, Lithium-ion battery modeling, BMS balancing algorithms, and charging infrastructure.",
        credit: 3.5,
        category: "Elective",
        sem: 8,
        year: 4,
        thumbnail_url: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=600",
        syllabus_url: "https://smartcampus.edu/syllabus/EE402.pdf",
        learning_objectives: "Model electric vehicle traction systems and battery management algorithms.",
      },
    ],
  },
];

async function seedDepartmentsAndCourses() {
  const client = await pool.connect();

  try {
    console.log("Starting database seeding for Departments & Courses...\n");
    await client.query("BEGIN");

    let departmentsInserted = 0;
    let departmentsExisting = 0;
    let coursesInserted = 0;
    let coursesUpdated = 0;

    const departmentUpsertQuery = `
      INSERT INTO departments (name, code, description, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, (xmin = 0) AS is_new;
    `;

    const courseUpsertQuery = `
      INSERT INTO courses (
        name, code, description, department_id, credit, category, sem, year,
        thumbnail_url, syllabus_url, learning_objectives, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (code, department_id, sem, year) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        credit = EXCLUDED.credit,
        category = EXCLUDED.category,
        thumbnail_url = EXCLUDED.thumbnail_url,
        syllabus_url = EXCLUDED.syllabus_url,
        learning_objectives = EXCLUDED.learning_objectives,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, (xmin = 0) AS is_new;
    `;

    for (const deptData of departmentsData) {
      // 1. Insert/Update Department
      const deptRes = await client.query(departmentUpsertQuery, [
        deptData.name,
        deptData.code,
        deptData.description,
      ]);

      const deptId = deptRes.rows[0].id;
      const isDeptNew = deptRes.rows[0].is_new;

      if (isDeptNew) {
        departmentsInserted++;
      } else {
        departmentsExisting++;
      }

      console.log(
        `✓ Department: [${deptData.code}] ${deptData.name} (${isDeptNew ? "Inserted" : "Updated/Existing"})`
      );

      // 2. Insert/Update Courses for this department
      for (const course of deptData.courses) {
        const courseRes = await client.query(courseUpsertQuery, [
          course.name,
          course.code,
          course.description,
          deptId,
          course.credit,
          course.category,
          course.sem,
          course.year,
          course.thumbnail_url,
          course.syllabus_url,
          course.learning_objectives,
        ]);

        const isCourseNew = courseRes.rows[0].is_new;
        if (isCourseNew) {
          coursesInserted++;
        } else {
          coursesUpdated++;
        }
      }

      console.log(
        `   └─ Processed ${deptData.courses.length} courses for ${deptData.code}.`
      );
    }

    await client.query("COMMIT");

    console.log("\n==================================================");
    console.log("  SEEDING COMPLETE SUMMARY");
    console.log("==================================================");
    console.log(`  Departments Inserted: ${departmentsInserted}`);
    console.log(`  Departments Updated/Existing: ${departmentsExisting}`);
    console.log(`  Total Departments Processed: ${departmentsInserted + departmentsExisting}`);
    console.log(`--------------------------------------------------`);
    console.log(`  Courses Inserted: ${coursesInserted}`);
    console.log(`  Courses Updated/Existing: ${coursesUpdated}`);
    console.log(`  Total Courses Processed: ${coursesInserted + coursesUpdated}`);
    console.log("==================================================\n");

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("✗ Seeding failed:", error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDepartmentsAndCourses();
