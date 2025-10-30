# Analytics & Insights UI - Visual Overview

## Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Analytics & Insights                    [Week][Month][Quarter][Year] │
│ Track your job search performance and get actionable insights   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │   📄     │ │   ✉️     │ │   👥     │ │   ✓     │ │   ⏰     │ │   ⚡     │ │
│ │   150    │ │  45.2%   │ │  32.1%   │ │  12.5%   │ │  7 days  │ │    23    │ │
│ │Applications│ │Response  │ │Interview │ │  Offer   │ │Avg Time  │ │  Active  │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     Trends Over Time                            │
│                                                                 │
│ ┌─────────────────────────┐ ┌─────────────────────────┐        │
│ │ Applications Sent  ↑5.2%│ │ Response Rate     ↓2.1% │        │
│ │                         │ │                         │        │
│ │      📈 Line Chart      │ │      📈 Line Chart      │        │
│ │                         │ │                         │        │
│ └─────────────────────────┘ └─────────────────────────┘        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                  Insights & Recommendations                     │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ✓ Excellent Response Rate                                   │ │
│ │   Your response rate of 45.2% is well above average!        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⚠ Low Interview Conversion                                  │ │
│ │   Only 32.1% of applications lead to interviews             │ │
│ │   💡 Recommendation: Review your skill score and add more   │ │
│ │      relevant skills to your profile                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Benchmark Comparison                         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Your Percentile Ranking                            75th     │ │
│ │ Based on response rate                                      │ │
│ │ ████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ Great! You're performing better than most                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Your Performance vs Platform Average                        │ │
│ │                                                             │ │
│ │ Response Rate                              [Above Average]  │ │
│ │ You  ████████████████████████████ 45.2%                    │ │
│ │ Avg  ████████████████████ 35.0%                            │ │
│ │ ↑ 29.1% better than average                                │ │
│ │                                                             │ │
│ │ Interview Rate                             [Average]        │ │
│ │ You  ████████████████ 32.1%                                │ │
│ │ Avg  ███████████████ 30.0%                                 │ │
│ │ → On par with average                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│ │ Strengths│ │ Average  │ │ Improve  │                        │
│ │    2     │ │    1     │ │    0     │                        │
│ └──────────┘ └──────────┘ └──────────┘                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      Export Analytics                           │
│                                                                 │
│ Select Time Period                                              │
│ [Last Week] [Last Month] [Last Quarter] [Last Year]            │
│                                                                 │
│ Export Format                                                   │
│ ┌─────────────────────────┐ ┌─────────────────────────┐        │
│ │ 📊 Export as CSV        │ │ 📄 Export as PDF        │        │
│ │ Spreadsheet format      │ │ Professional report     │        │
│ └─────────────────────────┘ └─────────────────────────┘        │
│                                                                 │
│ ℹ️ What's included in the export?                              │
│ • All key metrics (applications, response rates, etc.)         │
│ • Trend data for the selected time period                      │
│ • Benchmark comparisons with platform averages                 │
│ • PDF exports include visual charts and graphs                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Header Section
- Page title and description
- Period selector (Week/Month/Quarter/Year)
- Active period highlighted in blue

### 2. Metrics Cards (6 cards in responsive grid)
- Applications Sent (Blue)
- Response Rate (Green)
- Interview Rate (Purple)
- Offer Rate (Yellow)
- Avg Response Time (Indigo)
- Active Applications (Pink)

Each card shows:
- Icon
- Large value
- Label
- Description

### 3. Trend Charts
- 2-column responsive grid
- Line charts with SVG
- Trend indicators (↑↓→)
- Percentage change
- Date labels on X-axis
- Value labels on Y-axis

### 4. Insights Panel
- Color-coded insight cards:
  - Green: Success insights
  - Yellow: Warning insights
  - Blue: Info insights
- Each insight includes:
  - Icon
  - Title
  - Description
  - Recommendation (if actionable)

### 5. Benchmark Comparison
- Percentile ranking card with progress bar
- Comparison section with:
  - Metric name
  - Performance badge
  - Side-by-side bars (You vs Average)
  - Difference indicator
- Performance summary cards (Strengths/Average/Improve)

### 6. Export Panel
- Period selector buttons
- Format selection cards (CSV/PDF)
- Loading state
- Information box

## Color Scheme

### Primary Colors
- Blue (#3b82f6): Primary actions, user data
- Gray (#6b7280): Platform averages, neutral elements

### Status Colors
- Green (#10b981): Success, above average
- Red (#ef4444): Warnings, below average
- Yellow (#f59e0b): Offers, cautions
- Purple (#8b5cf6): Interviews
- Indigo (#6366f1): Time-based metrics
- Pink (#ec4899): Active items

## Responsive Behavior

### Desktop (lg+)
- 3-column grid for metrics cards
- 2-column grid for trend charts
- Full-width insights and benchmarks

### Tablet (md)
- 2-column grid for metrics cards
- 2-column grid for trend charts
- Full-width insights and benchmarks

### Mobile (sm)
- 1-column grid for all components
- Stacked layout
- Horizontal scroll for charts if needed

## Interactive Elements

### Buttons
- Period selector: Toggle between time periods
- Export buttons: Trigger download
- Dismiss button: Clear error messages

### Visual Feedback
- Hover effects on cards and buttons
- Loading spinners during data fetch
- Smooth transitions on data updates
- Animated progress bars

## Empty States

### No Data
- Icon illustration
- Helpful message
- Call to action

### Loading
- Centered spinner
- Loading message

### Error
- Error icon
- Error message
- Dismiss button

## Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly
