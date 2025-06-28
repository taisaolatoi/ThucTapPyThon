# backend-python/auth.py
import os
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib # Import thư viện gửi email
from email.mime.text import MIMEText # Để tạo nội dung email
import random # Để tạo mật khẩu ngẫu nhiên
import string # Để tạo mật khẩu ngẫu nhiên

auth_bp = Blueprint('auth', __name__, url_prefix='/api') # <<< Đổi prefix để phù hợp với frontend của bạn

def get_db():
    if 'db' not in g:
        from database import get_db_connection
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
    email = data.get('email') # Bạn nói email là tùy chọn trong frontend, nhưng tốt nhất nên có để gửi mật khẩu
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Tên người dùng và mật khẩu là bắt buộc."}), 400
    
    db = get_db()
    cursor = db.cursor()

    try:
        # Kiểm tra tên người dùng đã tồn tại chưa
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            return jsonify({"error": "Tên người dùng này đã tồn tại."}), 409

        # Nếu email được cung cấp, kiểm tra email đã tồn tại chưa
        if email:
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                return jsonify({"error": "Email này đã được sử dụng."}), 409

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        cursor.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                       (username, email, hashed_password))
        db.commit()
        return jsonify({"message": "Đăng ký thành công!"}), 201
    except Exception as e:
        db.rollback()
        print(f"Lỗi khi đăng ký người dùng: {e}")
        return jsonify({"error": "Đăng ký thất bại. Vui lòng thử lại."}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username_or_email = data.get('username') # Frontend gửi là 'username'
    password = data.get('password')

    if not username_or_email or not password:
        return jsonify({"error": "Tên người dùng/email và mật khẩu là bắt buộc."}), 400

    db = get_db()
    cursor = db.cursor()

    # Thử tìm theo username
    cursor.execute("SELECT id, username, email, password FROM users WHERE username = ?", (username_or_email,))
    user = cursor.fetchone()

    # Nếu không tìm thấy theo username, thử tìm theo email
    if not user:
        cursor.execute("SELECT id, username, email, password FROM users WHERE email = ?", (username_or_email,))
        user = cursor.fetchone()

    if user and check_password_hash(user['password'], password):
        return jsonify({"message": "Đăng nhập thành công!", "user_id": user['id'], "username": user['username']}), 200
    else:
        return jsonify({"error": "Tên người dùng/email hoặc mật khẩu không chính xác."}), 401

# --- Endpoint QUÊN MẬT KHẨU MỚI ---
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    username_or_email = data.get('email') # Frontend gửi là 'email' từ trường nhập liệu chung

    if not username_or_email:
        return jsonify({"error": "Vui lòng nhập tên người dùng hoặc địa chỉ email của bạn."}), 400

    db = get_db()
    cursor = db.cursor()

    try:
        # Thử tìm người dùng bằng username HOẶC email
        cursor.execute("SELECT id, username, email FROM users WHERE username = ? OR email = ?",
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
        cursor.execute("UPDATE users SET password = ? WHERE id = ?", (hashed_new_password, user_id))
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
        email_sent = send_email(user_email, subject, email_body) # <<< Gửi đến user_email từ CSDL

        if email_sent:
            return jsonify({"message": "Nếu thông tin bạn cung cấp tồn tại trong hệ thống, chúng tôi sẽ gửi mật khẩu mới đến email liên kết."}), 200
        else:
            print(f"Lỗi: Không thể gửi email cho {user_email} sau khi đặt lại mật khẩu.")
            return jsonify({"message": "Nếu thông tin bạn cung cấp tồn tại trong hệ thống, chúng tôi sẽ gửi mật khẩu mới đến email liên kết. Tuy nhiên, đã xảy ra lỗi khi gửi email."}), 200

    except Exception as e:
        db.rollback()
        print(f"Lỗi trong quá trình quên mật khẩu: {e}")
        return jsonify({"error": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."}), 500

# Endpoint để lấy thông tin phiên chat của người dùng
@auth_bp.route('/user_info/<int:user_id>', methods=['GET'])
def get_user_info(user_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT username, email FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if user:
        return jsonify({"username": user['username'], "email": user['email']}), 200
    return jsonify({"error": "Người dùng không tìm thấy."}), 404