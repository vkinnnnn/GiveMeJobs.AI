import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GiveMeJobs API',
      version: '1.0.0',
      description: 'AI-powered job application platform API documentation',
      contact: {
        name: 'GiveMeJobs Support',
        email: 'support@givemejobs.com',
        url: 'https://givemejobs.com/support',
      },
      license: {
        name: 'Proprietary',
        url: 'https://givemejobs.com/license',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://staging-api.givemejobs.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.givemejobs.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            professionalHeadline: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
            },
            refreshToken: {
              type: 'string',
            },
            expiresIn: {
              type: 'number',
            },
            tokenType: {
              type: 'string',
              enum: ['Bearer'],
            },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
            },
            skills: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Skill',
              },
            },
            experience: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Experience',
              },
            },
            education: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Education',
              },
            },
            skillScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
            },
          },
        },
        Skill: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            category: {
              type: 'string',
            },
            proficiencyLevel: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
            },
            yearsOfExperience: {
              type: 'number',
            },
          },
        },
        Experience: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            company: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            startDate: {
              type: 'string',
              format: 'date',
            },
            endDate: {
              type: 'string',
              format: 'date',
              nullable: true,
            },
            current: {
              type: 'boolean',
            },
            description: {
              type: 'string',
            },
          },
        },
        Education: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            institution: {
              type: 'string',
            },
            degree: {
              type: 'string',
            },
            fieldOfStudy: {
              type: 'string',
            },
            startDate: {
              type: 'string',
              format: 'date',
            },
            endDate: {
              type: 'string',
              format: 'date',
              nullable: true,
            },
            gpa: {
              type: 'number',
              nullable: true,
            },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            company: {
              type: 'string',
            },
            location: {
              type: 'string',
            },
            remoteType: {
              type: 'string',
              enum: ['remote', 'hybrid', 'onsite'],
            },
            jobType: {
              type: 'string',
              enum: ['full-time', 'part-time', 'contract', 'internship'],
            },
            salaryMin: {
              type: 'number',
              nullable: true,
            },
            salaryMax: {
              type: 'number',
              nullable: true,
            },
            description: {
              type: 'string',
            },
            matchScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              nullable: true,
            },
          },
        },
        Application: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            jobId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: [
                'saved',
                'applied',
                'screening',
                'interview_scheduled',
                'interview_completed',
                'offer_received',
                'accepted',
                'rejected',
                'withdrawn',
              ],
            },
            appliedDate: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Users',
        description: 'User profile management',
      },
      {
        name: 'Jobs',
        description: 'Job search and matching',
      },
      {
        name: 'Applications',
        description: 'Application tracking',
      },
      {
        name: 'Documents',
        description: 'Resume and cover letter generation',
      },
      {
        name: 'Interview Prep',
        description: 'Interview preparation resources',
      },
      {
        name: 'Analytics',
        description: 'Job search analytics and insights',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
