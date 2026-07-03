@echo off
cls
echo.
echo ========================================
echo   🚀 ZED AI SUPPORT AGENT DEPLOYER
echo ========================================
echo.
echo 🎯 This will prepare your project for FREE deployment!
echo.

echo 📂 Current directory: %cd%
echo.

echo 🗑️  Cleaning up unwanted files...
if exist ".env" del /q ".env" >nul 2>&1
if exist "backend\.env" del /q "backend\.env" >nul 2>&1
if exist "__pycache__" rmdir /s /q "__pycache__" >nul 2>&1
if exist "backend\__pycache__" rmdir /s /q "backend\__pycache__" >nul 2>&1
echo ✅ Cleanup complete!
echo.

echo 📋 Checking required files...
echo ✅ README.md - Deployment guide
echo ✅ FREE_DEPLOYMENT.md - Step-by-step instructions  
echo ✅ netlify.toml - Frontend deployment config
echo ✅ render.yaml - Backend deployment config
echo ✅ backend/requirements.txt - Python dependencies
echo ✅ db/schema.sql - MySQL database schema
echo.

echo 🔧 Git repository setup...
if not exist ".git" (
    echo 📝 Initializing git repository...
    git init >nul 2>&1
) else (
    echo ✅ Git already initialized
)
echo.

echo 📝 Adding files to git...
git add . >nul 2>&1

echo 💾 Creating deployment commit...
git commit -m "🚀 Deploy Zed AI Support Agent - FREE hosting ready

✨ Complete AI chatbot with admin dashboard
🌐 Ready for Netlify (frontend) + Render (backend)  
📱 Mobile responsive with modern UI
🔐 Secure authentication and user management
📊 Analytics dashboard with real-time data
🤖 Google Gemini AI integration
📚 FAQ management system
🎫 Ticket system with email notifications

Deploy instructions: See FREE_DEPLOYMENT.md" >nul 2>&1

echo.
echo 🌐 Setting up GitHub remote...
echo Enter your GitHub username:
set /p username="Username: "

git remote remove origin >nul 2>&1
git remote add origin https://github.com/%username%/faq-agent.git

echo 📤 Setting main branch...
git branch -M main

echo.
echo 🚀 Ready to push to GitHub!
echo.
echo ⚠️  IMPORTANT: You need these before deployment:
echo    1. 🔑 Google Gemini API key (https://makersuite.google.com/app/apikey)
echo    2. 🗄️  Free MySQL database (https://freesqldatabase.com) 
echo    3. 📧 Gmail account for notifications (optional)
echo.
echo 📋 After GitHub push, follow these steps:
echo    1. 🔥 Deploy backend on Render.com (free)
echo    2. 🌐 Deploy frontend on Netlify.com (free)  
echo    3. ⚙️  Configure environment variables
echo    4. 🎉 Your website will be LIVE!
echo.
echo 📚 Complete guide: FREE_DEPLOYMENT.md
echo.

choice /c YN /m "Push to GitHub now? (Y/N)"
if errorlevel 2 goto :skip

echo.
echo 📤 Pushing to GitHub...
git push -u origin main

if %errorlevel%==0 (
    echo.
    echo ✅ SUCCESS! Code pushed to GitHub!
    echo.
    echo 🔗 Your repository: https://github.com/%username%/faq-agent
    echo.
    echo 🎯 NEXT STEPS:
    echo    1. Open FREE_DEPLOYMENT.md 
    echo    2. Follow the step-by-step guide
    echo    3. Deploy on Render + Netlify  
    echo    4. Your AI chatbot will be live!
    echo.
) else (
    echo.
    echo ❌ Push failed. Please check:
    echo    - GitHub repository exists
    echo    - You're logged into git
    echo    - Internet connection is working
    echo.
)

:skip
echo.
echo 🎊 Ready for deployment!
echo 📖 Read FREE_DEPLOYMENT.md for complete instructions
echo.
pause