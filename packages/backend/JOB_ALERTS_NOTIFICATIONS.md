# Job Alerts and Notifications System

This document describes the job alerts and notifications system implementation for the GiveMeJobs platform.

## Overview

The system provides:
- **Job Alerts**: Users can create custom alerts based on job criteria
- **Background Processing**: Automated job matching and alert triggering
- **Email Notifications**: Email alerts for daily and weekly frequencies
- **Real-time Notifications**: WebSocket-based in-app notifications
- **Notification Management**: Full CRUD operations for alerts and notifications

## Architecture

### Components

1. **Job Alert Service** (`job-alert.service.ts`)
   - CRUD operations for job alerts
   - Notification management
   - Database interactions

2. **Job Alert Processor** (`job-alert-processor.service.ts`)
   - Background job processing
   - Job matching logic
   - Alert triggering based on frequency

3. **Scheduler Service** (`scheduler.service.ts`)
   - Scheduled job execution
   - Frequency-based processing (realtime, daily, weekly)

4. **Email Service** (`email.service.ts`)
   - Email template rendering
   - Job alert email delivery
   - SendGrid/SMTP integration

5. **WebSocket Service** (`websocket.service.ts`)
   - Real-time notification delivery
   - Socket.IO integration
   - User connection management

## Database Schema

### job_alerts Table
```sql
CREATE TABLE job_alerts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  criteria JSONB NOT NULL,
  frequency VARCHAR(20) CHECK (frequency IN ('realtime', 'daily', 'weekly')),
  active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Job Alerts

#### Create Job Alert
```
POST /api/jobs/alerts
Authorization: Bearer <token>

Body:
{
  "name": "Senior Developer Jobs",
  "criteria": {
    "keywords": ["senior", "developer"],
    "locations": ["New York", "Remote"],
    "jobTypes": ["full-time"],
    "remoteTypes": ["remote", "hybrid"],
    "salaryMin": 100000,
    "minMatchScore": 70
  },
  "frequency": "daily"
}
```

#### Get All Job Alerts
```
GET /api/jobs/alerts?active=true
Authorization: Bearer <token>
```

#### Get Job Alert by ID
```
GET /api/jobs/alerts/:id
Authorization: Bearer <token>
```

#### Update Job Alert
```
PUT /api/jobs/alerts/:id
Authorization: Bearer <token>

Body:
{
  "name": "Updated Alert Name",
  "active": false
}
```

#### Delete Job Alert
```
DELETE /api/jobs/alerts/:id
Authorization: Bearer <token>
```

### Notifications

#### Get Notifications
```
GET /api/notifications?unread=true&limit=50
Authorization: Bearer <token>
```

#### Get Unread Count
```
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

#### Mark Notification as Read
```
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Mark All Notifications as Read
```
PATCH /api/notifications/read-all
Authorization: Bearer <token>
```

#### Delete Notification
```
DELETE /api/notifications/:id
Authorization: Bearer <token>
```

## Background Processing

### Alert Frequencies

1. **Realtime Alerts**
   - Processed every hour
   - Checks for jobs posted in the last hour
   - In-app notifications only (no email)

2. **Daily Alerts**
   - Processed once per day at 9 AM
   - Checks for jobs posted in the last 24 hours
   - Sends email + in-app notification

3. **Weekly Alerts**
   - Processed once per week on Monday at 9 AM
   - Checks for jobs posted in the last 7 days
   - Sends email + in-app notification

### Processing Flow

```
1. Scheduler triggers alert processing
2. Fetch all active alerts for the frequency
3. For each alert:
   a. Check if should trigger (based on last_triggered)
   b. Search for matching jobs
   c. Filter jobs posted after last trigger
   d. Create in-app notification
   e. Send email (for daily/weekly)
   f. Update last_triggered timestamp
```

## WebSocket Integration

### Client Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Update UI with new notification
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### Events

- `connected`: Sent when client successfully connects
- `notification`: Sent when a new notification is created
- `notification:read`: Client can emit to acknowledge reading

## Email Templates

### Job Alert Email

The system sends HTML emails with:
- Personalized greeting
- Alert name
- List of matching jobs (up to 5)
- Job details (title, company, location)
- Links to view jobs
- Manage alerts link

### Configuration

Set environment variables:
```bash
# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@givemejobs.com

# Frontend URL for links
FRONTEND_URL=http://localhost:3000
```

## Testing

### Run Migrations
```bash
npm run migrate:up
```

### Test Alert Processing
```bash
# The scheduler starts automatically with the server
npm run dev

# Or manually trigger processing via API (add admin endpoint if needed)
```

### Test WebSocket Connection
```bash
# Use a WebSocket client or browser console
const socket = io('http://localhost:5000', {
  auth: { token: 'your-token' }
});
```

## Performance Considerations

1. **Database Indexes**
   - Indexes on `user_id`, `active`, `created_at`
   - Composite index on `(user_id, active)`

2. **Job Matching**
   - Limited to 20 jobs per alert
   - Cached job search results
   - Efficient date filtering

3. **WebSocket Scaling**
   - Use Redis adapter for multi-server deployments
   - Track user connections in memory
   - Graceful disconnect handling

4. **Email Rate Limiting**
   - Respect SendGrid rate limits
   - Batch email sending for multiple alerts
   - Retry logic for failed sends

## Future Enhancements

1. **Advanced Matching**
   - ML-based job recommendations
   - Semantic search integration
   - User feedback loop

2. **Notification Preferences**
   - Per-alert email preferences
   - Quiet hours configuration
   - Notification grouping

3. **Analytics**
   - Alert effectiveness tracking
   - Click-through rates
   - Job application conversion

4. **Mobile Push Notifications**
   - FCM/APNS integration
   - Mobile app support

## Troubleshooting

### Alerts Not Triggering
- Check scheduler is running
- Verify alert `active` status
- Check `last_triggered` timestamp
- Review job search results

### WebSocket Connection Issues
- Verify JWT token is valid
- Check CORS configuration
- Ensure Socket.IO client version matches server

### Email Not Sending
- Verify SendGrid API key
- Check email service logs
- Test with Ethereal email in development

## Dependencies

```json
{
  "socket.io": "^4.7.0",
  "nodemailer": "^7.0.9"
}
```

Install dependencies:
```bash
npm install socket.io
```
