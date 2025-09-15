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
        # Thử tìm người dùng bằng username HOẶc email
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

        # Gửi email cho người dùng với giao diện đẹp hơn
        subject = "Yêu cầu đặt lại mật khẩu cho ứng dụng Chat AI"
        email_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
            <div style="width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
                <div style="background-color: #6a5acd; color: #ffffff; padding: 20px; border-top-left-radius: 8px; border-top-right-radius: 8px; text-align: center;">
                    <h1 style="margin: 0;">Chat AI</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Xin chào <strong>{username}</strong>,</p>
                    <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mật khẩu mới của bạn là:</p>
                    <div style="background-color: #e8eaf6; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; color: #3f51b5;">{new_password}</span>
                    </div>
                    <p>Để đảm bảo an toàn, vui lòng đăng nhập và đổi mật khẩu này ngay sau khi đăng nhập thành công.</p>
                    <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
                </div>
                <div style="text-align: center; padding: 20px; font-size: 12px; color: #888888;">
                    <p>&copy; 2024 Chat AI. Tất cả các quyền được bảo lưu.</p>
                </div>
            </div>
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


@auth_bp.route('/change-password/<int:user_id>', methods=['PUT'])
def change_password(user_id):
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify({"error": "Vui lòng nhập đầy đủ mật khẩu cũ và mới."}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Người dùng không tìm thấy."}), 404

        if not check_password_hash(user['password'], old_password):
            return jsonify({"error": "Mật khẩu cũ không chính xác."}), 401

        hashed_new_password = generate_password_hash(new_password, method='pbkdf2:sha256')
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_new_password, user_id))
        db.commit()

        return jsonify({"message": "Đổi mật khẩu thành công!"}), 200

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi đổi mật khẩu: {e}")
        return jsonify({"error": "Đổi mật khẩu thất bại. Vui lòng thử lại."}), 500

@auth_bp.route('/update-profile/<int:user_id>', methods=['PUT'])
def update_profile(user_id):
    data = request.get_json()
    email = data.get('email')
    phone = data.get('phone')

    if not email or not phone:
        return jsonify({"error": "Email và số điện thoại là bắt buộc."}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)

    try:
        # Kiểm tra email đã tồn tại với user khác chưa
        cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
        if cursor.fetchone():
            return jsonify({"error": "Email này đã được sử dụng bởi tài khoản khác."}), 409

        # Kiểm tra phone đã tồn tại với user khác chưa
        cursor.execute("SELECT id FROM users WHERE phone = %s AND id != %s", (phone, user_id))
        if cursor.fetchone():
            return jsonify({"error": "Số điện thoại này đã được sử dụng bởi tài khoản khác."}), 409

        # Cập nhật email và phone
        cursor.execute(
            "UPDATE users SET email = %s, phone = %s WHERE id = %s",
            (email, phone, user_id)
        )
        db.commit()

        return jsonify({"message": "Cập nhật hồ sơ thành công!"}), 200

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi cập nhật hồ sơ: {e}")
        return jsonify({"error": "Đã xảy ra lỗi khi cập nhật hồ sơ."}), 500



@auth_bp.route('/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT id, email, phone FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Người dùng không tồn tại."}), 404

        return jsonify(user), 200

    except Exception as e:
        print(f"Lỗi khi lấy hồ sơ: {e}")
        return jsonify({"error": "Không thể lấy dữ liệu hồ sơ."}), 500



@auth_bp.route('/register/request-otp', methods=['POST'])
def request_register_otp():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    phone = data.get('phone')

    if not username or not email or not password:
        return jsonify({"error": "Thiếu thông tin"}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s",
                   (username, email))
    if cursor.fetchone():
        return jsonify({"error": "Username hoặc email đã tồn tại"}), 409

    otp_code = generate_otp()
    expire_at = datetime.datetime.now() + datetime.timedelta(minutes=10)

    pending_otps[email] = {
        "username": username,
        "email": email,
        "password": generate_password_hash(password),
        "phone": phone,
        "role": 0,
        "status": "Active",
        "registered_at": datetime.datetime.now(),
        "otp": otp_code,
        "expire_at": expire_at,
        "type": "register"
    }

    subject = "Xác nhận đăng ký"
    body = f"""
    <p>Xin chào {username},</p>
    <p>Mã OTP xác nhận đăng ký của bạn là:</p>
    <h2>{otp_code}</h2>
    <p>Mã có hiệu lực trong 10 phút.</p>
    """

    if send_email(email, subject, body):
        return jsonify({"message": "OTP đã gửi đến email, vui lòng xác nhận"}), 200
    else:
        return jsonify({"error": "Không gửi được OTP"}), 500


@auth_bp.route('/register/verify-otp', methods=['POST'])
def verify_register_otp():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')

    otp_data = pending_otps.get(email)
    if not otp_data or otp_data["type"] != "register":
        return jsonify({"error": "Không tìm thấy yêu cầu đăng ký"}), 400

    if datetime.datetime.now() > otp_data["expire_at"]:
        pending_otps.pop(email, None)
        return jsonify({"error": "OTP hết hạn"}), 400

    if otp != otp_data["otp"]:
        return jsonify({"error": "OTP không đúng"}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        INSERT INTO users (username, email, password, phone, role, status, registered_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, username, email, role, status, registered_at
    """, (otp_data["username"], otp_data["email"], otp_data["password"],
          otp_data["phone"], otp_data["role"], otp_data["status"], otp_data["registered_at"]))
    new_user = cursor.fetchone()
    db.commit()

    pending_otps.pop(email, None)

    return jsonify({
        "message": "Đăng ký thành công",
        "user": new_user
    }), 201
