# Analytics Components

This directory contains all components related to the analytics and insights dashboard for the GiveMeJobs platform.

## Components

### MetricsCards
Displays key performance metrics in card format:
- Applications Sent
- Response Rate
- Interview Rate
- Offer Rate
- Average Response Time
- Active Applications

Each card includes an icon, value, label, and description.

### TrendCharts
Visualizes metric trends over time using SVG line charts:
- Applications Sent trend
- Response Rate trend
- Interview Rate trend

Features:
- Interactive line charts with data points
- Trend direction indicators (up/down/stable)
- Percentage change calculations
- Responsive grid layout

### InsightsPanel
Displays AI-generated insights and recommendations:
- Success insights (green)
- Warning insights (yellow)
- Info insights (blue)

Each insight includes:
- Type-specific icon and color scheme
- Title and description
- Actionable recommendations (when applicable)

### BenchmarkComparison
Compares user performance against platform averages:
- Percentile ranking with visual indicator
- Side-by-side comparison bars for each metric
- Performance badges (Above/Below/Average)
- Performance indicators summary

Features:
- Color-coded percentile ranking
- Animated comparison bars
- Difference calculations
- Performance summary cards

### ExportPanel
Provides analytics export functionality:
- Date range selector (Week/Month/Quarter/Year)
- Export format options (CSV/PDF)
- Loading states
- Information about export contents

## Store

### useAnalyticsStore
Zustand store for analytics state management:

**State:**
- `dashboard`: Analytics dashboard data
- `benchmarks`: Benchmark comparison data
- `loading`: Loading state
- `error`: Error message

**Actions:**
- `fetchDashboard(period)`: Fetch analytics dashboard
- `fetchBenchmarks()`: Fetch benchmark comparison
- `exportAnalytics(format, period)`: Export analytics data
- `clearError()`: Clear error state

## Usage

```tsx
import { useAnalyticsStore } from '@/stores/analytics.store';
import { 
  MetricsCards, 
  TrendCharts, 
  InsightsPanel, 
  BenchmarkComparison,
  ExportPanel 
} from '@/components/analytics';

function AnalyticsPage() {
  const { dashboard, benchmarks, loading, fetchDashboard, fetchBenchmarks, exportAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchDashboard('month');
    fetchBenchmarks();
  }, []);

  return (
    <div>
      <MetricsCards metrics={dashboard.metrics} />
      <TrendCharts trends={dashboard.trends} />
      <InsightsPanel insights={dashboard.insights} />
      <BenchmarkComparison benchmarks={benchmarks} />
      <ExportPanel onExport={exportAnalytics} loading={loading} />
    </div>
  );
}
```

## API Integration

The components integrate with the following backend endpoints:

- `GET /api/analytics/dashboard?period={period}` - Fetch analytics dashboard
- `GET /api/analytics/benchmarks` - Fetch benchmark comparison
- `POST /api/analytics/export` - Export analytics data

## Styling

All components use Tailwind CSS for styling with:
- Consistent color schemes
- Responsive layouts
- Hover effects and transitions
- Accessibility-friendly contrast ratios

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 11.1**: Display key metrics (applications sent, response rate, interview rate)
- **Requirement 11.2**: Generate trend data for time periods
- **Requirement 11.3**: Display insights and recommendations
- **Requirement 11.4**: Compare user metrics to anonymized benchmarks
- **Requirement 11.6**: Export analytics data in CSV and PDF formats
