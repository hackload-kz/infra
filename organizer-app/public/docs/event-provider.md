# Event Provider Documentation

## Overview

The Event Provider API enables seamless integration with external event management platforms. This service provides comprehensive event creation, management, and synchronization capabilities for hackathon organizers.

## Core Features

- **Multi-platform Integration**: Connect with popular event platforms
- **Real-time Synchronization**: Automatic data sync between platforms
- **Event Lifecycle Management**: From creation to post-event analytics
- **Attendee Management**: Comprehensive participant tracking
- **Custom Branding**: Maintain consistent branding across platforms

## Supported Platforms

### Eventbrite Integration
- Event creation and management
- Ticket sales and registration
- Attendee tracking and check-in
- Analytics and reporting

### Meetup Integration
- Group and event management
- RSVP tracking
- Member communication
- Venue coordination

### Custom Platform Integration
- REST API integration
- Webhook support
- Custom data mapping
- Real-time synchronization

## Authentication

The Event Provider API uses OAuth 2.0 for secure authentication:

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

### OAuth Flow
1. Redirect user to authorization endpoint
2. User grants permission
3. Exchange authorization code for access token
4. Use access token for API requests

## API Endpoints

### Event Management

#### Create Event
```http
POST /api/event-provider/events
Content-Type: application/json

{
  "title": "HackLoad 2025",
  "description": "Annual hackathon event",
  "startDate": "2025-03-15T09:00:00Z",
  "endDate": "2025-03-17T18:00:00Z",
  "location": {
    "venue": "Tech Hub",
    "address": "123 Innovation Street",
    "city": "San Francisco",
    "country": "USA"
  },
  "capacity": 500,
  "platforms": ["eventbrite", "meetup"]
}
```

#### Update Event
```http
PUT /api/event-provider/events/{eventId}
Content-Type: application/json

{
  "title": "HackLoad 2025 - Updated",
  "capacity": 600,
  "platforms": ["eventbrite", "meetup", "facebook"]
}
```

#### Get Event Details
```http
GET /api/event-provider/events/{eventId}
```

#### Sync Event Data
```http
POST /api/event-provider/events/{eventId}/sync
Content-Type: application/json

{
  "platforms": ["eventbrite", "meetup"],
  "syncType": "full"
}
```

### Attendee Management

#### Get Attendees
```http
GET /api/event-provider/events/{eventId}/attendees
```

#### Sync Attendee Data
```http
POST /api/event-provider/events/{eventId}/attendees/sync
Content-Type: application/json

{
  "platforms": ["eventbrite"],
  "includeWaitlist": true
}
```

#### Export Attendee List
```http
GET /api/event-provider/events/{eventId}/attendees/export?format=csv
```

### Platform Integration

#### Connect Platform
```http
POST /api/event-provider/platforms/connect
Content-Type: application/json

{
  "platform": "eventbrite",
  "credentials": {
    "apiKey": "your-api-key",
    "organizationId": "your-org-id"
  }
}
```

#### Get Platform Status
```http
GET /api/event-provider/platforms/{platform}/status
```

#### Disconnect Platform
```http
DELETE /api/event-provider/platforms/{platform}
```

## Data Models

### Event Object
```json
{
  "id": "event-123",
  "title": "HackLoad 2025",
  "description": "Annual hackathon event",
  "startDate": "2025-03-15T09:00:00Z",
  "endDate": "2025-03-17T18:00:00Z",
  "location": {
    "venue": "Tech Hub",
    "address": "123 Innovation Street",
    "city": "San Francisco",
    "country": "USA",
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "capacity": 500,
  "registeredCount": 347,
  "waitlistCount": 23,
  "status": "published",
  "platforms": {
    "eventbrite": {
      "eventId": "eb-123456",
      "url": "https://eventbrite.com/e/123456",
      "status": "live"
    },
    "meetup": {
      "eventId": "mu-789012",
      "url": "https://meetup.com/event/789012",
      "status": "published"
    }
  },
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T15:45:00Z"
}
```

### Attendee Object
```json
{
  "id": "attendee-123",
  "eventId": "event-123",
  "name": "John Doe",
  "email": "john@example.com",
  "registrationDate": "2025-01-15T10:30:00Z",
  "status": "confirmed",
  "ticketType": "standard",
  "checkInStatus": "pending",
  "platform": "eventbrite",
  "platformAttendeeId": "eb-att-123456",
  "metadata": {
    "company": "Tech Corp",
    "experience": "intermediate",
    "dietary": "vegetarian"
  }
}
```

## Platform-Specific Features

### Eventbrite Integration

#### Features
- Automated ticket creation
- Payment processing
- Custom registration forms
- Email marketing integration
- Analytics and reporting

#### Configuration
```json
{
  "platform": "eventbrite",
  "config": {
    "ticketTypes": [
      {
        "name": "Early Bird",
        "price": 50,
        "quantity": 100,
        "salesStart": "2025-01-01T00:00:00Z",
        "salesEnd": "2025-02-01T23:59:59Z"
      },
      {
        "name": "Regular",
        "price": 75,
        "quantity": 400,
        "salesStart": "2025-02-01T00:00:00Z",
        "salesEnd": "2025-03-14T23:59:59Z"
      }
    ],
    "customQuestions": [
      {
        "question": "Years of programming experience",
        "type": "dropdown",
        "options": ["0-1", "2-5", "6-10", "10+"],
        "required": true
      }
    ]
  }
}
```

### Meetup Integration

#### Features
- Group management
- RSVP tracking
- Member messaging
- Event promotion
- Community building

#### Configuration
```json
{
  "platform": "meetup",
  "config": {
    "groupUrlname": "hackload-community",
    "rsvpLimit": 500,
    "guestLimit": 1,
    "announceTo": "members",
    "eventPhotos": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ]
  }
}
```

## Webhook Events

Subscribe to real-time event notifications:

### Available Events
- `event.created` - New event created
- `event.updated` - Event details changed
- `attendee.registered` - New attendee registered
- `attendee.cancelled` - Registration cancelled
- `sync.completed` - Platform sync finished
- `platform.connected` - New platform connected

### Webhook Configuration
```http
POST /api/event-provider/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/event-provider",
  "events": ["attendee.registered", "sync.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload
```json
{
  "id": "webhook-123",
  "event": "attendee.registered",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "eventId": "event-123",
    "attendeeId": "attendee-456",
    "platform": "eventbrite",
    "registrationDate": "2025-01-15T10:30:00Z"
  }
}
```

## Synchronization

### Sync Types

#### Full Sync
- Complete data synchronization
- Compares all fields
- Updates discrepancies
- Resource intensive

#### Incremental Sync
- Only new/changed data
- Based on timestamps
- Faster performance
- Regular intervals

#### Manual Sync
- On-demand synchronization
- Specific data subsets
- Error recovery
- Testing purposes

### Sync Configuration
```json
{
  "syncSettings": {
    "autoSync": true,
    "interval": "15m",
    "platforms": ["eventbrite", "meetup"],
    "dataTypes": ["attendees", "event_details"],
    "conflictResolution": "platform_priority",
    "notifyOnConflict": true
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "PLATFORM_UNAVAILABLE",
    "message": "Eventbrite API is currently unavailable",
    "platform": "eventbrite",
    "retryAfter": 300,
    "details": {
      "httpStatus": 503,
      "platformError": "Service Temporarily Unavailable"
    }
  }
}
```

### Common Error Codes
- `INVALID_CREDENTIALS` - Authentication failed
- `PLATFORM_UNAVAILABLE` - External platform down
- `RATE_LIMIT_EXCEEDED` - API rate limit reached
- `SYNC_CONFLICT` - Data conflict during sync
- `EVENT_NOT_FOUND` - Event doesn't exist
- `PERMISSION_DENIED` - Insufficient permissions

## SDK Examples

### JavaScript/Node.js
```javascript
const EventProvider = require('event-provider-sdk');

const client = new EventProvider({
  apiKey: process.env.EVENT_PROVIDER_API_KEY,
  environment: 'production'
});

// Create event
const event = await client.events.create({
  title: 'HackLoad 2025',
  startDate: '2025-03-15T09:00:00Z',
  endDate: '2025-03-17T18:00:00Z',
  platforms: ['eventbrite', 'meetup']
});

// Sync attendees
const syncResult = await client.events.syncAttendees(event.id, {
  platforms: ['eventbrite']
});

console.log(`Synced ${syncResult.count} attendees`);
```

### Python
```python
from event_provider import EventProviderClient

client = EventProviderClient(
    api_key=os.environ['EVENT_PROVIDER_API_KEY'],
    environment='production'
)

# Create event
event = client.events.create(
    title='HackLoad 2025',
    start_date='2025-03-15T09:00:00Z',
    end_date='2025-03-17T18:00:00Z',
    platforms=['eventbrite', 'meetup']
)

# Sync attendees
sync_result = client.events.sync_attendees(
    event['id'],
    platforms=['eventbrite']
)

print(f"Synced {sync_result['count']} attendees")
```

## Best Practices

### Platform Management
1. **Redundancy**: Use multiple platforms for critical events
2. **Monitoring**: Track platform availability and performance
3. **Fallbacks**: Have backup registration methods
4. **Testing**: Test integrations before going live

### Data Synchronization
1. **Regular Syncing**: Schedule automatic sync intervals
2. **Conflict Resolution**: Define clear conflict resolution rules
3. **Monitoring**: Track sync success rates and errors
4. **Backup**: Maintain local copies of critical data

### Security
1. **Credential Management**: Securely store platform credentials
2. **Access Control**: Limit platform access to necessary users
3. **Audit Logging**: Track all platform interactions
4. **Encryption**: Encrypt sensitive data in transit and at rest

## Support

For Event Provider API support:
- Documentation: https://docs.event-provider.com
- Support Email: support@event-provider.com
- Status Page: https://status.event-provider.com
- Community Forum: https://community.event-provider.com