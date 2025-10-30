# Document Generation Service (Mr.TAILOUR)

## Overview

The Document Generation Service is an AI-powered system that generates tailored resumes and cover letters for job applications. It uses OpenAI's GPT-4 to analyze job descriptions and create personalized application materials based on user profiles.

## Features

### 1. AI-Powered Content Generation
- **Resume Generation**: Creates tailored resumes highlighting relevant skills and experiences
- **Cover Letter Generation**: Generates personalized cover letters addressing specific job requirements
- **Job Requirement Extraction**: Automatically extracts key requirements from job descriptions
- **Keyword Optimization**: Ensures generated documents include relevant keywords from job postings

### 2. Template Management
- **Resume Templates**: Multiple pre-built templates (Modern, ATS-Friendly, Classic, Creative)
- **Cover Letter Templates**: Various tones (Professional, Casual, Enthusiastic)
- **Custom Templates**: Users can create and save their own templates
- **Template Categories**: Organized by style and purpose

### 3. Document Editing & Versioning
- **Version Control**: Automatic versioning of document changes
- **Edit History**: Track all modifications with timestamps
- **Version Restoration**: Restore documents to previous versions
- **Change Tracking**: Record reasons for document updates

### 4. Multi-Format Export
- **PDF Export**: Professional PDF documents with proper formatting
- **DOCX Export**: Microsoft Word compatible documents
- **Plain Text Export**: Simple text format for ATS systems

## API Endpoints

### Document Generation

#### Generate Resume
```http
POST /api/documents/generate/resume
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": "uuid",
  "templateId": "optional-template-id",
  "customizations": {
    "tone": "professional",
    "length": "standard",
    "focusAreas": ["backend development", "cloud architecture"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "document-id",
    "userId": "user-id",
    "jobId": "job-id",
    "documentType": "resume",
    "title": "Resume - Software Engineer at TechCorp",
    "content": { ... },
    "templateId": "template-id",
    "version": 1,
    "metadata": {
      "wordCount": 450,
      "keywordsUsed": ["Python", "AWS", "Docker"],
      "generationTime": 8500
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Resume generated successfully"
}
```

#### Generate Cover Letter
```http
POST /api/documents/generate/cover-letter
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": "uuid",
  "templateId": "optional-template-id",
  "customizations": {
    "tone": "enthusiastic"
  }
}
```

### Document Management

#### Get User Documents
```http
GET /api/documents?documentType=resume&jobId=uuid
Authorization: Bearer <token>
```

#### Get Specific Document
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
  "title": "Updated Resume Title",
  "content": { ... },
  "changes": "Updated experience section"
}
```

#### Delete Document
```http
DELETE /api/documents/:documentId
Authorization: Bearer <token>
```

### Document Versioning

#### Get Version History
```http
GET /api/documents/:documentId/versions
Authorization: Bearer <token>
```

#### Restore Version
```http
POST /api/documents/:documentId/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "version": 2
}
```

### Document Export

#### Export Document
```http
GET /api/documents/:documentId/export?format=pdf
Authorization: Bearer <token>
```

**Supported formats:** `pdf`, `docx`, `txt`

### Template Management

#### Get Resume Templates
```http
GET /api/templates/resume?category=ats-friendly&scope=public
```

#### Get Cover Letter Templates
```http
GET /api/templates/cover-letter?tone=professional
```

#### Create Custom Template
```http
POST /api/templates/resume
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Custom Template",
  "description": "A personalized resume template",
  "category": "modern",
  "sections": [...],
  "styling": {...},
  "isPublic": false
}
```

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# MongoDB Configuration (for document storage)
MONGODB_URI=mongodb://localhost:27017/givemejobs_docs
```

### AI Service Configuration

The AI service uses GPT-4 Turbo with the following settings:
- **Model**: `gpt-4-turbo-preview`
- **Temperature**: 0.7 for resumes, 0.8 for cover letters
- **Max Tokens**: 2000 for resumes, 1500 for cover letters
- **Retry Logic**: 3 attempts with exponential backoff

## Document Structure

### Resume Content Structure
```typescript
{
  sections: [
    {
      type: "header",
      title: "Contact Information",
      content: {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        location: "San Francisco, CA",
        headline: "Senior Software Engineer"
      },
      order: 1
    },
    {
      type: "summary",
      title: "Professional Summary",
      content: "Experienced software engineer...",
      order: 2
    },
    {
      type: "experience",
      title: "Work Experience",
      content: {
        items: [
          {
            company: "TechCorp",
            title: "Senior Engineer",
            period: "Jan 2020 - Present",
            description: "Led development of...",
            achievements: [
              "Increased performance by 40%",
              "Mentored 5 junior developers"
            ]
          }
        ]
      },
      order: 3
    },
    {
      type: "education",
      title: "Education",
      content: { items: [...] },
      order: 4
    },
    {
      type: "skills",
      title: "Skills",
      content: {
        skills: ["Python", "AWS", "Docker", "Kubernetes"]
      },
      order: 5
    }
  ],
  formatting: {
    fontFamily: "Inter",
    fontSize: 11,
    lineHeight: 1.5,
    margins: { top: 20, right: 20, bottom: 20, left: 20 }
  }
}
```

### Cover Letter Content Structure
```typescript
{
  sections: [
    {
      type: "header",
      title: "Contact Information",
      content: { name, email, phone, location },
      order: 1
    },
    {
      type: "custom",
      title: "Opening",
      content: "Dear Hiring Manager, I am writing to...",
      order: 2
    },
    {
      type: "custom",
      title: "Body 1",
      content: "With my background in...",
      order: 3
    },
    {
      type: "custom",
      title: "Body 2",
      content: "I am particularly drawn to...",
      order: 4
    },
    {
      type: "custom",
      title: "Closing",
      content: "Thank you for considering...",
      order: 5
    },
    {
      type: "custom",
      title: "Signature",
      content: "Sincerely,\nJohn Doe",
      order: 6
    }
  ],
  formatting: { ... }
}
```

## AI Prompt Engineering

### Resume Generation Prompt Strategy
1. **Context Setting**: Provide job description and user profile
2. **Tone Instructions**: Specify professional, casual, or enthusiastic tone
3. **Length Guidelines**: Control output verbosity (concise, standard, detailed)
4. **Focus Areas**: Highlight specific skills or experiences
5. **Keyword Integration**: Ensure natural inclusion of job-relevant keywords
6. **Metric Emphasis**: Encourage quantifiable achievements

### Cover Letter Generation Prompt Strategy
1. **Company Research**: Incorporate company information when available
2. **Personalization**: Match user's experience to job requirements
3. **Storytelling**: Create compelling narrative connecting user to role
4. **Value Proposition**: Clearly articulate what user brings to company
5. **Call to Action**: End with clear next steps

## Error Handling

### Common Errors

1. **AI Service Not Configured**
   - Status: 503
   - Message: "AI service is not configured. Please set OPENAI_API_KEY."

2. **Job Not Found**
   - Status: 404
   - Message: "Job not found"

3. **User Profile Incomplete**
   - Status: 404
   - Message: "User profile not found. Please complete your profile first."

4. **OpenAI API Errors**
   - Automatic retry with exponential backoff (3 attempts)
   - Authentication errors (401/403) fail immediately
   - Rate limit errors trigger retry logic

5. **Template Not Found**
   - Falls back to default template
   - ATS-friendly for resumes
   - Professional for cover letters

## Performance Considerations

### Generation Times
- **Resume Generation**: 5-10 seconds
- **Cover Letter Generation**: 4-8 seconds
- **Document Export (PDF)**: 1-2 seconds
- **Document Export (DOCX)**: 1-2 seconds

### Optimization Strategies
1. **Caching**: User profiles cached during generation
2. **Parallel Processing**: Multiple AI calls can run concurrently
3. **Template Preloading**: Default templates loaded at startup
4. **Streaming**: Large documents streamed to client

## Testing

### Manual Testing

1. **Generate Resume**
```bash
curl -X POST http://localhost:4000/api/documents/generate/resume \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job-uuid",
    "customizations": {
      "tone": "professional",
      "length": "standard"
    }
  }'
```

2. **Export to PDF**
```bash
curl -X GET "http://localhost:4000/api/documents/DOCUMENT_ID/export?format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output resume.pdf
```

### Integration Testing
- Test with various job descriptions
- Verify keyword extraction accuracy
- Check document formatting consistency
- Validate version control functionality

## Future Enhancements

1. **Additional AI Providers**: Support for Anthropic Claude, Google Gemini
2. **Real-time Collaboration**: Multiple users editing same document
3. **A/B Testing**: Compare different resume versions
4. **Analytics**: Track which resumes get most responses
5. **Smart Suggestions**: AI-powered improvement recommendations
6. **LinkedIn Integration**: Import and sync with LinkedIn profile
7. **ATS Scoring**: Predict ATS compatibility score
8. **Industry Templates**: Specialized templates for different industries

## Dependencies

```json
{
  "openai": "^6.4.0",
  "pdfkit": "^0.14.0",
  "docx": "^8.5.0",
  "mongodb": "^6.3.0"
}
```

## Related Services

- **AI Service**: Core AI/LLM integration
- **Job Service**: Fetches job details for generation
- **Profile Service**: Retrieves user profile data
- **Template Service**: Manages document templates

## Support

For issues or questions:
1. Check environment variables are set correctly
2. Verify OpenAI API key has sufficient credits
3. Ensure user profile is complete
4. Review error logs for specific issues
