'use client';

interface SkillScore {
  userId: string;
  overallScore: number;
  lastCalculated: Date;
  breakdown: {
    technicalSkills: number;
    experience: number;
    education: number;
    certifications: number;
    projectPortfolio: number;
    endorsements: number;
  };
}

interface SkillScoreWidgetProps {
  skillScore: SkillScore;
}

export function SkillScoreWidget({ skillScore }: SkillScoreWidgetProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const breakdownItems = [
    { label: 'Technical Skills', value: skillScore.breakdown.technicalSkills, weight: '30%' },
    { label: 'Experience', value: skillScore.breakdown.experience, weight: '25%' },
    { label: 'Education', value: skillScore.breakdown.education, weight: '15%' },
    { label: 'Certifications', value: skillScore.breakdown.certifications, weight: '15%' },
    { label: 'Portfolio', value: skillScore.breakdown.projectPortfolio, weight: '10%' },
    { label: 'Endorsements', value: skillScore.breakdown.endorsements, weight: '5%' },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Skill Score</h2>
      
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          <svg className="w-48 h-48 transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - skillScore.overallScore / 100)}`}
              className={getScoreColor(skillScore.overallScore)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getScoreColor(skillScore.overallScore)}`}>
              {Math.round(skillScore.overallScore)}
            </span>
            <span className="text-sm text-gray-600 mt-1">
              {getScoreLabel(skillScore.overallScore)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Score Breakdown
        </h3>
        {breakdownItems.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">
                {item.label} <span className="text-gray-500">({item.weight})</span>
              </span>
              <span className="font-medium text-gray-900">{Math.round(item.value)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  item.value >= 80
                    ? 'bg-green-600'
                    : item.value >= 60
                    ? 'bg-blue-600'
                    : item.value >= 40
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Last updated: {new Date(skillScore.lastCalculated).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
