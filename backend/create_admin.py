#!/usr/bin/env python3
import mysql.connector
import bcrypt

# Your production database credentials
DB_CONFIG = {
    'host': 'sql12.freesqldatabase.com',
    'port': 3306,
    'user': 'sql12832239',
    'password': 'YATPR8djkg',
    'database': 'sql12832239',
    'autocommit': True
}

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

print("🔑 Creating admin user...")
print(f"Connecting to: {DB_CONFIG['host']}/{DB_CONFIG['database']}")

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Admin credentials
    admin_email = "abishekopennova@gmail.com"
    admin_password = "abi@1234"
    admin_name = "Admin"
    
    # Hash the password
    hashed_password = hash_password(admin_password)
    
    # Insert or update admin user
    cursor.execute("""
        INSERT INTO users (name, email, password_hash, role) 
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash),
        role = VALUES(role)
    """, (admin_name, admin_email, hashed_password, 'admin'))
    
    print("✅ Admin user created/updated successfully!")
    print(f"📧 Email: {admin_email}")
    print(f"🔐 Password: {admin_password}")
    print("🎯 Role: admin")
    
    cursor.close()
    conn.close()
    print("🎉 Admin account ready for login!")
    
except Exception as e:
    print(f"❌ Error: {e}")