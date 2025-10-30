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
    suggestedAnswer: 'Use the STAR method to structure your response...',
  },
  {
    id: 'q2',
    category: 'technical',
    question: 'Explain the difference between var, let, and const in JavaScript.',
    suggestedAnswer: 'var is function-scoped, let and const are block-scoped...',
  },
];

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
