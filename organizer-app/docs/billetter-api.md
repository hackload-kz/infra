# Billetter API Documentation

## Overview

The Billetter API provides comprehensive ticketing and registration management for hackathon events. This service handles participant registration, ticket validation, and event capacity management.

## Key Features

- **Multi-tier Registration**: Support for different participant categories
- **Capacity Management**: Automatic capacity tracking and waitlist management
- **QR Code Integration**: Generate and validate QR codes for check-in
- **Batch Operations**: Bulk registration and ticket management
- **Real-time Analytics**: Live registration statistics and reporting

## Authentication

All API requests require authentication using API keys:

```http
Authorization: Bearer {your-api-key}
Content-Type: application/json
```

## API Endpoints

### Registration Management

#### Create Registration
```http
POST /api/billetter/registrations
Content-Type: application/json

{
  "participantId": "participant-123",
  "eventId": "hackathon-2025",
  "ticketType": "standard",
  "metadata": {
    "teamName": "CodeCrafters",
    "dietary": "vegetarian"
  }
}
```

#### Get Registration Details
```http
GET /api/billetter/registrations/{registrationId}
```

#### Update Registration
```http
PUT /api/billetter/registrations/{registrationId}
Content-Type: application/json

{
  "ticketType": "premium",
  "metadata": {
    "dietary": "vegan"
  }
}
```

#### Cancel Registration
```http
DELETE /api/billetter/registrations/{registrationId}
```

### Ticket Management

#### Generate Ticket
```http
POST /api/billetter/tickets/generate
Content-Type: application/json

{
  "registrationId": "reg-123",
  "format": "qr_code"
}
```

#### Validate Ticket
```http
POST /api/billetter/tickets/validate
Content-Type: application/json

{
  "ticketCode": "QR123456789",
  "eventId": "hackathon-2025"
}
```

#### Bulk Ticket Operations
```http
POST /api/billetter/tickets/bulk
Content-Type: application/json

{
  "operation": "generate",
  "registrationIds": ["reg-123", "reg-124", "reg-125"],
  "format": "qr_code"
}
```

### Event Management

#### Get Event Capacity
```http
GET /api/billetter/events/{eventId}/capacity
```

#### Update Event Settings
```http
PUT /api/billetter/events/{eventId}/settings
Content-Type: application/json

{
  "maxCapacity": 500,
  "enableWaitlist": true,
  "registrationDeadline": "2025-03-01T23:59:59Z"
}
```

#### Get Registration Statistics
```http
GET /api/billetter/events/{eventId}/stats
```

## Response Formats

### Registration Response
```json
{
  "id": "reg-123",
  "participantId": "participant-123",
  "eventId": "hackathon-2025",
  "ticketType": "standard",
  "status": "confirmed",
  "registrationDate": "2025-01-15T10:30:00Z",
  "qrCode": "QR123456789",
  "metadata": {
    "teamName": "CodeCrafters",
    "dietary": "vegetarian"
  }
}
```

### Capacity Response
```json
{
  "eventId": "hackathon-2025",
  "maxCapacity": 500,
  "currentRegistrations": 347,
  "availableSpots": 153,
  "waitlistEnabled": true,
  "waitlistCount": 23
}
```

### Statistics Response
```json
{
  "eventId": "hackathon-2025",
  "totalRegistrations": 347,
  "confirmedAttendees": 298,
  "checkedInCount": 156,
  "ticketTypes": {
    "standard": 280,
    "premium": 67
  },
  "registrationTrend": [
    {"date": "2025-01-01", "count": 45},
    {"date": "2025-01-02", "count": 78}
  ]
}
```

## Ticket Types

### Standard Ticket
- Basic event access
- Welcome package
- Lunch and refreshments
- Access to main venue

### Premium Ticket
- All standard features
- Priority seating
- Networking dinner
- Exclusive workshop access
- Premium swag package

### Team Ticket
- Discounted rate for teams (4+ members)
- Team workspace allocation
- Team building activities
- Shared resource access

## QR Code Integration

### QR Code Format
QR codes contain encrypted participant information:

```
Format: {eventId}:{participantId}:{timestamp}:{checksum}
Example: hackathon-2025:participant-123:1642176000:abc123
```

### Check-in Process
1. Scan QR code using mobile app or scanner
2. Validate ticket through API
3. Mark participant as checked in
4. Display welcome message and event information

## Webhook Events

Configure webhooks to receive real-time notifications:

### Available Events
- `registration.created` - New registration completed
- `registration.cancelled` - Registration cancelled
- `ticket.validated` - Ticket successfully validated
- `capacity.reached` - Event capacity reached
- `waitlist.added` - Participant added to waitlist

### Webhook Payload Example
```json
{
  "event": "registration.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "registrationId": "reg-123",
    "participantId": "participant-123",
    "eventId": "hackathon-2025",
    "ticketType": "standard"
  }
}
```

## Error Handling

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., capacity reached)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "message": "Event has reached maximum capacity",
    "details": {
      "currentCapacity": 500,
      "maxCapacity": 500,
      "waitlistAvailable": true
    }
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const BilletterAPI = require('billetter-api');

const client = new BilletterAPI({
  apiKey: process.env.BILLETTER_API_KEY,
  environment: 'production'
});

// Create registration
const registration = await client.registrations.create({
  participantId: 'participant-123',
  eventId: 'hackathon-2025',
  ticketType: 'standard'
});

// Generate ticket
const ticket = await client.tickets.generate({
  registrationId: registration.id,
  format: 'qr_code'
});

console.log('QR Code:', ticket.qrCode);
```

### Python
```python
from billetter_api import BilletterClient

client = BilletterClient(
    api_key=os.environ['BILLETTER_API_KEY'],
    environment='production'
)

# Create registration
registration = client.registrations.create(
    participant_id='participant-123',
    event_id='hackathon-2025',
    ticket_type='standard'
)

# Generate ticket
ticket = client.tickets.generate(
    registration_id=registration['id'],
    format='qr_code'
)

print(f"QR Code: {ticket['qr_code']}")
```

## Rate Limits

- **General API**: 1000 requests per minute
- **Bulk Operations**: 100 requests per minute
- **Webhook Delivery**: 500 requests per minute

## Testing

### Test Environment
- **Base URL**: `https://api-test.billetter.com`
- **Test Event ID**: `test-hackathon-2025`
- **API Key**: Contact support for test credentials

### Mock Data
Use test participant IDs for development:
- `test-participant-001` to `test-participant-100`

## Support

For API issues:
- Documentation: https://docs.billetter.com
- Support Email: api-support@billetter.com
- Status Page: https://status.billetter.com
- GitHub Issues: https://github.com/billetter/api-issues