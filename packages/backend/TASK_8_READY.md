# Task 8: Job Alerts and Notifications System - Ready to Start

## Overview

Build a comprehensive job alerts and notifications system that allows users to create custom job alerts and receive notifications when matching jobs are found.

## Subtasks

### 8.1 Create job alert management endpoints
- Implement CRUD operations for job alerts
- Add alert criteria validation
- Store alert preferences in database
- **Requirements:** 3.6

### 8.2 Implement background job for alert processing
- Create scheduled job to check for new matching jobs
- Compare new jobs against user alert criteria
- Use job matching algorithm from Task 7
- **Requirements:** 3.6

### 8.3 Add email notification service
- Integrate email service (SendGrid or AWS SES)
- Create email templates for job alerts
- Send notifications when matching jobs are found
- **Requirements:** 3.6

### 8.4 Write tests for alert system
- Test alert creation and management
- Test background job processing
- Test email notification sending
- **Requirements:** 3.6

## Prerequisites (Already Complete)

✅ Task 7 - Job matching algorithm is implemented  
✅ Task 6 - Job aggregation service is ready  
✅ Task 3 - Email service foundation exists  
✅ Database schemas are in place

## Database Schema Needed

You'll need to create a new table for job alerts:

```sql
CREATE TABLE job_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  criteria JSONB NOT NULL, -- Search criteria (keywords, location, etc.)
  frequency VARCHAR(50) NOT NULL, -- 'immediate', 'daily', 'weekly'
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_alerts_user_id ON job_alerts(user_id);
CREATE INDEX idx_job_alerts_active ON job_alerts(is_active);
```

## API Endpoints to Implement

### Alert Management
- `POST /api/alerts` - Create new job alert
- `GET /api/alerts` - Get user's job alerts
- `GET /api/alerts/:id` - Get specific alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert
- `POST /api/alerts/:id/toggle` - Enable/disable alert

### Alert Processing (Background)
- Scheduled job that runs periodically
- Checks for new jobs matching alert criteria
- Sends notifications to users

## Technology Stack

### Email Service Options
1. **SendGrid** (Recommended)
   - Easy integration
   - Good free tier
   - Reliable delivery

2. **AWS SES**
   - Cost-effective
   - Requires AWS account
   - Good for high volume

### Background Job Processing
1. **Node-cron** (Simple)
   - Easy to set up
   - Good for basic scheduling

2. **Bull** (Advanced)
   - Redis-based queue
   - Better for production
   - Retry logic built-in

## Implementation Approach

### Phase 1: Alert Management (8.1)
1. Create migration for job_alerts table
2. Create alert types and validators
3. Implement alert service with CRUD operations
4. Create alert controller and routes
5. Add authentication middleware

### Phase 2: Background Processing (8.2)
1. Set up job scheduler (node-cron or Bull)
2. Implement alert checking logic
3. Use job matching service to find matches
4. Track last checked timestamp
5. Handle errors and retries

### Phase 3: Email Notifications (8.3)
1. Set up email service integration
2. Create email templates (HTML + text)
3. Implement notification sending logic
4. Add unsubscribe functionality
5. Track notification history

### Phase 4: Testing (8.4)
1. Write unit tests for alert service
2. Write integration tests for endpoints
3. Test background job processing
4. Test email sending (use mock in tests)

## Existing Code to Leverage

### From Task 3 (Auth Service)
- Email service foundation in `src/services/email.service.ts`
- Can extend for job alert emails

### From Task 7 (Job Matching)
- `jobMatchingService.calculateMatchScore()` - Calculate match scores
- `jobMatchingService.getJobRecommendations()` - Get matching jobs

### From Task 6 (Job Aggregation)
- `jobService.searchJobs()` - Search for jobs
- Job data is already normalized and stored

## Configuration Needed

### Environment Variables
```env
# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@givemejobs.com

# Alert Processing
ALERT_CHECK_INTERVAL=3600000  # 1 hour in milliseconds
ALERT_BATCH_SIZE=100          # Process 100 alerts at a time
```

## Success Criteria

✅ Users can create, read, update, and delete job alerts  
✅ Alerts support various criteria (keywords, location, salary, etc.)  
✅ Background job runs on schedule and finds matching jobs  
✅ Email notifications are sent when matches are found  
✅ Users can control notification frequency  
✅ All endpoints are tested and working  
✅ Email templates are professional and mobile-friendly

## Estimated Complexity

- **8.1 Alert Management:** Medium (2-3 hours)
- **8.2 Background Processing:** Medium-High (3-4 hours)
- **8.3 Email Notifications:** Medium (2-3 hours)
- **8.4 Testing:** Medium (2-3 hours)

**Total:** ~10-13 hours

## Ready to Start?

All prerequisites are complete. You can start with Task 8.1 (Create job alert management endpoints).

Would you like to begin implementing Task 8.1?
