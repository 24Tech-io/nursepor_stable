import {
  User,
  Course,
  BlogPost,
  AccessRequest,
  StudentProgress,
  Achievement,
  DailyVideo,
  Notification,
} from './types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'student',
    phone: '+91-9876543210',
    isActive: true,
    joinedDate: new Date('2024-01-15'),
    faceIdEnrolled: true,
    bio: 'Passionate learner exploring web development and design.',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'admin',
    phone: '+91-9876543211',
    isActive: true,
    joinedDate: new Date('2023-12-01'),
    faceIdEnrolled: false,
  },
  {
    id: '3',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'student',
    phone: '+91-9876543212',
    isActive: true,
    joinedDate: new Date('2024-02-01'),
    faceIdEnrolled: false,
    bio: 'Full-stack developer with 5 years of experience.',
  },
  {
    id: '4',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    role: 'student',
    phone: '+91-9876543213',
    isActive: false,
    joinedDate: new Date('2024-01-20'),
    faceIdEnrolled: true,
    bio: 'Data scientist and machine learning enthusiast.',
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'student',
    phone: '+91-9876543214',
    isActive: true,
    joinedDate: new Date('2024-02-10'),
    faceIdEnrolled: false,
    bio: 'UI/UX designer passionate about creating beautiful interfaces.',
  },
];

export const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'Introduction to React',
    description:
      'Learn the fundamentals of React, including components, props, state, and hooks. Build your first interactive web applications.',
    instructor: 'Alice Johnson',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
    modules: [
      {
        id: 'module-1',
        title: 'Getting Started with React',
        description: 'Understanding React fundamentals and setting up your development environment',
        videos: [
          {
            id: 'video-1',
            title: 'What is React?',
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            provider: 'youtube',
            duration: 15,
            watchedTime: 0,
          },
        ],
        quizzes: [
          {
            id: 'quiz-1',
            title: 'React Basics Quiz',
            questions: [
              {
                id: 'q1',
                question: 'What is React?',
                options: {
                  a: 'A JavaScript library for building user interfaces',
                  b: 'A programming language',
                  c: 'A database management system',
                  d: 'A web server',
                },
                correctAnswer: 'a',
                explanation:
                  'React is a JavaScript library for building user interfaces, particularly for web applications.',
              },
            ],
            passMark: 70,
            timeLimit: 10,
            showAnswers: true,
          },
        ],
        duration: 45,
      },
    ],
    pricing: 4999,
    status: 'published',
    isRequestable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: 'course-2',
    title: 'Advanced TypeScript',
    description:
      'Master TypeScript with advanced concepts like generics, decorators, and type manipulation.',
    instructor: 'Bob Wilson',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop',
    modules: [
      {
        id: 'module-2',
        title: 'TypeScript Fundamentals',
        description: 'Deep dive into TypeScript types and interfaces',
        videos: [
          {
            id: 'video-2',
            title: 'TypeScript Overview',
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            provider: 'youtube',
            duration: 20,
            watchedTime: 0,
          },
        ],
        quizzes: [],
        duration: 60,
      },
    ],
    pricing: 7999,
    status: 'published',
    isRequestable: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: 'course-3',
    title: 'Node.js Backend Development',
    description: 'Build scalable backend applications with Node.js, Express, and MongoDB.',
    instructor: 'Charlie Brown',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=250&fit=crop',
    modules: [],
    pricing: 6999,
    status: 'published',
    isRequestable: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-25'),
  },
];

export const mockBlogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Getting Started with Next.js',
    slug: 'getting-started-with-nextjs',
    content: `<h2>Introduction to Next.js</h2>
<p>Next.js is a powerful React framework that enables you to build production-ready web applications with ease. It provides features like server-side rendering, static site generation, and API routes out of the box.</p>

<h3>Why Choose Next.js?</h3>
<ul>
<li><strong>Server-Side Rendering (SSR):</strong> Improves SEO and initial page load performance</li>
<li><strong>Static Site Generation (SSG):</strong> Pre-build pages at build time for optimal performance</li>
<li><strong>API Routes:</strong> Build API endpoints within your Next.js application</li>
<li><strong>File-based Routing:</strong> Intuitive routing system based on your file structure</li>
</ul>

<h3>Getting Started</h3>
<p>To create a new Next.js project, run:</p>
<pre><code>npx create-next-app@latest my-app</code></pre>

<p>This will set up a new Next.js project with all the necessary dependencies and configuration files.</p>

<h3>Basic Project Structure</h3>
<p>A typical Next.js project structure looks like this:</p>
<pre><code>my-app/
├── pages/
│   ├── index.js
│   └── _app.js
├── public/
├── styles/
└── package.json</code></pre>

<p>The <code>pages</code> directory contains your application's pages, and Next.js automatically handles routing based on the file names.</p>`,
    author: 'Nurse Pro Academy Team',
    cover: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=400&fit=crop',
    tags: ['nextjs', 'react', 'javascript', 'web-development'],
    status: 'published',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: '2',
    title: 'Mastering CSS Grid Layout',
    slug: 'mastering-css-grid-layout',
    content: `<h2>CSS Grid: A Complete Guide</h2>
<p>CSS Grid Layout is a two-dimensional layout method for the web. It lets you lay content out in rows and columns, and has many features that make building complex layouts straightforward.</p>

<h3>Basic Grid Setup</h3>
<p>To create a grid container, set the display property to grid:</p>
<pre><code>.container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 100px 100px;
  gap: 20px;
}</code></pre>

<h3>Grid Template Areas</h3>
<p>Grid template areas allow you to name sections of your grid and then place items using those names:</p>
<pre><code>.container {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
  gap: 20px;
}</code></pre>

<h3>Practical Examples</h3>
<p>Let's look at some real-world examples of CSS Grid in action...</p>`,
    author: 'Nurse Pro Academy Team',
    cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop',
    tags: ['css', 'grid', 'layout', 'frontend'],
    status: 'published',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: '3',
    title: 'Understanding JavaScript Closures',
    slug: 'understanding-javascript-closures',
    content: `<h2>JavaScript Closures Explained</h2>
<p>A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives you access to an outer function's scope from an inner function.</p>

<h3>What is a Closure?</h3>
<p>In JavaScript, closures are created every time a function is created, at function creation time. Consider this example:</p>
<pre><code>function outerFunction() {
  let outerVariable = 'I am from outer scope';

  function innerFunction() {
    console.log(outerVariable); // Can access outerVariable
  }

  return innerFunction;
}

const closure = outerFunction();
closure(); // Logs: "I am from outer scope"</code></pre>

<h3>Practical Use Cases</h3>
<ul>
<li><strong>Data Privacy:</strong> Create private variables that can't be accessed directly</li>
<li><strong>Function Factories:</strong> Create functions with preset configurations</li>
<li><strong>Event Handlers:</strong> Maintain state in asynchronous operations</li>
</ul>

<h3>Common Pitfalls</h3>
<p>Closures can sometimes lead to memory leaks if not handled properly. Always be mindful of what variables you're capturing in your closures.</p>`,
    author: 'Nurse Pro Academy Team',
    cover: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800&h=400&fit=crop',
    tags: ['javascript', 'closures', 'programming', 'advanced'],
    status: 'published',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-25'),
  },
  {
    id: '4',
    title: 'Building RESTful APIs with Express.js',
    slug: 'building-restful-apis-with-express',
    content: `<h2>Express.js API Development</h2>
<p>Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. It's perfect for building RESTful APIs.</p>

<h3>Setting Up Express</h3>
<p>First, install Express and create a basic server:</p>
<pre><code>npm install express
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});</code></pre>

<h3>RESTful Routes</h3>
<p>RESTful APIs follow standard HTTP methods:</p>
<ul>
<li><strong>GET:</strong> Retrieve data</li>
<li><strong>POST:</strong> Create new resources</li>
<li><strong>PUT:</strong> Update existing resources</li>
<li><strong>DELETE:</strong> Remove resources</li>
</ul>

<h3>Middleware</h3>
<p>Express middleware functions have access to the request object (req), response object (res), and the next middleware function in the application's request-response cycle.</p>`,
    author: 'Nurse Pro Academy Team',
    cover: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
    tags: ['nodejs', 'express', 'api', 'backend'],
    status: 'published',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-28'),
  },
  {
    id: '5',
    title: 'Introduction to Machine Learning',
    slug: 'introduction-to-machine-learning',
    content: `<h2>Welcome to Machine Learning</h2>
<p>Machine Learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for every scenario.</p>

<h3>Types of Machine Learning</h3>
<ul>
<li><strong>Supervised Learning:</strong> Learning from labeled data</li>
<li><strong>Unsupervised Learning:</strong> Finding patterns in unlabeled data</li>
<li><strong>Reinforcement Learning:</strong> Learning through trial and error</li>
</ul>

<h3>Getting Started</h3>
<p>To begin your machine learning journey, you'll need:</p>
<ul>
<li>Python programming knowledge</li>
<li>Understanding of mathematics (linear algebra, calculus, statistics)</li>
<li>Familiarity with libraries like NumPy, Pandas, and Scikit-learn</li>
</ul>

<h3>Popular Algorithms</h3>
<p>Some fundamental algorithms every ML practitioner should know:</p>
<ul>
<li>Linear Regression</li>
<li>Logistic Regression</li>
<li>Decision Trees</li>
<li>Support Vector Machines</li>
<li>Neural Networks</li>
</ul>`,
    author: 'Nurse Pro Academy Team',
    cover: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&h=400&fit=crop',
    tags: ['machine-learning', 'ai', 'python', 'data-science'],
    status: 'published',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-03-01'),
  },
];

export const mockAccessRequests: AccessRequest[] = [
  {
    id: 'req-1',
    studentId: '1',
    studentName: 'John Doe',
    courseId: 'course-2',
    courseTitle: 'Advanced TypeScript',
    reason:
      'I need this course for my current project at work. I have basic TypeScript knowledge and want to advance my skills.',
    status: 'pending',
    requestedAt: new Date('2024-02-25'),
  },
  {
    id: 'req-2',
    studentId: '3',
    studentName: 'Alice Johnson',
    courseId: 'course-3',
    courseTitle: 'Node.js Backend Development',
    reason: 'As a frontend developer, I want to expand my skills to full-stack development.',
    status: 'approved',
    requestedAt: new Date('2024-02-20'),
    reviewedAt: new Date('2024-02-22'),
    reviewedBy: 'Jane Smith',
  },
  {
    id: 'req-3',
    studentId: '5',
    studentName: 'Charlie Brown',
    courseId: 'course-2',
    courseTitle: 'Advanced TypeScript',
    reason: 'I want to improve my TypeScript skills for better job opportunities.',
    status: 'rejected',
    requestedAt: new Date('2024-02-18'),
    reviewedAt: new Date('2024-02-19'),
    reviewedBy: 'Jane Smith',
  },
];

export const mockStudentProgress: StudentProgress[] = [
  {
    studentId: '1',
    courseId: 'course-1',
    completedModules: ['module-1'],
    completedQuizzes: ['quiz-1'],
    watchedVideos: ['video-1'],
    quizScores: { 'quiz-1': 85 },
    totalProgress: 100,
    lastAccessed: new Date('2024-02-28'),
  },
  {
    studentId: '3',
    courseId: 'course-1',
    completedModules: [],
    completedQuizzes: [],
    watchedVideos: ['video-1'],
    quizScores: {},
    totalProgress: 33,
    lastAccessed: new Date('2024-02-27'),
  },
];

export const mockAchievements: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Course Completed',
    description: 'Completed your first course on the platform',
    icon: '🎓',
    color: 'bg-blue-100 text-blue-600',
    unlockedAt: new Date('2024-02-01'),
  },
  {
    id: 'ach-2',
    title: '5 Day Streak',
    description: 'Logged in for 5 consecutive days',
    icon: '🔥',
    color: 'bg-orange-100 text-orange-600',
    unlockedAt: new Date('2024-02-10'),
  },
  {
    id: 'ach-3',
    title: 'Quiz Master',
    description: 'Scored 90% or higher on a quiz',
    icon: '🏆',
    color: 'bg-yellow-100 text-yellow-600',
    unlockedAt: new Date('2024-02-15'),
  },
  {
    id: 'ach-4',
    title: 'Early Bird',
    description: 'Completed a daily video before 8 AM',
    icon: '🌅',
    color: 'bg-purple-100 text-purple-600',
    unlockedAt: new Date('2024-02-05'),
  },
];

export const mockDailyVideos: DailyVideo[] = [
  {
    id: 'daily-1',
    title: 'Understanding React Hooks',
    description: 'Learn how to use useState, useEffect, and other essential React hooks',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    provider: 'youtube',
    duration: 15,
    day: 1,
    isCompleted: true,
    completedAt: new Date('2024-02-26'),
  },
  {
    id: 'daily-2',
    title: 'CSS Flexbox Deep Dive',
    description: 'Master CSS Flexbox for modern web layouts',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    provider: 'youtube',
    duration: 12,
    day: 2,
    isCompleted: false,
  },
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'New Course Available',
    message: 'Advanced TypeScript course is now available for enrollment',
    type: 'info',
    read: false,
    createdAt: new Date('2024-02-25'),
  },
  {
    id: 'notif-2',
    title: 'Achievement Unlocked',
    message: 'Congratulations! You earned the "Quiz Master" achievement',
    type: 'success',
    read: true,
    createdAt: new Date('2024-02-15'),
  },
];

// Helper functions
export const getCourses = () => mockCourses;
export const getStudents = () => mockUsers.filter((user) => user.role === 'student');
export const getBlogPosts = () => mockBlogPosts;
export const getAccessRequests = () => mockAccessRequests;
export const getStudentProgress = (studentId: string) =>
  mockStudentProgress.filter((p) => p.studentId === studentId);
export const getAchievements = () => mockAchievements;
export const getDailyVideos = () => mockDailyVideos;
export const getNotifications = () => mockNotifications;
