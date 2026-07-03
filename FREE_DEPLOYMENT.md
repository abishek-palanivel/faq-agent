# 🚀 FREE Deployment Guide - Complete Live Website

Deploy your **Zed AI Support Agent** completely **FREE** and make it accessible to the world!

## 🌐 Live Website Architecture

- **Frontend**: Netlify/Vercel (Free static hosting)  
- **Backend**: Render (Free API hosting)
- **Database**: Free MySQL hosting options
- **Total Cost**: **$0/month** ✨

---

## 🔧 Step 1: Push to GitHub

### First, push your code to GitHub:

```bash
# 1. Initialize git repository
git init

# 2. Add all files
git add .

# 3. Commit your project
git commit -m "Deploy Zed AI Support Agent - Complete free deployment setup"

# 4. Add GitHub remote
git remote add origin https://github.com/abishek-palanivel/faq-agent.git

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🗄️ Step 2: Free MySQL Database

### Option A: FreeSQLDatabase (Recommended)
1. Go to [freesqldatabase.com](https://freesqldatabase.com)
2. **Sign up** for free MySQL hosting
3. **Create database** with these settings:
   - Database Name: `zed_ai`
   - Username: (note this down)
   - Password: (note this down)
   - Host: (note this down)
4. **Import schema**: Upload `db/schema.sql` through their phpMyAdmin

### Option B: PlanetScale (Free Tier)
1. Sign up at [planetscale.com](https://planetscale.com)
2. Create new database: `faq-agent`
3. Get connection string
4. Import schema using their CLI

### Option C: Railway (Free Tier)
1. Sign up at [railway.app](https://railway.app)
2. Create MySQL service
3. Get connection details
4. Import schema

---

## 🔥 Step 3: Deploy Backend (Render)

### 3.1 Create Render Account
1. Go to [render.com](https://render.com)
2. **Sign up** with GitHub (free)
3. Connect your GitHub repository

### 3.2 Deploy Backend Service
1. **Dashboard** → **New** → **Web Service**
2. **Select Repository**: `faq-agent`
3. **Configure Service**:
   ```
   Name: faq-agent-backend
   Environment: Python 3
   Build Command: pip install -r backend/requirements.txt
   Start Command: cd backend && python -m uvicorn api:app --host 0.0.0.0 --port $PORT
   ```

### 3.3 Environment Variables (CRITICAL!)
Add these in Render dashboard:
```bash
# Database (from Step 2)
MYSQL_HOST=your_db_host_here
MYSQL_PORT=3306
MYSQL_USER=your_db_username
MYSQL_PASSWORD=your_db_password
MYSQL_DATABASE=zed_ai

# Google Gemini API (get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Security (generate strong password)
JWT_SECRET_KEY=your_super_secure_secret_32_characters_minimum

# Email (optional - for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_EMAIL=your_email@gmail.com

# Frontend URL (update after frontend deployment)
FRONTEND_URL=https://your-app-name.netlify.app

# Environment
ENVIRONMENT=production
```

### 3.4 Deploy!
- Click **Create Web Service**
- Wait 5-10 minutes for deployment
- Your API will be live at: `https://faq-agent-backend.onrender.com`

---

## 🌐 Step 4: Deploy Frontend (Choose One)

### Option A: Netlify (Recommended)

#### 4.1 Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. **Sign up** with GitHub (free)
3. **New site from Git** → Choose your repository
4. **Configure build**:
   ```
   Build command: cd frontend && npm install && npm run build
   Publish directory: frontend/dist
   ```

#### 4.2 Environment Variables
Add in Netlify dashboard:
```bash
VITE_API_URL=https://faq-agent-backend.onrender.com
```

#### 4.3 Custom Domain (Optional)
- **Site settings** → **Change site name** → Choose: `your-app-name`
- Your site: `https://your-app-name.netlify.app`

### Option B: Vercel
1. Go to [vercel.com](https://vercel.com)
2. **Import project** from GitHub
3. **Framework preset**: Other
4. **Root Directory**: `frontend`
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. Add environment variable: `VITE_API_URL=https://faq-agent-backend.onrender.com`

---

## 🔑 Step 5: Get API Keys

### Google Gemini API Key (REQUIRED)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Create API Key**
3. Copy the key
4. Add to Render backend environment variables

### Gmail App Password (Optional - for emails)
1. **Enable 2FA** on your Gmail account
2. **Google Account** → **Security** → **App passwords**
3. **Generate password** for "Mail"
4. Use this password (NOT your Gmail password) in `SMTP_PASSWORD`

---

## ⚙️ Step 6: Update Backend CORS

Update `FRONTEND_URL` in Render environment variables with your actual frontend URL:
```bash
FRONTEND_URL=https://your-actual-app-name.netlify.app
```

---

## 🧪 Step 7: Test Your Live Website

### Backend Testing
Visit: `https://faq-agent-backend.onrender.com/api/health`
Should return: `{"status":"ok","service":"Zed AI API"}`

### Frontend Testing
Visit: `https://your-app-name.netlify.app`
Should load the login page

### Full Testing Checklist
- ✅ **User Registration**: Create new account works
- ✅ **User Login**: Login with credentials works  
- ✅ **AI Chat**: Messages get responses from Gemini
- ✅ **Admin Login**: `admin@zed-ai.com` / `admin123`
- ✅ **Admin Dashboard**: Analytics and management work
- ✅ **File Upload**: Can attach files in chat
- ✅ **Mobile**: Works on phone browsers

---

## 🎯 Your Live Website URLs

After deployment, you'll have:

- **🌐 Main Website**: `https://your-app-name.netlify.app`
- **🔧 Backend API**: `https://faq-agent-backend.onrender.com`
- **📊 Admin Dashboard**: `https://your-app-name.netlify.app/admin`

### Default Admin Login:
- **Email**: `admin@zed-ai.com`
- **Password**: `admin123`
- **⚠️ Change this immediately after login!**

---

## 🚀 Step 8: Share Your Website

### Your project is now LIVE! Share these links:

**For End Users:**
```
🤖 Zed AI Support Agent
Get instant AI-powered support at:
https://your-app-name.netlify.app

✨ Features:
• Intelligent AI chat responses
• File upload support
• Multi-language interface
• Real-time ticket system
• Mobile-friendly design
```

**For Admins:**
```
📊 Admin Dashboard:
https://your-app-name.netlify.app/admin

Login: admin@zed-ai.com
Password: admin123 (change immediately!)
```

---

## 💡 Free Tier Limits

### What you get FREE:
- **Netlify**: 100GB bandwidth/month, 300 build minutes
- **Render**: 750 hours/month (sleeps after 15min inactivity)  
- **Database**: Varies by provider (usually 100MB-1GB)

### For Production Scale:
- **Netlify Pro**: $19/month (more bandwidth)
- **Render Starter**: $7/month (always-on service)
- **Database**: $5-10/month for dedicated hosting

---

## 🔒 Security Checklist

### After deployment:
- [ ] **Change admin password** immediately
- [ ] **Use strong JWT secret** (32+ characters)
- [ ] **Verify HTTPS** is working (automatic on Netlify/Render)
- [ ] **Test all features** work correctly
- [ ] **Monitor service logs** in Render dashboard

---

## 🐛 Troubleshooting

### Common Issues:

**Backend won't start:**
- Check environment variables are set in Render
- Verify database connection details
- Check build logs for errors

**Frontend can't connect to backend:**
- Verify `VITE_API_URL` points to your Render backend
- Check CORS settings in backend
- Ensure both services are deployed

**Database connection failed:**
- Verify MySQL host, username, password
- Check if database `zed_ai` exists
- Ensure schema is imported

**AI not responding:**
- Verify `GEMINI_API_KEY` is set correctly
- Check API key is valid in Google AI Studio
- Monitor backend logs for errors

---

## 🎉 Success! Your Website is Live!

**Congratulations!** You now have a **fully functional AI support website** running completely **FREE** and accessible to anyone worldwide!

### What you've built:
- ✅ **Professional AI chatbot** with Google Gemini
- ✅ **Complete admin dashboard** with analytics  
- ✅ **User management system** with authentication
- ✅ **Ticket management** with email notifications
- ✅ **FAQ knowledge base** with feedback system
- ✅ **Mobile-responsive design** for all devices
- ✅ **Secure HTTPS** hosting with global CDN

### Share your achievement:
- Add the live URL to your resume/portfolio
- Share on social media
- Show to potential employers
- Use as a reference for future projects

---

## 🚀 Optional: Custom Domain

### To use your own domain (e.g., `support.yourcompany.com`):

**Netlify:**
1. Buy domain from any registrar
2. **Site settings** → **Domain management** → **Add custom domain**
3. Update DNS records as instructed
4. SSL certificate is automatic!

**Update environment variables:**
```bash
FRONTEND_URL=https://support.yourcompany.com
```

---

**🎊 Your Zed AI Support Agent is now live and helping users worldwide!**

**Need help?** Create an issue in your GitHub repo or check the service logs in Render/Netlify dashboards.