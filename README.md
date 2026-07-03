# 🤖 Zed AI Support Agent

![Zed Support](https://img.shields.io/badge/Zed-Support%20Agent-6366f1?style=for-the-badge)
![Gemini](https://img.shields.io/badge/Google%20Gemini-API-blue?style=for-the-badge&logo=google)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react)
![Python](https://img.shields.io/badge/Python-FastAPI-3776AB?style=for-the-badge&logo=python)
![Deploy](https://img.shields.io/badge/Deploy-FREE-46E3B7?style=for-the-badge)

**An intelligent AI-powered customer support chatbot built with Google Gemini, React, FastAPI, and MySQL. Deploy your own complete website for FREE!**

## 🌐 Deploy Your Own FREE Website in 10 Minutes

🚀 **[CLICK HERE FOR COMPLETE DEPLOYMENT GUIDE](FREE_DEPLOYMENT.md)** 🚀

### What You'll Get:
- ✅ **Complete live website** accessible worldwide
- ✅ **Professional AI chatbot** with Google Gemini
- ✅ **Admin dashboard** with analytics and management
- ✅ **User registration** and authentication system
- ✅ **HTTPS security** and mobile responsive design
- ✅ **$0 monthly cost** using free hosting services

### Your Live URLs After Deployment:
- **🌐 Main Website**: `https://your-app-name.netlify.app`
- **📊 Admin Dashboard**: `https://your-app-name.netlify.app/admin`
- **🔧 Backend API**: `https://your-backend.onrender.com`

---

## ✨ Features

### 🤖 AI-Powered Chat
- **Google Gemini Integration**: Advanced AI conversations using Gemini 2.5 Flash
- **Context-Aware Responses**: Maintains conversation context and history
- **Smart Escalation**: Automatically creates support tickets when needed
- **Multi-language Support**: English, Spanish, French, German
- **File Attachments**: Upload images, PDFs, and documents
- **Smart Suggestions**: Context-aware query suggestions as you type

### 📊 Admin Dashboard
- **Real-time Analytics**: User engagement, satisfaction ratings, escalation rates
- **Ticket Management**: Reply to users, bulk operations, urgency flags
- **FAQ Management**: Create, edit, and organize knowledge base
- **User Management**: View registered users and activity
- **System Settings**: Configure AI behavior, notifications, and preferences
- **Data Export**: Export conversations, tickets, and user data

### 👤 User Experience
- **Modern Chat Interface**: Responsive design with fixed layout
- **Quick Actions**: One-click buttons for common requests
- **Search History**: Find previous conversations easily
- **Rating System**: Rate AI responses to improve quality
- **Export Data**: Download conversation history in JSON/CSV
- **Drag & Drop**: Easy file uploading with modern UI

### 🔧 System Features
- **Secure Authentication**: JWT tokens, password hashing, role-based access
- **MySQL Database**: Optimized performance with connection pooling
- **Email Notifications**: SMTP integration for ticket alerts
- **File Upload Security**: Validated file types and safe storage
- **Real-time Updates**: Live notifications and status updates

---

## 🚀 Quick Deploy (FREE)

### 1. Fork & Clone
```bash
git clone https://github.com/abishek-palanivel/faq-agent.git
cd faq-agent
```

### 2. Get Required Keys
- **Gemini API**: [Get free key from Google AI Studio](https://makersuite.google.com/app/apikey)
- **Free Database**: [Get MySQL hosting](https://freesqldatabase.com)

### 3. Deploy (5 minutes)
1. **Push to GitHub**
2. **Deploy backend** on [Render](https://render.com) (free)
3. **Deploy frontend** on [Netlify](https://netlify.com) (free)
4. **Configure environment variables**
5. **Your website is LIVE!** 🎉

**📚 [Complete Step-by-Step Guide](FREE_DEPLOYMENT.md)**

---

## 💻 Local Development (Optional)

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0+

### Quick Start
```bash
# 1. Setup backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python -m uvicorn api:app --reload --port 8080

# 2. Setup frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local if needed
npm run dev

# 3. Setup database
mysql -u root -p < ../db/schema.sql
```

**Visit**: `http://localhost:5173`

---

## 🎯 Live Demo Features

### For End Users:
- **Smart AI Chat**: Get instant intelligent responses
- **File Upload**: Attach images, documents for context
- **Conversation History**: Search and review past chats
- **Multi-language**: Interface in multiple languages
- **Mobile Friendly**: Works perfectly on phones

### For Administrators:
- **Analytics Dashboard**: Track user engagement and satisfaction
- **Ticket System**: Manage escalated support requests
- **FAQ Management**: Create and organize knowledge base
- **User Management**: Monitor registered users and activity
- **System Configuration**: Customize AI behavior and settings

---

## 🔐 Default Credentials

**Admin Login:**
- Email: `admin@zed-ai.com`
- Password: `admin123`
- **⚠️ Change immediately after first login!**

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React + Vite | Modern responsive UI |
| **Backend** | FastAPI | High-performance Python API |
| **AI Engine** | Google Gemini | Advanced language model |
| **Database** | MySQL | User data and conversations |
| **Authentication** | JWT | Secure user sessions |
| **Hosting** | Netlify + Render | Free cloud deployment |
| **Email** | SMTP | Notification system |

---

## 📱 Mobile & Desktop

The application is fully responsive and works seamlessly on:
- 📱 **Mobile phones** (iOS/Android)
- 💻 **Desktop computers** (Windows/Mac/Linux)
- 📟 **Tablets** (iPad/Android tablets)
- 🌐 **All modern browsers** (Chrome, Firefox, Safari, Edge)

---

## 🌍 Global Accessibility

Once deployed, your website will be:
- ✅ **Accessible worldwide** via HTTPS URL
- ✅ **Fast loading** with global CDN
- ✅ **SEO optimized** for search engines
- ✅ **Mobile responsive** for all devices
- ✅ **Secure** with SSL certificates
- ✅ **Professional** looking interface

---

## 🚀 Ready to Deploy?

### [📖 Follow the Complete FREE Deployment Guide](FREE_DEPLOYMENT.md)

**Time required**: 10-15 minutes  
**Cost**: $0 (completely free)  
**Result**: Full live website with AI chatbot  

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is open source and available under the MIT License.

---

## ⭐ Show Your Support

If you found this project helpful:
- ⭐ **Star the repository**
- 🔄 **Share with others**
- 🐛 **Report bugs**
- 💡 **Suggest features**

---

**🎉 Deploy your own AI support agent today and start helping users worldwide!**
| MySQL | 8.0+ | ✅ |
| Google Gemini API Key | Latest | ✅ |

### 1. Clone & Setup

```bash
git clone <repository-url>
cd zed-ai-support
```

### 2. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
# AI Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=zed_ai

# Email Configuration
SMTP_EMAIL=your_email@domain.com
SMTP_PASSWORD=your_app_password

# Security
JWT_SECRET_KEY=your_very_secure_random_jwt_secret_minimum_32_chars

# Admin Account (Optional - for first-time setup)
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=your_secure_admin_password
```

### 3. Database Setup

```bash
mysql -u root -p < db/schema.sql
```

### 4. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### 5. Frontend Setup

```bash
cd frontend
npm install
```

### 6. Start Application

**Option A: Automated Start (Windows)**
```bash
start_servers.bat
```

**Option B: Manual Start**

Terminal 1 (Backend):
```bash
cd backend
python -m uvicorn api:app --reload --port 8080
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 7. Access Application

- **User Portal**: http://localhost:5173
- **Admin Panel**: http://localhost:5173 (click "Admin Login")
- **API Documentation**: http://localhost:8080/docs

## 📋 Configuration Guide

### Google Gemini API Setup

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to your `.env` file as `GEMINI_API_KEY`

### Email Configuration (Gmail Example)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Google Account → Security → App passwords
   - Generate password for "Mail"
3. Use your Gmail address as `SMTP_EMAIL`
4. Use the app password as `SMTP_PASSWORD`

### Admin Account Setup

**First-time Setup:**
1. Set `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in `.env`
2. Start the application
3. Login with these credentials
4. Create additional admin accounts through the system

**Production Setup:**
1. Remove default credentials from `.env`
2. Use only database-managed admin accounts
3. Ensure strong password policies

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client   │◄──►│  FastAPI Server │◄──►│  MySQL Database │
│   (Vite + JSX)   │    │   (Python 3.11) │    │   (8.0+ Engine) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Modern UI/UX   │    │  Google Gemini  │    │  Data & Sessions│
│  • Chat Interface│    │  • AI Responses │    │  • User Management
│  • Admin Dashboard│   │  • Context Aware│    │  • Analytics    │
│  • Real-time    │    │  • Escalation   │    │  • File Storage │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/google/url` - Google OAuth URL
- `GET /api/auth/google/callback` - OAuth callback

### Chat Endpoints
- `POST /api/chat` - Send message to AI
- `GET /api/suggestions` - Get query suggestions
- `POST /api/chat/{id}/rate` - Rate AI response
- `GET /api/user/conversations/export` - Export conversations (JSON)
- `GET /api/user/conversations/export/csv` - Export conversations (CSV)

### Admin Endpoints
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/analytics` - Advanced analytics
- `GET /api/admin/tickets` - All support tickets
- `POST /api/admin/tickets/{id}/reply` - Reply to ticket
- `POST /api/admin/bulk-operations` - Bulk ticket operations

### FAQ Management
- `GET /api/faqs` - Get FAQs for users
- `POST /api/faqs/{id}/feedback` - Submit FAQ feedback
- `GET /api/admin/faqs` - Admin FAQ management
- `POST /api/admin/faqs` - Create new FAQ
- `PUT /api/admin/faqs/{id}` - Update FAQ
- `DELETE /api/admin/faqs/{id}` - Delete FAQ

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure session management
- **Password Hashing**: Bcrypt with salt
- **Role-based Access**: User and admin roles
- **OAuth Integration**: Google Sign-In support

### API Security
- **CORS Configuration**: Restricted origins
- **Input Validation**: Pydantic models
- **SQL Injection Prevention**: Parameterized queries
- **File Upload Security**: Type and size validation

### Data Protection
- **Environment Variables**: Sensitive data in .env
- **Database Encryption**: Secure password storage
- **Session Management**: Automatic token expiration
- **Error Handling**: No sensitive data leakage

## 📊 Database Schema

### Core Tables
- **users** - User accounts and authentication
- **chat_history** - Conversation messages and ratings
- **tickets** - Escalated support requests
- **faq_entries** - Knowledge base content
- **user_preferences** - Settings and notifications

### Analytics Tables
- **popular_queries** - Search trends and optimization
- **satisfaction_surveys** - User feedback and ratings
- **user_notifications** - Real-time alerts
- **conversation_context** - Chat session management

## 🛠️ Development

### Project Structure
```
zed-ai-support/
├── backend/
│   ├── api.py              # FastAPI application
│   ├── auth.py             # Authentication utilities
│   ├── database.py         # Database connection & queries
│   ├── system_prompt.py    # AI system instructions
│   ├── requirements.txt    # Python dependencies
│   └── uploads/           # File storage directory
├── frontend/
│   ├── src/
│   │   ├── pages/         # React components
│   │   ├── App.css        # Styles
│   │   └── main.jsx       # Application entry
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Build configuration
├── db/
│   └── schema.sql         # Database structure
├── .env.example          # Environment template
├── .gitignore           # Git exclusions
└── start_servers.bat    # Windows startup script
```

### Development Commands

```bash
# Backend development
cd backend
python -m uvicorn api:app --reload --port 8080

# Frontend development  
cd frontend
npm run dev

# Database management
mysql -u root -p zed_ai < db/schema.sql

# Build for production
cd frontend
npm run build
```

### Code Quality

- **Type Safety**: Pydantic models for API validation
- **Error Handling**: Comprehensive try-catch blocks
- **Logging**: Detailed application logs
- **Security**: Input sanitization and validation
- **Performance**: Connection pooling and query optimization

## 🚀 Deployment

### Production Checklist

1. **Environment Security**
   - [ ] Generate strong JWT secret (32+ characters)
   - [ ] Use production database credentials
   - [ ] Configure SMTP with app passwords
   - [ ] Set up SSL certificates

2. **Database Configuration**
   - [ ] Create production database
   - [ ] Run schema migrations
   - [ ] Configure connection pooling
   - [ ] Set up automated backups

3. **Application Security**
   - [ ] Update CORS origins for production domain
   - [ ] Enable HTTPS redirects
   - [ ] Configure rate limiting
   - [ ] Set up monitoring and alerts

4. **Infrastructure**
   - [ ] Use reverse proxy (nginx/Apache)
   - [ ] Configure load balancing
   - [ ] Set up log rotation
   - [ ] Enable automatic restarts

### Docker Deployment (Coming Soon)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README and API docs
- **Issues**: Create a GitHub issue for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

## 🎯 Roadmap

### Version 2.0 (Planned)
- [ ] Real-time chat with WebSockets
- [ ] Voice message support  
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] Mobile app integration
- [ ] Advanced AI models (GPT-4, Claude)

### Version 2.1 (Planned)
- [ ] Chat bot training interface
- [ ] Custom AI model fine-tuning
- [ ] Integration marketplace
- [ ] Advanced workflow automation
- [ ] Performance monitoring dashboard

---

**Built with ❤️ by the Zed AI Team**