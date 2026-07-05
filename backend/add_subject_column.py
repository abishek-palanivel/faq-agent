#!/usr/bin/env python3
"""
Migration script to add subject column to existing tickets table
Run this once if you have an existing database without the subject field
"""

import os
import sys
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate_database():
    """Add subject column to tickets table if it doesn't exist"""
    try:
        # Database connection
        db = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'zed_ai'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        cursor = db.cursor()
        
        # Check if subject column exists
        cursor.execute("SHOW COLUMNS FROM tickets LIKE 'subject'")
        result = cursor.fetchone()
        
        if not result:
            print("Adding subject column to tickets table...")
            cursor.execute("ALTER TABLE tickets ADD COLUMN subject VARCHAR(255) AFTER user_email")
            print("✅ Subject column added successfully!")
        else:
            print("✅ Subject column already exists")
        
        # Update existing tickets without subjects
        cursor.execute("UPDATE tickets SET subject = 'Support Request' WHERE subject IS NULL OR subject = ''")
        updated_rows = cursor.rowcount
        
        if updated_rows > 0:
            print(f"✅ Updated {updated_rows} existing tickets with default subject")
        
        db.commit()
        cursor.close()
        db.close()
        
        print("🎉 Migration completed successfully!")
        
    except mysql.connector.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🔄 Starting database migration...")
    migrate_database()