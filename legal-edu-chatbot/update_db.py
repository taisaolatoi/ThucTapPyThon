# backend-python/update_db.py
from database import get_db_connection

def add_email_column():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA table_info(users);")
        columns = cursor.fetchall()
        column_names = [col['name'] for col in columns]

        if 'email' not in column_names:
            # SỬA DÒNG NÀY: Bỏ UNIQUE khỏi đây
            cursor.execute("ALTER TABLE users ADD COLUMN email TEXT;")
            print("Cột 'email' đã được thêm vào bảng 'users' thành công (không có ràng buộc UNIQUE ban đầu).")
            # Cập nhật các bản ghi cũ để email là NULL nếu bạn muốn
            # cursor.execute("UPDATE users SET email = NULL WHERE email IS NULL;")
        else:
            print("Cột 'email' đã tồn tại trong bảng 'users'. Không cần thêm.")
        conn.commit()
    except Exception as e:
        print(f"Lỗi khi thêm cột 'email': {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    add_email_column()