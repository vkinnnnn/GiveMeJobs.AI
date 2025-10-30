# Quick Start: Job Alerts & Notifications

## Installation

```bash
# Install new dependency
npm install socket.io

# Run database migration
npm run migrate:up
```

## Environment Variables

Add to `.env`:
```bash
# Email (optional - uses Ethereal in dev)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@givemejobs.com

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

## Usage Examples

### 1. Create a Job Alert

```bash
POST /api/jobs/alerts
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "Senior Developer Remote Jobs",
  "criteria": {
    "keywords": ["senior", "developer", "engineer"],
    "locations": ["Remote"],
    "remoteTypes": ["remote"],
    "jobTypes": ["full-time"],
    "salaryMin": 100000,
    "minMatchScore": 70
  },
  "frequency": "daily"
}
```

### 2. Get Your Alerts

```bash
GET /api/jobs/alerts
Authorization: Bearer <your-jwt-token>
```

### 3. Get Notifications

```bash
GET /api/notifications?unread=true
Authorization: Bearer <your-jwt-token>
```

### 4. WebSocket Connection (Frontend)

```javascript
import io from 'socket.io-client';

// Connect with JWT token
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('token')
  }
});

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Listen for new notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Update your UI
  showNotification(notification);
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

## Alert Frequencies

- **realtime**: Checked every hour, in-app notifications only
- **daily**: Checked at 9 AM daily, email + in-app notifications
- **weekly**: Checked Monday 9 AM, email + in-app notifications

## Testing

### Test Alert Creation
```bash
curl -X POST http://localhost:5000/api/jobs/alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Alert",
    "criteria": {
      "keywords": ["developer"]
    },
    "frequency": "daily"
  }'
```

### Test WebSocket
Open browser console:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_TOKEN' }
});

socket.on('notification', (data) => {
  console.log('Notification:', data);
});
```

## Troubleshooting

### Alerts Not Triggering
1. Check server logs for scheduler messages
2. Verify alert is `active: true`
3. Check `last_triggered` timestamp
4. Ensure jobs exist matching criteria

### WebSocket Not Connecting
1. Verify JWT token is valid
2. Check CORS settings in `index.ts`
3. Ensure Socket.IO client version matches server

### Emails Not Sending
1. Check `SENDGRID_API_KEY` is set
2. Review email service logs
3. In dev, check Ethereal preview URLs in logs

## Architecture

```
User Request → API Endpoint → Service Layer → Database
                                    ↓
                            WebSocket Service
                                    ↓
                            Connected Clients

Background:
Scheduler → Alert Processor → Job Matching → Notifications
                                    ↓
                            Email Service + WebSocket
```

## Files Overview

- `migrations/1697000000007_create-job-alerts.js` - Database schema
- `types/job-alert.types.ts` - TypeScript types
- `validators/job-alert.validators.ts` - Input validation
- `services/job-alert.service.ts` - CRUD operations
- `services/job-alert-processor.service.ts` - Background processing
- `services/scheduler.service.ts` - Job scheduling
- `services/websocket.service.ts` - Real-time notifications
- `services/email.service.ts` - Email notifications
- `controllers/job-alert.controller.ts` - API handlers
- `routes/job-alert.routes.ts` - Alert endpoints
- `routes/notification.routes.ts` - Notification endpoints

## Next Steps

1. ✅ System is ready to use
2. Create frontend components for alerts UI
3. Add user preferences for notification settings
4. Implement notification grouping
5. Add analytics for alert effectiveness
