# YouTube Manager

A comprehensive YouTube content management application built with Next.js and Express.js that allows you to manage your YouTube videos, comments, and notes through an intuitive dashboard.

## 🚀 Features

- **Video Management**: View and update video metadata (title, description)
- **Comment System**: Add, reply to, and delete comments on videos
- **Notes Management**: Create and search personal notes with video associations
- **Activity Logging**: Track all API activities and operations
- **OAuth Authentication**: Secure Google OAuth 2.0 integration
- **Real-time Updates**: Live data synchronization with Zustand state management

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **Axios** - HTTP client for API requests

### Backend
- **Express.js** - Node.js web framework
- **MongoDB** - Database with Mongoose ODM
- **Google APIs** - YouTube Data API v3
- **OAuth 2.0** - Google authentication

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v18 or higher)
- MongoDB database
- Google Cloud Console project with YouTube Data API v3 enabled
- Google OAuth 2.0 credentials

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd youtube-manager
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies (if separate)
cd frontend
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/youtube-manager

# Google OAuth 2.0
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
REDIRECT_URI=http://localhost:5000/oauth2callback
REFRESH_TOKEN=your_refresh_token

# Server
PORT=5000
NODE_ENV=development
```

### 4. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/oauth2callback`
5. Add your domain to authorized origins: `http://localhost:3000`

### 5. Database Setup

Make sure MongoDB is running:

```bash
# Using MongoDB locally
mongod

# Or using MongoDB Atlas (update MONGODB_URI in .env)
```

## 🚀 Running the Application

### Development Mode

```bash
# Start backend server
npm run dev

# Start frontend (Next.js) - in separate terminal
cd frontend
npm run dev
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## 📚 API Documentation

### Authentication Endpoints

#### Login
```http
GET /login
```
Redirects to Google OAuth consent screen.

#### OAuth Callback
```http
GET /oauth2callback?code={auth_code}
```
Handles OAuth callback and redirects to dashboard.

### Video Endpoints

#### Get Video Details
```http
GET /api/video/:id
```

**Parameters:**
- `id` (string): YouTube video ID

**Response:**
```json
{
  "id": "video_id",
  "snippet": {
    "title": "Video Title",
    "description": "Video Description",
    "channelTitle": "Channel Name",
    "publishedAt": "2024-01-01T00:00:00Z",
    "thumbnails": {
      "default": { "url": "..." },
      "medium": { "url": "..." },
      "high": { "url": "..." }
    }
  },
  "statistics": {
    "viewCount": "1000",
    "likeCount": "50",
    "commentCount": "10"
  }
}
```

#### Update Video Metadata
```http
PUT /api/video/:id
```

**Parameters:**
- `id` (string): YouTube video ID

**Body:**
```json
{
  "title": "New Video Title",
  "description": "New video description"
}
```

### Comment Endpoints

#### Add Comment
```http
POST /api/video/:id/comment
```

**Parameters:**
- `id` (string): YouTube video ID

**Body:**
```json
{
  "text": "Your comment text here"
}
```

#### Reply to Comment
```http
POST /api/comment/:id/reply
```

**Parameters:**
- `id` (string): Comment ID

**Body:**
```json
{
  "text": "Your reply text here"
}
```

#### Delete Comment
```http
DELETE /api/comment/:id
```

**Parameters:**
- `id` (string): Comment ID

### Notes Endpoints

#### Get All Notes
```http
GET /api/notes?q={search_query}
```

**Query Parameters:**
- `q` (optional): Search query to filter notes

#### Create Note
```http
POST /api/notes
```

**Body:**
```json
{
  "text": "Your note content",
  "videoId": "optional_video_id"
}
```

### Logs Endpoint

#### Get Activity Logs
```http
GET /api/logs
```

Returns all API activity logs sorted by creation date (newest first).

### Utility Endpoints

#### Health Check
```http
GET /api/health
```

Returns server status and configuration info.

## 🎯 Usage Guide

### 1. Authentication
1. Navigate to `http://localhost:3000`
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Get redirected to dashboard

### 2. Managing Videos
1. Enter a YouTube video ID in the dashboard
2. View video details, statistics, and metadata
3. Click "Edit" to update title/description
4. Save changes

### 3. Managing Comments
1. Select the "Comments" tab
2. Enter video ID
3. Add new comments or reply to existing ones
4. Delete comments as needed

### 4. Taking Notes
1. Go to "Notes" tab
2. Create notes with optional video associations
3. Search through existing notes
4. Use notes for content planning or reminders

### 5. Monitoring Activity
1. Check "Activity Logs" tab
2. View all API operations
3. Monitor for errors or unusual activity

## 🔒 Security Considerations

- Store sensitive credentials in environment variables
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Regularly rotate OAuth tokens
- Validate all user inputs
- Monitor API quota usage

## 🚨 Troubleshooting

### Common Issues

#### 400 Bad Request on Comments
- **Cause**: Comments disabled on video, invalid video ID, or quota exceeded
- **Solution**: Check video settings, verify video ID, check API quota

#### 401 Unauthorized
- **Cause**: Expired or invalid access token
- **Solution**: Re-authenticate through `/login` endpoint

#### 403 Forbidden
- **Cause**: Insufficient permissions or quota exceeded
- **Solution**: Check OAuth scopes and API quota limits

#### Video Not Found
- **Cause**: Invalid video ID or private video
- **Solution**: Verify video ID and ensure video is public

### Debug Mode

Enable detailed logging by setting:
```env
NODE_ENV=development
```

## 📝 Development

### Project Structure
```
youtube-manager/
├── server.js              # Express server
├── models/                # Mongoose models
│   ├── note.model.js     # Note schema
│   └── log.model.js      # Log schema
├── config/               # Configuration files
│   └── db.js            # Database connection
├── frontend/            # Next.js application
│   ├── app/            # App router pages
│   ├── components/     # React components
│   ├── store/         # Zustand stores
│   └── lib/           # Utilities
└── README.md
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🤝 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review API documentation

## 🔄 Updates and Maintenance

- Regularly update dependencies
- Monitor Google API changes
- Check quota usage
- Review and rotate credentials
- Backup your data regularly

---

**Note**: Make sure to comply with YouTube's Terms of Service and API usage policies when using this application.
