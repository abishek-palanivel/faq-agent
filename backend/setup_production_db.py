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

print("🔧 Setting up production database...")
print(f"Connecting to: {DB_CONFIG['host']}/{DB_CONFIG['database']}")

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Create faq_entries table (simple version)
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
    
    # Insert sample FAQs
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
    
    print("✅ faq_entries table created successfully!")
    print("✅ Sample FAQ data inserted!")
    
    cursor.close()
    conn.close()
    print("🎉 Production database setup complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")