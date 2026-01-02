# LetShare API Documentation

## Setup Instructions

### 1. Create Database
1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Import the file `database/schema.sql`
3. Or run the SQL commands manually in phpMyAdmin

### 2. Configure Database
Edit `api/config.php` and update database credentials if needed:
- DB_HOST: usually 'localhost'
- DB_NAME: 'letshare_db'
- DB_USER: usually 'root'
- DB_PASS: usually empty for WAMP

### 3. Test API
You can test the API using:
- Postman
- Browser (for GET requests)
- JavaScript fetch() calls

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "department": "Finance",
  "language": "en"
}
```

#### POST /api/auth/login
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET /api/auth/me
Get current user info (requires authentication)

#### POST /api/auth/logout
Logout current user

### Items

#### GET /api/items
Get all active items (excluding user's own items)
- Requires authentication
- Returns list of items

#### POST /api/items
Create new item
```json
{
  "title": "Financial Accounting Textbook",
  "type": "donation",
  "department": "Finance",
  "description": "Book in good condition",
  "image": "base64_image_data"
}
```

#### DELETE /api/items?id=123
Delete item (soft delete)
- Requires authentication
- Only owner can delete

### Messages

#### GET /api/messages
Get all conversations for current user
- Requires authentication
- Returns list of conversations with last message

#### POST /api/messages
Create new message/conversation
```json
{
  "item_id": 123,
  "message": "Hi! I'm interested in this item."
}
```

### Conversations

#### GET /api/conversations?id=123
Get conversation details and messages
- Requires authentication
- User must be part of conversation

#### POST /api/conversations
Send message in existing conversation
```json
{
  "conversation_id": 123,
  "message": "When can we meet?"
}
```

#### PUT /api/conversations
Update conversation status
```json
{
  "conversation_id": 123,
  "status": "accepted" // or "rejected" or "completed"
}
```

### Users

#### GET /api/users?id=123
Get user profile and stats
- Requires authentication

#### PUT /api/users
Update user profile
```json
{
  "name": "New Name",
  "email": "newemail@example.com",
  "department": "Marketing",
  "avatar": "base64_image_data",
  "language": "fr"
}
```

## Authentication

The API uses session-based authentication. After login:
1. Session is created with user_id and token
2. Token is returned in response
3. Include token in subsequent requests (if using token-based auth)
4. Or rely on session cookies (current implementation)

## Default Test Users

The schema includes default test users:
- fausat@example.com / password123
- marie@example.com / password123
- thomas@example.com / password123
- sophie@example.com / password123

## Error Responses

All errors return JSON in this format:
```json
{
  "success": false,
  "message": "Error message",
  "data": null
}
```

Status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 405: Method Not Allowed
- 500: Server Error

