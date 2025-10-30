# GiveMeJobs API Documentation

## Overview

The GiveMeJobs API is a RESTful API that provides access to the platform's features including user authentication, job search, application tracking, document generation, and more.

## Base URLs

- **Development**: `http://localhost:4000`
- **Staging**: `https://staging-api.givemejobs.com`
- **Production**: `https://api.givemejobs.com`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### Refreshing a Token

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "professionalHeadline": "Software Engineer"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### OAuth Login (LinkedIn)
```http
GET /api/auth/oauth/linkedin
```

#### OAuth Login (Google)
```http
GET /api/auth/oauth/google
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}
```

### User Profile

#### Get User Profile
```http
GET /api/users/:userId/profile
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/users/:userId/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "professionalHeadline": "Senior Software Engineer"
}
```

#### Add Skill
```http
POST /api/users/:userId/skills
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "JavaScript",
  "category": "Programming Language",
  "proficiencyLevel": 4,
  "yearsOfExperience": 5
}
```

#### Add Experience
```http
POST /api/users/:userId/experience
Authorization: Bearer <token>
Content-Type: application/json

{
  "company": "Tech Corp",
  "title": "Software Engineer",
  "startDate": "2020-01-01",
  "endDate": null,
  "current": true,
  "description": "Developed web applications",
  "achievements": ["Improved performance by 50%"],
  "skills": ["JavaScript", "React", "Node.js"]
}
```

#### Add Education
```http
POST /api/users/:userId/education
Authorization: Bearer <token>
Content-Type: application/json

{
  "institution": "University of Technology",
  "degree": "Bachelor of Science",
  "fieldOfStudy": "Computer Science",
  "startDate": "2016-09-01",
  "endDate": "2020-05-31",
  "gpa": 3.8
}
```

#### Get Skill Score
```http
GET /api/users/:userId/skill-score
Authorization: Bearer <token>
```

Response:
```json
{
  "overallScore": 85,
  "breakdown": {
    "technicalSkills": 90,
    "experience": 85,
    "education": 80,
    "certifications": 75,
    "projectPortfolio": 88,
    "endorsements": 70
  },
  "lastCalculated": "2024-01-18T10:30:00Z"
}
```

### Job Search

#### Search Jobs
```http
GET /api/jobs/search?keywords=software+engineer&location=San+Francisco&page=1&limit=20
Authorization: Bearer <token>
```

Query Parameters:
- `keywords`: Search keywords
- `location`: Job location
- `remoteType`: remote, hybrid, onsite
- `jobType`: full-time, part-time, contract, internship
- `salaryMin`: Minimum salary
- `salaryMax`: Maximum salary
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

#### Get Job Details
```http
GET /api/jobs/:jobId
Authorization: Bearer <token>
```

#### Get Job Recommendations
```http
GET /api/jobs/recommendations
Authorization: Bearer <token>
```

#### Save Job
```http
POST /api/jobs/:jobId/save
Authorization: Bearer <token>
```

#### Get Saved Jobs
```http
GET /api/jobs/saved
Authorization: Bearer <token>
```

#### Create Job Alert
```http
POST /api/jobs/alerts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Software Engineer Jobs",
  "criteria": {
    "keywords": ["software engineer", "developer"],
    "locations": ["San Francisco", "Remote"],
    "jobTypes": ["full-time"],
    "minMatchScore": 70
  },
  "frequency": "daily"
}
```

### Applications

#### Create Application
```http
POST /api/applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": "job-uuid",
  "resumeId": "resume-uuid",
  "coverLetterId": "cover-letter-uuid",
  "applicationMethod": "platform"
}
```

#### Get Applications
```http
GET /api/applications?status=applied&page=1&limit=20
Authorization: Bearer <token>
```

#### Get Application Details
```http
GET /api/applications/:applicationId
Authorization: Bearer <token>
```

#### Update Application Status
```http
PATCH /api/applications/:applicationId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "interview_scheduled",
  "interviewDate": "2024-01-25T14:00:00Z"
}
```

#### Add Application Note
```http
POST /api/applications/:applicationId/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Had a great phone screen with the hiring manager",
  "type": "interview"
}
```

#### Get Application Statistics
```http
GET /api/applications/stats
Authorization: Bearer <token>
```

### Document Generation

#### Generate Resume
```http
POST /api/documents/resume/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": "job-uuid",
  "templateId": "template-uuid",
  "customizations": {
    "tone": "professional",
    "length": "standard",
    "focusAreas": ["technical skills", "leadership"]
  }
}
```

#### Generate Cover Letter
```http
POST /api/documents/cover-letter/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": "job-uuid",
  "templateId": "template-uuid",
  "customizations": {
    "tone": "enthusiastic",
    "length": "concise"
  }
}
```

#### Get Document
```http
GET /api/documents/:documentId
Authorization: Bearer <token>
```

#### Update Document
```http
PUT /api/documents/:documentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": {
    "sections": [...]
  }
}
```

#### Export Document
```http
POST /api/documents/:documentId/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "pdf"
}
```

Response: Binary file download

### Interview Preparation

#### Generate Interview Prep
```http
POST /api/interview-prep/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "applicationId": "application-uuid",
  "interviewDate": "2024-01-25T14:00:00Z"
}
```

#### Get Interview Prep
```http
GET /api/interview-prep/:applicationId
Authorization: Bearer <token>
```

#### Submit Practice Response
```http
POST /api/interview-prep/:prepId/practice
Authorization: Bearer <token>
Content-Type: application/json

{
  "questionId": "question-uuid",
  "response": "My answer to the interview question..."
}
```

#### Get Response Analysis
```http
POST /api/interview-prep/:prepId/practice/:practiceId/analyze
Authorization: Bearer <token>
```

### Analytics

#### Get Analytics Dashboard
```http
GET /api/analytics/dashboard?period=month
Authorization: Bearer <token>
```

Query Parameters:
- `period`: week, month, quarter, year

#### Get Application Analytics
```http
GET /api/analytics/applications
Authorization: Bearer <token>
```

#### Get Benchmarks
```http
GET /api/analytics/benchmarks
Authorization: Bearer <token>
```

#### Export Analytics
```http
POST /api/analytics/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "csv",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional information"
  }
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated requests**: 100 requests per 15 minutes
- **Unauthenticated requests**: 20 requests per 15 minutes

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705587000
```

## Pagination

List endpoints support pagination:

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Webhooks

Subscribe to events via webhooks:

### Available Events

- `application.created`
- `application.status_changed`
- `job.matched`
- `document.generated`
- `interview.scheduled`

### Webhook Payload

```json
{
  "event": "application.status_changed",
  "timestamp": "2024-01-18T10:30:00Z",
  "data": {
    "applicationId": "uuid",
    "oldStatus": "applied",
    "newStatus": "interview_scheduled"
  }
}
```

## SDKs and Libraries

Official SDKs:
- JavaScript/TypeScript: `@givemejobs/sdk-js`
- Python: `givemejobs-sdk`
- Ruby: `givemejobs-ruby`

## Support

- **Documentation**: https://docs.givemejobs.com
- **API Status**: https://status.givemejobs.com
- **Support Email**: api-support@givemejobs.com
- **Developer Forum**: https://forum.givemejobs.com

## Changelog

### v1.0.0 (2024-01-18)
- Initial API release
- Authentication endpoints
- User profile management
- Job search and matching
- Application tracking
- Document generation
- Interview preparation
- Analytics and insights
