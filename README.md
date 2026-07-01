# LetShare

LetShare is a student-to-student exchange platform for giving away, exchanging, and sharing items within a university community.

## Features
- User authentication and profile management
- Item posting with images
- Interest tracking and exchanges
- Real-time messaging and notifications
- Push notifications and presence

## Tech Stack
- PHP 8+
- MySQL
- Vanilla JavaScript
- Composer
- Pusher for real-time chat

## Local Setup
1. Clone the repository
2. Create a local `.env` file with your database and service credentials
3. Install PHP dependencies with `composer install`
4. Import the SQL schema from the `database` folder
5. Run the project from your local web server

## Environment Variables
Create a `.env` file with values for:
- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `JWT_SECRET`
- `GOOGLE_TRANSLATE_API_KEY`
- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `APP_BASE_URL`

## Deployment
This project can be deployed to IONOS using GitHub Actions or manual upload.

## Security Notes
- Never commit secrets or `.env` files
- Keep API keys in your hosting provider environment settings
- Rotate exposed keys immediately if they were ever committed
