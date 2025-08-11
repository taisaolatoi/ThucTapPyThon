# dashboard_bp.py
# File này chứa Blueprint cho các chức năng liên quan đến trang tổng quan (dashboard).

import os
import psycopg2
from psycopg2.extras import RealDictCursor # Import RealDictCursor
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Tải biến môi trường (phải ở đây để các module khác có thể truy cập os.getenv)
load_dotenv()

# Import các hàm kết nối và khởi tạo CSDL từ database.py
from database import get_db_connection

# Blueprint cho trang tổng quan
dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

# --- Định nghĩa hàm get_db() trong Blueprint ---
def get_db():
    """
    Lấy kết nối DB từ context toàn cục của Flask.
    Nếu chưa có, tạo một kết nối mới.
    """
    if 'db' not in g:
        g.db = get_db_connection()
    return g.db

@dashboard_bp.teardown_app_request
def teardown_db(exception):
    """
    Đóng kết nối cơ sở dữ liệu sau mỗi request.
    """
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Endpoint cũ cho /stats (từ Dashboard.js ban đầu)
@dashboard_bp.route('/stats', methods=['GET'])
def get_dashboard_stats():
    """
    Lấy các chỉ số thống kê tổng quan cho trang tổng quan từ cơ sở dữ liệu (công khai).
    """
    db = None
    cursor = None
    try:
        db = get_db() # Sử dụng get_db() đã định nghĩa
        if db is None:
            return jsonify({"error": "Không thể kết nối đến cơ sở dữ liệu."}), 500
        
        cursor = db.cursor(cursor_factory=RealDictCursor) # Sử dụng RealDictCursor
        
        cursor.execute("SELECT COUNT(*) FROM messages WHERE sender = 'user';")
        total_questions = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) FROM messages WHERE sender = 'model';")
        answered_questions = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) FROM image_generations;")
        total_image_requests = cursor.fetchone()['count']

        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        cursor.execute("SELECT COUNT(*) FROM users WHERE created_at >= %s;", (seven_days_ago,))
        new_users_weekly = cursor.fetchone()['count']

        stats = {
            "total_questions": total_questions,
            "answered_questions": answered_questions,
            "total_image_requests": total_image_requests,
            "new_users_weekly": new_users_weekly,
        }

        return jsonify(stats), 200

    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu thống kê trang tổng quan: {e}")
        return jsonify({"error": "Không thể lấy dữ liệu thống kê trang tổng quan."}), 500
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# Endpoint cũ cho /activities (từ Dashboard.js ban đầu)
@dashboard_bp.route('/activities', methods=['GET'])
def get_public_activities_list(): # Tên hàm này đã là duy nhất
    """
    Lấy danh sách các hoạt động gần đây (công khai) từ cơ sở dữ liệu.
    """
    db = None
    cursor = None
    try:
        db = get_db() # Sử dụng get_db() đã định nghĩa
        if db is None:
            return jsonify({"error": "Không thể kết nối đến cơ sở dữ liệu."}), 500
            
        cursor = db.cursor(cursor_factory=RealDictCursor) # Sử dụng RealDictCursor
        
        cursor.execute("""
            (SELECT 'Câu hỏi mới' as type, text as description, timestamp as created_at
             FROM messages
             WHERE sender = 'user'
             ORDER BY timestamp DESC
             LIMIT 5)
            UNION ALL
            (SELECT 'Tạo ảnh' as type, prompt as description, created_at
             FROM image_generations
             ORDER BY created_at DESC
             LIMIT 5)
            UNION ALL
            (SELECT 'Người dùng mới' as type, username as description, created_at
             FROM users
             ORDER BY created_at DESC
             LIMIT 5)
            ORDER BY created_at DESC
            LIMIT 10;
        """)
        activities = cursor.fetchall()
        
        activities_data = []
        for activity in activities:
            activity_dict = dict(activity)
            # Định dạng created_at thành chuỗi ISO để dễ dàng phân tích cú pháp trong JavaScript
            if 'created_at' in activity_dict and activity_dict['created_at']:
                activity_dict['created_at'] = activity_dict['created_at'].isoformat()
            activities_data.append(activity_dict)
        
        return jsonify(activities_data), 200

    except Exception as e:
        print(f"Lỗi khi lấy hoạt động gần đây: {e}")
        return jsonify({"error": "Không thể lấy hoạt động gần đây."}), 500
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# dashboard_user 
@dashboard_bp.route('/summary-stats-user', methods=['GET'])
def get_summary_stats():
    """
    Endpoint API để lấy tổng số phiên chat và tổng số ảnh đã tạo.
    Có thể lọc theo user_id nếu được cung cấp qua query parameter.
    """
    conn = None
    user_id = request.args.get('user_id', type=int) # Lấy user_id từ query parameter

    try:
        conn = get_db() # Sử dụng get_db() đã định nghĩa
        cursor = conn.cursor(cursor_factory=RealDictCursor) # Sử dụng RealDictCursor

        if user_id:
            # Lấy tổng số phiên chat cho người dùng cụ thể
            cursor.execute("SELECT COUNT(*) FROM chat_sessions WHERE user_id = %s;", (user_id,))
            total_chats = cursor.fetchone()['count']

            # Lấy tổng số ảnh đã tạo cho người dùng cụ thể
            cursor.execute("SELECT COUNT(*) FROM image_generations WHERE user_id = %s;", (user_id,))
            total_image_generations = cursor.fetchone()['count']
        else:
            # Lấy tổng số phiên chat toàn cầu
            cursor.execute("SELECT COUNT(*) FROM chat_sessions;")
            total_chats = cursor.fetchone()['count']

            # Lấy tổng số ảnh đã tạo toàn cầu
            cursor.execute("SELECT COUNT(*) FROM image_generations;")
            total_image_generations = cursor.fetchone()['count']

        return jsonify({
            "total_chats": total_chats,
            "total_image_generations": total_image_generations
        }), 200

    except psycopg2.Error as e:
        print(f"Lỗi khi lấy dữ liệu thống kê tổng quan từ PostgreSQL: {e}")
        return jsonify({'error': 'Lỗi server khi lấy dữ liệu thống kê tổng quan.'}), 500
    except Exception as e:
        print(f"Đã xảy ra lỗi không mong muốn: {e}")
        return jsonify({'error': 'Đã xảy ra lỗi không mong muốn.'}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route('/recent-activities-user', methods=['GET'])
def get_recent_activities_user(): # Tên hàm này đã là duy nhất
    """
    Endpoint API để lấy danh sách các hoạt động gần đây (tin nhắn chat và tạo ảnh).
    Có thể lọc theo user_id nếu được cung cấp qua query parameter.
    """
    conn = None
    user_id = request.args.get('user_id', type=int) # Lấy user_id từ query parameter

    try:
        conn = get_db() # Sử dụng get_db() đã định nghĩa
        cursor = conn.cursor(cursor_factory=RealDictCursor) # Sử dụng RealDictCursor

        chat_activities = []
        image_activities = []

        if user_id:
            # Lấy các tin nhắn chat gần đây nhất cho người dùng cụ thể
            cursor.execute("""
                SELECT
                    m.id,
                    'chat' as type,
                    m.text as description,
                    m.timestamp as created_at,
                    u.username as user_name
                FROM
                    messages m
                JOIN
                    chat_sessions cs ON m.session_id = cs.id
                JOIN
                    users u ON cs.user_id = u.id
                WHERE m.sender = 'user' AND cs.user_id = %s
                ORDER BY
                    m.timestamp DESC
                LIMIT 5;
            """, (user_id,)) # Truyền user_id vào đây
            chat_activities = cursor.fetchall()

            # Lấy các lần tạo ảnh gần đây nhất cho người dùng cụ thể
            cursor.execute("""
                SELECT
                    ig.id,
                    'image' as type,
                    ig.prompt as description,
                    ig.created_at,
                    u.username as user_name
                FROM
                    image_generations ig
                JOIN
                    users u ON ig.user_id = u.id
                WHERE ig.user_id = %s
                ORDER BY
                    ig.created_at DESC
                LIMIT 5;
            """, (user_id,)) # Truyền user_id vào đây
            image_activities = cursor.fetchall()
        else:
            # Lấy các tin nhắn chat gần đây nhất toàn cầu
            cursor.execute("""
                SELECT
                    m.id,
                    'chat' as type,
                    m.text as description,
                    m.timestamp as created_at,
                    u.username as user_name
                FROM
                    messages m
                JOIN
                    chat_sessions cs ON m.session_id = cs.id
                JOIN
                    users u ON cs.user_id = u.id
                WHERE m.sender = 'user'
                ORDER BY
                    m.timestamp DESC
                LIMIT 5;
            """)
            chat_activities = cursor.fetchall()

            # Lấy các lần tạo ảnh gần đây nhất toàn cầu
            cursor.execute("""
                SELECT
                    ig.id,
                    'image' as type,
                    ig.prompt as description,
                    ig.created_at,
                    u.username as user_name
                FROM
                    image_generations ig
                JOIN
                    users u ON ig.user_id = u.id
                ORDER BY
                    ig.created_at DESC
                LIMIT 5;
            """)
            image_activities = cursor.fetchall()

        # Kết hợp và sắp xếp tất cả các hoạt động theo thời gian tạo giảm dần
        all_activities = sorted(
            chat_activities + image_activities,
            key=lambda x: x['created_at'],
            reverse=True
        )[:10] # Giới hạn 10 hoạt động gần đây nhất

        # Định dạng đối tượng datetime thành chuỗi ISO để dễ dàng phân tích cú pháp trong JavaScript
        for activity in all_activities:
            if 'created_at' in activity and activity['created_at']:
                activity['created_at'] = activity['created_at'].isoformat()

        return jsonify(all_activities), 200

    except psycopg2.Error as e:
        print(f"Lỗi khi lấy hoạt động gần đây từ PostgreSQL: {e}")
        return jsonify({'error': 'Lỗi server khi lấy hoạt động gần đây.'}), 500
    except Exception as e:
        print(f"Đã xảy ra lỗi không mong muốn: {e}")
        return jsonify({'error': 'Đã xảy ra lỗi không mong muốn.'}), 500
    finally:
        if conn:
            conn.close()
