# D[ai]TA - AI-Powered Math Education Platform

D[ai]TA is an innovative educational platform that leverages AI to create personalized math learning experiences. The platform helps teachers track student progress, generate customized lesson plans, and provide targeted support based on student performance.

## Key Features

### For Teachers
- **Smart Assessment Creation**: Generate grade-appropriate math assessments with AI
- **Personalized Lesson Planning**: Auto-generate UDL-compliant lesson plans based on student performance
- **Student Analytics**: Track individual and classroom progress with detailed analytics
- **Weekly Group Formation**: AI-powered student grouping based on similar learning needs
- **Standards Alignment**: Automatic alignment with California Math Standards

### For Students
- **Adaptive Assessments**: Take assessments tailored to their grade level
- **Instant Feedback**: Receive immediate feedback on quiz performance
- **Secure Access**: Simple emoji-based authentication system

### For Coaches
- **Teacher Oversight**: Monitor assigned teachers' performance
- **Progress Tracking**: View classroom analytics and student improvement

### For Administrators
- **District Management**: Organize schools and teachers by district
- **User Management**: Manage teacher accounts and access
- **Audit Logging**: Track all administrative actions

## Setup

### Environment Variables

This project requires several environment variables to be set. Create a `.env` file in the root directory with the following variables:

```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key 
```

⚠️ **IMPORTANT: Never commit your `.env` file to version control!**

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: OpenAI API
- **Authentication**: Custom auth with Supabase

### Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Architecture

The application follows a modular architecture with:
- Component-based UI development
- Custom hooks for shared logic
- Service layer for API interactions
- Type-safe database operations
- Secure authentication flow

## Security Features

- Row Level Security (RLS) in Supabase
- Secure password hashing
- Role-based access control
- Audit logging for administrative actions
- Session management
- Rate limiting on API endpoints

### Deployment

Before deploying:
1. Set up environment variables in your deployment platform
2. Never expose API keys in your code or version control
3. Use proper security measures for production deployments