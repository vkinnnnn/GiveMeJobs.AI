import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // TODO: Integrate with OpenAI or your backend AI service
    // For now, we'll create a simple response handler
    const response = await generateResponse(message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateResponse(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // Simple pattern matching for common queries
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return `I can help you with:
- Finding job opportunities
- Tracking your applications
- Preparing for interviews
- Generating resumes and cover letters
- Career advice and tips
- Analyzing your job search progress

What would you like to know more about?`;
  }

  if (lowerMessage.includes('job') && (lowerMessage.includes('find') || lowerMessage.includes('search'))) {
    return 'I can help you find jobs! Try going to the Jobs page from the sidebar, or tell me what kind of position you\'re looking for and I\'ll search for you.';
  }

  if (lowerMessage.includes('resume') || lowerMessage.includes('cv')) {
    return 'I can help you create a professional resume! You can upload your current resume or create a new one from scratch. Would you like me to guide you through the process?';
  }

  if (lowerMessage.includes('interview')) {
    return 'Interview preparation is crucial! I can provide you with common interview questions, tips, and company-specific insights. Would you like to practice some interview questions?';
  }

  if (lowerMessage.includes('application') || lowerMessage.includes('apply')) {
    return 'I can help you track your job applications. You can view all your applications in the Applications Dashboard, where you can see their status and set reminders.';
  }

  if (lowerMessage.includes('profile')) {
    return 'Your profile is important! Make sure to keep your skills, experience, and preferences up to date. Would you like me to help you optimize your profile?';
  }

  // Default response
  return `I understand you're asking about "${message}". I'm here to help with your job search! You can ask me about:
- Finding jobs
- Application tracking
- Resume building
- Interview preparation
- Career advice

What would you like help with?`;
}
