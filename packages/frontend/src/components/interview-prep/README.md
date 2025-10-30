# Interview Preparation Components

This directory contains all components related to the Interview Preparation feature.

## Component Structure

```
interview-prep/
├── index.ts                      # Barrel export file
├── InterviewQuestions.tsx        # Display interview questions with answers
├── CompanyResearch.tsx           # Display company information and research
├── InterviewTips.tsx             # Display interview preparation tips
├── PracticeMode.tsx              # Modal for practicing interview questions
├── ResponseFeedback.tsx          # Display AI-generated feedback on responses
└── InterviewReminders.tsx        # Display upcoming interviews with countdown
```

## Component Descriptions

### InterviewQuestions
Displays interview questions grouped by category (behavioral, technical, situational, company-specific).

**Props:**
- `questions: InterviewQuestion[]` - Array of interview questions
- `onPractice?: (questionId: string) => void` - Callback when user wants to practice a question

**Features:**
- Expandable questions to show/hide answers
- Category and difficulty badges
- STAR framework breakdown for behavioral questions
- Key points highlighting
- Practice button for each question

### CompanyResearch
Displays comprehensive company research information.

**Props:**
- `research: CompanyResearch` - Company research data

**Features:**
- Company overview (industry, size)
- Company values and culture highlights
- Interview process description
- Recent news with links

### InterviewTips
Displays numbered interview preparation tips.

**Props:**
- `tips: string[]` - Array of tip strings

**Features:**
- Numbered list with visual indicators
- Clean, easy-to-read layout

### PracticeMode
Full-screen modal for practicing interview questions.

**Props:**
- `question: InterviewQuestion` - The question to practice
- `onSubmit: (response: string) => Promise<void>` - Callback to submit response
- `onClose: () => void` - Callback to close modal

**Features:**
- Timer tracking response duration
- Text area for typing responses
- Character and word count
- Key points reminder
- Practice tips
- Audio recording placeholder (future)

### ResponseFeedback
Displays detailed AI-generated feedback on practice responses.

**Props:**
- `analysis: ResponseAnalysis` - The analysis data
- `onClose: () => void` - Callback to close modal
- `onPracticeAgain?: () => void` - Callback to practice the same question again

**Features:**
- Overall score with visual indicator
- Score breakdown (clarity, relevance)
- STAR method usage indicator
- Strengths and areas for improvement
- Actionable suggestions
- Keywords covered
- Confidence indicators

### InterviewReminders
Displays upcoming interviews with countdown and preparation checklist.

**Props:**
- `applications: Application[]` - Array of applications
- `onPrepare?: (applicationId: string) => void` - Callback to prepare for specific interview

**Features:**
- Filters interviews within next 14 days
- Color-coded urgency (red/orange/yellow/blue)
- Countdown timer
- Interview date and time
- Preparation checklist
- Empty state for no upcoming interviews

## Usage Example

```tsx
import {
  InterviewQuestions,
  CompanyResearch,
  InterviewTips,
  PracticeMode,
  ResponseFeedback,
  InterviewReminders
} from '@/components/interview-prep';

// In your component
<InterviewQuestions 
  questions={interviewPrep.questions} 
  onPractice={handlePractice} 
/>

<CompanyResearch research={interviewPrep.companyResearch} />

<InterviewTips tips={interviewPrep.tips} />

{practiceQuestion && (
  <PracticeMode
    question={practiceQuestion}
    onSubmit={handleSubmit}
    onClose={handleClose}
  />
)}

{showFeedback && analysis && (
  <ResponseFeedback
    analysis={analysis}
    onClose={handleCloseFeedback}
    onPracticeAgain={handlePracticeAgain}
  />
)}

<InterviewReminders
  applications={applications}
  onPrepare={handlePrepare}
/>
```

## Styling

All components use Tailwind CSS for styling with consistent:
- Color schemes (blue for primary actions, green for success, red for urgency)
- Spacing and padding
- Border radius and shadows
- Responsive design patterns
- Hover and transition effects

## State Management

Components integrate with `useInterviewPrepStore` from `@/stores/interview-prep.store.ts` for:
- Fetching interview prep data
- Submitting practice responses
- Managing loading states
- Error handling
