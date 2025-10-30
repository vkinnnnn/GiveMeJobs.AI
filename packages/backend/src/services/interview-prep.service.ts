import { Pool } from 'pg';
import { pgPool } from '../config/database';
import OpenAI from 'openai';
import { companyResearchService } from './company-research.service';

/**
 * Interview Preparation Service (GURU)
 * Generates AI-powered interview preparation materials
 */
export class InterviewPrepService {
  private db: Pool;
  private openai: OpenAI;

  constructor() {
    this.db = pgPool;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not configured. AI features will be disabled.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  /**
   * Generate interview preparation package
   */
  async generateInterviewPrep(data: {
    applicationId: string;
    userId: string;
  }): Promise<any> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get application details
      const appQuery = `
        SELECT a.*, j.title, j.company, j.description, j.requirements, j.responsibilities
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = $1 AND a.user_id = $2
      `;
      const appResult = await client.query(appQuery, [data.applicationId, data.userId]);

      if (appResult.rows.length === 0) {
        throw new Error('Application not found');
      }

      const application = appResult.rows[0];

      // Get user profile
      const userQuery = `
        SELECT 
          u.first_name, u.last_name, u.professional_headline,
          json_agg(DISTINCT jsonb_build_object(
            'name', s.name,
            'proficiency_level', s.proficiency_level,
            'years_of_experience', s.years_of_experience
          )) FILTER (WHERE s.id IS NOT NULL) as skills,
          json_agg(DISTINCT jsonb_build_object(
            'company', e.company,
            'title', e.title,
            'description', e.description,
            'achievements', e.achievements
          )) FILTER (WHERE e.id IS NOT NULL) as experience
        FROM users u
        LEFT JOIN skills s ON u.id = s.user_id
        LEFT JOIN experience e ON u.id = e.user_id
        WHERE u.id = $1
        GROUP BY u.id, u.first_name, u.last_name, u.professional_headline
      `;
      const userResult = await client.query(userQuery, [data.userId]);
      const userProfile = userResult.rows[0];

      // Generate interview questions using AI
      const questions = await this.generateInterviewQuestions(
        application,
        userProfile
      );

      // Fetch company research
      const companyResearch = await this.fetchCompanyResearch(
        application.company,
        application.title
      );

      // Generate preparation tips
      const tips = await this.generatePreparationTips(application, userProfile);

      // Store interview prep
      const insertQuery = `
        INSERT INTO interview_prep (
          application_id, user_id, job_id, questions, company_research, tips
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, application_id, user_id, job_id, created_at as generated_at
      `;

      const result = await client.query(insertQuery, [
        data.applicationId,
        data.userId,
        application.job_id,
        JSON.stringify(questions),
        JSON.stringify(companyResearch),
        JSON.stringify(tips),
      ]);

      await client.query('COMMIT');

      return {
        ...result.rows[0],
        questions,
        companyResearch,
        tips,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error generating interview prep:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate interview questions using AI
   */
  private async generateInterviewQuestions(
    application: any,
    userProfile: any
  ): Promise<any[]> {
    const prompt = `Generate interview questions for the following job and candidate:

Job Title: ${application.title}
Company: ${application.company}
Job Description: ${application.description}
Requirements: ${application.requirements?.join(', ') || 'N/A'}

Candidate Background:
- Name: ${userProfile.first_name} ${userProfile.last_name}
- Headline: ${userProfile.professional_headline}
- Skills: ${JSON.stringify(userProfile.skills)}
- Experience: ${JSON.stringify(userProfile.experience)}

Generate 15 interview questions in the following categories:
1. Behavioral questions (5 questions)
2. Technical questions (5 questions)
3. Company-specific questions (3 questions)
4. Situational questions (2 questions)

For each question, provide:
- The question text
- A suggested answer based on the candidate's background
- Key points to cover
- STAR framework breakdown (for behavioral questions)
- Difficulty level (easy, medium, hard)

Return the response as a JSON array of question objects.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interview coach helping candidates prepare for job interviews. Generate realistic, relevant interview questions with helpful guidance.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      return response.questions || [];
    } catch (error) {
      console.error('Error generating questions with AI:', error);
      // Fallback to basic questions if AI fails
      return this.generateFallbackQuestions(application);
    }
  }

  /**
   * Fallback questions if AI generation fails
   */
  private generateFallbackQuestions(application: any): any[] {
    return [
      {
        id: '1',
        category: 'behavioral',
        question: 'Tell me about yourself and your background.',
        suggestedAnswer: 'Focus on your professional journey, key achievements, and what led you to apply for this role.',
        keyPoints: ['Professional background', 'Key achievements', 'Career motivation'],
        difficulty: 'easy',
      },
      {
        id: '2',
        category: 'behavioral',
        question: 'Why are you interested in this position?',
        suggestedAnswer: `Highlight your interest in ${application.company} and how the role aligns with your career goals.`,
        keyPoints: ['Company research', 'Role alignment', 'Career goals'],
        difficulty: 'easy',
      },
      {
        id: '3',
        category: 'behavioral',
        question: 'Describe a challenging project you worked on and how you overcame obstacles.',
        suggestedAnswer: 'Use the STAR method to structure your response.',
        keyPoints: ['Situation', 'Task', 'Action', 'Result'],
        starFramework: {
          situation: 'Describe the context',
          task: 'Explain your responsibility',
          action: 'Detail the steps you took',
          result: 'Share the outcome',
        },
        difficulty: 'medium',
      },
      {
        id: '4',
        category: 'technical',
        question: `What experience do you have with the technologies mentioned in the job description?`,
        suggestedAnswer: 'Discuss specific projects where you used these technologies.',
        keyPoints: ['Relevant experience', 'Specific examples', 'Depth of knowledge'],
        difficulty: 'medium',
      },
      {
        id: '5',
        category: 'company-specific',
        question: `What do you know about ${application.company}?`,
        suggestedAnswer: 'Research the company\'s mission, products, culture, and recent news.',
        keyPoints: ['Company mission', 'Products/services', 'Recent achievements'],
        difficulty: 'easy',
      },
    ];
  }

  /**
   * Fetch company research data
   */
  private async fetchCompanyResearch(companyName: string, jobTitle?: string): Promise<any> {
    try {
      // Use company research service to fetch comprehensive data
      const research = await companyResearchService.researchCompany({
        companyName,
        jobTitle,
      });

      return {
        companyName,
        overview: research.overview,
        culture: research.culture,
        values: research.values,
        recentNews: research.recentNews,
        interviewTips: research.interviewTips,
        commonQuestions: research.commonQuestions,
      };
    } catch (error) {
      console.error('Error fetching company research:', error);
      // Fallback to basic structure if research fails
      return {
        companyName,
        overview: `${companyName} is a company in the industry.`,
        culture: 'Information not available',
        values: ['Innovation', 'Excellence', 'Integrity'],
        recentNews: ['Company information will be updated soon'],
        interviewTips: [
          'Research the company thoroughly before the interview',
          'Prepare examples that demonstrate your skills',
          'Ask thoughtful questions about the role and company',
          'Be ready to discuss how you can contribute to their goals',
          'Show enthusiasm for the company and position',
        ],
        commonQuestions: [
          'Why do you want to work here?',
          'What do you know about our company?',
          'How would you contribute to our team?',
        ],
      };
    }
  }

  /**
   * Generate preparation tips
   */
  private async generatePreparationTips(
    application: any,
    userProfile: any
  ): Promise<string[]> {
    const prompt = `Generate 5-7 specific interview preparation tips for:

Job: ${application.title} at ${application.company}
Candidate: ${userProfile.professional_headline}

Focus on actionable advice that will help the candidate succeed in the interview.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interview coach. Provide specific, actionable preparation tips.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content || '';
      return response.split('\n').filter((tip) => tip.trim().length > 0);
    } catch (error) {
      console.error('Error generating tips:', error);
      return [
        'Research the company thoroughly',
        'Prepare examples using the STAR method',
        'Practice common interview questions',
        'Prepare questions to ask the interviewer',
        'Review the job description and align your experience',
      ];
    }
  }

  /**
   * Get interview prep by ID
   */
  async getInterviewPrep(prepId: string, userId: string): Promise<any> {
    const query = `
      SELECT 
        ip.*,
        a.status as application_status,
        j.title as job_title,
        j.company
      FROM interview_prep ip
      JOIN applications a ON ip.application_id = a.id
      JOIN jobs j ON ip.job_id = j.id
      WHERE ip.id = $1 AND ip.user_id = $2
    `;

    const result = await this.db.query(query, [prepId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Interview prep not found');
    }

    const prep = result.rows[0];

    return {
      id: prep.id,
      applicationId: prep.application_id,
      userId: prep.user_id,
      jobId: prep.job_id,
      jobTitle: prep.job_title,
      company: prep.company,
      generatedAt: prep.created_at,
      interviewDate: prep.interview_date,
      questions: prep.questions,
      companyResearch: prep.company_research,
      tips: prep.tips,
    };
  }

  /**
   * Get interview prep by application ID
   */
  async getInterviewPrepByApplication(
    applicationId: string,
    userId: string
  ): Promise<any> {
    const query = `
      SELECT 
        ip.*,
        j.title as job_title,
        j.company
      FROM interview_prep ip
      JOIN applications a ON ip.application_id = a.id
      JOIN jobs j ON ip.job_id = j.id
      WHERE ip.application_id = $1 AND ip.user_id = $2
      ORDER BY ip.created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [applicationId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const prep = result.rows[0];

    return {
      id: prep.id,
      applicationId: prep.application_id,
      userId: prep.user_id,
      jobId: prep.job_id,
      jobTitle: prep.job_title,
      company: prep.company,
      generatedAt: prep.created_at,
      interviewDate: prep.interview_date,
      questions: prep.questions,
      companyResearch: prep.company_research,
      tips: prep.tips,
    };
  }

  /**
   * Update interview date
   */
  async updateInterviewDate(
    prepId: string,
    userId: string,
    interviewDate: Date
  ): Promise<any> {
    const query = `
      UPDATE interview_prep
      SET interview_date = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;

    const result = await this.db.query(query, [interviewDate, prepId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Interview prep not found');
    }

    return result.rows[0];
  }

  /**
   * Create a practice session
   */
  async createPracticeSession(data: {
    interviewPrepId: string;
    userId: string;
    questionId: string;
    questionText: string;
    response: string;
    recordingUrl?: string;
    transcript?: string;
    duration?: number;
  }): Promise<any> {
    // Verify the interview prep belongs to the user
    const prepQuery = `
      SELECT id FROM interview_prep
      WHERE id = $1 AND user_id = $2
    `;
    const prepResult = await this.db.query(prepQuery, [data.interviewPrepId, data.userId]);

    if (prepResult.rows.length === 0) {
      throw new Error('Interview prep not found');
    }

    const insertQuery = `
      INSERT INTO practice_sessions (
        interview_prep_id, user_id, question_id, question_text,
        response, recording_url, transcript, duration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query(insertQuery, [
      data.interviewPrepId,
      data.userId,
      data.questionId,
      data.questionText,
      data.response,
      data.recordingUrl || null,
      data.transcript || null,
      data.duration || null,
    ]);

    return result.rows[0];
  }

  /**
   * Get practice sessions for an interview prep
   */
  async getPracticeSessions(
    interviewPrepId: string,
    userId: string
  ): Promise<any[]> {
    const query = `
      SELECT * FROM practice_sessions
      WHERE interview_prep_id = $1 AND user_id = $2
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [interviewPrepId, userId]);
    return result.rows;
  }

  /**
   * Get a specific practice session
   */
  async getPracticeSession(
    sessionId: string,
    userId: string
  ): Promise<any> {
    const query = `
      SELECT * FROM practice_sessions
      WHERE id = $1 AND user_id = $2
    `;

    const result = await this.db.query(query, [sessionId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Practice session not found');
    }

    return result.rows[0];
  }

  /**
   * Update practice session with analysis
   */
  async updatePracticeSessionAnalysis(
    sessionId: string,
    userId: string,
    analysis: any
  ): Promise<any> {
    const query = `
      UPDATE practice_sessions
      SET analysis = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;

    const result = await this.db.query(query, [
      JSON.stringify(analysis),
      sessionId,
      userId,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Practice session not found');
    }

    return result.rows[0];
  }

  /**
   * Get practice progress for an interview prep
   */
  async getPracticeProgress(
    interviewPrepId: string,
    userId: string
  ): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT question_id) as questions_practiced,
        AVG((analysis->>'overallScore')::float) as average_score,
        MAX(created_at) as last_practice_date
      FROM practice_sessions
      WHERE interview_prep_id = $1 AND user_id = $2 AND analysis IS NOT NULL
    `;

    const result = await this.db.query(query, [interviewPrepId, userId]);
    return result.rows[0];
  }

  /**
   * Analyze practice response using AI
   */
  async analyzePracticeResponse(
    sessionId: string,
    userId: string
  ): Promise<any> {
    // Get the practice session
    const session = await this.getPracticeSession(sessionId, userId);

    // Generate analysis using AI
    const analysis = await this.generateResponseAnalysis(
      session.question_text,
      session.response
    );

    // Update the session with analysis
    await this.updatePracticeSessionAnalysis(sessionId, userId, analysis);

    return analysis;
  }

  /**
   * Generate AI-powered response analysis
   */
  private async generateResponseAnalysis(
    question: string,
    response: string
  ): Promise<any> {
    const prompt = `You are an expert interview coach analyzing a candidate's practice response.

Question: ${question}

Candidate's Response: ${response}

Analyze this response and provide detailed feedback in the following areas:

1. OVERALL SCORE (0-100): Rate the overall quality of the response
2. CLARITY (0-100): How clear and well-structured is the response?
3. RELEVANCE (0-100): How well does it answer the question?
4. STAR METHOD USAGE: Does it follow the STAR (Situation, Task, Action, Result) framework? (true/false)
5. CONFIDENCE INDICATORS: List phrases or elements that show confidence
6. KEYWORDS COVERED: List important keywords from the question that were addressed
7. STRENGTHS: List 2-3 specific strengths of the response
8. AREAS FOR IMPROVEMENT: List 2-3 specific areas to improve
9. SUGGESTIONS: Provide 2-3 actionable suggestions to enhance the response

Return ONLY valid JSON in this exact format:
{
  "overallScore": 85,
  "clarity": 90,
  "relevance": 85,
  "starMethodUsage": true,
  "confidenceIndicators": ["specific example", "quantified results"],
  "keywordsCovered": ["keyword1", "keyword2"],
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForImprovement": ["area1", "area2", "area3"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interview coach providing constructive feedback on interview responses. Be specific, actionable, and encouraging.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');

      // Validate and ensure all required fields exist
      return {
        overallScore: analysis.overallScore || 0,
        clarity: analysis.clarity || 0,
        relevance: analysis.relevance || 0,
        starMethodUsage: analysis.starMethodUsage || false,
        confidenceIndicators: analysis.confidenceIndicators || [],
        keywordsCovered: analysis.keywordsCovered || [],
        strengths: analysis.strengths || [],
        areasForImprovement: analysis.areasForImprovement || [],
        suggestions: analysis.suggestions || [],
      };
    } catch (error) {
      console.error('Error generating response analysis:', error);
      // Return fallback analysis
      return {
        overallScore: 50,
        clarity: 50,
        relevance: 50,
        starMethodUsage: false,
        confidenceIndicators: [],
        keywordsCovered: [],
        strengths: ['Response provided'],
        areasForImprovement: ['Could not analyze response automatically'],
        suggestions: ['Try practicing with more specific examples', 'Structure your response using the STAR method'],
      };
    }
  }
}

export const interviewPrepService = new InterviewPrepService();
