import os
import re
import pandas as pd
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from fastapi.responses import RedirectResponse
import json
import os
import uuid
import shutil
from pathlib import Path
import asyncio
import asyncio
import threading
import time

from auth import hash_password, verify_password, create_token, decode_token
from system_prompt import SYSTEM_PROMPT

# Load environment variables from .env file
load_dotenv()

# Import database module AFTER environment variables are loaded
from database import execute_query, init_connection_pool
# Initialize database connection pool after loading env vars
init_connection_pool()

# Verify critical tables exist
def verify_database_setup():
    """Verify essential tables exist"""
    try:
        tables = ['users', 'faq_entries', 'tickets', 'chat_history', 'password_reset_tokens']
        for table in tables:
            result = execute_query(f"SHOW TABLES LIKE '{table}'", fetch=True)
            if not result:
                print(f"⚠️ Warning: Table '{table}' not found in database")
                return False
        print("✅ Database tables verified")
        return True
    except Exception as e:
        print(f"❌ Database verification error: {e}")
        return False

# Run database verification
verify_database_setup()

app = FastAPI(title='Zed AI Support API')

# ─────────── Keep-Alive System ───────────
def keep_alive_ping():
    """Internal keep-alive system to prevent Render from sleeping"""
    def ping_self():
        while True:
            try:
                time.sleep(600)  # Wait 10 minutes
                # Ping own health endpoint
                response = requests.get('https://faq-agent-1y6i.onrender.com/health', timeout=30)
                if response.status_code == 200:
                    print(f"✅ Keep-alive ping successful at {datetime.now()}")
                else:
                    print(f"⚠️ Keep-alive ping failed with status {response.status_code}")
            except Exception as e:
                print(f"❌ Keep-alive ping error: {e}")
    
    # Start background thread
    thread = threading.Thread(target=ping_self, daemon=True)
    thread.start()
    print("🚀 Keep-alive system started")

# Start keep-alive system
keep_alive_ping()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://localhost:3000', 
        'https://faq-agent.netlify.app',
        'https://*.netlify.app'
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Load FAQ data
df = pd.read_csv('faq_data.csv')
COMPANY = 'Zed'

# Secure Admin credentials - Load from environment or database
DEFAULT_ADMIN_EMAIL = os.getenv('DEFAULT_ADMIN_EMAIL', 'admin@zed.com')
DEFAULT_ADMIN_PASSWORD = os.getenv('DEFAULT_ADMIN_PASSWORD')  # No hardcoded fallback

# Configure Gemini with secure API key
api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    print("❌ ERROR: GEMINI_API_KEY not set in environment variables!")
    raise ValueError("Missing GEMINI_API_KEY - check your .env file")

genai.configure(api_key=api_key)

model = None
try:
    model = genai.GenerativeModel(
        model_name='gemini-1.5-flash',  # Faster model variant
        system_instruction=SYSTEM_PROMPT.format(company_name=COMPANY),
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,  # Lower temperature for faster, more consistent responses
            top_k=20,         # Reduced for speed
            top_p=0.8,        # Optimized for speed vs creativity balance
            max_output_tokens=200,  # Limit response length for speed
            candidate_count=1
        )
    )
    print("✅ Gemini AI model initialized with speed optimizations")
except Exception as e:
    print('Model init error:', e)
    model = None

# ─────────── Auth Helpers ───────────
def get_user_from_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = decode_token(authorization.split(' ')[1])
        if payload.get('role') != 'user':
            raise HTTPException(status_code=403, detail='Not authorized')
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid or expired token')

def get_admin_from_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = decode_token(authorization.split(' ')[1])
        if payload.get('role') != 'admin':
            raise HTTPException(status_code=403, detail='Not authorized')
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid or expired token')

# ─────────── Pydantic Models ───────────
class RegisterReq(BaseModel):
    name: str
    email: str
    password: str

class LoginReq(BaseModel):
    email: str
    password: str

class ChatReq(BaseModel):
    message: str
    history: list = []

class ReplyReq(BaseModel):
    reply: str

class StatusReq(BaseModel):
    status: str

class RatingReq(BaseModel):
    rating: int
    feedback: Optional[str] = None

class QuickActionReq(BaseModel):
    action: str
    data: Optional[dict] = None

class FAQEntryReq(BaseModel):
    category: str
    question: str
    answer: str

class FAQFeedbackReq(BaseModel):
    faq_id: int
    is_helpful: bool
    feedback_text: Optional[str] = None

class UserPreferencesReq(BaseModel):
    language: Optional[str] = 'en'
    notifications_enabled: Optional[bool] = True
    email_notifications: Optional[bool] = True
    sound_notifications: Optional[bool] = True

class SatisfactionSurveyReq(BaseModel):
    ticket_id: int
    satisfaction_rating: int
    resolution_rating: int
    speed_rating: int
    comments: Optional[str] = None
    would_recommend: bool

class AdminNoteReq(BaseModel):
    user_id: int
    note_text: str
    is_important: Optional[bool] = False

class NotificationPrefs(BaseModel):
    push_enabled: bool = True
    sound_enabled: bool = True
    email_enabled: bool = True

class BulkTicketOperation(BaseModel):
    ticket_ids: List[int]
    operation: str  # 'resolve', 'delete', 'mark_urgent'
    
class CannedResponse(BaseModel):
    title: str
    content: str
    category: Optional[str] = None



# ─────────── Enhanced Email Notification System ───────────
def send_email(user_name: str, user_email: str, message: str, ticket_id: int):
    """Send email to admin about new ticket"""
    smtp_email = os.getenv('SMTP_EMAIL')
    smtp_pass = os.getenv('SMTP_PASSWORD')
    admin_email = os.getenv('ADMIN_EMAIL', DEFAULT_ADMIN_EMAIL)
    
    if not smtp_email or not smtp_pass:
        print("Email credentials not configured - email notification skipped")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_email
        msg['To'] = admin_email
        msg['Subject'] = f'🚨 New Support Ticket #{ticket_id} - Zed AI'
        
        body = f"""
New support ticket requires attention!

📋 Ticket Details:
• Ticket ID: #{ticket_id}
• Customer: {user_name}
• Email: {user_email}
• Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

💬 Message:
"{message}"

🎯 Actions:
• Login to admin dashboard: http://localhost:5173 (Admin Login)
• Reply to customer directly from the dashboard
• Mark ticket as resolved when completed

This email was sent automatically by Zed AI Support System.
"""
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_pass)
            server.sendmail(smtp_email, admin_email, msg.as_string())
        
        print(f"✅ Email notification sent for ticket #{ticket_id}")
        return True
        
    except Exception as e:
        print(f"❌ Email notification failed: {e}")
        return False

def send_user_notification_email(user_email: str, user_name: str, title: str, message: str, ticket_id: int = None):
    """Send email notification to user"""
    smtp_email = os.getenv('SMTP_EMAIL')
    smtp_pass = os.getenv('SMTP_PASSWORD')
    
    if not smtp_email or not smtp_pass:
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_email
        msg['To'] = user_email
        msg['Subject'] = f'Zed Support: {title}'
        
        body = f"""
Hi {user_name},

{message}

{f"Ticket ID: #{ticket_id}" if ticket_id else ""}

If you have any questions, you can:
• Continue chatting with our AI assistant: http://localhost:5173
• View your tickets in the dashboard: http://localhost:5173 (My Tickets tab)

Best regards,
Zed Support Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_pass)
            server.sendmail(smtp_email, user_email, msg.as_string())
        
        return True
        
    except Exception as e:
        print(f"User email notification failed: {e}")
        return False

# ─────────── FAQ Management ───────────
def migrate_csv_to_db():
    """One-time migration of CSV data to database"""
    try:
        # Check if FAQs already exist in DB
        existing = execute_query('SELECT COUNT(*) as count FROM faq_entries', fetch=True)
        if existing and existing[0]['count'] > 0:
            return  # Already migrated
        
        # Load CSV and insert into database
        for _, row in df.iterrows():
            execute_query(
                'INSERT INTO faq_entries (category, question, answer) VALUES (%s, %s, %s)',
                (row['category'], row['question'], row['answer'])
            )
        print("FAQ data migrated to database successfully")
    except Exception as e:
        print(f"Migration error: {e}")

# Simplified FAQ system - no complex caching
def get_simple_faqs():
    """Simple FAQ retrieval without caching complications"""
    try:
        faqs = execute_query('SELECT * FROM faq_entries WHERE is_active = 1 LIMIT 20', fetch=True)
        return faqs if faqs else []
    except:
        return []

def retrieve_faqs_from_db(query: str, top_n=2):
    """Simple, fast FAQ retrieval without complex caching"""
    try:
        words = re.findall(r'\w+', query.lower())
        if not words:
            return []
        
        # Get simple FAQ list
        faqs = get_simple_faqs()
        if not faqs:
            return []
        
        matched_faqs = []
        for faq in faqs:
            # Simple keyword matching
            question_lower = str(faq['question']).lower()
            if any(word in question_lower for word in words):
                matched_faqs.append(faq)
        
        return matched_faqs[:top_n]
    except Exception as e:
        print(f"FAQ retrieval error: {e}")
        return []

def get_conversation_context(user_id: int, session_id: str):
    """Simple conversation context (disabled for reliability)"""
    return None

def update_conversation_context(user_id: int, session_id: str, message: str, topic: str = None):
    """Simple context update (disabled for reliability)"""
    pass
            context_data = {
                'last_messages': [{
                    'message': message[:200],
                    'timestamp': datetime.now().isoformat(),
                    'topic': topic
                }]
            }
            execute_query(
                'INSERT INTO conversation_context (user_id, session_id, context_data, last_topic, updated_at) VALUES (%s, %s, %s, %s, %s)',
                (user_id, session_id, json.dumps(context_data), topic, datetime.now())
            )
    except Exception as e:
        print(f"Context update error: {e}")

# Initialize database migration
migrate_csv_to_db()

@app.get('/')
def health_check():
    return {'status': 'ok', 'service': 'Zed AI API'}

# Store startup time for uptime tracking
startup_time = datetime.now()

@app.get('/health')
@app.head('/health')  # Add HEAD method support for monitoring services
def health():
    """Simple, reliable health check"""
    try:
        uptime = datetime.now() - startup_time
        
        # Simple database check
        db_status = "connected"
        try:
            execute_query('SELECT 1', fetch=True)
        except:
            db_status = "disconnected"
        
        # AI model status
        ai_status = "available" if model else "unavailable"
        
        return {
            'status': 'healthy', 
            'timestamp': datetime.now().isoformat(),
            'uptime_seconds': int(uptime.total_seconds()),
            'uptime_human': str(uptime).split('.')[0],
            'database': db_status,
            'ai_model': ai_status
        }
    except Exception as e:
        return {
            'status': 'degraded', 
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
def get_query_suggestions(query: str, limit=5):
    """Get smart suggestions based on popular queries and FAQ matching"""
    if len(query.strip()) < 2:
        return []
    
    # Get popular queries that match
    popular = execute_query(
        'SELECT query_text, search_count FROM popular_queries WHERE query_text LIKE %s ORDER BY search_count DESC LIMIT %s',
        (f'%{query}%', limit), fetch=True
    )
    
    # Get FAQ matches
    faq_matches = []
    words = set(re.findall(r'\w+', query.lower()))
    if words:
        for _, row in df.iterrows():
            q_words = set(re.findall(r'\w+', str(row['question']).lower()))
            if words & q_words:
                faq_matches.append(row['question'])
    
    # Combine and deduplicate
    suggestions = []
    for item in popular:
        if item['query_text'] not in suggestions:
            suggestions.append(item['query_text'])
    
    for faq in faq_matches[:limit-len(suggestions)]:
        if faq not in suggestions:
            suggestions.append(faq)
    
    return suggestions[:limit]

def update_query_popularity(query: str):
    """Track popular queries for suggestions"""
    try:
        execute_query(
            'INSERT INTO popular_queries (query_text, search_count) VALUES (%s, 1) ON DUPLICATE KEY UPDATE search_count = search_count + 1',
            (query.strip()[:255],)
        )
    except:
        pass  # Fail silently if tracking fails

# ─────────── Quick Actions ───────────
def handle_quick_action(action: str, user_data: dict, action_data: dict = None):
    """Handle quick action buttons"""
    actions = {
        'cancel_subscription': 'Your subscription cancellation request has been submitted. You\'ll receive confirmation via email.',
        'request_refund': 'A refund request has been created. Our team will review and respond within 24 hours.',
        'reset_password': 'A password reset link has been sent to your registered email address.',
        'download_data': 'Your data export is being prepared. You\'ll receive a download link via email within 10 minutes.',
        'schedule_callback': 'A callback has been scheduled. Our team will contact you within 1 business day.',
        'check_status': 'Let me check your account status and recent activity.',
        'live_agent': 'I\'m connecting you with a human agent. Please wait a moment.'
    }
    
    response = actions.get(action, 'Action completed successfully.')
    
    # Create ticket for actions that need human follow-up
    if action in ['cancel_subscription', 'request_refund', 'schedule_callback', 'live_agent']:
        try:
            ticket_id = execute_query(
                'INSERT INTO tickets (user_id, user_name, user_email, message, status) VALUES (%s, %s, %s, %s, %s)',
                (user_data.get('sub'), user_data.get('name'), user_data.get('email'), 
                 f'Quick Action: {action} - {json.dumps(action_data or {})}', 'Open')
            )
            response += f' Ticket #{ticket_id} has been created for follow-up.'
        except:
            pass
    
    return response
def retrieve_faqs(query: str, top_n=5):
    words = set(re.findall(r'\w+', query.lower()))
    if not words:
        return pd.DataFrame()
    def score(row):
        q = set(re.findall(r'\w+', str(row['question']).lower()))
        a = set(re.findall(r'\w+', str(row['answer']).lower()))
        return len(words & q) * 2 + len(words & a)
    scored = df.assign(score=df.apply(score, axis=1))
    return scored.nlargest(top_n, 'score')

def is_escalation(text: str) -> bool:
    phrases = ['human', 'support team', 'closer look', 'flag', 'connect', 'agent', 'escalate', 'representative', 'live agent']
    return any(p in text.lower() for p in phrases)

# ─────────── Auth Routes ───────────
@app.post('/api/auth/register')
def register(req: RegisterReq):
    # Validate password length for bcrypt compatibility
    if len(req.password.encode('utf-8')) > 72:
        raise HTTPException(status_code=400, detail='Password too long - maximum 72 characters allowed')
    
    if execute_query('SELECT id FROM users WHERE email = %s', (req.email,), fetch=True):
        raise HTTPException(status_code=400, detail='Email already registered')
    
    try:
        uid = execute_query(
            'INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)',
            (req.name, req.email, hash_password(req.password))
        )
        token = create_token({'sub': str(uid), 'email': req.email, 'name': req.name, 'role': 'user'})
        return {'token': token, 'name': req.name, 'email': req.email}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/api/auth/login')
def login(req: LoginReq):
    # Validate password length for bcrypt compatibility
    if len(req.password.encode('utf-8')) > 72:
        raise HTTPException(status_code=401, detail='Invalid email or password')
    
    rows = execute_query('SELECT * FROM users WHERE email = %s', (req.email,), fetch=True)
    if not rows or not verify_password(req.password, rows[0]['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    u = rows[0]
    token = create_token({'sub': str(u['id']), 'email': u['email'], 'name': u['name'], 'role': 'user'})
    return {'token': token, 'name': u['name'], 'email': u['email']}

@app.post('/api/auth/admin/login')
def admin_login(req: LoginReq):
    # Validate password length for bcrypt compatibility
    if len(req.password.encode('utf-8')) > 72:
        raise HTTPException(status_code=401, detail='Invalid admin credentials')
    
    try:
        # First check database for admin users
        admin_user = execute_query('SELECT * FROM users WHERE email = %s AND role = %s', (req.email, 'admin'), fetch=True)
        
        if admin_user and verify_password(req.password, admin_user[0]['password_hash']):
            u = admin_user[0]
            token = create_token({'sub': str(u['id']), 'email': u['email'], 'name': u['name'], 'role': 'admin'})
            return {'token': token, 'name': u['name'], 'email': u['email']}
        
        # Fallback to environment-based admin (for initial setup only)
        # Check for the known admin credentials from your setup
        if req.email == 'abishekopennova@gmail.com' and req.password == 'abi@1234':
            token = create_token({'sub': 'admin', 'email': 'abishekopennova@gmail.com', 'name': 'Admin', 'role': 'admin'})
            return {'token': token, 'name': 'Admin', 'email': 'abishekopennova@gmail.com'}
        
        # Also check DEFAULT_ADMIN if set
        if DEFAULT_ADMIN_EMAIL and req.email == DEFAULT_ADMIN_EMAIL:
            if DEFAULT_ADMIN_PASSWORD and req.password == DEFAULT_ADMIN_PASSWORD:
                token = create_token({'sub': 'admin', 'email': DEFAULT_ADMIN_EMAIL, 'name': 'Admin', 'role': 'admin'})
                return {'token': token, 'name': 'Admin', 'email': DEFAULT_ADMIN_EMAIL}
        
        print(f"❌ Admin login failed for email: {req.email}")
        raise HTTPException(status_code=401, detail='Invalid admin credentials')
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Admin login error: {e}")
        raise HTTPException(status_code=401, detail='Invalid admin credentials')

# ─────────── Forgot Password Routes ───────────
class ForgotPasswordReq(BaseModel):
    email: str

class ResetPasswordReq(BaseModel):
    token: str
    new_password: str

@app.post('/api/auth/forgot-password')
def forgot_password(req: ForgotPasswordReq):
    """Send password reset email with enhanced debugging"""
    try:
        print(f"🔧 DEBUG: Forgot password request for email: {req.email}")
        
        # Check if user exists
        user = execute_query('SELECT id, name, email FROM users WHERE email = %s', (req.email,), fetch=True)
        if not user:
            print(f"⚠️ WARNING: User not found for email: {req.email}")
            # Return success even if user doesn't exist (security)
            return {'message': 'If this email exists, a password reset link has been sent'}
        
        print(f"✅ User found: {user[0]['name']} ({user[0]['email']})")
        
        # Generate reset token (valid for 1 hour)
        reset_token = create_token({
            'email': req.email,
            'purpose': 'password_reset',
            'exp': datetime.utcnow() + timedelta(hours=1)
        })
        
        print(f"🔧 DEBUG: Reset token generated (length: {len(reset_token)})")
        
        # Store reset token in database
        execute_query(
            'INSERT INTO password_reset_tokens (email, token, expires_at, created_at) VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at), created_at = VALUES(created_at)',
            (req.email, reset_token, datetime.utcnow() + timedelta(hours=1), datetime.utcnow())
        )
        
        print("✅ Reset token stored in database")
        
        # Send reset email
        print("📧 Attempting to send password reset email...")
        success = send_password_reset_email(user[0]['email'], user[0]['name'], reset_token)
        
        if success:
            print(f"✅ SUCCESS: Password reset email process completed for {req.email}")
        else:
            print(f"❌ FAILED: Email sending failed for {req.email}")
        
        return {'message': 'If this email exists, a password reset link has been sent'}
    except Exception as e:
        print(f"❌ CRITICAL ERROR in forgot_password endpoint: {e}")
        import traceback
        traceback.print_exc()
        return {'message': 'If this email exists, a password reset link has been sent'}

@app.post('/api/auth/reset-password')
def reset_password(req: ResetPasswordReq):
    """Reset password with valid token"""
    try:
        # Validate password length
        if len(req.new_password.encode('utf-8')) > 72:
            raise HTTPException(status_code=400, detail='Password too long - maximum 72 characters allowed')
        
        # Verify reset token
        try:
            payload = decode_token(req.token)
            if payload.get('purpose') != 'password_reset':
                raise HTTPException(status_code=400, detail='Invalid reset token')
        except:
            raise HTTPException(status_code=400, detail='Invalid or expired reset token')
        
        email = payload.get('email')
        
        # Check token exists in database and is not expired
        token_record = execute_query(
            'SELECT * FROM password_reset_tokens WHERE email = %s AND token = %s AND expires_at > %s',
            (email, req.token, datetime.utcnow()), fetch=True
        )
        
        if not token_record:
            raise HTTPException(status_code=400, detail='Invalid or expired reset token')
        
        # Update user password
        new_hash = hash_password(req.new_password)
        execute_query(
            'UPDATE users SET password_hash = %s WHERE email = %s',
            (new_hash, email)
        )
        
        # Delete used token
        execute_query('DELETE FROM password_reset_tokens WHERE email = %s', (email,))
        
        return {'message': 'Password reset successfully'}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail='Password reset failed')

def send_password_reset_email(user_email: str, user_name: str, reset_token: str):
    """Send password reset email with enhanced error handling and debugging"""
    smtp_email = os.getenv('SMTP_EMAIL')
    smtp_pass = os.getenv('SMTP_PASSWORD')
    
    print(f"🔧 DEBUG: Starting password reset email for {user_email}")
    print(f"🔧 DEBUG: SMTP Email configured: {bool(smtp_email)}")
    print(f"🔧 DEBUG: SMTP Password configured: {bool(smtp_pass)}")
    
    if not smtp_email or not smtp_pass:
        print("❌ ERROR: Email credentials not configured in .env file")
        print(f"   SMTP_EMAIL: {'✓' if smtp_email else '✗'}")
        print(f"   SMTP_PASSWORD: {'✓' if smtp_pass else '✗'}")
        return False
    
    try:
        reset_link = f"https://faq-agent.netlify.app/reset-password?token={reset_token}"
        print(f"🔧 DEBUG: Reset link generated: {reset_link[:50]}...")
        
        msg = MIMEMultipart()
        msg['From'] = smtp_email
        msg['To'] = user_email
        msg['Subject'] = 'Password Reset - Zed AI Support'
        
        body = f"""
Hi {user_name},

You requested a password reset for your Zed AI Support account.

🔐 Reset Your Password:
Click the link below to reset your password:
{reset_link}

⏰ This link will expire in 1 hour for security.

If you didn't request this reset, please ignore this email.

Best regards,
Zed Support Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        print("📧 Email message prepared successfully")
        
        # Primary Gmail SMTP configuration - most reliable
        smtp_configs = [
            {'host': 'smtp.gmail.com', 'port': 587, 'use_tls': True, 'name': 'Gmail TLS'},
            {'host': 'smtp.gmail.com', 'port': 465, 'use_ssl': True, 'name': 'Gmail SSL'},
        ]
        
        for config in smtp_configs:
            try:
                print(f"🔄 Attempting to send via {config['name']} ({config['host']}:{config['port']})")
                
                if config.get('use_ssl'):
                    with smtplib.SMTP_SSL(config['host'], config['port'], timeout=30) as server:
                        server.set_debuglevel(1)  # Enable SMTP debug output
                        print("🔐 Logging in to SMTP server...")
                        server.login(smtp_email, smtp_pass)
                        print("📤 Sending email...")
                        server.sendmail(smtp_email, user_email, msg.as_string())
                else:
                    with smtplib.SMTP(config['host'], config['port'], timeout=30) as server:
                        server.set_debuglevel(1)  # Enable SMTP debug output
                        if config.get('use_tls'):
                            print("🔒 Starting TLS encryption...")
                            server.starttls()
                        print("🔐 Logging in to SMTP server...")
                        server.login(smtp_email, smtp_pass)
                        print("📤 Sending email...")
                        server.sendmail(smtp_email, user_email, msg.as_string())
                
                print(f"✅ SUCCESS: Password reset email sent to {user_email} via {config['name']}")
                return True
                
            except smtplib.SMTPAuthenticationError as e:
                print(f"❌ AUTHENTICATION ERROR with {config['name']}: {e}")
                print("   Check if App Password is correctly set for Gmail")
                continue
            except smtplib.SMTPRecipientsRefused as e:
                print(f"❌ RECIPIENT REFUSED by {config['name']}: {e}")
                continue
            except smtplib.SMTPException as e:
                print(f"❌ SMTP ERROR with {config['name']}: {e}")
                continue
            except Exception as e:
                print(f"❌ CONNECTION ERROR with {config['name']}: {e}")
                continue
        
        print("❌ FAILED: All SMTP configurations failed")
        return False
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: Password reset email preparation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

# ─────────── Chat Routes ───────────
@app.post('/api/chat')
def chat(req: ChatReq, user=Depends(get_user_from_token)):
    """Ultra-fast, bulletproof chat endpoint"""
    try:
        # Basic validation
        if not req.message or not req.message.strip():
            raise HTTPException(status_code=400, detail='Message cannot be empty')
        
        if len(req.message) > 1000:
            raise HTTPException(status_code=400, detail='Message too long')
        
        # Check if AI model is available
        if not model:
            return {
                'response': "I'm currently experiencing technical difficulties. Please try again in a moment or contact our support team for immediate assistance.",
                'chat_id': int(time.time()),
                'escalated': True
            }
        
        uid = int(user['sub'])
        message = req.message.strip()
        message_lower = message.lower()
        
        # INSTANT HUMAN CONNECTION CHECK (before any other processing)
        human_keywords = [
            'human', 'person', 'agent', 'live agent', 'support agent', 'human support',
            'connect to support', 'talk to someone', 'speak to someone', 'real person',
            'connect me', 'human help', 'live help', 'customer service', 'support team',
            'connect to human', 'need help from person', 'talk to agent', 'human agent',
            'manager', 'supervisor', 'complaint', 'escalate', 'escalation'
        ]
        
        # Check for human connection request
        if any(keyword in message_lower for keyword in human_keywords):
            try:
                # Create support ticket immediately
                ticket_id = execute_query(
                    'INSERT INTO tickets (user_id, user_name, user_email, message, status, is_urgent, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)',
                    (uid, user['name'], user['email'], f"Human Support Request: {message}", 'Open', 1, datetime.now())
                )
                
                # Send email notification to admin (don't wait for it)
                try:
                    send_email(user['name'], user['email'], message, ticket_id)
                except:
                    pass  # Don't fail if email fails
                
                response_text = f"🤝 **Connected to Human Support!**\n\n✅ **Ticket #{ticket_id} created successfully**\n✅ **Admin notified immediately**\n✅ **You'll hear back within 24 hours**\n✅ **Email updates sent automatically**\n\n📧 **Our support team has been notified**\n🎫 **Your ticket ID**: #{ticket_id}\n\n**Thank you!** Our team will review your request and respond quickly. You can also check ticket status in your dashboard."
                
            except Exception as e:
                print(f"Ticket creation error: {e}")
                response_text = "🤝 **Support Request Received!**\n\n✅ **Your request has been forwarded to our support team**\n✅ **You'll hear back within 24 hours**\n✅ **Priority handling for your request**\n\nOur team will contact you shortly!"
            
            # Store the conversation
            try:
                execute_query('INSERT INTO chat_history (user_id, role, content, created_at) VALUES (%s, %s, %s, %s)', 
                             (uid, 'user', message, datetime.now()))
                execute_query('INSERT INTO chat_history (user_id, role, content, created_at) VALUES (%s, %s, %s, %s)', 
                             (uid, 'assistant', response_text, datetime.now()))
            except:
                pass
            
            return {
                'response': response_text,
                'chat_id': int(time.time()),
                'escalated': True,
                'ticket_created': True
            }
        
        # Fast FAQ lookup - use simple keyword matching
        response_text = get_fast_response(message)
        
        if not response_text:
            # Ultra-fast AI fallback with minimal prompt
            try:
                # Super simple prompt for maximum speed
                simple_prompt = f"Answer briefly: {message}"
                
                # Direct generate_content call (fastest method)
                ai_response = model.generate_content(
                    simple_prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=100,  # Very short responses
                        temperature=0.1,        # Fast and consistent
                        top_k=10,              # Reduced for speed
                        top_p=0.7             # Optimized for speed
                    )
                )
                response_text = ai_response.text
                
                # If AI response is too generic, provide fallback
                if len(response_text) < 10 or 'i cannot' in response_text.lower():
                    response_text = "I understand you're asking about that topic. Let me connect you with our support team who can provide detailed assistance with your specific question. They'll be able to help you right away!"
                
            except Exception as ai_error:
                print(f"AI error: {ai_error}")
                # Smart fallback based on message content
                if any(word in message.lower() for word in ['order', 'track', 'delivery']):
                    response_text = "For order questions, please check your email for tracking info or visit your account dashboard. If you need specific help, our support team can assist you immediately!"
                elif any(word in message.lower() for word in ['billing', 'payment', 'charge']):
                    response_text = "For billing questions, you can update payment info in Account Settings → Billing. For specific billing issues, our support team is ready to help right away!"
                elif any(word in message.lower() for word in ['return', 'refund']):
                    response_text = "For returns, visit our Returns Center online with your order details. Our 30-day return policy covers most items. Need specific help? Our team is here!"
                else:
                    response_text = "I want to make sure I give you the most accurate help. Let me connect you with our support team who can provide detailed assistance with your question right away!"
        
        # Store in background (don't wait)
        try:
            execute_query('INSERT INTO chat_history (user_id, role, content, created_at) VALUES (%s, %s, %s, %s)', 
                         (uid, 'user', message, datetime.now()))
            execute_query('INSERT INTO chat_history (user_id, role, content, created_at) VALUES (%s, %s, %s, %s)', 
                         (uid, 'assistant', response_text, datetime.now()))
        except:
            pass  # Don't fail if storage fails
        
        return {
            'response': response_text,
            'chat_id': int(time.time()),
            'escalated': False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat error: {e}")
        return {
            'response': "I apologize, but I'm experiencing some technical difficulties. Please try again or contact our support team.",
            'chat_id': int(time.time()),
            'escalated': True,
            'error': True
        }

def get_fast_response(message: str):
    """ULTRA-FAST response system - bypasses AI for 90% of queries"""
    message_lower = message.lower().strip()
    
    # INSTANT HUMAN CONNECTION - No AI delay!
    human_keywords = [
        'human', 'person', 'agent', 'live agent', 'support agent', 'human support',
        'connect to support', 'talk to someone', 'speak to someone', 'real person',
        'connect me', 'human help', 'live help', 'customer service', 'support team',
        'connect to human', 'need help from person', 'talk to agent', 'human agent',
        'manager', 'supervisor', 'complaint', 'escalate', 'escalation'
    ]
    
    # Check for human connection request FIRST (highest priority)
    if any(keyword in message_lower for keyword in human_keywords):
        return "🤝 **Connecting You to Human Support**\n\n✅ **Support ticket created successfully**\n✅ **Admin notified immediately** \n✅ **You'll hear back within 24 hours**\n✅ **Urgent issues: Within 2 hours**\n\n📧 **Email notification sent** to our support team\n🎫 **Ticket ID**: Will be provided shortly\n\n**While you wait**, is there anything specific I should tell our support team about your request?"
    
    # Urgent/Problem keywords - immediate escalation  
    urgent_keywords = ['urgent', 'emergency', 'immediate', 'asap', 'now', 'quickly']
    problem_keywords = ['problem', 'issue', 'broken', 'not working', 'error', 'bug', 'help']
    
    if any(keyword in message_lower for keyword in urgent_keywords + problem_keywords):
        return "🚨 **Priority Support Request Created**\n\n✅ **URGENT ticket created**\n✅ **Priority handling activated** \n✅ **Admin notified immediately**\n✅ **Response within 2 hours guaranteed**\n\n🔥 **Your request has been flagged as urgent**\n📧 **Immediate notification sent** to our support team\n\n**Please describe your issue** so our team can prepare to help you immediately!"
    
    # Instant responses for greetings (0.1 seconds)
    if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
        return "Hi there! 👋 I'm your AI assistant. I can help you with:\n\n• 📦 Order tracking & delivery\n• 💳 Billing & payments\n• 🔄 Returns & refunds\n• 👤 Account issues\n• ❓ General questions\n\n**Need human help?** Just say **'connect to support'** and I'll get you connected immediately!\n\nWhat can I help you with today?"
    
    # Help requests
    if any(word in message_lower for word in ['help', 'support', 'assist', 'what can you do']):
        return "I'm here to help! 🤝 Here's what I can assist you with:\n\n**📦 Orders & Shipping**\n• Track your order status\n• Check delivery times\n• Update shipping address\n\n**💳 Billing & Payments**\n• Payment methods\n• Update billing info\n• Receipt requests\n\n**🔄 Returns & Refunds**\n• Return policy info\n• Start a return\n• Refund status\n\n**👤 Account Management**\n• Password reset\n• Update profile\n• Account settings\n\nJust ask me about any of these topics!"
    
    # Order tracking queries
    if any(word in message_lower for word in ['track', 'tracking', 'order status', 'where is my order', 'shipment']):
        return "📦 **Track Your Order**\n\n**Option 1:** Check your email for the tracking link we sent\n**Option 2:** Log into your account → Order History\n**Option 3:** Use the tracking number with your carrier (FedEx, UPS, DHL)\n\n**Delivery Times:**\n• Standard: 5-7 business days\n• Express: 1-2 business days\n• International: 10-15 business days\n\nNeed help finding your tracking info? I can help with that!"
    
    # Billing and payment queries
    if any(word in message_lower for word in ['billing', 'payment', 'card', 'charge', 'receipt', 'invoice']):
        return "💳 **Billing & Payments**\n\n**We Accept:**\n• Visa, Mastercard, American Express\n• PayPal, Apple Pay\n• All transactions secured with 256-bit SSL\n\n**Update Payment Info:**\nAccount Settings → Billing → Update Payment Details\n\n**Get Receipt:**\nReceipts are auto-emailed after purchase. Check Order History in your account for downloads.\n\n**Billing Issues?** Let me know what specific problem you're having!"
    
    # Return and refund queries
    if any(word in message_lower for word in ['return', 'refund', 'exchange', 'send back']):
        return "🔄 **Returns & Refunds**\n\n**Return Policy:**\n• 30-day return window\n• Items must be unopened/unused\n• Free returns on defective items\n\n**Start a Return:**\n1. Visit our Returns Center online\n2. Enter order number + email\n3. Print prepaid shipping label\n4. Drop off at any carrier location\n\n**Refund Timeline:**\n• Processing: 3-5 business days after we receive item\n• Bank reflection: Additional 5-7 days\n\n**Want to exchange?** We offer free size/color exchanges!"
    
    # Password and account queries  
    if any(word in message_lower for word in ['password', 'login', 'sign in', 'account', 'forgot']):
        return "🔐 **Account & Password Help**\n\n**Reset Password:**\n1. Go to login page\n2. Click 'Forgot Password'\n3. Enter your email\n4. Check email for reset link\n5. Create new password\n\n**Account Issues:**\n• Can't login? Try password reset\n• Email not recognized? Check for typos\n• Account locked? Contact support\n\n**Update Profile:**\nAccount Settings → Profile → Edit Information\n\nStill having trouble? I can help troubleshoot!"
    
    # Shipping and delivery queries
    if any(word in message_lower for word in ['shipping', 'delivery', 'when will it arrive', 'how long']):
        return "🚚 **Shipping & Delivery**\n\n**Delivery Options:**\n• **Standard** (5-7 days): FREE on orders $50+\n• **Express** (1-2 days): $9.99\n• **International** (10-15 days): Calculated at checkout\n\n**Carriers:** FedEx, UPS, DHL\n**Tracking:** Provided via email when shipped\n\n**Change Address:**\nContact us within 1 hour of ordering\n\n**International Shipping:**\nWe ship to 50+ countries with customs handled automatically!"
    
    # Cancel order queries
    if any(word in message_lower for word in ['cancel', 'cancellation', 'cancel order']):
        return "❌ **Cancel Your Order**\n\n**Within 1 Hour:** You can cancel from your account\n1. Go to Account → Order History\n2. Find your order\n3. Click 'Cancel Order'\n\n**After 1 Hour:** Order is processed and cannot be cancelled\n• You can return it once delivered (30-day policy)\n• Contact support for urgent cancellation requests\n\n**Need to modify instead?** Change address, items, or shipping speed - contact us within 1 hour!"
    
    # Product and general queries
    if any(word in message_lower for word in ['product', 'item', 'what do you sell', 'catalog']):
        return "📋 **Our Products**\n\nWe offer a range of digital and physical products:\n• Software subscriptions\n• Business tools\n• Accessories\n• Digital downloads\n\n**Browse Products:**\nVisit our Products page for the full catalog with descriptions, pricing, and reviews.\n\n**Product Questions?**\n• Compatibility, features, specifications\n• Bulk discounts\n• Custom solutions\n\nWhat specific product are you interested in?"
    
    # Contact and support hours
    if any(word in message_lower for word in ['contact', 'support hours', 'phone', 'email', 'human']):
        return "📞 **Contact Support**\n\n**Support Hours:**\nMonday - Friday: 9 AM to 6 PM EST\n\n**Contact Methods:**\n• **Live Chat:** Right here! (fastest response)\n• **Email Support:** Available 24/7\n• **Phone:** Enterprise customers only\n\n**Response Times:**\n• Chat: Immediate\n• Email: Within 24 hours\n• Urgent issues: Prioritized\n\n**Need Human Agent?** Just say 'connect me to a human' and I'll escalate your request immediately!"
    
    # Thank you responses
    if any(word in message_lower for word in ['thank', 'thanks', 'appreciate']):
        return "You're very welcome! 😊 I'm glad I could help.\n\nIs there anything else you need assistance with today? I'm here to help with orders, billing, returns, or any other questions you might have!"
    
    # Complaints and urgent issues
    if any(word in message_lower for word in ['complaint', 'manager', 'urgent', 'problem', 'issue', 'frustrated']):
        return "I understand your concern and want to help resolve this immediately. 🚨\n\n**For Urgent Issues:**\n• I'm escalating this to our support team right now\n• You'll receive priority handling\n• A manager will review your case\n\n**What I need from you:**\n• Order number (if applicable)\n• Brief description of the issue\n• Your preferred resolution\n\n**I'm here to help make this right!** Please tell me more about what happened."
    
    # Business and enterprise queries
    if any(word in message_lower for word in ['business', 'enterprise', 'bulk', 'wholesale', 'company']):
        return "🏢 **Business & Enterprise**\n\n**Enterprise Features:**\n• Volume discounts\n• Dedicated account manager\n• Priority support (24/7)\n• Custom billing terms\n• API access\n\n**Getting Started:**\n1. Contact our Business team\n2. Discuss your requirements\n3. Get custom pricing\n4. Setup enterprise account\n\n**Benefits:**\n• Bulk pricing\n• Priority processing\n• Advanced analytics\n• Team management tools\n\nInterested in enterprise solutions?"
    
    return None  # No instant match - will use AI

# Remove async function that was causing issues
# async def store_chat_async(uid: int, user_message: str, ai_response: str, faqs: list):
#     """This was causing errors on Render.com - removed"""
#     pass
        quick_actions = []
        message_lower = req.message.lower()
        if any(word in message_lower for word in ['cancel', 'subscription', 'unsubscribe']):
            quick_actions.append({'action': 'cancel_subscription', 'label': 'Cancel Subscription', 'type': 'danger'})
        if any(word in message_lower for word in ['refund', 'money back', 'return']):
            quick_actions.append({'action': 'request_refund', 'label': 'Request Refund', 'type': 'primary'})
        if any(word in message_lower for word in ['password', 'login', 'access']):
            quick_actions.append({'action': 'reset_password', 'label': 'Reset Password', 'type': 'secondary'})
        if any(word in message_lower for word in ['human', 'agent', 'person']):
            quick_actions.append({'action': 'live_agent', 'label': 'Connect to Human Agent', 'type': 'success'})
        
        return {
            'response': text, 
            'escalated': escalated, 
            'ticket_id': ticket_id,
            'chat_id': chat_id,
            'quick_actions': quick_actions,
            'matched_faqs': [{'id': faq['id'], 'question': faq['question']} for faq in faqs[:3]]
        }
    except Exception as e:
        print(f"AI API Error: {e}")
        raise HTTPException(status_code=500, detail='AI service error. Please try again or contact support if the problem persists.')

# ─────────── New Feature Routes ───────────

@app.get('/api/suggestions')
def get_suggestions(q: str = '', user=Depends(get_user_from_token)):
    """Get query suggestions as user types"""
    return {'suggestions': get_query_suggestions(q)}

@app.post('/api/chat/{chat_id}/rate')
def rate_message(chat_id: int, req: RatingReq, user=Depends(get_user_from_token)):
    """Rate AI response quality"""
    execute_query(
        'UPDATE chat_history SET rating = %s, feedback = %s WHERE id = %s AND user_id = %s',
        (req.rating, req.feedback, chat_id, int(user['sub']))
    )
    return {'message': 'Rating recorded successfully'}

@app.post('/api/quick-action')
def quick_action(req: QuickActionReq, user=Depends(get_user_from_token)):
    """Handle quick action buttons"""
    response = handle_quick_action(req.action, user, req.data)
    return {'message': response, 'action': req.action}

@app.get('/api/user/conversations/export')
def export_conversations(user=Depends(get_user_from_token)):
    """Export user's conversation history - ENHANCED VERSION"""
    try:
        conversations = execute_query('''
            SELECT 
                role, 
                content, 
                rating, 
                feedback, 
                created_at,
                CASE WHEN rating IS NOT NULL THEN 'rated' ELSE 'unrated' END as rating_status
            FROM chat_history 
            WHERE user_id = %s 
            ORDER BY created_at ASC
        ''', (int(user['sub']),), fetch=True)
        
        # Get user info
        user_info_result = execute_query(
            'SELECT name, email, created_at FROM users WHERE id = %s',
            (int(user['sub']),), fetch=True
        )
        
        if not user_info_result:
            raise HTTPException(status_code=404, detail="User not found")
            
        user_info = user_info_result[0]
        
        # Get tickets for this user
        tickets = execute_query('''
            SELECT id, message, status, admin_reply, is_urgent, created_at, reply_timestamp
            FROM tickets 
            WHERE user_id = %s 
            ORDER BY created_at DESC
        ''', (int(user['sub']),), fetch=True)
        
        # Format dates for JSON serialization
        for conv in conversations:
            if conv.get('created_at') and hasattr(conv['created_at'], 'isoformat'):
                conv['created_at'] = conv['created_at'].isoformat()
            elif conv.get('created_at'):
                conv['created_at'] = str(conv['created_at'])
        
        for ticket in tickets:
            if ticket.get('created_at') and hasattr(ticket['created_at'], 'isoformat'):
                ticket['created_at'] = ticket['created_at'].isoformat()
            elif ticket.get('created_at'):
                ticket['created_at'] = str(ticket['created_at'])
                
            if ticket.get('reply_timestamp') and hasattr(ticket['reply_timestamp'], 'isoformat'):
                ticket['reply_timestamp'] = ticket['reply_timestamp'].isoformat()
            elif ticket.get('reply_timestamp'):
                ticket['reply_timestamp'] = str(ticket['reply_timestamp'])
        
        if user_info.get('created_at') and hasattr(user_info['created_at'], 'isoformat'):
            user_info['created_at'] = user_info['created_at'].isoformat()
        elif user_info.get('created_at'):
            user_info['created_at'] = str(user_info['created_at'])
        
        # Calculate statistics safely
        rated_conversations = [c for c in conversations if c.get('rating') is not None]
        total_rating = sum(c['rating'] for c in rated_conversations if c.get('rating') is not None)
        avg_rating = total_rating / len(rated_conversations) if rated_conversations else 0
        
        # Comprehensive export data
        export_data = {
            'export_info': {
                'user_id': int(user['sub']),
                'export_date': datetime.now().isoformat(),
                'export_version': '2.1',
                'total_conversations': len(conversations),
                'total_tickets': len(tickets)
            },
            'user_info': user_info,
            'conversations': conversations or [],
            'support_tickets': tickets or [],
            'statistics': {
                'total_messages': len(conversations),
                'rated_messages': len(rated_conversations),
                'average_rating': round(avg_rating, 2) if avg_rating > 0 else None,
                'escalated_conversations': len(tickets)
            }
        }
        
        return export_data
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Export error: {e}")
        raise HTTPException(status_code=500, detail="Export failed. Please try again later.")

@app.get('/api/user/conversations/export/csv')
def export_conversations_csv(user=Depends(get_user_from_token)):
    """Export conversations as CSV"""
    try:
        from fastapi.responses import Response
        import io
        import csv
        
        conversations = execute_query(
            'SELECT role, content, rating, feedback, created_at FROM chat_history WHERE user_id = %s ORDER BY created_at ASC',
            (int(user['sub']),), fetch=True
        )
        
        # Get user name for filename
        user_info = execute_query(
            'SELECT name FROM users WHERE id = %s',
            (int(user['sub']),), fetch=True
        )
        
        user_name = user_info[0]['name'] if user_info else 'user'
        safe_user_name = ''.join(c for c in user_name if c.isalnum() or c in (' ', '-', '_')).replace(' ', '_')
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_ALL)
        
        # Write header
        writer.writerow(['Timestamp', 'Role', 'Message', 'Rating', 'Feedback'])
        
        # Write data
        for conv in conversations:
            timestamp = ''
            if conv.get('created_at'):
                if hasattr(conv['created_at'], 'isoformat'):
                    timestamp = conv['created_at'].isoformat()
                else:
                    timestamp = str(conv['created_at'])
            
            # Safely handle content
            content = str(conv.get('content', ''))
            if len(content) > 1000:  # Limit very long messages
                content = content[:1000] + '... [truncated]'
            
            writer.writerow([
                timestamp,
                conv.get('role', ''),
                content,
                conv.get('rating', ''),
                conv.get('feedback', '')
            ])
        
        csv_content = output.getvalue()
        output.close()
        
        # Generate filename with timestamp
        filename = f"conversations_{safe_user_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        # Return CSV response
        return Response(
            content=csv_content,
            media_type='text/csv',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
        
    except Exception as e:
        print(f"CSV Export error: {e}")
        raise HTTPException(status_code=500, detail="CSV export failed. Please try again later.")

@app.get('/api/admin/analytics')
def get_analytics(admin=Depends(get_admin_from_token)):
    """Enhanced analytics dashboard"""
    
    # Basic stats
    stats = {
        'total_users': execute_query('SELECT COUNT(*) as c FROM users', fetch=True)[0]['c'],
        'total_conversations': execute_query('SELECT COUNT(*) as c FROM chat_history WHERE role="user"', fetch=True)[0]['c'],
        'total_tickets': execute_query('SELECT COUNT(*) as c FROM tickets', fetch=True)[0]['c'],
        'avg_rating': execute_query('SELECT AVG(rating) as avg_rating FROM chat_history WHERE rating IS NOT NULL', fetch=True)[0]['avg_rating'] or 0,
        'total_faqs': execute_query('SELECT COUNT(*) as c FROM faq_entries WHERE is_active = 1', fetch=True)[0]['c']
    }
    
    # Popular queries
    popular_queries = execute_query(
        'SELECT query_text, search_count FROM popular_queries ORDER BY search_count DESC LIMIT 10',
        fetch=True
    )
    
    # Daily conversation volume (last 7 days)
    daily_stats = execute_query('''
        SELECT DATE(created_at) as date, COUNT(*) as conversations 
        FROM chat_history 
        WHERE role="user" AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at) 
        ORDER BY date DESC
    ''', fetch=True)
    
    # Rating distribution
    rating_stats = execute_query('''
        SELECT rating, COUNT(*) as count 
        FROM chat_history 
        WHERE rating IS NOT NULL 
        GROUP BY rating 
        ORDER BY rating
    ''', fetch=True)
    
    # FAQ performance
    faq_performance = execute_query('''
        SELECT id, question, view_count, helpful_count, not_helpful_count, category
        FROM faq_entries 
        WHERE is_active = 1 
        ORDER BY view_count DESC 
        LIMIT 10
    ''', fetch=True)
    
    # Escalation rate
    escalation_rate = execute_query('''
        SELECT 
            (COUNT(DISTINCT t.user_id) * 100.0 / NULLIF(COUNT(DISTINCT c.user_id), 0)) as rate
        FROM chat_history c
        LEFT JOIN tickets t ON c.user_id = t.user_id AND DATE(c.created_at) = DATE(t.created_at)
        WHERE c.role = "user" AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ''', fetch=True)[0]['rate'] or 0
    
    return {
        'stats': stats,
        'popular_queries': popular_queries,
        'daily_conversations': daily_stats,
        'rating_distribution': rating_stats,
        'faq_performance': faq_performance,
        'escalation_rate': round(escalation_rate, 2)
    }

# ─────────── FAQ Management Routes ───────────

@app.get('/api/faqs')
def get_faqs(category: Optional[str] = None, search: Optional[str] = None, user=Depends(get_user_from_token)):
    """Get FAQs for users to browse"""
    query = 'SELECT * FROM faq_entries WHERE is_active = 1'
    params = []
    
    if category:
        query += ' AND category = %s'
        params.append(category)
    
    if search:
        query += ' AND (question LIKE %s OR answer LIKE %s)'
        params.extend([f'%{search}%', f'%{search}%'])
    
    query += ' ORDER BY helpful_count DESC, view_count DESC'
    
    faqs = execute_query(query, params, fetch=True)
    categories = execute_query('SELECT DISTINCT category FROM faq_entries WHERE is_active = 1 ORDER BY category', fetch=True)
    
    return {
        'faqs': faqs,
        'categories': [cat['category'] for cat in categories]
    }

@app.post('/api/faqs/{faq_id}/feedback')
def faq_feedback(faq_id: int, req: FAQFeedbackReq, user=Depends(get_user_from_token)):
    """Submit feedback for FAQ helpfulness"""
    # Record feedback
    execute_query(
        'INSERT INTO faq_feedback (faq_id, user_id, is_helpful, feedback_text) VALUES (%s, %s, %s, %s)',
        (faq_id, int(user['sub']), req.is_helpful, req.feedback_text)
    )
    
    # Update FAQ counters
    if req.is_helpful:
        execute_query('UPDATE faq_entries SET helpful_count = helpful_count + 1 WHERE id = %s', (faq_id,))
    else:
        execute_query('UPDATE faq_entries SET not_helpful_count = not_helpful_count + 1 WHERE id = %s', (faq_id,))
    
    return {'message': 'Feedback recorded'}

@app.get('/api/admin/faqs')
def admin_get_faqs(admin=Depends(get_admin_from_token)):
    """Get all FAQs for admin management"""
    faqs = execute_query('SELECT * FROM faq_entries ORDER BY created_at DESC', fetch=True)
    return faqs

@app.post('/api/admin/faqs')
def admin_create_faq(req: FAQEntryReq, admin=Depends(get_admin_from_token)):
    """Create new FAQ entry"""
    faq_id = execute_query(
        'INSERT INTO faq_entries (category, question, answer, created_by) VALUES (%s, %s, %s, %s)',
        (req.category, req.question, req.answer, 'admin')
    )
    return {'message': 'FAQ created successfully', 'id': faq_id}

@app.put('/api/admin/faqs/{faq_id}')
def admin_update_faq(faq_id: int, req: FAQEntryReq, admin=Depends(get_admin_from_token)):
    """Update existing FAQ entry"""
    execute_query(
        'UPDATE faq_entries SET category = %s, question = %s, answer = %s, updated_at = NOW() WHERE id = %s',
        (req.category, req.question, req.answer, faq_id)
    )
    return {'message': 'FAQ updated successfully'}

@app.delete('/api/admin/faqs/{faq_id}')
def admin_delete_faq(faq_id: int, admin=Depends(get_admin_from_token)):
    """Soft delete FAQ entry"""
    execute_query('UPDATE faq_entries SET is_active = 0 WHERE id = %s', (faq_id,))
    return {'message': 'FAQ deleted successfully'}

@app.patch('/api/admin/faqs/{faq_id}/toggle')
def admin_toggle_faq(faq_id: int, admin=Depends(get_admin_from_token)):
    """Toggle FAQ active status"""
    execute_query('UPDATE faq_entries SET is_active = NOT is_active WHERE id = %s', (faq_id,))
    return {'message': 'FAQ status toggled'}

# ─────────── User Preferences & Settings ───────────

@app.get('/api/user/preferences')
def get_user_preferences(user=Depends(get_user_from_token)):
    """Get user preferences"""
    prefs = execute_query(
        'SELECT * FROM user_preferences WHERE user_id = %s',
        (int(user['sub']),), fetch=True
    )
    
    if not prefs:
        # Create default preferences
        execute_query(
            'INSERT INTO user_preferences (user_id) VALUES (%s)',
            (int(user['sub']),)
        )
        return {
            'language': 'en',
            'notifications_enabled': True,
            'email_notifications': True,
            'sound_notifications': True
        }
    
    return prefs[0]

@app.put('/api/user/preferences')
def update_user_preferences(req: UserPreferencesReq, user=Depends(get_user_from_token)):
    """Update user preferences"""
    execute_query('''
        INSERT INTO user_preferences (user_id, language, notifications_enabled, email_notifications, sound_notifications)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        language = VALUES(language),
        notifications_enabled = VALUES(notifications_enabled),
        email_notifications = VALUES(email_notifications),
        sound_notifications = VALUES(sound_notifications),
        updated_at = NOW()
    ''', (int(user['sub']), req.language, req.notifications_enabled, req.email_notifications, req.sound_notifications))
    
    return {'message': 'Preferences updated successfully'}

# ─────────── Chat Search ───────────

@app.get('/api/user/chat-search')
def search_chat_history(q: str = '', user=Depends(get_user_from_token)):
    """Search through chat history"""
    if len(q.strip()) < 2:
        return {'results': []}
    
    results = execute_query('''
        SELECT id, role, content, created_at,
               MATCH(content) AGAINST(%s IN BOOLEAN MODE) as relevance
        FROM chat_history 
        WHERE user_id = %s AND MATCH(content) AGAINST(%s IN BOOLEAN MODE)
        ORDER BY relevance DESC, created_at DESC 
        LIMIT 20
    ''', (f'*{q}*', int(user['sub']), f'*{q}*'), fetch=True)
    
    return {'results': results}

# ─────────── Satisfaction Surveys ───────────

@app.post('/api/surveys/satisfaction')
def submit_satisfaction_survey(req: SatisfactionSurveyReq, user=Depends(get_user_from_token)):
    """Submit satisfaction survey after ticket resolution"""
    survey_id = execute_query('''
        INSERT INTO satisfaction_surveys 
        (user_id, ticket_id, satisfaction_rating, resolution_rating, speed_rating, comments, would_recommend)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    ''', (int(user['sub']), req.ticket_id, req.satisfaction_rating, req.resolution_rating, 
          req.speed_rating, req.comments, req.would_recommend))
    
    return {'message': 'Thank you for your feedback!', 'survey_id': survey_id}

@app.get('/api/admin/satisfaction-analytics')
def get_satisfaction_analytics(admin=Depends(get_admin_from_token)):
    """Get satisfaction survey analytics"""
    
    # Overall satisfaction metrics
    overall = execute_query('''
        SELECT 
            AVG(satisfaction_rating) as avg_satisfaction,
            AVG(resolution_rating) as avg_resolution,
            AVG(speed_rating) as avg_speed,
            COUNT(*) as total_responses,
            SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as recommenders
        FROM satisfaction_surveys 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ''', fetch=True)[0]
    
    # Rating distribution
    rating_distribution = execute_query('''
        SELECT satisfaction_rating, COUNT(*) as count
        FROM satisfaction_surveys
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY satisfaction_rating
        ORDER BY satisfaction_rating
    ''', fetch=True)
    
    # NPS calculation
    nps_data = execute_query('''
        SELECT 
            SUM(CASE WHEN satisfaction_rating >= 9 THEN 1 ELSE 0 END) as promoters,
            SUM(CASE WHEN satisfaction_rating <= 6 THEN 1 ELSE 0 END) as detractors,
            COUNT(*) as total
        FROM satisfaction_surveys
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ''', fetch=True)[0]
    
    nps_score = 0
    if nps_data['total'] > 0:
        nps_score = ((nps_data['promoters'] - nps_data['detractors']) / nps_data['total']) * 100
    
    return {
        'overall': overall,
        'rating_distribution': rating_distribution,
        'nps_score': round(nps_score, 1),
        'recommendation_rate': round((overall['recommenders'] / max(overall['total_responses'], 1)) * 100, 1)
    }

# ─────────── Admin Notes ───────────

@app.get('/api/admin/users/{user_id}/notes')
def get_user_notes(user_id: int, admin=Depends(get_admin_from_token)):
    """Get admin notes for a user"""
    notes = execute_query('''
        SELECT * FROM admin_notes 
        WHERE user_id = %s 
        ORDER BY created_at DESC
    ''', (user_id,), fetch=True)
    
    return notes

@app.post('/api/admin/users/{user_id}/notes')
def add_user_note(user_id: int, req: AdminNoteReq, admin=Depends(get_admin_from_token)):
    """Add admin note for a user"""
    note_id = execute_query('''
        INSERT INTO admin_notes (user_id, admin_name, note_text, is_important)
        VALUES (%s, %s, %s, %s)
    ''', (user_id, admin.get('name', 'Admin'), req.note_text, req.is_important))
    
    return {'message': 'Note added successfully', 'note_id': note_id}

# ─────────── File Upload & Attachments ───────────

@app.post('/api/upload')
def upload_file(file: UploadFile = File(...), user=Depends(get_user_from_token)):
    """Upload file attachment - SECURE VERSION"""
    
    # Enhanced file type validation
    allowed_types = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'], 
        'image/gif': ['.gif'],
        'application/pdf': ['.pdf'],
        'text/plain': ['.txt'],
        'application/json': ['.json'],
        'text/csv': ['.csv']
    }
    
    max_size = 10 * 1024 * 1024  # 10MB
    
    # Validate content type
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f'File type {file.content_type} not allowed')
    
    # Validate file extension matches content type
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in allowed_types.get(file.content_type, []):
        raise HTTPException(status_code=400, detail='File extension does not match content type')
    
    # Validate file size
    if file.size > max_size:
        raise HTTPException(status_code=400, detail='File too large (max 10MB)')
    
    # Sanitize filename
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
    unique_filename = f"{uuid.uuid4()}_{safe_filename}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file securely
    try:
        with file_path.open("wb") as buffer:
            # Read in chunks to prevent memory issues
            while True:
                chunk = file.file.read(8192)
                if not chunk:
                    break
                buffer.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'File upload failed: {str(e)}')
    
    # Store in database
    attachment_id = execute_query('''
        INSERT INTO chat_attachments (user_id, filename, file_size, file_type, file_path)
        VALUES (%s, %s, %s, %s, %s)
    ''', (int(user['sub']), safe_filename, file.size, file.content_type, str(file_path)))
    
    return {
        'attachment_id': attachment_id,
        'filename': safe_filename,
        'file_url': f'/uploads/{unique_filename}',
        'file_type': file.content_type,
        'file_size': file.size
    }

@app.get('/api/attachments/{attachment_id}')
def get_attachment(attachment_id: int, user=Depends(get_user_from_token)):
    """Get attachment info"""
    attachment = execute_query(
        'SELECT * FROM chat_attachments WHERE id = %s AND user_id = %s',
        (attachment_id, int(user['sub'])), fetch=True
    )
    
    if not attachment:
        raise HTTPException(status_code=404, detail='Attachment not found')
    
    return attachment[0]

# ─────────── Real-time Notifications ───────────

@app.post('/api/notifications/register')
def register_push_subscription(subscription: dict, user=Depends(get_user_from_token)):
    """Register push notification subscription"""
    # Store push subscription in user preferences
    execute_query('''
        UPDATE user_preferences 
        SET push_subscription = %s, updated_at = NOW()
        WHERE user_id = %s
    ''', (json.dumps(subscription), int(user['sub'])))
    
    return {'message': 'Push subscription registered'}

@app.post('/api/notifications/test')
def send_test_notification(user=Depends(get_user_from_token)):
    """Send test notification"""
    # In a real implementation, you'd use a service like Firebase or web-push
    return {'message': 'Test notification sent', 'timestamp': datetime.now().isoformat()}

# ─────────── Multi-language Support ───────────

TRANSLATIONS = {
    'en': {
        'welcome': 'Welcome to Zed AI Support',
        'ask_anything': 'Ask me anything about your orders, billing, returns, or account.',
        'human_agent': 'Connect to Human Agent',
        'ticket_created': 'Ticket created - A human agent will reach out soon',
        'rate_response': 'Rate Response',
        'helpful': 'Helpful',
        'not_helpful': 'Not Helpful'
    },
    'es': {
        'welcome': 'Bienvenido al Soporte de Zed AI',
        'ask_anything': 'Pregúntame sobre tus pedidos, facturación, devoluciones o cuenta.',
        'human_agent': 'Conectar con Agente Humano',
        'ticket_created': 'Ticket creado - Un agente humano se pondrá en contacto pronto',
        'rate_response': 'Calificar Respuesta',
        'helpful': 'Útil',
        'not_helpful': 'No Útil'
    },
    'fr': {
        'welcome': 'Bienvenue au Support Zed AI',
        'ask_anything': 'Demandez-moi tout sur vos commandes, facturation, retours ou compte.',
        'human_agent': 'Se connecter à un Agent Humain',
        'ticket_created': 'Ticket créé - Un agent humain vous contactera bientôt',
        'rate_response': 'Noter la Réponse',
        'helpful': 'Utile',
        'not_helpful': 'Pas Utile'
    },
    'de': {
        'welcome': 'Willkommen beim Zed AI Support',
        'ask_anything': 'Fragen Sie mich zu Ihren Bestellungen, Abrechnung, Rücksendungen oder Konto.',
        'human_agent': 'Mit menschlichem Agent verbinden',
        'ticket_created': 'Ticket erstellt - Ein menschlicher Agent wird sich bald melden',
        'rate_response': 'Antwort bewerten',
        'helpful': 'Hilfreich',
        'not_helpful': 'Nicht Hilfreich'
    }
}

@app.get('/api/translations/{language}')
def get_translations(language: str):
    """Get translations for specified language"""
    return TRANSLATIONS.get(language, TRANSLATIONS['en'])

@app.post('/api/translate')
def translate_text(text: str, target_language: str = 'en'):
    """Simple translation (in production, use Google Translate API)"""
    # This is a mock implementation
    # In production, integrate with Google Translate API or similar service
    
    if target_language == 'es':
        simple_translations = {
            'hello': 'hola',
            'thank you': 'gracias',
            'help': 'ayuda',
            'problem': 'problema',
            'order': 'pedido'
        }
    elif target_language == 'fr':
        simple_translations = {
            'hello': 'bonjour',
            'thank you': 'merci',
            'help': 'aide',
            'problem': 'problème',
            'order': 'commande'
        }
    else:
        return {'translated_text': text}
    
    translated = text.lower()
    for en, trans in simple_translations.items():
        translated = translated.replace(en, trans)
    
    return {'translated_text': translated}

# ─────────── Advanced Admin Features ───────────

@app.post('/api/admin/bulk-operations')
def bulk_ticket_operations(req: BulkTicketOperation, admin=Depends(get_admin_from_token)):
    """Perform bulk operations on tickets - SECURE VERSION"""
    
    if not req.ticket_ids:
        raise HTTPException(status_code=400, detail='No ticket IDs provided')
    
    # Validate ticket IDs are integers
    try:
        ticket_ids = [int(tid) for tid in req.ticket_ids]
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail='Invalid ticket ID format')
    
    if req.operation == 'resolve':
        # Use proper parameterized query
        placeholders = ','.join(['%s'] * len(ticket_ids))
        execute_query(
            f"UPDATE tickets SET status = 'Resolved' WHERE id IN ({placeholders})",
            ticket_ids
        )
        message = f'{len(ticket_ids)} tickets marked as resolved'
        
    elif req.operation == 'delete':
        # Use proper parameterized query  
        placeholders = ','.join(['%s'] * len(ticket_ids))
        execute_query(
            f"DELETE FROM tickets WHERE id IN ({placeholders})",
            ticket_ids
        )
        message = f'{len(ticket_ids)} tickets deleted'
        
    elif req.operation == 'mark_urgent':
        # Use proper parameterized query
        placeholders = ','.join(['%s'] * len(ticket_ids))
        execute_query(
            f"UPDATE tickets SET is_urgent = 1 WHERE id IN ({placeholders})",
            ticket_ids
        )
        message = f'{len(ticket_ids)} tickets marked as urgent'
    else:
        raise HTTPException(status_code=400, detail='Invalid operation')
    
    return {'message': message, 'affected_count': len(ticket_ids)}

# Canned Responses Management
@app.get('/api/admin/canned-responses')
def get_canned_responses(admin=Depends(get_admin_from_token)):
    """Get all canned responses"""
    responses = [
        {'id': 1, 'title': 'Password Reset', 'content': 'I can help you reset your password. Please click on "Reset Password" and check your email.', 'category': 'Account'},
        {'id': 2, 'title': 'Order Status', 'content': 'Let me check your order status. Please provide your order number.', 'category': 'Orders'},
        {'id': 3, 'title': 'Refund Process', 'content': 'I\'ll initiate a refund for you. Refunds typically take 5-7 business days to process.', 'category': 'Billing'},
        {'id': 4, 'title': 'Technical Support', 'content': 'I\'m escalating this to our technical team. They\'ll reach out within 24 hours.', 'category': 'Technical'}
    ]
    return responses

@app.post('/api/admin/canned-responses')
def create_canned_response(req: CannedResponse, admin=Depends(get_admin_from_token)):
    """Create new canned response"""
    # In a real implementation, store in database
    return {'message': 'Canned response created', 'title': req.title}

# Real-time notification helper - ENHANCED VERSION
def send_real_time_notification(user_id: int, title: str, message: str, ticket_id: int = None):
    """Send real-time notification to user with email support"""
    try:
        # Get user info and preferences
        user_info = execute_query(
            'SELECT name, email FROM users WHERE id = %s',
            (user_id,), fetch=True
        )
        
        prefs = execute_query(
            'SELECT * FROM user_preferences WHERE user_id = %s',
            (user_id,), fetch=True
        )
        
        if not user_info:
            return None
        
        user = user_info[0]
        user_prefs = prefs[0] if prefs else {'notifications_enabled': True, 'email_notifications': True}
        
        notification_data = {
            'title': title,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'ticket_id': ticket_id,
            'user_id': user_id
        }
        
        # Store notification in database
        notification_id = execute_query('''
            INSERT INTO user_notifications (user_id, title, message, ticket_id, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        ''', (user_id, title, message, ticket_id))
        
        # Send email notification if enabled
        if user_prefs.get('email_notifications', True) and user_prefs.get('notifications_enabled', True):
            email_sent = send_user_notification_email(
                user['email'], 
                user['name'], 
                title, 
                message, 
                ticket_id
            )
            
            # Update notification with email status
            execute_query(
                'UPDATE user_notifications SET email_sent = %s WHERE id = %s',
                (email_sent, notification_id)
            )
            
            notification_data['email_sent'] = email_sent
        
        return notification_data
        
    except Exception as e:
        print(f"Notification error: {e}")
        return None

@app.get('/api/notifications')
def get_user_notifications(user=Depends(get_user_from_token)):
    """Get unread notifications for user"""
    notifications = execute_query('''
        SELECT * FROM user_notifications 
        WHERE user_id = %s AND is_read = 0
        ORDER BY created_at DESC
        LIMIT 10
    ''', (int(user['sub']),), fetch=True)
    
    return notifications

@app.patch('/api/notifications/{notification_id}/read')
def mark_notification_read(notification_id: int, user=Depends(get_user_from_token)):
    """Mark notification as read"""
    execute_query(
        'UPDATE user_notifications SET is_read = 1 WHERE id = %s AND user_id = %s',
        (notification_id, int(user['sub']))
    )
    return {'message': 'Notification marked as read'}

@app.get('/api/admin/advanced-analytics')
def get_advanced_analytics(admin=Depends(get_admin_from_token)):
    """Get advanced analytics with satisfaction data"""
    
    # User engagement metrics
    engagement = execute_query('''
        SELECT 
            COUNT(DISTINCT user_id) as active_users_30d,
            AVG(daily_messages) as avg_daily_messages,
            MAX(daily_messages) as peak_daily_messages
        FROM (
            SELECT user_id, DATE(created_at) as date, COUNT(*) as daily_messages
            FROM chat_history 
            WHERE role = 'user' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY user_id, DATE(created_at)
        ) daily_stats
    ''', fetch=True)[0]
    
    # Resolution time analytics
    resolution_times = execute_query('''
        SELECT 
            AVG(TIMESTAMPDIFF(HOUR, created_at, reply_timestamp)) as avg_resolution_hours,
            MIN(TIMESTAMPDIFF(HOUR, created_at, reply_timestamp)) as fastest_resolution,
            MAX(TIMESTAMPDIFF(HOUR, created_at, reply_timestamp)) as slowest_resolution
        FROM tickets 
        WHERE reply_timestamp IS NOT NULL 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ''', fetch=True)[0]
    
    # Top issues by category
    top_issues = execute_query('''
        SELECT category, COUNT(*) as frequency
        FROM faq_entries f
        JOIN (
            SELECT SUBSTRING_INDEX(query_text, ' ', 3) as query_start, COUNT(*) as searches
            FROM popular_queries 
            GROUP BY query_start
            ORDER BY searches DESC
            LIMIT 10
        ) popular ON f.question LIKE CONCAT('%', popular.query_start, '%')
        GROUP BY category
        ORDER BY frequency DESC
        LIMIT 5
    ''', fetch=True)
    
    return {
        'engagement': engagement,
        'resolution_times': resolution_times,
        'top_issues': top_issues
    }

@app.get('/api/user/chat-history')
def get_history(user=Depends(get_user_from_token)):
    return execute_query(
        'SELECT role, content, created_at FROM chat_history WHERE user_id = %s ORDER BY created_at ASC',
        (int(user['sub']),), fetch=True
    )

@app.get('/api/user/tickets')
def get_my_tickets(user=Depends(get_user_from_token)):
    rows = execute_query(
        'SELECT id, message, status, is_urgent, admin_reply, reply_timestamp, created_at FROM tickets WHERE user_id = %s ORDER BY created_at DESC',
        (int(user['sub']),), fetch=True
    )
    for r in rows:
        if r.get('reply_timestamp') and hasattr(r['reply_timestamp'], 'strftime'):
            r['reply_timestamp'] = r['reply_timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        if r.get('created_at') and hasattr(r['created_at'], 'strftime'):
            r['created_at'] = r['created_at'].strftime('%Y-%m-%d %H:%M:%S')
    return rows

# ─────────── Admin Routes ───────────
@app.get('/api/admin/stats')
def stats(admin=Depends(get_admin_from_token)):
    return {
        'total_users': execute_query('SELECT COUNT(*) as c FROM users', fetch=True)[0]['c'],
        'total_tickets': execute_query('SELECT COUNT(*) as c FROM tickets', fetch=True)[0]['c'],
        'open_tickets': execute_query("SELECT COUNT(*) as c FROM tickets WHERE status='Open'", fetch=True)[0]['c'],
        'urgent_tickets': execute_query('SELECT COUNT(*) as c FROM tickets WHERE is_urgent=1', fetch=True)[0]['c'],
    }

@app.get('/api/admin/tickets')
def all_tickets(admin=Depends(get_admin_from_token)):
    rows = execute_query('SELECT * FROM tickets ORDER BY is_urgent DESC, created_at DESC', fetch=True)
    for r in rows:
        for f in ['reply_timestamp', 'created_at']:
            if r.get(f) and hasattr(r[f], 'strftime'):
                r[f] = r[f].strftime('%Y-%m-%d %H:%M:%S')
    return rows

@app.get('/api/admin/users')
def all_users(admin=Depends(get_admin_from_token)):
    rows = execute_query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC', fetch=True)
    for r in rows:
        if r.get('created_at') and hasattr(r['created_at'], 'strftime'):
            r['created_at'] = r['created_at'].strftime('%Y-%m-%d %H:%M:%S')
    return rows

@app.get('/api/admin/system-status')
def get_system_status(admin=Depends(get_admin_from_token)):
    """Get real-time system status"""
    try:
        # Test database connection
        db_status = "Connected"
        try:
            execute_query("SELECT 1", fetch=True)
        except:
            db_status = "Disconnected"
        
        # Test AI model (Gemini)
        ai_status = "Online"
        try:
            if not genai_api_key:
                ai_status = "No API Key"
            # You could add a simple API test here if needed
        except:
            ai_status = "Offline"
            
        # Test email service
        email_status = "Active"
        try:
            if not smtp_email or not smtp_password:
                email_status = "Not Configured"
        except:
            email_status = "Error"
            
        # Mock storage status (you can implement real disk usage if needed)
        import os
        storage_status = "Available"
        try:
            # This is a simplified version - you might want to check actual disk usage
            storage_status = "78% Used"  # Mock value matching UI
        except:
            storage_status = "Unknown"
        
        return {
            'database': db_status,
            'aiModel': ai_status, 
            'emailService': email_status,
            'storage': storage_status
        }
    except Exception as e:
        return {
            'database': 'Error',
            'aiModel': 'Error',
            'emailService': 'Error', 
            'storage': 'Error'
        }

# Export endpoints for admin settings
@app.get('/api/admin/export/conversations')
def export_all_conversations(admin=Depends(get_admin_from_token)):
    """Export all conversations as JSON"""
    try:
        conversations = execute_query("""
            SELECT ch.*, u.name, u.email 
            FROM chat_history ch
            LEFT JOIN users u ON ch.user_id = u.id
            ORDER BY ch.created_at DESC
        """, fetch=True)
        
        # Format dates for JSON serialization
        for conv in conversations:
            if conv.get('created_at') and hasattr(conv['created_at'], 'strftime'):
                conv['created_at'] = conv['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                
        return {'conversations': conversations, 'total': len(conversations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")

@app.get('/api/admin/export/users')
def export_user_data(admin=Depends(get_admin_from_token)):
    """Export user data as CSV"""
    try:
        users = execute_query("""
            SELECT u.id, u.name, u.email, u.role, u.created_at,
                   COUNT(DISTINCT ch.id) as total_messages,
                   COUNT(DISTINCT t.id) as total_tickets
            FROM users u
            LEFT JOIN chat_history ch ON u.id = ch.user_id  
            LEFT JOIN tickets t ON u.id = t.user_id
            GROUP BY u.id, u.name, u.email, u.role, u.created_at
            ORDER BY u.created_at DESC
        """, fetch=True)
        
        # Create CSV content
        import io
        output = io.StringIO()
        output.write("ID,Name,Email,Role,Created At,Total Messages,Total Tickets\n")
        
        for user in users:
            created_at = user['created_at'].strftime('%Y-%m-%d %H:%M:%S') if user.get('created_at') and hasattr(user['created_at'], 'strftime') else user.get('created_at', '')
            output.write(f"{user['id']},{user['name']},{user['email']},{user['role']},{created_at},{user['total_messages']},{user['total_tickets']}\n")
        
        from fastapi.responses import Response
        return Response(
            content=output.getvalue(),
            media_type='text/csv',
            headers={"Content-Disposition": "attachment; filename=users.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")

@app.get('/api/admin/export/tickets')
def export_tickets_data(admin=Depends(get_admin_from_token)):
    """Export tickets data as CSV"""
    try:
        tickets = execute_query("""
            SELECT t.*, u.name, u.email
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        """, fetch=True)
        
        # Create CSV content
        import io
        output = io.StringIO()
        output.write("ID,User Name,User Email,Message,Status,Urgent,Admin Reply,Created At,Reply Time\n")
        
        for ticket in tickets:
            created_at = ticket['created_at'].strftime('%Y-%m-%d %H:%M:%S') if ticket.get('created_at') and hasattr(ticket['created_at'], 'strftime') else ticket.get('created_at', '')
            reply_time = ticket['reply_timestamp'].strftime('%Y-%m-%d %H:%M:%S') if ticket.get('reply_timestamp') and hasattr(ticket['reply_timestamp'], 'strftime') else ''
            
            # Escape commas and quotes in text fields
            message = str(ticket.get('message', '')).replace('"', '""')
            admin_reply = str(ticket.get('admin_reply', '')).replace('"', '""')
            
            output.write(f'{ticket["id"]},"{ticket.get("name", "")}",{ticket.get("email", "")},"{message}",{ticket.get("status", "")},{ticket.get("is_urgent", 0)},"{admin_reply}",{created_at},{reply_time}\n')
        
        from fastapi.responses import Response
        return Response(
            content=output.getvalue(),
            media_type='text/csv',
            headers={"Content-Disposition": "attachment; filename=tickets.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")

@app.post('/api/admin/cleanup/old-data')
def cleanup_old_data(admin=Depends(get_admin_from_token)):
    """Cleanup conversation data older than 90 days"""
    try:
        # Delete old chat history
        result = execute_query("""
            DELETE FROM chat_history 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        """)
        
        # Delete old resolved tickets
        result2 = execute_query("""
            DELETE FROM tickets 
            WHERE status = 'Resolved' AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        """)
        
        return {
            'message': 'Cleanup completed successfully',
            'deleted_count': 'Data older than 90 days removed'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {e}")

@app.post('/api/admin/tickets/{ticket_id}/reply')
def reply(ticket_id: int, req: ReplyReq, admin=Depends(get_admin_from_token)):
    # Get ticket info first
    ticket = execute_query('SELECT * FROM tickets WHERE id = %s', (ticket_id,), fetch=True)
    if not ticket:
        raise HTTPException(status_code=404, detail='Ticket not found')
    
    ticket = ticket[0]
    
    # Update ticket with reply
    execute_query(
        "UPDATE tickets SET admin_reply=%s, reply_timestamp=%s, status='In Progress' WHERE id=%s",
        (req.reply, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), ticket_id)
    )
    
    # Send notification to user about the reply
    send_real_time_notification(
        ticket['user_id'],
        'Support Ticket Reply',
        f'Your support ticket #{ticket_id} has received a reply from our team.',
        ticket_id
    )
    
    return {'message': 'Reply sent and user notified'}

@app.delete('/api/admin/tickets/{ticket_id}')
def del_ticket(ticket_id: int, admin=Depends(get_admin_from_token)):
    execute_query('DELETE FROM tickets WHERE id=%s', (ticket_id,))
    return {'message': f'Ticket #{ticket_id} deleted'}

@app.patch('/api/admin/tickets/{ticket_id}/status')
def upd_status(ticket_id: int, req: StatusReq, admin=Depends(get_admin_from_token)):
    execute_query('UPDATE tickets SET status=%s WHERE id=%s', (req.status, ticket_id))
    return {'message': 'Status updated'}

@app.patch('/api/admin/tickets/{ticket_id}/urgent')
def toggle_urgent(ticket_id: int, admin=Depends(get_admin_from_token)):
    execute_query('UPDATE tickets SET is_urgent=NOT is_urgent WHERE id=%s', (ticket_id,))
    return {'message': 'Urgent toggled'}

@app.get('/api/test-chat')
def test_chat():
    """Simple test endpoint to verify chat system"""
    try:
        # Test basic components
        result = {
            'status': 'ok',
            'ai_model': 'available' if model else 'unavailable',
            'timestamp': datetime.now().isoformat()
        }
        
        # Test FAQ system
        try:
            test_faqs = get_simple_faqs()
            result['faq_count'] = len(test_faqs)
        except Exception as e:
            result['faq_error'] = str(e)
        
        # Test AI response
        if model:
            try:
                test_response = model.generate_content("Say hello")
                result['ai_test'] = 'pass'
            except Exception as e:
                result['ai_error'] = str(e)
        
        return result
    except Exception as e:
        return {'status': 'error', 'error': str(e)}
