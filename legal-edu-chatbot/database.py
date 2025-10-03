import psycopg2
from psycopg2.extras import RealDictCursor # Để trả về kết quả dưới dạng dictionary
import os

# --- Cấu hình kết nối PostgreSQL ---
# Lấy thông tin kết nối từ biến môi trường.
# Bạn cần đặt các biến môi trường này trước khi chạy ứng dụng, ví dụ:
# export PG_HOST="localhost"
# export PG_DBNAME="your_database_name"
# export PG_USER="your_username"
# export PG_PASSWORD="your_password"
# export PG_PORT="5432"
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
    conn = None
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
        raise # Ném lại ngoại lệ để ứng dụng xử lý

def init_db():
    """
    Khởi tạo cơ sở dữ liệu PostgreSQL bằng cách tạo các bảng cần thiết nếu chúng chưa tồn tại.
    """
    conn = None
    try:
        conn = get_db_connection() # Sử dụng hàm kết nối chính thức
        cursor = conn.cursor()

        # Tạo bảng users
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        ''')

        # Tạo bảng chat_sessions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
        ''')

        # Tạo bảng messages
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL,
                sender TEXT NOT NULL,
                text TEXT,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
            );
        ''')

        # Tạo bảng image_generations
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS image_generations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            session_id INTEGER,
            prompt TEXT NOT NULL,
            style TEXT,
            engine_id TEXT,
            generated_image_data TEXT,
            status TEXT DEFAULT 'success', -- 'success', 'failed', 'pending'
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE SET NULL
            );
        ''')

        # Tạo bảng stt_history
        # Đã chỉnh sửa: thêm IF NOT EXISTS và FOREIGN KEY
        # cursor.execute('''
        #     CREATE TABLE IF NOT EXISTS stt_history (
        #         id VARCHAR(255) PRIMARY KEY,
        #         user_id INTEGER NOT NULL, -- Đã đổi từ VARCHAR sang INTEGER
        #         transcribed_text TEXT NOT NULL,
        #         word_timestamps JSONB,
        #         audio_url VARCHAR(2048) NOT NULL,
        #         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        #         FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        #     );
        # ''')

        # Tạo chỉ mục để cải thiện hiệu suất truy vấn trên bảng stt_history
        # Đã thêm các chỉ mục đã đề xuất
        # cursor.execute('''
        #     CREATE INDEX IF NOT EXISTS idx_stt_history_user_id ON stt_history (user_id);
        #     CREATE INDEX IF NOT EXISTS idx_stt_history_created_at ON stt_history (created_at);
        # ''')

        conn.commit()
        print("Cơ sở dữ liệu PostgreSQL đã được khởi tạo/kiểm tra thành công.")

    except psycopg2.Error as e:
        print(f"Lỗi khi khởi tạo cơ sở dữ liệu PostgreSQL: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

# Không có các hàm thao tác CSDL khác ở đây (register_user, add_message, v.v.)
# Chúng sẽ được định nghĩa trong các Blueprint (auth.py, chat.py, image.py)
# hoặc một module riêng biệt nếu bạn muốn tái cấu trúc chúng.
