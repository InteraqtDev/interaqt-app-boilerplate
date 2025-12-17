# Frontend - Media Sharing App

A React-based frontend for the celebrity-fan interaction app built with the interaqt framework.

## Features

- User authentication (register/login)
- Browse posts feed with images and videos
- View post details with comments
- Upload media files (images/videos) to Volcengine TOS
- Create and delete posts
- Comment on posts
- User profile management
- Responsive design with Tailwind CSS

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v6
- **State Management**: React Context API
- **API Client**: Auto-generated from backend interactions

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running on `http://localhost:3000`
- Environment variables configured (see backend setup)

### Installation

```bash
cd frontend
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

This will start the Vite dev server on `http://localhost:5173` (or another port if 5173 is taken).

### Build

Build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── api/
│   ├── APIClient.ts              # Core API client implementation
│   ├── generated.ts               # Auto-generated interaction types
│   └── custom-endpoints.generated.ts  # Auto-generated custom endpoints
├── src/
│   ├── components/
│   │   ├── Layout.tsx            # Main layout with navigation
│   │   └── ProtectedRoute.tsx   # Auth guard component
│   ├── context/
│   │   ├── APIContext.tsx        # API client context provider
│   │   └── AuthContext.tsx       # Authentication context
│   ├── pages/
│   │   ├── AuthPage.tsx          # Login/Register page
│   │   ├── PostsFeed.tsx         # Home page with posts grid
│   │   ├── PostDetail.tsx        # Single post with comments
│   │   ├── UploadMedia.tsx       # Upload media page
│   │   └── UserProfile.tsx       # User profile page
│   ├── App.tsx                   # Root component with routes
│   ├── main.tsx                  # App entry point
│   └── index.css                 # Global styles
└── package.json
```

## API Integration

The frontend uses an auto-generated API client that maps to backend interactions:

### Generated Interactions

- `ViewPosts`: Get all posts
- `ViewUserProfile`: Get user profile
- `ViewComments`: Get comments for a post
- `CreatePost`: Create a new post
- `DeletePost`: Delete a post (author only)
- `CreateComment`: Add a comment
- `DeleteComment`: Delete a comment (author only)
- `UpdateUserProfile`: Update user profile

### Custom Endpoints

- `register`: User registration
- `login`: User login
- `logout`: User logout
- `getUploadUrl`: Get pre-signed URL for media upload

## Usage

### Authentication

1. Navigate to `/auth`
2. Register a new account or login with existing credentials
3. Upon success, you'll be redirected to the posts feed

### Creating a Post

1. Click "Upload" in the navigation (requires authentication)
2. Select an image or video file
3. Optionally add a caption
4. Click "Publish"
5. The file is uploaded directly to TOS, then a post is created

### Viewing and Commenting

1. Browse posts on the home page
2. Click on any post to view details
3. Add comments (requires authentication)
4. Delete your own posts/comments using the delete buttons

### Profile Management

1. Click "Profile" in the navigation
2. View your profile information and posts
3. Click "Edit Profile" to update username or email

## Environment Configuration

The frontend uses the following environment variables (configured in `vite.config.development.ts`):

- `BASE_URL`: Backend API base URL (default: `http://localhost:3000/api`)
- `HOST`: Development server host (default: `localhost`)
- `PORT`: Development server port (default: `3000`)

## Authentication Flow

The app supports two authentication modes:

1. **Cookie-based** (default): Session stored in HTTP-only cookies
2. **JWT token-based**: Token stored in localStorage and sent in Authorization header

The auth mode is determined by the backend response and stored in localStorage.

## Media Upload Flow

1. Frontend requests pre-signed upload URL from backend
2. Backend generates URL using Volcengine TOS SDK
3. Frontend uploads file directly to TOS (client-direct integration)
4. Frontend creates post with the public media URL
5. No file data passes through the backend server

## Error Handling

- API errors are displayed as toast notifications or inline messages
- Form validation errors are shown inline
- Network errors trigger retry buttons
- Protected routes redirect to auth page

## Responsive Design

The app is mobile-first with breakpoints:

- **Mobile**: < 640px (1 column)
- **Tablet**: 640px - 1024px (2 columns)
- **Desktop**: > 1024px (3 columns)

## Known Limitations

- No pagination (loads all posts)
- No real-time updates (manual refresh required)
- No image compression before upload
- No file size limit enforcement in UI

## Future Enhancements

- Add pagination for posts and comments
- Implement real-time updates with WebSockets
- Add image compression and resizing
- Add search and filter functionality
- Implement infinite scroll
- Add notification system
- Support for multiple file uploads
