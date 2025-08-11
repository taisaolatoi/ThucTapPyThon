import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib
from email.mime.text import MIMEText
import random
import string
from datetime import datetime # Đã thay đổi cách import datetime


# Import get_db_connection từ database.py
from database import get_db_connection

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

def get_db():
    # Sử dụng hàm get_db_connection từ database.py
    if 'db' not in g:
        g.db = get_db_connection()
    return g.db

# Hàm gửi email (Được đặt trong auth.py hoặc một file helper riêng)
def send_email(to_email, subject, body):
    try:
        sender_email = os.getenv("EMAIL_HOST_USER")
        sender_password = os.getenv("EMAIL_HOST_PASSWORD")
        smtp_server = os.getenv("EMAIL_HOST_SMTP")
        smtp_port = int(os.getenv("EMAIL_HOST_PORT"))
        use_tls = os.getenv("EMAIL_USE_TLS").lower() == 'true'

        if not sender_email or not sender_password or not smtp_server or not smtp_port:
            print("Lỗi cấu hình email: Thiếu biến môi trường EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_HOST_SMTP, hoặc EMAIL_HOST_PORT.")
            return False

        msg = MIMEText(body, 'html', 'utf-8') # Sử dụng 'html' nếu bạn muốn định dạng HTML
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = to_email

        print(f"Đang cố gắng gửi email từ {sender_email} đến {to_email} qua {smtp_server}:{smtp_port}...")

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            if use_tls:
                server.starttls() # Bắt đầu mã hóa TLS
            server.login(sender_email, sender_password)
            server.send_message(msg)
        print("Email đã được gửi thành công.")
        return True
    except Exception as e:
        print(f"Lỗi khi gửi email: {e}")
        return False

# Hàm tạo mật khẩu ngẫu nhiên
def generate_random_password(length=10):
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(random.choice(characters) for i in range(length))
    return password

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    phone = data.get('phone') 
    
    # Mặc định role là 0 cho người dùng mới (User)
    role = 0 
    # Mặc định status là 'Active'
    status = 'Active'
    # Lấy thời gian hiện tại cho registered_at
    registered_at = datetime.now()
    if not username or not password:
        return jsonify({"error": "Tên người dùng và mật khẩu là bắt buộc."}), 400
    
    db = None
    cursor = None

    try:
        print("Attempting to get DB connection...")
        db = get_db()
        print("DB connection obtained.")
        cursor = db.cursor(cursor_factory=RealDictCursor)
        print("Cursor obtained.")

        # Kiểm tra tên người dùng đã tồn tại chưa
        print(f"Checking if username '{username}' exists...")
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            print("Username already exists.")
            return jsonify({"error": "Tên người dùng này đã tồn tại."}), 409

        # Nếu email được cung cấp, kiểm tra email đã tồn tại chưa
        if email:
            print(f"Checking if email '{email}' exists...")
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                print("Email already exists.")
                return jsonify({"error": "Email này đã được sử dụng."}), 409

        print("Hashing password...")
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        
        print("Inserting new user...")
        # Thêm 'phone', 'role', 'status' và 'registered_at' vào câu lệnh INSERT
        cursor.execute(
            "INSERT INTO users (username, email, password, phone, role, status, registered_at) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, role, status, registered_at",
            (username, email, hashed_password, phone, role, status, registered_at)
        )
        
        user_row = cursor.fetchone()
        if user_row:
            user_id = user_row['id']
            user_role = user_row['role']
            user_status = user_row['status']
            user_registered_at = user_row['registered_at'].strftime('%Y-%m-%d %H:%M:%S') # Định dạng lại để trả về
            print(f"User inserted with ID: {user_id}, Role: {user_role}, Status: {user_status}, Registered At: {user_registered_at}")
        else:
            print("Error: No user ID or role returned after insert.")
            raise Exception("Failed to retrieve user ID and role after registration.")

        db.commit()
        print("DB committed.")
        
        return jsonify({
            "message": "Đăng ký thành công!", 
            "user_id": user_id, 
            "username": username, 
            "role": user_role,
            "status": user_status,
            "registered_at": user_registered_at
        }), 201
    except psycopg2.IntegrityError as e:
        if db:
            db.rollback()
        print(f"Lỗi khi đăng ký người dùng (IntegrityError): {e}")
        if "users_username_key" in str(e):
            return jsonify({"error": "Tên người dùng này đã tồn tại."}), 409
        elif "users_email_key" in str(e):
            return jsonify({"error": "Email này đã được sử dụng."}), 409
        else:
            return jsonify({"error": "Đăng ký thất bại do dữ liệu không hợp lệ."}), 400
    except psycopg2.Error as e:
        if db:
            db.rollback()
        print(f"Lỗi khi đăng ký người dùng (PostgreSQL Error): {e}")
        return jsonify({"error": "Đăng ký thất bại. Vui lòng thử lại."}), 500
    except Exception as e:
        if db:
            db.rollback()
        print(f"Lỗi khi đăng ký người dùng: Type: {type(e)}, Value: {e}")
        return jsonify({"error": "Đăng ký thất bại. Vui lòng thử lại."}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username_or_email = data.get('username')
    password = data.get('password')

    if not username_or_email or not password:
        return jsonify({"error": "Tên người dùng/email và mật khẩu là bắt buộc."}), 400

    db = get_db()
    # Sử dụng RealDictCursor để truy cập kết quả theo tên cột
    cursor = db.cursor(cursor_factory=RealDictCursor)

    try:
        # Thử tìm theo username
        cursor.execute("SELECT id, username, email, password, role FROM users WHERE username = %s", (username_or_email,))
        user = cursor.fetchone()

        # Nếu không tìm thấy theo username, thử tìm theo email
        if not user:
            cursor.execute("SELECT id, username, email, password, role FROM users WHERE email = %s", (username_or_email,))
            user = cursor.fetchone()

        if user and check_password_hash(user['password'], password):
            # Trả về role trong phản hồi đăng nhập
            return jsonify({"message": "Đăng nhập thành công!", "user_id": user['id'], "username": user['username'], "role": user['role']}), 200
        else:
            return jsonify({"error": "Tên người dùng/email hoặc mật khẩu không chính xác."}), 401
    except psycopg2.Error as e:
        print(f"Lỗi PostgreSQL khi đăng nhập: {e}")
        return jsonify({"error": "Đã xảy ra lỗi hệ thống khi đăng nhập. Vui lòng thử lại sau."}), 500
    except Exception as e:
        print(f"Lỗi khi đăng nhập: {e}")
        return jsonify({"error": "Đã xảy ra lỗi không mong muốn khi đăng nhập. Vui lòng thử lại sau."}), 500

# --- Endpoint QUÊN MẬT KHẨU MỚI ---
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    username_or_email = data.get('email')

    if not username_or_email:
        return jsonify({"error": "Vui lòng nhập tên người dùng hoặc địa chỉ email của bạn."}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor) # Đảm bảo sử dụng RealDictCursor

    try:
        # Thử tìm người dùng bằng username HOẶC email
        cursor.execute("SELECT id, username, email FROM users WHERE username = %s OR email = %s",
                       (username_or_email, username_or_email))
        user = cursor.fetchone()

        if not user:
            # Luôn trả về thông báo chung để tránh tiết lộ email/username nào tồn tại
            return jsonify({"message": "Nếu thông tin bạn cung cấp tồn tại trong hệ thống, chúng tôi sẽ gửi mật khẩu mới đến email liên kết."}), 200

        user_id = user['id']
        username = user['username']
        user_email = user['email'] # Lấy email của người dùng từ CSDL

        if not user_email:
            # Nếu người dùng không có email được lưu trong CSDL
            return jsonify({"message": "Tài khoản của bạn không có email liên kết. Vui lòng liên hệ hỗ trợ."}), 400

        new_password = generate_random_password()
        hashed_new_password = generate_password_hash(new_password, method='pbkdf2:sha256')

        # Cập nhật mật khẩu mới vào CSDL
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_new_password, user_id))
        db.commit()

        # Gửi email cho người dùng
        subject = "Đặt lại mật khẩu của bạn cho ứng dụng Chat AI"
        email_body = f"""
        <html>
        <body>
            <p>Xin chào <strong>{username}</strong>,</p>
            <p>Mật khẩu mới của bạn cho ứng dụng Chat AI là: <strong>{new_password}</strong></p>
        </body>
        </html>
        """
        email_sent = send_email(user_email, subject, email_body)

        if email_sent:
            return jsonify({"message": "Nếu thông tin bạn cung cấp tồn tại trong hệ thống, chúng tôi sẽ gửi mật khẩu mới đến email liên kết."}), 200
        else:
            print(f"Lỗi: Không thể gửi email cho {user_email} sau khi đặt lại mật khẩu.")
            return jsonify({"message": "Nếu thông tin bạn cung cấp tồn tại trong hệ thống, chúng tôi sẽ gửi mật khẩu mới đến email liên kết. Tuy nhiên, đã xảy ra lỗi khi gửi email."}), 200

    except psycopg2.Error as e:
        db.rollback()
        print(f"Lỗi PostgreSQL trong quá trình quên mật khẩu: {e}")
        return jsonify({"error": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."}), 500
    except Exception as e:
        db.rollback()
        print(f"Lỗi trong quá trình quên mật khẩu: {e}")
        return jsonify({"error": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."}), 500

# Endpoint để lấy thông tin phiên chat của người dùng
@auth_bp.route('/user_info/<int:user_id>', methods=['GET'])
def get_user_info(user_id):
    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor) # Đảm bảo sử dụng RealDictCursor
    cursor.execute("SELECT username, email, role, phone FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    if user:
        return jsonify({"username": user['username'], "email": user['email'], "role": user['role'], "phone": user['phone']}), 200
    return jsonify({"error": "Người dùng không tìm thấy."}), 404
