'use client';

import { Application } from '@/stores/applications.store';

interface ApplicationTrendsProps {
  applications: Application[];
}

export function ApplicationTrends({ applications }: ApplicationTrendsProps) {
  // Calculate weekly trends
  const getWeeklyTrends = () => {
    const now = new Date();
    const weeks = 8; // Show last 8 weeks
    const weeklyData: { week: string; count: number }[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const count = applications.filter((app) => {
        const appDate = new Date(app.appliedDate);
        return appDate >= weekStart && appDate < weekEnd;
      }).length;

      const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      weeklyData.push({ week: weekLabel, count });
    }

    return weeklyData;
  };

  const weeklyTrends = getWeeklyTrends();
  const maxCount = Math.max(...weeklyTrends.map((d) => d.count), 1);

  // Calculate conversion funnel
  const getFunnelData = () => {
    const total = applications.length;
    const screening = applications.filter(
      (app) =>
        app.status === 'screening' ||
        app.status === 'interview_scheduled' ||
        app.status === 'interview_completed' ||
        app.status === 'offer_received' ||
        app.status === 'accepted'
    ).length;
    const interviews = applications.filter(
      (app) =>
        app.status === 'interview_scheduled' ||
        app.status === 'interview_completed' ||
        app.status === 'offer_received' ||
        app.status === 'accepted'
    ).length;
    const offers = applications.filter(
      (app) => app.status === 'offer_received' || app.status === 'accepted'
    ).length;
    const accepted = applications.filter((app) => app.status === 'accepted').length;

    return [
      { stage: 'Applied', count: total, percentage: 100 },
      {
        stage: 'Screening',
        count: screening,
        percentage: total > 0 ? (screening / total) * 100 : 0,
      },
      {
        stage: 'Interview',
        count: interviews,
        percentage: total > 0 ? (interviews / total) * 100 : 0,
      },
      { stage: 'Offer', count: offers, percentage: total > 0 ? (offers / total) * 100 : 0 },
      {
        stage: 'Accepted',
        count: accepted,
        percentage: total > 0 ? (accepted / total) * 100 : 0,
      },
    ];
  };

  const funnelData = getFunnelData();

  return (
    <div className="space-y-6">
      {/* Weekly Application Trend */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Application Activity (Last 8 Weeks)
        </h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {weeklyTrends.map((data, index) => {
            const height = (data.count / maxCount) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center h-40">
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-all relative group"
                    style={{ height: `${height}%`, minHeight: data.count > 0 ? '8px' : '0' }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {data.count} application{data.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-600 mt-2">{data.week}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {funnelData.map((stage, index) => {
            const colors = [
              'bg-blue-500',
              'bg-blue-600',
              'bg-purple-500',
              'bg-green-500',
              'bg-green-600',
            ];
            return (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                  <span className="text-sm text-gray-600">
                    {stage.count} ({stage.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 flex items-center">
                  <div
                    className={`${colors[index]} h-8 rounded-full transition-all duration-500 flex items-center justify-center text-white text-xs font-medium`}
                    style={{ width: `${stage.percentage}%`, minWidth: stage.count > 0 ? '40px' : '0' }}
                  >
                    {stage.count > 0 && stage.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Insights</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {funnelData[1].percentage > 0 && (
              <li>
                • {funnelData[1].percentage.toFixed(0)}% of applications reach screening stage
              </li>
            )}
            {funnelData[2].percentage > 0 && (
              <li>
                • {funnelData[2].percentage.toFixed(0)}% of applications result in interviews
              </li>
            )}
            {funnelData[3].percentage > 0 && (
              <li>• {funnelData[3].percentage.toFixed(0)}% of applications receive offers</li>
            )}
            {funnelData[4].percentage > 0 && (
              <li>• {funnelData[4].percentage.toFixed(0)}% of applications are accepted</li>
            )}
            {applications.length === 0 && (
              <li>• Start applying to jobs to see your conversion metrics</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
