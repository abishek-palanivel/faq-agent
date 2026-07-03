# 🚀 Quick Start - Deploy in 10 Minutes

## 🎯 What You're Building

A **complete AI-powered support website** with:
- 🤖 **Smart chatbot** (Google Gemini AI)
- 📊 **Admin dashboard** (analytics, tickets, FAQs)
- 👥 **User system** (registration, authentication)
- 📱 **Mobile-friendly** design
- 🌐 **Live on the internet** (accessible worldwide)
- 💸 **Completely FREE** hosting

---

## ⚡ Super Quick Deploy (10 minutes)

### 1. Get Required Keys (3 minutes)
- 🔑 **Gemini API Key**: [Get free key](https://makersuite.google.com/app/apikey)
- 🗄️ **Free MySQL Database**: [Get here](https://freesqldatabase.com)

### 2. Push to GitHub (2 minutes)
```bash
# Run the deploy script
./deploy.bat

# Or manually:
git init
git add .
git commit -m "Deploy Zed AI Support Agent"
git remote add origin https://github.com/YOUR_USERNAME/faq-agent.git
git push -u origin main
```

### 3. Deploy Backend (3 minutes)
1. Go to [render.com](https://render.com) → Sign up (free)
2. **New Web Service** → Connect GitHub repo
3. **Name**: `faq-agent-backend`
4. **Build Command**: `pip install -r backend/requirements.txt`
5. **Start Command**: `cd backend && python -m uvicorn api:app --host 0.0.0.0 --port $PORT`
6. **Add Environment Variables**:
   ```
   MYSQL_HOST=your_db_host
   MYSQL_USER=your_db_user  
   MYSQL_PASSWORD=your_db_password
   MYSQL_DATABASE=zed_ai
   GEMINI_API_KEY=your_gemini_key
   JWT_SECRET_KEY=your_secure_secret_32_chars
   FRONTEND_URL=https://your-app.netlify.app
   ```

### 4. Deploy Frontend (2 minutes)
1. Go to [netlify.com](https://netlify.com) → Sign up (free)
2. **New site from Git** → Choose your repo
3. **Build Command**: `cd frontend && npm install && npm run build`
4. **Publish Directory**: `frontend/dist`
5. **Environment Variable**: `VITE_API_URL=https://your-backend.onrender.com`

### 🎉 Done! Your website is LIVE!

---

## 🌐 Your Live URLs

After deployment:
- **🌐 Main Website**: `https://your-app.netlify.app`
- **📊 Admin Panel**: `https://your-app.netlify.app/admin`
- **🔧 API**: `https://your-backend.onrender.com`

### Default Login:
- **Email**: `admin@zed-ai.com`
- **Password**: `admin123`
- **⚠️ Change immediately after login!**

---

## 🎯 Test Your Website

### ✅ User Features:
- Create account and login
- Chat with AI assistant
- Upload files in chat
- Search conversation history
- Export chat data

### ✅ Admin Features:
- Login to admin dashboard
- View user analytics
- Manage support tickets
- Create/edit FAQs
- Configure system settings

---

## 🔧 If Something Goes Wrong

### Backend Issues:
- Check environment variables in Render
- Verify database connection details
- Look at Render service logs

### Frontend Issues:
- Verify `VITE_API_URL` is correct
- Check Netlify deploy logs
- Test API endpoint directly

### Database Issues:
- Ensure schema is imported
- Check connection credentials
- Verify database exists

---

## 📚 Need More Help?

### 📖 Complete Guides:
- **[FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md)** - Detailed step-by-step
- **[WHAT_IS_INCLUDED.md](WHAT_IS_INCLUDED.md)** - Full feature overview  
- **[README.md](README.md)** - Project documentation

### 🆘 Support:
- **GitHub Issues**: Report problems
- **Service Logs**: Check Render/Netlify dashboards
- **Documentation**: All services have great docs

---

## 🎊 You Did It!

**Congratulations!** You now have a **professional AI support website** running completely **FREE** and helping users worldwide!

### Share Your Success:
- ⭐ **Star this repository** if it helped you
- 🔄 **Share with friends** who need AI chatbots
- 💼 **Add to your portfolio** as a live project
- 📱 **Test on your phone** - it works everywhere!

---

**🚀 Ready to deploy? Run `./deploy.bat` and follow the guide!**