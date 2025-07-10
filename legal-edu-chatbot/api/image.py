import base64
import io
import os
import time
import sqlite3 # Import sqlite3
import datetime # Import datetime for timestamp

import requests
from PIL import Image, ImageDraw, ImageFont
from googletrans import Translator
from flask import Blueprint, request, jsonify, g

# --- Configuration ---
# Set your API Keys here.
# IMPORTANT: In a real production environment, consider loading these from environment variables
# (e.g., using os.getenv) instead of hardcoding them).
STABILITY_API_KEY = "sk-ywpUdhApv5lO5F5PmWS1XdJeLJXVvqZQvBJ209dMIY2u5aPk"
SEGMENT_API_KEY = "SG_242151dd1a4024a5"

# Tạo Blueprint cho chức năng tạo ảnh và chat
image_bp = Blueprint('image_generation', __name__, url_prefix='/api')

# --- Database functions (moved from database.py) ---
DATABASE_NAME = 'chatbot.db'

def get_db_connection():
    """
    Kết nối đến cơ sở dữ liệu SQLite và cấu hình row_factory để trả về các hàng
    dưới dạng sqlite3.Row (cho phép truy cập cột bằng tên).
    """
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def add_message(session_id, sender, text=None, image_data=None):
    """
    Thêm một tin nhắn mới vào bảng messages.
    Có thể là tin nhắn văn bản hoặc tin nhắn có kèm ảnh.
    """
    if text is None and image_data is None:
        print("Lỗi: Tin nhắn phải có ít nhất văn bản hoặc dữ liệu ảnh.")
        return None

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO messages (session_id, sender, text, image_data) VALUES (?, ?, ?, ?)",
            (session_id, sender, text, image_data)
        )
        conn.commit()
        return cursor.lastrowid
    except sqlite3.Error as e:
        print(f"Lỗi SQLite khi thêm tin nhắn: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()

# --- Quản lý kết nối cơ sở dữ liệu với Flask 'g' ---
def get_db():
    """
    Lấy kết nối cơ sở dữ liệu từ đối tượng 'g' của Flask.
    Nếu chưa có, tạo một kết nối mới.
    """
    if 'db' not in g:
        g.db = get_db_connection() # Sử dụng hàm cục bộ get_db_connection
    return g.db

@image_bp.teardown_app_request
def teardown_db(exception):
    """
    Đóng kết nối cơ sở dữ liệu sau mỗi yêu cầu.
    """
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Dịch prompt tiếng Việt sang tiếng Anh
def translate_prompt(viet_prompt):
    translator = Translator()
    try:
        eng_prompt = translator.translate(viet_prompt, dest='en').text
        return eng_prompt
    except Exception as e:
        print(f"Error translating prompt: {e}")
        return viet_prompt # Fallback to original prompt if translation fails

# Gọi Stability.ai API để tạo hình ảnh
def generate_image_from_sdxl(prompt, style=None, engine_id="stable-diffusion-xl-1024-v1-0", cfg_scale=7, steps=30, seed=None, negative_prompt=None):
    if style:
        prompt = f"{prompt}, style: {style}"

    url = f"https://api.stability.ai/v1/generation/{engine_id}/text-to-image"
    headers = {
        "Authorization": f"Bearer {STABILITY_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "image/png"
    }

    payload = {
        "text_prompts": [
            {"text": prompt, "weight": 1}
        ],
        "cfg_scale": cfg_scale,
        "height": 1024,
        "width": 1024,
        "samples": 1,
        "steps": steps
    }

    if seed is not None:
        payload["seed"] = seed
    if negative_prompt:
        payload["text_prompts"].append({
            "text": negative_prompt,
            "weight": -1
        })

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        return Image.open(io.BytesIO(response.content))
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 402: # This is the "insufficient_balance" case
            raise Exception(f"API đã hết credit. Vui lòng kiểm tra tài khoản Stability.ai của bạn. Chi tiết: {e.response.text}")
        else:
            raise Exception(f"Stability.ai API Error: {e.response.status_code}, {e.response.text}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Lỗi kết nối đến Stability.ai API: {str(e)}")

# Gọi Flux.1 Schnell API từ Segmind
def generate_image_from_flux(prompt, style=None):
    if style:
        prompt = f"{prompt}, style: {style}"

    url = "https://api.segmind.com/v1/flux-schnell"
    headers = {"x-api-key": SEGMENT_API_KEY}
    payload = {
        "prompt": prompt,
        "samples": 1,
        "num_inference_steps": 25,
        "guidance_scale": 7.5,
        "img_width": 500,
        "img_height": 500
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        return Image.open(io.BytesIO(response.content))
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429: # This is the "Too Many Requests" case for Flux
            raise Exception(f"API Flux đã đạt giới hạn yêu cầu. Vui lòng đợi 5 phút trước khi thử lại hoặc chọn model AI khác. Chi tiết: {e.response.text}")
        else:
            raise Exception(f"Lỗi API Flux: {e.response.status_code}. Vui lòng thử lại sau hoặc chọn model AI khác. Chi tiết: {e.response.text}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Lỗi kết nối đến Flux API: {str(e)}")

# Lấy danh sách engine_id từ API Stability.ai
def get_available_engines():
    url = "https://api.stability.ai/v1/engines/list"
    headers = {
        "Authorization": f"Bearer {STABILITY_API_KEY}"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        engines = response.json()
        return engines
    except requests.exceptions.RequestException:
        # Fallback to a default list if there's a connection error or API error
        return [
            {"id": "stable-diffusion-xl-1024-v1-0", "name": "Stable Diffusion XL v1.0"},
            {"id": "stable-diffusion-v1-6", "name": "Stable Diffusion v1.6"}
        ]

# --- Blueprint Routes ---

@image_bp.route('/generate-image', methods=['POST'])
def generate_image():
    data = request.get_json()
    user_id = data.get('user_id') # Lấy user_id từ request
    session_id = data.get('session_id') # Lấy session_id từ request (có thể là None)
    viet_prompt = data.get('prompt')
    style = data.get('style', 'design')
    engine_id = data.get('engine_id', 'stable-diffusion-xl-1024-v1-0')

    if not viet_prompt:
        return jsonify({"error": "Prompt là bắt buộc."}), 400
    if not user_id: # user_id vẫn là bắt buộc để liên kết với phiên
        return jsonify({"error": "user_id là bắt buộc."}), 400

    db = get_db() # Lấy kết nối DB
    cursor = db.cursor()

    try:
        # Nếu session_id không được cung cấp, tạo một phiên mới
        if not session_id:
            initial_title = viet_prompt[:50] + "..." if len(viet_prompt) > 50 else viet_prompt
            cursor.execute("INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)", (user_id, initial_title))
            session_id = cursor.lastrowid
            db.commit()
            print(f"Đã tạo phiên chat mới cho ảnh với ID: {session_id}")

        eng_prompt = translate_prompt(viet_prompt)

        # Lưu tin nhắn của người dùng vào DB
        add_message(session_id, "user", viet_prompt) # Sử dụng hàm add_message cục bộ

        image = None
        img_str = None

        if engine_id == "flux-schnell":
            image = generate_image_from_flux(eng_prompt, style)
        else:
            image = generate_image_from_sdxl(eng_prompt, style, engine_id)

        # Convert PIL Image to Base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        # Lưu tin nhắn của AI (bao gồm ảnh) vào DB
        ai_response_text = f"Đã tạo ảnh với prompt: '{viet_prompt}' và style: '{style}' sử dụng {engine_id}."
        add_message(session_id, "ai", ai_response_text, image_data=img_str) # Sử dụng hàm add_message cục bộ

        return jsonify({
            "image_base64": img_str,
            "prompt": viet_prompt,
            "style": style,
            "engine_id": engine_id,
            "session_id": session_id # Luôn trả về session_id (có thể là mới tạo)
        })
    except Exception as e:
        error_message = str(e)
        # Lưu lỗi vào DB nếu có thể
        if session_id: # Chỉ lưu lỗi nếu có session_id hợp lệ
            add_message(session_id, "ai", f"Lỗi khi tạo ảnh: {error_message}") # Sử dụng hàm add_message cục bộ
            pass

        # Kiểm tra các thông báo lỗi cụ thể từ các hàm tạo ảnh
        if "API đã hết credit" in error_message or "insufficient_balance" in error_message:
            return jsonify({"error": "Tài khoản Stability.ai của bạn đã hết số dư/credit. Vui lòng nạp thêm để tiếp tục sử dụng các model Stable Diffusion."}), 402 # 402 Payment Required
        elif "API Flux đã đạt giới hạn yêu cầu" in error_message:
            return jsonify({"error": "API Flux đã đạt giới hạn yêu cầu (Too Many Requests). Vui lòng đợi một lát hoặc chọn model AI khác."}), 429 # 429 Too Many Requests
        elif "Lỗi kết nối" in error_message:
            return jsonify({"error": f"Lỗi kết nối đến API. Vui lòng kiểm tra kết nối mạng của bạn: {error_message}"}), 503 # 503 Service Unavailable
        else:
            # Các lỗi khác không xác định
            return jsonify({"error": f"Đã xảy ra lỗi không mong muốn: {error_message}"}), 500

@image_bp.route('/available-models', methods=['GET'])
def get_models():
    available_models = get_available_engines()
    # Add Flux model to the list
    available_models.append({"id": "flux-schnell", "name": "Flux.1 Schnell (Segmind)"})
    return jsonify(available_models)


# --- Các hàm quản lý chat ---

@image_bp.route('/chat/history/<int:session_id>', methods=['GET'])
def get_session_history(session_id):
    """
    Lấy lịch sử tin nhắn của một phiên chat cụ thể, bao gồm dữ liệu ảnh.
    """
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT sender, text, image_data, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
        messages = cursor.fetchall()
        
        history_data = []
        for msg in messages:
            msg_dict = dict(msg)
            # Nếu có dữ liệu ảnh, tạo URL base64 cho client
            if msg_dict['image_data']:
                msg_dict['image_url'] = f"data:image/png;base64,{msg_dict['image_data']}"
            # Xóa image_data thô khỏi phản hồi JSON nếu không muốn gửi nó trực tiếp
            del msg_dict['image_data'] 
            history_data.append(msg_dict)

        return jsonify(history_data), 200
    except Exception as e:
        print(f"Lỗi khi lấy lịch sử chat: {e}")
        return jsonify({"error": f"Không thể lấy lịch sử chat: {e}"}), 500

@image_bp.route('/chat/sessions/<int:user_id>', methods=['GET'])
def get_user_sessions(user_id):
    """
    Lấy tất cả các phiên chat của một người dùng cụ thể.
    """
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        sessions = cursor.fetchall()

        sessions_data = []
        for session in sessions:
            session_dict = dict(session)
            cursor.execute("SELECT COUNT(*) FROM messages WHERE session_id = ?", (session['id'],))
            msg_count = cursor.fetchone()[0]
            session_dict['message_count'] = msg_count
            sessions_data.append(session_dict)

        return jsonify(sessions_data), 200
    except Exception as e:
        print(f"Lỗi khi lấy các phiên chat của người dùng: {e}")
        return jsonify({"error": f"Không thể lấy các phiên chat: {e}"}), 500

@image_bp.route('/chat/session/<int:session_id>', methods=['DELETE'])
def delete_chat_session(session_id):
    """
    Xóa một phiên chat cụ thể và tất cả tin nhắn liên quan.
    """
    db = get_db()
    cursor = db.cursor()
    try:
        # Bắt đầu giao dịch
        db.execute("BEGIN TRANSACTION")
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
        db.commit() # Kết thúc giao dịch và lưu thay đổi
        return jsonify({"message": f"Phiên chat {session_id} đã được xóa thành công."}), 200
    except Exception as e:
        print(f"Lỗi khi xóa phiên chat: {e}")
        db.rollback() # Hoàn tác nếu có lỗi
        return jsonify({"error": "Không thể xóa phiên chat."}), 500

# Bạn có thể thêm một endpoint để thêm tin nhắn văn bản thông thường nếu cần.
# @image_bp.route('/chat/message', methods=['POST'])
# def add_chat_message():
#     data = request.get_json()
#     session_id = data.get('session_id')
#     sender = data.get('sender') # 'user' or 'ai'
#     text = data.get('text')
#
#     if not session_id or not sender or not text:
#         return jsonify({"error": "session_id, sender, và text là bắt buộc."}), 400
#
#     message_id = add_message(session_id, sender, text)
#     if message_id:
#         return jsonify({"message": "Tin nhắn đã được thêm thành công.", "message_id": message_id}), 201
#     else:
#         return jsonify({"error": "Không thể thêm tin nhắn."}), 500
