#!/usr/bin/env python3
import mysql.connector

# Your production database credentials
DB_CONFIG = {
    'host': 'sql12.freesqldatabase.com',
    'port': 3306,
    'user': 'sql12832239',
    'password': 'YATPR8djkg',
    'database': 'sql12832239',
    'autocommit': True
}

print("🔧 Setting up complete production database...")
print(f"Connecting to: {DB_CONFIG['host']}/{DB_CONFIG['database']}")

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Create users table first (needed for admin login)
    print("Creating users table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('user', 'admin') DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create faq_entries table
    print("Creating faq_entries table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS faq_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category VARCHAR(100) NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            is_active TINYINT(1) DEFAULT 1,
            view_count INT DEFAULT 0,
            helpful_count INT DEFAULT 0,
            not_helpful_count INT DEFAULT 0,
            created_by VARCHAR(255) DEFAULT 'admin'
        )
    """)
    
    # Create tickets table
    print("Creating tickets table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            user_name VARCHAR(255),
            user_email VARCHAR(255),
            message TEXT NOT NULL,
            status ENUM('Open', 'In Progress', 'Resolved') DEFAULT 'Open',
            is_urgent TINYINT(1) DEFAULT 0,
            admin_reply TEXT,
            reply_timestamp TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)
    
    # Create chat_history table
    print("Creating chat_history table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            role ENUM('user', 'assistant') NOT NULL,
            content TEXT NOT NULL,
            rating INT DEFAULT NULL,
            feedback TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # Insert sample FAQs
    print("Adding sample FAQ data...")
    sample_faqs = [
        ('General', 'What is Zed AI?', 'Zed AI is an intelligent customer support agent.'),
        ('Account', 'How do I reset my password?', 'Click "Forgot Password" on the login page.'),
        ('Billing', 'How to update billing?', 'Go to Account Settings > Billing.'),
        ('Technical', 'Service is slow?', 'Try refreshing or contact support.'),
        ('Features', 'What features are available?', '24/7 support, AI responses, file attachments.')
    ]
    
    for category, question, answer in sample_faqs:
        cursor.execute(
            "INSERT IGNORE INTO faq_entries (category, question, answer) VALUES (%s, %s, %s)",
            (category, question, answer)
        )
    
    print("✅ users table created successfully!")
    print("✅ faq_entries table created successfully!")
    print("✅ tickets table created successfully!")
    print("✅ chat_history table created successfully!")
    print("✅ Sample FAQ data inserted!")
    
    cursor.close()
    conn.close()
    print("🎉 Complete production database setup finished!")
    print("🔑 Admin can now login with environment credentials")
    
except Exception as e:
    print(f"❌ Error: {e}")