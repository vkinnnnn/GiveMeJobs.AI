# Analytics and Insights Service

## Overview

The Analytics and Insights Service provides comprehensive analytics, insights generation, benchmarking, and data export capabilities for the GiveMeJobs platform.

## Features Implemented

### 1. Analytics Dashboard Endpoint
**Endpoint:** `GET /api/analytics/dashboard?period=month`

Provides comprehensive analytics including:
- **Key Metrics:**
  - Applications sent
  - Response rate (%)
  - Interview rate (%)
  - Offer rate (%)
  - Average response time (days)
  - Active applications count

- **Trend Data:**
  - Applications sent over time
  - Response rate trends
  - Interview rate trends
  - Percentage change and direction (up/down/stable)

- **Insights:**
  - Automatically generated actionable insights
  - Performance warnings and recommendations
  - Success celebrations

**Query Parameters:**
- `period`: `week`, `month`, `quarter`, or `year` (default: `month`)

### 2. Insights Generation
The service automatically analyzes user data to generate actionable insights:

**Basic Insights:**
- Low response rate warnings
- High response rate celebrations
- Slow response time notifications
- Low interview conversion warnings
- Activity trend analysis
- Pipeline health status

**Advanced Pattern Analysis:**
- **Best Days to Apply:** Identifies which days of the week yield the highest response rates
- **Responsive Companies:** Identifies companies that respond most frequently
- **Skill Match Patterns:** Analyzes correlation between skill match and success rates

### 3. Benchmark Comparison
**Endpoint:** `GET /api/analytics/benchmarks`

Compares user metrics against platform-wide averages:
- Response rate comparison
- Interview rate comparison
- Offer rate comparison
- Percentile ranking
- Performance indicators (above/below/average)

### 4. Application Analytics
**Endpoint:** `GET /api/analytics/applications`

Provides detailed application analytics:
- **Best days to apply:** Top 3 days with highest response rates
- **Most responsive companies:** Top 5 companies that respond most frequently
- **Average time to response:** Breakdown by application status
- **Success rate by industry:** Performance across different industries
- **Highest converting resume formats:** Most successful resume templates

### 5. Analytics Export
**Endpoint:** `POST /api/analytics/export`

Export analytics data in multiple formats:

**CSV Export:**
- Application ID
- Job title
- Company
- Location
- Status
- Applied date
- Last updated
- Application method
- Response time (days)

**PDF Export:**
- Summary statistics
- Key metrics with percentages
- Recent applications list
- Professional formatting
- Generated timestamp

**Request Body:**
```json
{
  "format": "csv" | "pdf",
  "period": "week" | "month" | "quarter" | "year",
  "includeCharts": true
}
```

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/analytics/dashboard` | Get analytics dashboard with metrics, trends, and insights | Yes |
| GET | `/api/analytics/benchmarks` | Get benchmark comparison with platform averages | Yes |
| GET | `/api/analytics/applications` | Get detailed application analytics | Yes |
| POST | `/api/analytics/export` | Export analytics data to CSV or PDF | Yes |

## Files Created

1. **Types:**
   - `src/types/analytics.types.ts` - Type definitions for analytics

2. **Services:**
   - `src/services/analytics.service.ts` - Core analytics logic
   - `src/services/analytics-export.service.ts` - Export functionality

3. **Controllers:**
   - `src/controllers/analytics.controller.ts` - Request handlers

4. **Routes:**
   - `src/routes/analytics.routes.ts` - Route definitions

## Usage Examples

### Get Dashboard Analytics
```typescript
GET /api/analytics/dashboard?period=month
Authorization: Bearer <token>

Response:
{
  "userId": "...",
  "period": "month",
  "metrics": {
    "applicationsSent": 25,
    "responseRate": 32.0,
    "interviewRate": 16.0,
    "offerRate": 4.0,
    "averageResponseTime": 12.5,
    "activeApplications": 15
  },
  "trends": [...],
  "insights": [...]
}
```

### Get Benchmarks
```typescript
GET /api/analytics/benchmarks
Authorization: Bearer <token>

Response:
{
  "userMetrics": {...},
  "platformAverage": {...},
  "percentile": 65,
  "comparison": [...]
}
```

### Export to CSV
```typescript
POST /api/analytics/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "csv",
  "period": "quarter"
}

Response: CSV file download
```

### Export to PDF
```typescript
POST /api/analytics/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "pdf",
  "period": "month"
}

Response: PDF file download
```

## Requirements Addressed

- **Requirement 11.1:** Calculate key metrics (applications sent, response rate, interview rate)
- **Requirement 11.2:** Generate trend data for time periods
- **Requirement 11.3:** Analyze user data to identify patterns and generate actionable insights
- **Requirement 11.4:** Calculate platform-wide averages and compare user metrics to benchmarks
- **Requirement 11.6:** Generate CSV and PDF reports of job search activity
- **Requirement 11.7:** Generate actionable insights and recommendations

## Technical Details

### Database Queries
- Optimized queries with filters and aggregations
- Uses PostgreSQL window functions for trend analysis
- Efficient joins with jobs table for company/industry data
- Proper indexing on `user_id`, `applied_date`, and `status` columns

### Performance Considerations
- Date range filtering to limit data volume
- Aggregation at database level
- Minimal data transfer
- Streaming for PDF generation

### Security
- All endpoints require JWT authentication
- User data isolation (queries filtered by `user_id`)
- Input validation for period and format parameters

## Future Enhancements

1. **Charts in PDF:** Add visual charts to PDF exports
2. **Custom Date Ranges:** Allow users to specify custom date ranges
3. **Email Reports:** Schedule automated email reports
4. **More Insights:** Add ML-based predictive insights
5. **Industry Benchmarks:** Compare against industry-specific averages
6. **A/B Testing:** Track effectiveness of different application strategies
