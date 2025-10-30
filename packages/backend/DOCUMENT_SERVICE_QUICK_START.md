# Document Generation Service - Quick Start Guide

## Setup

### 1. Install Dependencies
```bash
cd packages/backend
npm install
```

### 2. Configure Environment
Add to your `.env` file:
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin
```

### 3. Initialize MongoDB Collections
```bash
npm run mongo:init
```

This will:
- Create required collections
- Set up indexes
- Seed default templates

## Quick Test

### 1. Start the Server
```bash
npm run dev
```

### 2. Get Authentication Token
```bash
# Login or register to get a token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 3. Generate a Resume
```bash
curl -X POST http://localhost:4000/api/documents/generate/resume \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "JOB_UUID",
    "customizations": {
      "tone": "professional",
      "length": "standard"
    }
  }'
```

### 4. Export to PDF
```bash
curl -X GET "http://localhost:4000/api/documents/DOCUMENT_ID/export?format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output resume.pdf
```

## Common Use Cases

### Generate Resume with Custom Template
```javascript
const response = await fetch('/api/documents/generate/resume', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jobId: 'job-uuid',
    templateId: 'template-uuid',
    customizations: {
      tone: 'enthusiastic',
      length: 'detailed',
      focusAreas: ['leadership', 'cloud architecture']
    }
  })
});
```

### Generate Cover Letter
```javascript
const response = await fetch('/api/documents/generate/cover-letter', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jobId: 'job-uuid',
    customizations: {
      tone: 'professional'
    }
  })
});
```

### Update Document Content
```javascript
const response = await fetch(`/api/documents/${documentId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: updatedContent,
    changes: 'Updated skills section'
  })
});
```

### Get All User Documents
```javascript
const response = await fetch('/api/documents?documentType=resume', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Export Document
```javascript
// PDF
window.open(`/api/documents/${documentId}/export?format=pdf`);

// DOCX
window.open(`/api/documents/${documentId}/export?format=docx`);

// TXT
window.open(`/api/documents/${documentId}/export?format=txt`);
```

## Available Templates

### Resume Templates
- **Modern Professional**: Clean design for tech/creative industries
- **ATS-Friendly Classic**: Optimized for applicant tracking systems
- **Creative**: Bold design for creative roles
- **Classic**: Traditional format for corporate positions

### Cover Letter Templates
- **Professional Standard**: Traditional business format
- **Enthusiastic Approach**: Energetic tone for startups
- **Casual**: Friendly tone for informal companies

## Customization Options

### Tone
- `professional`: Formal, industry-standard language
- `casual`: Approachable, conversational style
- `enthusiastic`: Energetic, passionate language

### Length
- `concise`: Brief, impactful descriptions
- `standard`: Balanced detail level
- `detailed`: Comprehensive descriptions with metrics

### Focus Areas
Array of skills/topics to emphasize:
```javascript
focusAreas: [
  'backend development',
  'team leadership',
  'cloud architecture',
  'agile methodologies'
]
```

## Troubleshooting

### "AI service is not configured"
- Check `OPENAI_API_KEY` is set in `.env`
- Verify API key is valid and has credits
- Restart the server after adding the key

### "User profile not found"
- Ensure user has completed their profile
- Check skills, experience, and education are added
- Use profile endpoints to add missing data

### "Job not found"
- Verify job ID exists in database
- Check job hasn't been deleted
- Ensure job is accessible to the user

### Generation Takes Too Long
- Normal generation time: 5-10 seconds
- Check OpenAI API status
- Verify network connectivity
- Review server logs for errors

### Export Fails
- Ensure document exists and belongs to user
- Check format parameter is valid (pdf, docx, txt)
- Verify sufficient server memory for PDF generation

## API Response Examples

### Successful Resume Generation
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "user-uuid",
    "jobId": "job-uuid",
    "documentType": "resume",
    "title": "Resume - Senior Developer at TechCorp",
    "version": 1,
    "metadata": {
      "wordCount": 485,
      "keywordsUsed": ["Python", "AWS", "Docker", "Kubernetes"],
      "generationTime": 7800
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Resume generated successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Failed to generate resume",
  "error": "Job not found"
}
```

## Performance Tips

1. **Cache User Profile**: Profile data is cached during generation
2. **Batch Operations**: Generate multiple documents in parallel
3. **Use Default Templates**: Faster than custom templates
4. **Optimize Job Descriptions**: Cleaner descriptions = better results
5. **Monitor API Usage**: Track OpenAI API costs

## Next Steps

1. **Explore Templates**: Browse available templates via API
2. **Create Custom Template**: Design your own resume template
3. **Test Different Tones**: Compare professional vs enthusiastic
4. **Version Control**: Edit and track document changes
5. **Export Formats**: Try PDF, DOCX, and TXT exports

## Support Resources

- **Full Documentation**: `DOCUMENT_GENERATION_SERVICE.md`
- **API Reference**: Check route definitions in `routes/document.routes.ts`
- **Service Code**: Review `services/document-generation.service.ts`
- **Examples**: See `__tests__/` directory for test cases

## Development Workflow

1. **Make Changes**: Edit service files
2. **Check Types**: `npm run type-check`
3. **Run Tests**: `npm test`
4. **Start Dev Server**: `npm run dev`
5. **Test Endpoints**: Use curl or Postman
6. **Review Logs**: Check console for errors

## Common Patterns

### Frontend Integration
```typescript
// React hook for document generation
const useDocumentGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateResume = async (jobId: string, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/documents/generate/resume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId, ...options })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateResume, loading, error };
};
```

### Backend Service Extension
```typescript
// Add custom generation logic
class CustomDocumentService extends DocumentGenerationService {
  async generateWithAnalytics(params) {
    const startTime = Date.now();
    const document = await this.generateResume(params);
    
    // Track analytics
    await analyticsService.track({
      event: 'document_generated',
      userId: params.userId,
      duration: Date.now() - startTime,
      documentType: 'resume'
    });
    
    return document;
  }
}
```

## Best Practices

1. **Always Handle Errors**: Wrap API calls in try-catch
2. **Show Loading States**: Generation takes 5-10 seconds
3. **Validate Input**: Check jobId and userId before calling
4. **Cache Templates**: Load templates once, reuse multiple times
5. **Monitor Costs**: Track OpenAI API usage and costs
6. **Test Thoroughly**: Test with various job descriptions
7. **Version Documents**: Use versioning for important changes
8. **Optimize Prompts**: Refine prompts for better results

## FAQ

**Q: How much does document generation cost?**
A: Depends on OpenAI pricing. Typically $0.01-0.03 per document.

**Q: Can I use a different AI provider?**
A: Yes, modify `ai.service.ts` to support other providers.

**Q: How do I add a new template?**
A: Use POST `/api/templates/resume` with template configuration.

**Q: Can documents be generated offline?**
A: No, requires OpenAI API connection.

**Q: How long are documents stored?**
A: Indefinitely until user deletes them.

**Q: Can I customize the AI prompts?**
A: Yes, edit prompt templates in `ai.service.ts`.

**Q: What's the maximum document size?**
A: Limited by OpenAI token limits (2000 tokens for resumes).

**Q: How do I backup documents?**
A: Export to PDF/DOCX and store externally.
