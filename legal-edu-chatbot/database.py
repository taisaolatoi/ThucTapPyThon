# backend-python/database.py
import sqlite3
import os

DATABASE_NAME = 'chatbot.db'

def get_db_connection():
    """Tạo và trả về kết nối đến cơ sở dữ liệu."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row # Cho phép truy cập cột bằng tên thay vì chỉ số
    return conn

def init_db():
    """Khởi tạo cơ sở dữ liệu và tạo bảng nếu chúng chưa tồn tại."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Tạo bảng users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE, -- <<< GIỮ NGUYÊN DÒNG NÀY CÓ UNIQUE CHO SCHEMA.SQL
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Tạo bảng chat_sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Tạo bảng messages
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            text TEXT NOT NULL,
            image_data TEXT, -- Cột mới để lưu trữ dữ liệu ảnh Base64
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions (id)
        )
    ''')

    conn.commit()
    conn.close()
    print(f"Cơ sở dữ liệu '{DATABASE_NAME}' đã được khởi tạo/kiểm tra.")

if __name__ == '__main__':
    # Chạy hàm này một lần để tạo CSDL khi bạn chạy script này trực tiếp
    init_db()
    print("Có thể chạy: python database.py để khởi tạo CSDL.")