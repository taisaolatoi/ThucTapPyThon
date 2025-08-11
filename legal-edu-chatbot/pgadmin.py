import psycopg2
from psycopg2.extras import RealDictCursor # Để trả về kết quả dưới dạng dictionary
import os


PG_HOST = os.getenv("PG_HOST", "localhost")
PG_DBNAME = os.getenv("PG_DBNAME", "chatbot") # Đặt tên database của bạn
PG_USER = os.getenv("PG_USER", "postgres") # Đặt username của bạn
PG_PASSWORD = os.getenv("PG_PASSWORD", "1") # Đặt password của bạn
PG_PORT = os.getenv("PG_PORT", "5432")

def get_db_connection():
    """
    Tạo và trả về kết nối đến cơ sở dữ liệu PostgreSQL.
    Sử dụng RealDictCursor để có thể truy cập cột bằng tên, giống sqlite3.Row.
    """
    try:
        conn = psycopg2.connect(
            host=PG_HOST,
            database=PG_DBNAME,
            user=PG_USER,
            password=PG_PASSWORD,
            port=PG_PORT
        )
        conn.cursor_factory = RealDictCursor # Cấu hình cursor để trả về dict
        return conn
    except psycopg2.Error as e:
        print(f"Lỗi kết nối PostgreSQL: {e}")
        # Trong môi trường sản phẩm, bạn có thể muốn ghi log lỗi này và thoát ứng dụng
        raise # Ném lại ngoại lệ để ứng dụng xử lý
        
if __name__ == '__main__':
    print("Đang kiểm tra kết nối PostgreSQL...")
    conn = None
    try:
        conn = get_db_connection()
        print("Kết nối thành công đến PostgreSQL!")
    except Exception as e:
        print(f"Kiểm tra kết nối thất bại: {e}")
    finally:
        if conn:
            conn.close()
            print("Đã đóng kết nối.")
