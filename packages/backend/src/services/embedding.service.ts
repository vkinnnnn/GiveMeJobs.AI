import OpenAI from 'openai';

export class EmbeddingService {
  private openai: OpenAI;
  private model = 'text-embedding-ada-002';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate embedding for a text string
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Create a text representation of a job for embedding
   */
  createJobText(job: {
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    location?: string;
    industry?: string;
  }): string {
    const parts = [
      `Title: ${job.title}`,
      `Company: ${job.company}`,
      job.location ? `Location: ${job.location}` : '',
      job.industry ? `Industry: ${job.industry}` : '',
      `Description: ${job.description}`,
      job.requirements.length > 0 ? `Requirements: ${job.requirements.join(', ')}` : '',
      job.responsibilities.length > 0 ? `Responsibilities: ${job.responsibilities.join(', ')}` : '',
    ];

    return parts.filter(Boolean).join('\n');
  }

  /**
   * Create a text representation of a user profile for embedding
   */
  createProfileText(profile: {
    skills: Array<{ name: string; proficiencyLevel: number; yearsOfExperience: number }>;
    experience: Array<{ title: string; company: string; description: string; skills: string[] }>;
    education: Array<{ degree: string; fieldOfStudy: string; institution: string }>;
    careerGoals?: Array<{ targetRole: string }>;
  }): string {
    const parts = [
      // Skills section
      profile.skills.length > 0
        ? `Skills: ${profile.skills
            .map((s) => `${s.name} (${s.yearsOfExperience} years, level ${s.proficiencyLevel})`)
            .join(', ')}`
        : '',
      
      // Experience section
      profile.experience.length > 0
        ? `Experience: ${profile.experience
            .map((e) => `${e.title} at ${e.company}. ${e.description}. Skills: ${e.skills.join(', ')}`)
            .join(' | ')}`
        : '',
      
      // Education section
      profile.education.length > 0
        ? `Education: ${profile.education
            .map((e) => `${e.degree} in ${e.fieldOfStudy} from ${e.institution}`)
            .join(', ')}`
        : '',
      
      // Career goals
      profile.careerGoals && profile.careerGoals.length > 0
        ? `Career Goals: ${profile.careerGoals.map((g) => g.targetRole).join(', ')}`
        : '',
    ];

    return parts.filter(Boolean).join('\n');
  }
}

export const embeddingService = new EmbeddingService();
