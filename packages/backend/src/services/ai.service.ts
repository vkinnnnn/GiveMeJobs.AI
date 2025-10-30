import OpenAI from 'openai';

/**
 * AI Service for document generation using OpenAI
 * Handles resume and cover letter generation with prompt engineering
 */
export class AIService {
  private openai: OpenAI;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not configured. AI features will be disabled.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  /**
   * Generate tailored resume content based on job requirements and user profile
   */
  async generateResumeContent(params: {
    jobDescription: string;
    jobTitle: string;
    company: string;
    userProfile: {
      name: string;
      email: string;
      phone?: string;
      location?: string;
      professionalHeadline: string;
      skills: Array<{ name: string; proficiencyLevel: number; yearsOfExperience: number }>;
      experience: Array<{
        company: string;
        title: string;
        startDate: Date;
        endDate?: Date;
        current: boolean;
        description: string;
        achievements: string[];
      }>;
      education: Array<{
        institution: string;
        degree: string;
        fieldOfStudy: string;
        startDate: Date;
        endDate?: Date;
        gpa?: number;
      }>;
    };
    tone?: 'professional' | 'casual' | 'enthusiastic';
    length?: 'concise' | 'standard' | 'detailed';
    focusAreas?: string[];
  }): Promise<{
    summary: string;
    experience: Array<{
      company: string;
      title: string;
      period: string;
      description: string;
      achievements: string[];
    }>;
    skills: string[];
    keywords: string[];
  }> {
    const prompt = this.buildResumePrompt(params);

    try {
      const response = await this.callOpenAIWithRetry(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      return this.parseResumeResponse(response);
    } catch (error) {
      console.error('Error generating resume content:', error);
      throw new Error('Failed to generate resume content');
    }
  }

  /**
   * Generate personalized cover letter content
   */
  async generateCoverLetterContent(params: {
    jobDescription: string;
    jobTitle: string;
    company: string;
    companyInfo?: string;
    userProfile: {
      name: string;
      professionalHeadline: string;
      skills: Array<{ name: string }>;
      experience: Array<{
        company: string;
        title: string;
        description: string;
        achievements: string[];
      }>;
    };
    tone?: 'professional' | 'casual' | 'enthusiastic';
  }): Promise<{
    opening: string;
    body: string[];
    closing: string;
    keywords: string[];
  }> {
    const prompt = this.buildCoverLetterPrompt(params);

    try {
      const response = await this.callOpenAIWithRetry(prompt, {
        temperature: 0.8,
        maxTokens: 1500,
      });

      return this.parseCoverLetterResponse(response);
    } catch (error) {
      console.error('Error generating cover letter content:', error);
      throw new Error('Failed to generate cover letter content');
    }
  }

  /**
   * Extract key requirements from job description
   */
  async extractJobRequirements(jobDescription: string): Promise<{
    requiredSkills: string[];
    preferredSkills: string[];
    experienceLevel: string;
    responsibilities: string[];
    qualifications: string[];
  }> {
    const prompt = `Analyze the following job description and extract key information in JSON format:

Job Description:
${jobDescription}

Extract and return a JSON object with:
- requiredSkills: array of must-have technical and soft skills
- preferredSkills: array of nice-to-have skills
- experienceLevel: string (entry, mid, senior, lead, etc.)
- responsibilities: array of main job responsibilities
- qualifications: array of required qualifications (education, certifications, etc.)

Return only valid JSON, no additional text.`;

    try {
      const response = await this.callOpenAIWithRetry(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error extracting job requirements:', error);
      throw new Error('Failed to extract job requirements');
    }
  }

  /**
   * Build resume generation prompt with context
   */
  private buildResumePrompt(params: any): string {
    const { jobDescription, jobTitle, company, userProfile, tone = 'professional', length = 'standard', focusAreas = [] } = params;

    const toneInstructions: Record<string, string> = {
      professional: 'Use formal, professional language with industry-standard terminology.',
      casual: 'Use approachable, conversational language while maintaining professionalism.',
      enthusiastic: 'Use energetic, passionate language that shows excitement and motivation.',
    };

    const lengthInstructions: Record<string, string> = {
      concise: 'Keep descriptions brief and impactful, focusing on key achievements.',
      standard: 'Provide balanced descriptions with relevant details and achievements.',
      detailed: 'Include comprehensive descriptions with specific metrics and outcomes.',
    };

    return `You are an expert resume writer. Create tailored resume content for the following job application.

JOB INFORMATION:
Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

USER PROFILE:
Name: ${userProfile.name}
Professional Headline: ${userProfile.professionalHeadline}

Skills:
${userProfile.skills.map((s: any) => `- ${s.name} (${s.yearsOfExperience} years, proficiency: ${s.proficiencyLevel}/5)`).join('\n')}

Experience:
${userProfile.experience.map((e: any) => `
Company: ${e.company}
Title: ${e.title}
Period: ${this.formatDateRange(e.startDate, e.endDate, e.current)}
Description: ${e.description}
Achievements: ${e.achievements.join('; ')}
`).join('\n')}

Education:
${userProfile.education.map((e: any) => `
${e.degree} in ${e.fieldOfStudy}
${e.institution}
${this.formatDateRange(e.startDate, e.endDate, false)}${e.gpa ? ` (GPA: ${e.gpa})` : ''}
`).join('\n')}

INSTRUCTIONS:
${toneInstructions[tone] || toneInstructions.professional}
${lengthInstructions[length] || lengthInstructions.standard}
${focusAreas.length > 0 ? `Focus particularly on: ${focusAreas.join(', ')}` : ''}

Analyze the job description and tailor the resume content to highlight relevant skills and experiences.
Use keywords from the job description naturally throughout the content.
Quantify achievements with metrics where possible.

Return a JSON object with:
{
  "summary": "A compelling 2-3 sentence professional summary tailored to this role",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "period": "Month Year - Month Year",
      "description": "Tailored description emphasizing relevant aspects",
      "achievements": ["Achievement 1 with metrics", "Achievement 2 with impact"]
    }
  ],
  "skills": ["Skill 1", "Skill 2", ...] (prioritized by relevance to job),
  "keywords": ["keyword1", "keyword2", ...] (important keywords from job description)
}

Return only valid JSON, no additional text.`;
  }

  /**
   * Build cover letter generation prompt
   */
  private buildCoverLetterPrompt(params: any): string {
    const { jobDescription, jobTitle, company, companyInfo, userProfile, tone = 'professional' } = params;

    const toneInstructions: Record<string, string> = {
      professional: 'Use formal, professional language appropriate for corporate communications.',
      casual: 'Use friendly, approachable language while maintaining professionalism.',
      enthusiastic: 'Use energetic, passionate language that conveys genuine excitement.',
    };

    return `You are an expert cover letter writer. Create a personalized cover letter for the following job application.

JOB INFORMATION:
Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}
${companyInfo ? `Company Information: ${companyInfo}` : ''}

USER PROFILE:
Name: ${userProfile.name}
Professional Headline: ${userProfile.professionalHeadline}

Key Skills: ${userProfile.skills.map((s: any) => s.name).join(', ')}

Relevant Experience:
${userProfile.experience.slice(0, 3).map((e: any) => `
- ${e.title} at ${e.company}
  ${e.description}
  Key achievements: ${e.achievements.slice(0, 2).join('; ')}
`).join('\n')}

INSTRUCTIONS:
${toneInstructions[tone] || toneInstructions.professional}

Create a compelling cover letter that:
1. Opens with a strong hook that shows genuine interest in the role and company
2. Demonstrates understanding of the company's mission/values (if company info provided)
3. Highlights 2-3 most relevant experiences that align with job requirements
4. Shows how the candidate's skills solve the company's needs
5. Closes with enthusiasm and a clear call to action

The cover letter should be 3-4 paragraphs, natural and conversational, not generic.
Use specific examples and avoid clichés.

Return a JSON object with:
{
  "opening": "Opening paragraph with hook and interest statement",
  "body": [
    "Body paragraph 1 - relevant experience/skills",
    "Body paragraph 2 - additional qualifications and value proposition"
  ],
  "closing": "Closing paragraph with call to action",
  "keywords": ["keyword1", "keyword2", ...] (important keywords from job description used)
}

Return only valid JSON, no additional text.`;
  }

  /**
   * Call OpenAI API with retry logic
   */
  private async callOpenAIWithRetry(
    prompt: string,
    options: {
      temperature: number;
      maxTokens: number;
    }
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert career advisor and professional document writer. Always return valid JSON when requested.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('No content in OpenAI response');
        }

        return content;
      } catch (error: any) {
        lastError = error;
        console.error(`OpenAI API call attempt ${attempt} failed:`, error.message);

        // Don't retry on certain errors
        if (error.status === 401 || error.status === 403) {
          throw new Error('OpenAI API authentication failed');
        }

        if (error.status === 400) {
          throw new Error('Invalid request to OpenAI API');
        }

        // Wait before retrying
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`OpenAI API call failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Parse resume generation response
   */
  private parseResumeResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      
      // Validate structure
      if (!parsed.summary || !parsed.experience || !parsed.skills || !parsed.keywords) {
        throw new Error('Invalid resume response structure');
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing resume response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Parse cover letter generation response
   */
  private parseCoverLetterResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      
      // Validate structure
      if (!parsed.opening || !parsed.body || !parsed.closing || !parsed.keywords) {
        throw new Error('Invalid cover letter response structure');
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing cover letter response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Format date range for display
   */
  private formatDateRange(startDate: Date, endDate: Date | undefined, current: boolean): string {
    const start = new Date(startDate);
    const startStr = `${start.toLocaleString('en-US', { month: 'short' })} ${start.getFullYear()}`;
    
    if (current) {
      return `${startStr} - Present`;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      const endStr = `${end.toLocaleString('en-US', { month: 'short' })} ${end.getFullYear()}`;
      return `${startStr} - ${endStr}`;
    }
    
    return startStr;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if AI service is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key';
  }
}

export const aiService = new AIService();
