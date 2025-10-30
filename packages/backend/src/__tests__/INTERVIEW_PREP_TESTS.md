# Interview Preparation Service Tests

## Overview

This document describes the comprehensive test suite for the Interview Preparation Service (GURU), covering interview prep generation for various job types and response analysis accuracy.

## Requirements Covered

- **Requirement 6.1**: Generate interview questions based on job requirements
- **Requirement 6.2**: Provide company research and preparation tips
- **Requirement 6.4**: Analyze practice responses with AI-powered feedback

## Test File

`src/__tests__/interview-prep.integration.test.ts`

## Test Coverage

### 1. Interview Prep Generation (Requirements 6.1, 6.2)

#### Question Generation for Various Job Types

**Full-Time Software Engineering Role**
- Tests generation of comprehensive interview prep package
- Verifies all question categories are included (behavioral, technical, company-specific, situational)
- Validates company research data structure
- Confirms preparation tips are provided

**Contract Frontend Developer Role**
- Tests interview prep for contract positions
- Ensures questions are relevant to contract work
- Validates shorter-term engagement focus

**Backend Python Developer Role**
- Tests language-specific technical questions
- Verifies backend-focused question generation
- Validates database and API-related questions

**Entry-Level Position**
- Tests appropriate difficulty levels for junior roles
- Ensures mix of easy and medium questions
- Validates beginner-friendly suggested answers

#### Question Quality

**STAR Framework Integration**
- Verifies behavioral questions include STAR method guidance
- Tests situation, task, action, result breakdown
- Validates structured answer suggestions

**Difficulty Levels**
- Tests presence of easy, medium, and hard questions
- Verifies appropriate distribution based on role level
- Validates difficulty indicators

**Suggested Answers**
- Tests that all questions have suggested answers
- Verifies key points are provided
- Validates answer relevance to candidate profile

**Technical Question Relevance**
- Tests questions match job requirements
- Verifies technology-specific questions
- Validates proper question structure

### 2. Practice Sessions and Response Analysis (Requirement 6.4)

#### Practice Session Creation

**Successful Creation**
- Tests creating practice sessions with question responses
- Verifies session data storage (question, response, duration)
- Validates user ownership

**Validation**
- Tests required field validation
- Verifies error handling for missing data
- Validates proper error messages

#### Response Analysis Accuracy

**Excellent Response Analysis**
- Tests high-quality responses receive scores ≥80
- Verifies STAR method detection
- Validates comprehensive feedback structure:
  - Overall score (0-100)
  - Clarity score (0-100)
  - Relevance score (0-100)
  - STAR method usage (boolean)
  - Confidence indicators (array)
  - Keywords covered (array)
  - Strengths (array)
  - Areas for improvement (array)
  - Actionable suggestions (array)

**Good Response Analysis**
- Tests moderate-quality responses receive scores 60-84
- Verifies constructive feedback
- Validates improvement suggestions

**Poor Response Analysis**
- Tests low-quality responses receive scores <60
- Verifies detailed improvement areas
- Validates actionable, specific suggestions
- Tests STAR method absence detection

**STAR Method Detection**
- Tests explicit STAR-formatted responses
- Verifies accurate detection of structure
- Validates proper scoring for structured answers

**Keyword Identification**
- Tests relevant keyword extraction
- Verifies keyword coverage analysis
- Validates alignment with question requirements

**Actionable Suggestions**
- Tests suggestion quality and specificity
- Verifies suggestions are not generic
- Validates minimum suggestion length

#### Practice Progress Tracking

**Session Retrieval**
- Tests fetching all practice sessions
- Verifies chronological ordering
- Validates session data completeness

**Progress Statistics**
- Tests aggregate statistics calculation:
  - Total sessions count
  - Unique questions practiced
  - Average score across sessions
  - Last practice date
- Verifies accurate metric computation

### 3. Company Research (Requirement 6.2)

**Company Information**
- Tests company research inclusion in prep package
- Verifies company name, overview, and values
- Validates data structure

**Interview Tips**
- Tests interview tips generation
- Verifies tips are actionable and relevant
- Validates array structure and content

### 4. Interview Prep Retrieval

**By Interview Prep ID**
- Tests fetching prep by unique ID
- Verifies complete data retrieval
- Validates authentication requirements
- Tests 404 handling for non-existent preps

**By Application ID**
- Tests fetching prep by associated application
- Verifies most recent prep retrieval
- Validates user ownership
- Tests 404 handling when no prep exists

### 5. Error Handling

**Authentication**
- Tests 401 responses without authentication
- Verifies token validation

**Validation Errors**
- Tests 400 responses for missing required fields
- Verifies descriptive error messages

**Not Found Errors**
- Tests 404 responses for non-existent resources
- Verifies appropriate error messages

## Test Data

### Mock AI Responses

The tests use mocked AI responses to ensure consistent, predictable test results without requiring actual OpenAI API calls:

**Interview Questions Mock**
- 9 questions across 4 categories
- Mix of difficulty levels (easy, medium, hard)
- STAR framework examples for behavioral questions
- Suggested answers with key points

**Response Analysis Mocks**
- Three quality levels: excellent, good, poor
- Realistic score distributions
- Comprehensive feedback structures
- Actionable suggestions

### Test Job Types

1. **Senior Software Engineer** (Full-time)
   - Requirements: JavaScript, React, Node.js, PostgreSQL, 5+ years
   - Salary: $120k-$180k
   - Location: San Francisco, CA (Hybrid)

2. **Frontend Developer** (Contract)
   - Requirements: React, TypeScript, CSS, 3+ years
   - Location: Remote

3. **Backend Python Developer** (Full-time)
   - Requirements: Python, Django, PostgreSQL, REST APIs, 4+ years
   - Focus: Data analytics

4. **Junior Software Developer** (Full-time)
   - Requirements: JavaScript, Basic web development, Willingness to learn
   - Entry-level position

### Test User Profile

- **Name**: Test User
- **Headline**: Software Engineer
- **Skills**: JavaScript (6 years), React (5 years), Node.js (5 years), Python (4 years), PostgreSQL (4 years)
- **Experience**: Software Engineer at Previous Tech Company (2019-2023)
  - Improved performance by 40%
  - Led team of 3 developers
  - Implemented CI/CD pipeline
- **Education**: BS in Computer Science from Tech University (2014-2018, GPA: 3.8)

## Running the Tests

### Prerequisites

1. PostgreSQL running locally
2. Redis running locally
3. MongoDB running locally
4. Test database created: `givemejobs_test`
5. Environment variables configured in `.env.test`

### Commands

```bash
# Run all interview prep tests
npm test -- src/__tests__/interview-prep.integration.test.ts --run

# Run with coverage
npm test -- src/__tests__/interview-prep.integration.test.ts --run --coverage

# Run in watch mode (for development)
npm run test:watch -- src/__tests__/interview-prep.integration.test.ts
```

### Expected Results

When all services are running:
- **29 tests** should pass
- All test suites should complete successfully
- No database connection errors
- No authentication errors

## Test Assertions

### Question Generation Tests
- Verify question structure (id, category, question, suggestedAnswer, keyPoints, difficulty)
- Validate presence of all question categories
- Check STAR framework inclusion for behavioral questions
- Ensure company research completeness
- Verify preparation tips array

### Response Analysis Tests
- Assert score ranges (0-100)
- Validate feedback structure completeness
- Check STAR method detection accuracy
- Verify keyword identification
- Ensure actionable suggestions
- Validate constructive feedback for poor responses

### Integration Tests
- Verify end-to-end flows (generate → practice → analyze)
- Test data persistence
- Validate user ownership and access control
- Check error handling and edge cases

## Maintenance Notes

### Updating Mocks

When updating AI response structures:
1. Update mock functions in test file
2. Ensure all required fields are present
3. Maintain realistic score distributions
4. Keep suggestions actionable and specific

### Adding New Test Cases

When adding new job types or scenarios:
1. Create appropriate job data
2. Define expected question categories
3. Set up relevant user profile data
4. Add assertions for new scenarios

### Known Limitations

- Tests require running database services
- AI responses are mocked (not testing actual OpenAI integration)
- Company research service is mocked
- Email notifications are not tested in this suite

## Success Criteria

✅ Tests cover all three requirements (6.1, 6.2, 6.4)
✅ Question generation tested for multiple job types
✅ Response analysis accuracy validated across quality levels
✅ STAR method detection verified
✅ Company research inclusion confirmed
✅ Error handling comprehensive
✅ Authentication and authorization tested
✅ Practice session management validated
✅ Progress tracking verified

## Related Files

- `src/services/interview-prep.service.ts` - Service implementation
- `src/controllers/interview-prep.controller.ts` - Controller implementation
- `src/routes/interview-prep.routes.ts` - API routes
- `src/services/company-research.service.ts` - Company research integration
- `src/__tests__/setup.ts` - Test setup utilities
