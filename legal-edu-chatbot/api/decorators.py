# decorators.py
# File này chứa các decorators tùy chỉnh để sử dụng trong các Blueprint.

from functools import wraps
from flask import request, jsonify, g
import os

def auth_required(f):
    """
    Một decorator tùy chỉnh để yêu cầu xác thực JWT cho một route.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            # Token có định dạng "Bearer <token>"
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({"error": "Token is missing"}), 401

        # Đây là nơi bạn sẽ thêm logic xác thực token thực tế của mình.
        # Ví dụ, bạn có thể giải mã token JWT và kiểm tra tính hợp lệ.
        # Hiện tại, chúng ta chỉ giả định token hợp lệ để tránh lỗi.
        try:
            # ... Thêm logic xác thực token JWT ở đây
            # Nếu token không hợp lệ, throw một Exception
            is_authenticated = True
        except Exception as e:
            print(f"Lỗi xác thực token: {e}")
            is_authenticated = False

        if not is_authenticated:
            return jsonify({"error": "Invalid token"}), 401

        # Gán thông tin người dùng vào đối tượng 'g' nếu cần
        # Ví dụ: g.user_id = user_id_from_token

        return f(*args, **kwargs)
    return decorated_function
