'use client';

interface SkillScoreHistory {
  score: number;
  timestamp: Date;
  trigger: string;
}

interface SkillProgressChartProps {
  history: SkillScoreHistory[];
}

export function SkillProgressChart({ history }: SkillProgressChartProps) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress Tracking</h2>
        <p className="text-gray-500 text-center py-8">
          No progress history available yet. Keep updating your profile to track your growth!
        </p>
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const maxScore = Math.max(...sortedHistory.map((h) => h.score));
  const minScore = Math.min(...sortedHistory.map((h) => h.score));
  const scoreRange = maxScore - minScore || 10;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      profile_update: 'Profile Update',
      new_skill: 'New Skill',
      certification: 'Certification',
      experience_added: 'Experience Added',
    };
    return labels[trigger] || trigger;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Progress Tracking</h2>

      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line
                x1="0"
                y1={200 - (value * 2)}
                x2="800"
                y2={200 - (value * 2)}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="-5"
                y={200 - (value * 2) + 5}
                fontSize="12"
                fill="#6b7280"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          ))}

          {/* Line chart */}
          <polyline
            points={sortedHistory
              .map((item, index) => {
                const x = (index / (sortedHistory.length - 1)) * 800;
                const y = 200 - (item.score * 2);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {sortedHistory.map((item, index) => {
            const x = (index / (sortedHistory.length - 1)) * 800;
            const y = 200 - (item.score * 2);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="5"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Recent Updates
        </h3>
        <div className="space-y-2">
          {sortedHistory.slice(-5).reverse().map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <span className="text-gray-700">{getTriggerLabel(item.trigger)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{formatDate(item.timestamp)}</span>
                <span className="font-medium text-gray-900">{Math.round(item.score)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
