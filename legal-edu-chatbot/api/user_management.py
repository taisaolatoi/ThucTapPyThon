# user_management.py - Backend Python cho chức năng Quản lý Người dùng
# Code này cung cấp các API để frontend React có thể quản lý thông tin người dùng từ PostgreSQL.

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Blueprint, request, jsonify, g
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env
load_dotenv()

# Import hàm get_db_connection từ file database.py
# Đảm bảo file database.py của bạn có hàm này và cấu hình kết nối PostgreSQL.
from database import get_db_connection

# Tạo một Blueprint mới. 'users' là tên của blueprint, /api/users là tiền tố URL.
user_bp = Blueprint('users', __name__, url_prefix='/api/users')

def get_db():
    """Lấy kết nối DB từ context toàn cục của Flask."""
    if 'db' not in g:
        g.db = get_db_connection()
    return g.db

@user_bp.teardown_app_request
def teardown_db(exception):
    """Đóng kết nối cơ sở dữ liệu sau mỗi request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- Endpoint API lấy danh sách tất cả người dùng ---
@user_bp.route('/', methods=['GET'])
def get_all_users():
    """
    Endpoint API để lấy danh sách tất cả người dùng từ cơ sở dữ liệu.
    Chuyển đổi giá trị 'role' từ số nguyên (0, 1) sang chuỗi ('User', 'Admin').
    """
    db = None
    try:
        db = get_db()
        cursor = db.cursor(cursor_factory=RealDictCursor) # Sử dụng RealDictCursor để lấy kết quả dạng dictionary

        query = """
        SELECT 
            id, 
            username as name, 
            email, 
            role, 
            status, 
            registered_at as registered
        FROM 
            users 
        ORDER BY 
            registered_at DESC;
        """
        cursor.execute(query)
        users = cursor.fetchall()
        
        # Chuyển đổi giá trị 'role' từ số nguyên sang chuỗi và định dạng ngày tháng
        formatted_users = []
        for user in users:
            user_dict = dict(user) # Tạo bản sao để tránh sửa đổi trực tiếp RealDictRow
            user_dict['role'] = 'Admin' if user_dict['role'] == 1 else 'User'
            if 'registered' in user_dict and user_dict['registered']:
                user_dict['registered'] = user_dict['registered'].strftime('%Y-%m-%d')
            formatted_users.append(user_dict)

        return jsonify({'users': formatted_users}), 200

    except psycopg2.Error as e:
        print(f"Lỗi PostgreSQL khi lấy danh sách người dùng: {e}")
        return jsonify({'error': 'Lỗi server khi lấy danh sách người dùng.'}), 500
    except Exception as e:
        print(f"Đã xảy ra lỗi không mong muốn: {e}")
        return jsonify({'error': 'Đã xảy ra lỗi không mong muốn.'}), 500
    finally:
        if db:
            db.close()

# --- Endpoint API chỉnh sửa thông tin người dùng ---
@user_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """
    Endpoint API để cập nhật thông tin của một người dùng cụ thể.
    Nhận dữ liệu cập nhật từ request body.
    """
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    role_str = data.get('role') # 'Admin' hoặc 'User'
    status = data.get('status') # 'Active' hoặc 'Inactive'

    # Chuyển đổi role từ chuỗi sang số nguyên
    role = 1 if role_str == 'Admin' else 0

    if not all([name, email, role_str, status]):
        return jsonify({"error": "Thiếu thông tin cập nhật người dùng."}), 400

    db = None
    try:
        db = get_db()
        cursor = db.cursor()

        query = """
        UPDATE users
        SET username = %s, email = %s, role = %s, status = %s
        WHERE id = %s;
        """
        cursor.execute(query, (name, email, role, status, user_id))
        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Không tìm thấy người dùng để cập nhật hoặc không có thay đổi."}), 404

        return jsonify({"message": "Cập nhật người dùng thành công."}), 200

    except psycopg2.Error as e:
        print(f"Lỗi PostgreSQL khi cập nhật người dùng: {e}")
        db.rollback()
        return jsonify({'error': 'Lỗi server khi cập nhật người dùng.'}), 500
    except Exception as e:
        print(f"Đã xảy ra lỗi không mong muốn: {e}")
        db.rollback()
        return jsonify({'error': 'Đã xảy ra lỗi không mong muốn.'}), 500
    finally:
        if db:
            db.close()

# --- Endpoint API xóa người dùng ---
@user_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """
    Endpoint API để xóa một người dùng cụ thể khỏi cơ sở dữ liệu.
    """
    db = None
    try:
        db = get_db()
        cursor = db.cursor()

        # Bắt đầu giao dịch để đảm bảo tính toàn vẹn dữ liệu
        cursor.execute("BEGIN TRANSACTION;")
        
        # Xóa các tin nhắn và phiên chat liên quan đến người dùng này trước (nếu có)
        # Giả định: 'messages' và 'chat_sessions' có khóa ngoại liên kết với 'users'
        # Nếu không có, bạn có thể bỏ qua các dòng này hoặc điều chỉnh.
        cursor.execute("DELETE FROM messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = %s);", (user_id,))
        cursor.execute("DELETE FROM chat_sessions WHERE user_id = %s;", (user_id,))
        cursor.execute("DELETE FROM image_generations WHERE user_id = %s;", (user_id,))

        
        # Cuối cùng, xóa người dùng
        cursor.execute("DELETE FROM users WHERE id = %s;", (user_id,))

        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Không tìm thấy người dùng để xóa."}), 404

        return jsonify({"message": "Xóa người dùng thành công."}), 200

    except psycopg2.Error as e:
        print(f"Lỗi PostgreSQL khi xóa người dùng: {e}")
        db.rollback()
        return jsonify({'error': 'Lỗi server khi xóa người dùng.'}), 500
    except Exception as e:
        print(f"Đã xảy ra lỗi không mong muốn: {e}")
        db.rollback()
        return jsonify({'error': 'Đã xảy ra lỗi không mong muốn.'}), 500
    finally:
        if db:
            db.close()
