/**
 * Test data fixtures for E2E tests
 */

export const testJobs = [
  {
    id: 'test-job-1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    remoteType: 'hybrid',
    jobType: 'full-time',
    salaryMin: 120000,
    salaryMax: 180000,
    description: 'We are looking for a senior software engineer...',
    requirements: [
      '5+ years of experience',
      'Strong JavaScript/TypeScript skills',
      'Experience with React and Node.js',
    ],
    matchScore: 85,
  },
  {
    id: 'test-job-2',
    title: 'Frontend Developer',
    company: 'Startup Inc',
    location: 'Remote',
    remoteType: 'remote',
    jobType: 'full-time',
    salaryMin: 90000,
    salaryMax: 130000,
    description: 'Join our team as a frontend developer...',
    requirements: [
      '3+ years of experience',
      'React expertise',
      'CSS/Tailwind proficiency',
    ],
    matchScore: 92,
  },
];

export const testUserProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  professionalHeadline: 'Senior Software Engineer',
  skills: [
    { name: 'JavaScript', proficiencyLevel: 5, yearsOfExperience: 7 },
    { name: 'TypeScript', proficiencyLevel: 5, yearsOfExperience: 5 },
    { name: 'React', proficiencyLevel: 5, yearsOfExperience: 6 },
    { name: 'Node.js', proficiencyLevel: 4, yearsOfExperience: 5 },
  ],
  experience: [
    {
      company: 'Previous Company',
      title: 'Senior Developer',
      startDate: '2020-01-01',
      endDate: '2023-12-31',
      current: false,
      description: 'Led development of web applications',
    },
  ],
  skillScore: 85,
};

export const testApplication = {
  id: 'test-app-1',
  jobId: 'test-job-1',
  status: 'applied',
  appliedDate: new Date().toISOString(),
  resumeId: 'test-resume-1',
  coverLetterId: 'test-cover-1',
};

export const testInterviewQuestions = [
  {
    id: 'q1',
    category: 'behavioral',
    question: 'Tell me about a time when you faced a challenging bug.',
    suggestedAnswer: 'Use the STAR method to structure your response. Situation: Describe the context. Task: Explain what needed to be done. Action: Detail the steps you took. Result: Share the outcome.',
    keyPoints: ['Problem-solving skills', 'Technical debugging', 'Communication'],
    starFramework: {
      situation: 'Production bug affecting users',
      task: 'Fix critical issue quickly',
      action: 'Analyzed logs, identified root cause, implemented fix',
      result: 'Resolved in 2 hours, prevented further issues'
    },
    difficulty: 'medium'
  },
  {
    id: 'q2',
    category: 'technical',
    question: 'Explain the difference between var, let, and const in JavaScript.',
    suggestedAnswer: 'var is function-scoped and can be redeclared, let and const are block-scoped. const cannot be reassigned after declaration.',
    keyPoints: ['JavaScript fundamentals', 'Variable scoping', 'ES6 features'],
    difficulty: 'easy'
  },
  {
    id: 'q3',
    category: 'company-specific',
    question: 'Why do you want to work at Tech Corp?',
    suggestedAnswer: 'Research the company values and recent achievements. Connect your career goals with their mission.',
    keyPoints: ['Company research', 'Cultural fit', 'Career alignment'],
    difficulty: 'medium'
  },
  {
    id: 'q4',
    category: 'situational',
    question: 'How would you handle a disagreement with a team member?',
    suggestedAnswer: 'Focus on communication, understanding different perspectives, and finding common ground.',
    keyPoints: ['Conflict resolution', 'Team collaboration', 'Communication skills'],
    difficulty: 'medium'
  }
];

export const testInterviewPrepData = {
  id: 'prep-123',
  applicationId: 'test-app-1',
  userId: 'test-user-id',
  jobId: 'test-job-1',
  generatedAt: new Date().toISOString(),
  questions: testInterviewQuestions,
  companyResearch: {
    companyName: 'Tech Corp',
    industry: 'Technology',
    size: '1000-5000 employees',
    culture: ['Innovation', 'Collaboration', 'Work-life balance'],
    recentNews: [
      {
        title: 'Tech Corp launches new AI product',
        summary: 'Company announces innovative AI solution for enterprise customers',
        url: 'https://example.com/news/ai-product',
        publishedDate: new Date().toISOString()
      }
    ],
    values: ['Customer focus', 'Excellence', 'Integrity'],
    interviewProcess: 'Initial screening, technical interview, behavioral interview, final round'
  },
  tips: [
    'Research the company thoroughly',
    'Practice the STAR method for behavioral questions',
    'Prepare specific examples from your experience',
    'Ask thoughtful questions about the role and company'
  ]
};

export const testPracticeSession = {
  id: 'practice-123',
  questionId: 'q1',
  userId: 'test-user-id',
  response: 'In my previous role, I encountered a critical bug in production that was affecting user authentication...',
  duration: 180,
  createdAt: new Date().toISOString()
};

export const testResponseAnalysis = {
  overallScore: 85,
  clarity: 90,
  relevance: 85,
  starMethodUsage: true,
  confidenceIndicators: ['Clear structure', 'Specific examples', 'Quantified results'],
  keywordsCovered: ['problem-solving', 'debugging', 'production', 'users'],
  suggestions: [
    'Great use of STAR method',
    'Consider adding more details about the impact',
    'Mention any lessons learned'
  ],
  strengths: [
    'Clear problem description',
    'Logical approach to solution',
    'Quantified outcome'
  ],
  areasForImprovement: [
    'Could elaborate on team collaboration',
    'Mention prevention strategies'
  ]
};

export const testResume = {
  id: 'test-resume-1',
  title: 'Resume for Tech Corp',
  content: {
    sections: [
      {
        type: 'header',
        title: 'Header',
        content: 'John Doe\nSenior Software Engineer',
      },
      {
        type: 'experience',
        title: 'Experience',
        content: 'Previous Company - Senior Developer',
      },
    ],
  },
};

export const testCoverLetter = {
  id: 'test-cover-1',
  title: 'Cover Letter for Tech Corp',
  content: 'Dear Hiring Manager,\n\nI am writing to express my interest...',
};
