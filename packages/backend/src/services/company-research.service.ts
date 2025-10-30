import { aiService } from './ai.service';

/**
 * Company Research Service
 * Aggregates company information for interview preparation
 */
export class CompanyResearchService {
  /**
   * Research company information
   */
  async researchCompany(params: {
    companyName: string;
    industry?: string;
    jobTitle?: string;
  }): Promise<{
    overview: string;
    culture: string;
    values: string[];
    recentNews: string[];
    interviewTips: string[];
    commonQuestions: string[];
  }> {
    try {
      // Use AI to generate company research based on available information
      const research = await this.generateCompanyResearch(params);
      
      return research;
    } catch (error) {
      console.error('Error researching company:', error);
      throw new Error('Failed to research company');
    }
  }

  /**
   * Generate company research using AI
   */
  private async generateCompanyResearch(params: {
    companyName: string;
    industry?: string;
    jobTitle?: string;
  }): Promise<any> {
    const prompt = `You are a career research expert. Provide comprehensive company research for interview preparation.

Company: ${params.companyName}
${params.industry ? `Industry: ${params.industry}` : ''}
${params.jobTitle ? `Position: ${params.jobTitle}` : ''}

Generate a comprehensive company research report with:

1. COMPANY OVERVIEW:
   - Brief description of the company
   - What they do and their market position
   - Size and scale

2. COMPANY CULTURE:
   - Work environment and culture
   - Employee experience
   - Work-life balance reputation

3. CORE VALUES:
   - 3-5 key company values
   - What they prioritize

4. RECENT NEWS & ACHIEVEMENTS:
   - Recent company news (if known)
   - Major achievements or milestones
   - Growth trajectory

5. INTERVIEW TIPS:
   - 5 specific tips for interviewing at this company
   - What they look for in candidates
   - How to stand out

6. COMMON INTERVIEW QUESTIONS:
   - 5 questions commonly asked at this company
   - Company-specific scenarios

Return ONLY valid JSON in this format:
{
  "overview": "Company description",
  "culture": "Culture description",
  "values": ["value1", "value2", "value3"],
  "recentNews": ["news1", "news2", "news3"],
  "interviewTips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "commonQuestions": ["question1", "question2", "question3", "question4", "question5"]
}`;

    try {
      const response = await aiService['callOpenAIWithRetry'](prompt, {
        temperature: 0.6,
        maxTokens: 2000,
      });

      const parsed = JSON.parse(response);
      
      // Validate structure
      if (!parsed.overview || !parsed.culture || !parsed.values) {
        throw new Error('Invalid company research response');
      }

      return parsed;
    } catch (error) {
      console.error('Error generating company research:', error);
      throw new Error('Failed to generate company research');
    }
  }

  /**
   * Get company culture insights
   */
  async getCompanyCulture(companyName: string): Promise<{
    culture: string;
    values: string[];
    workEnvironment: string;
  }> {
    const prompt = `Provide insights about ${companyName}'s company culture.

Return ONLY valid JSON:
{
  "culture": "Brief culture description",
  "values": ["value1", "value2", "value3"],
  "workEnvironment": "Work environment description"
}`;

    try {
      const response = await aiService['callOpenAIWithRetry'](prompt, {
        temperature: 0.5,
        maxTokens: 800,
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error getting company culture:', error);
      throw new Error('Failed to get company culture');
    }
  }

  /**
   * Get company-specific interview questions
   */
  async getCompanyInterviewQuestions(params: {
    companyName: string;
    jobTitle: string;
  }): Promise<string[]> {
    const prompt = `Generate 5 company-specific interview questions for ${params.jobTitle} position at ${params.companyName}.

These should be questions that are unique to this company's culture, values, or business model.

Return ONLY valid JSON:
{
  "questions": ["question1", "question2", "question3", "question4", "question5"]
}`;

    try {
      const response = await aiService['callOpenAIWithRetry'](prompt, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      const parsed = JSON.parse(response);
      return parsed.questions || [];
    } catch (error) {
      console.error('Error getting company questions:', error);
      throw new Error('Failed to get company questions');
    }
  }
}

export const companyResearchService = new CompanyResearchService();
