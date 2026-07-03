import mysql.connector
from mysql.connector import pooling
import os

DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'port': int(os.getenv('MYSQL_PORT', '3306')),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DATABASE', 'zed_ai'),
    'autocommit': True
}

# Create connection pool for better performance
connection_pool = None

def init_connection_pool():
    global connection_pool
    try:
        connection_pool = pooling.MySQLConnectionPool(
            pool_name="zed_pool",
            pool_size=10,
            pool_reset_session=True,
            **DB_CONFIG
        )
        print("✅ Database connection pool initialized")
    except Exception as e:
        print(f"❌ Failed to create connection pool: {e}")
        connection_pool = None

def get_connection():
    if connection_pool:
        try:
            return connection_pool.get_connection()
        except Exception as e:
            print(f"Pool connection failed, falling back to direct connection: {e}")
    
    # Fallback to direct connection
    return mysql.connector.connect(**DB_CONFIG)

def execute_query(query, params=None, fetch=False):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())
        
        if fetch:
            result = cursor.fetchall()
            return result
        else:
            conn.commit()
            return cursor.lastrowid
            
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Database error: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Initialize pool on import
init_connection_pool()