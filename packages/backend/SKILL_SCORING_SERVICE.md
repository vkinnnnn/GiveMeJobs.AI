# Skill Scoring Service

The Skill Scoring Service provides functionality to calculate, track, and analyze user skill scores based on their profile data.

## Features

### 1. Skill Score Calculation (0-100)

The service calculates an overall skill score using a weighted formula:

- **Technical Skills (30%)**: Based on number of skills, proficiency levels, and years of experience
- **Experience (25%)**: Based on total years, number of positions, and career progression
- **Education (15%)**: Based on degree level, GPA, and multiple degrees
- **Certifications (15%)**: Based on number, active status, and recency
- **Project Portfolio (10%)**: Based on number of projects and technology diversity
- **Endorsements (5%)**: Based on total endorsements across all skills

### 2. Score Tracking and History

- Automatically tracks score changes over time
- Records trigger events (new_skill, experience_added, education_added, etc.)
- Stores detailed breakdown of each score calculation
- Provides historical view of skill progression

### 3. Skill Gap Analysis

- Compares user skills against career goal requirements
- Identifies missing skills and proficiency gaps
- Prioritizes gaps (high, medium, low priority)
- Estimates learning time for each gap
- Generates personalized learning recommendations

## API Endpoints

### Get Current Skill Score
```
GET /api/skill-score
Authorization: Bearer <token>
```

Response:
```json
{
  "userId": "uuid",
  "overallScore": 75,
  "breakdown": {
    "technicalSkills": 80,
    "experience": 70,
    "education": 85,
    "certifications": 60,
    "projectPortfolio": 75,
    "endorsements": 40
  },
  "lastCalculated": "2024-01-15T10:30:00Z"
}
```

### Get Score History
```
GET /api/skill-score/history?limit=50
Authorization: Bearer <token>
```

Response:
```json
{
  "history": [
    {
      "id": "uuid",
      "userId": "uuid",
      "score": 75,
      "trigger": "new_skill",
      "breakdown": { ... },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 10
}
```

### Recalculate Score
```
POST /api/skill-score/recalculate
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Skill score recalculated successfully",
  "skillScore": {
    "userId": "uuid",
    "overallScore": 76,
    "breakdown": { ... },
    "lastCalculated": "2024-01-15T10:35:00Z"
  }
}
```

### Analyze Skill Gaps
```
GET /api/skill-score/gap-analysis/:careerGoalId
Authorization: Bearer <token>
```

Response:
```json
{
  "userId": "uuid",
  "targetRole": "Senior Full Stack Developer",
  "currentSkills": [
    {
      "name": "JavaScript",
      "proficiencyLevel": 4,
      "yearsOfExperience": 5
    }
  ],
  "requiredSkills": [
    {
      "name": "JavaScript",
      "requiredLevel": 4,
      "importance": "critical"
    },
    {
      "name": "TypeScript",
      "requiredLevel": 3,
      "importance": "important"
    }
  ],
  "gaps": [
    {
      "skillName": "TypeScript",
      "currentLevel": 0,
      "requiredLevel": 3,
      "priority": "high",
      "estimatedLearningTime": "2-4 months"
    }
  ],
  "recommendations": [
    {
      "title": "TypeScript Fundamentals Course",
      "provider": "Online Learning Platform",
      "type": "course",
      "url": "https://example.com/courses/typescript",
      "duration": "2-4 months",
      "cost": 0,
      "relevanceScore": 95
    }
  ],
  "matchPercentage": 60
}
```

## Automatic Score Updates

The skill score is automatically recalculated when:

- A new skill is added to the profile
- Work experience is added or updated
- Education is added or updated
- Certifications are added

This ensures the score always reflects the user's current profile state.

## Usage Example

```typescript
import { SkillScoringService } from './services/skill-scoring.service';

const skillScoringService = new SkillScoringService();

// Calculate and update score
const score = await skillScoringService.recalculateAndUpdateScore(
  userId,
  'profile_update'
);

// Get current score
const currentScore = await skillScoringService.getCurrentSkillScore(userId);

// Get history
const history = await skillScoringService.getSkillScoreHistory(userId, 20);

// Analyze skill gaps
const analysis = await skillScoringService.analyzeSkillGaps(userId, careerGoalId);
```

## Database Schema

### skill_score_history Table
```sql
CREATE TABLE skill_score_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  score DECIMAL(5,2),
  trigger VARCHAR(50),
  breakdown JSONB,
  created_at TIMESTAMP
);
```

The breakdown JSONB field stores:
```json
{
  "technicalSkills": 80,
  "experience": 70,
  "education": 85,
  "certifications": 60,
  "projectPortfolio": 75,
  "endorsements": 40
}
```

## Testing

Run the skill scoring tests:
```bash
npm test skill-scoring.test.ts
```

Note: Tests require a running PostgreSQL database. Ensure your database is configured in `.env` before running tests.

## Future Enhancements

1. **Machine Learning Integration**: Use ML models to predict skill requirements for roles
2. **Industry Benchmarking**: Compare scores against industry averages
3. **Skill Recommendations**: AI-powered suggestions for skills to learn based on career goals
4. **Learning Path Generation**: Create personalized learning paths to close skill gaps
5. **Integration with Learning Platforms**: Direct integration with Coursera, Udemy, etc.
