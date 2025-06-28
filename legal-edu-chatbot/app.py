# app.py
import os
from flask import Flask, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv

# Import các hàm và Blueprint từ các file đã tách
from database import init_db, get_db_connection

# THAY ĐỔI CÁCH IMPORT Ở ĐÂY - Đảm bảo đường dẫn đúng tới file auth.py trong folder api
# Giả định cấu trúc thư mục của bạn là:
# your_project/
# ├── app.py
# ├── database.py
# ├── .env
# └── api/
#     ├── __init__.py  (file rỗng để biến api thành package)
#     ├── auth.py
#     └── chat.py
from api.auth import auth_bp # Import Blueprint xác thực từ package 'api'
from api.chat import chat_bp # Import Blueprint chat từ package 'api'
# from api.image import image_bp # Import blueprint hình ảnh


# Tải biến môi trường (phải ở đây để các module khác có thể truy cập os.getenv)
load_dotenv()

app = Flask(__name__)

# Cấu hình CORS. Đảm bảo frontend chạy ở http://localhost:3000
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Cấu hình API Key cho Gemini (chỉ cần ở app.py vì nó được sử dụng trong chat.py)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Lỗi: Thiếu GEMINI_API_KEY trong file .env. Chức năng AI có thể không hoạt động.")

# Hàm trợ giúp để có kết nối CSDL và đóng nó sau mỗi request
# Hàm này dùng để truy cập kết nối CSDL trong các Blueprint
def get_db():
    if 'db' not in g:
        g.db = get_db_connection()
    return g.db

# ĐẢM BẢO THÊM PHẦN NÀY VÀO app.py CỦA BẠN
@app.before_request
def before_request():
    """
    Thiết lập kết nối cơ sở dữ liệu trước mỗi yêu cầu.
    """
    # Gọi hàm get_db() của chính app.py để đảm bảo g.db được thiết lập
    get_db()

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Đăng ký các Blueprints
# Các routes trong auth_bp sẽ có tiền tố /api (ví dụ: /api/register, /api/login)
app.register_blueprint(auth_bp)
# Các routes trong chat_bp sẽ có tiền tố /api/chat (ví dụ: /api/chat/, /api/chat/history/...)
app.register_blueprint(chat_bp)
# app.register_blueprint(image_bp) # Đăng ký blueprint hình ảnh

# Route mặc định (tùy chọn)
@app.route('/')
def home():
    return "Backend của bạn đang chạy!"

if __name__ == '__main__':
    init_db() # Đảm bảo CSDL được khởi tạo
    app.run(debug=True, port=3001)