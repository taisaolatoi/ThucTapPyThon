import io
import base64
import os
import time
import json
import uuid

import requests
from PIL import Image, ImageDraw, ImageFont
from googletrans import Translator
from flask import Blueprint, request, jsonify, g, current_app

import psycopg2
from psycopg2.extras import RealDictCursor

from database import get_db_connection

STABILITY_API_KEY = "sk-r3eGdEHEHXXNqRNzXcCHyMTgETV0mYzraDblpXD5TfE4ls6B"
SEGMENT_API_KEY = "SG_242151dd1a4024a5"

image_bp = Blueprint('image_generation', __name__, url_prefix='/api')

def get_db():
    if 'db' not in g:
        g.db = get_db_connection()
    return g.db

@image_bp.teardown_app_request
def teardown_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def translate_prompt(viet_prompt):
    translator = Translator()
    try:
        eng_prompt = translator.translate(viet_prompt, dest='en').text
        return eng_prompt
    except Exception as e:
        print(f"Error translating prompt: {e}")
        return viet_prompt

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
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content))
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 402:
            raise Exception(f"API đã hết credit. Vui lòng kiểm tra tài khoản Stability.ai của bạn. Chi tiết: {e.response.text}")
        else:
            raise Exception(f"Stability.ai API Error: {e.response.status_code}, {e.response.text}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Lỗi kết nối đến Stability.ai API: {str(e)}")

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
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content))
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            raise Exception(f"API Flux đã đạt giới hạn yêu cầu. Vui lòng đợi 5 phút trước khi thử lại hoặc chọn model AI khác. Chi tiết: {e.response.text}")
        else:
            raise Exception(f"Lỗi API Flux: {e.response.status_code}. Vui lòng thử lại sau hoặc chọn model AI khác. Chi tiết: {e.response.text}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Lỗi kết nối đến Flux API: {str(e)}")

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
        return [
            {"id": "stable-diffusion-xl-1024-v1-0", "name": "Stable Diffusion XL v1.0"},
            {"id": "stable-diffusion-v1-6", "name": "Stable Diffusion v1.6"}
        ]

# --- Blueprint Routes ---

@image_bp.route('/generate-image', methods=['POST'])
def generate_image():
    data = request.get_json()
    user_id = data.get('user_id')
    # Đảm bảo dòng này không bị comment hoặc bị xóa
    session_id = data.get('session_id') # Lấy session_id từ request, có thể là None

    viet_prompt = data.get('prompt')
    style = data.get('style', 'design')
    engine_id = data.get('engine_id', 'stable-diffusion-xl-1024-v1-0')

    if not viet_prompt:
        return jsonify({"error": "Prompt là bắt buộc."}), 400
    if not user_id:
        return jsonify({"error": "user_id là bắt buộc."}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)
    image_generation_id = None

    try:
        # Logic tạo chat_sessions đã bị loại bỏ như bạn yêu cầu
        # Các bản ghi tạo ảnh giờ đây độc lập với chat sessions

        # INSERT statement đã được sửa để không còn chèn session_id vào image_generations
        cursor.execute(
            "INSERT INTO image_generations (user_id, prompt, style, engine_id, status) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (user_id, viet_prompt, style, engine_id, 'pending')
        )
        image_generation_id = cursor.fetchone()['id']
        db.commit()
        print(f"Đã tạo bản ghi image_generations ban đầu với ID: {image_generation_id}")

        eng_prompt = translate_prompt(viet_prompt)

        image = None

        if engine_id == "flux-schnell":
            image = generate_image_from_flux(eng_prompt, style)
        else:
            image = generate_image_from_sdxl(eng_prompt, style, engine_id)

        filename = f"{uuid.uuid4()}.png"

        GENERATED_IMAGES_FOLDER = os.path.join(current_app.root_path, 'static', 'generated_images')
        
        os.makedirs(GENERATED_IMAGES_FOLDER, exist_ok=True)
        print(f"Đảm bảo thư mục lưu ảnh tồn tại: {GENERATED_IMAGES_FOLDER}")

        file_path = os.path.join(GENERATED_IMAGES_FOLDER, filename)
        
        image.save(file_path, format="PNG")
        print(f"Ảnh đã được lưu tại: {file_path}")

        image_url = f"/static/generated_images/{filename}"
        print(f"URL ảnh được lưu vào DB: {image_url}")

        cursor.execute(
            "UPDATE image_generations SET generated_image_data = %s, status = %s WHERE id = %s",
            (image_url, 'success', image_generation_id)
        )
        db.commit()
        print(f"Đã cập nhật bản ghi image_generations ID {image_generation_id} với URL ảnh và trạng thái thành công.")

        # session_id vẫn được trả về, ngay cả khi nó là None
        return jsonify({
            "image_url": image_url,
            "prompt": viet_prompt,
            "style": style,
            "engine_id": engine_id,
            "session_id": session_id # Đảm bảo biến này đã được định nghĩa
        })
    except Exception as e:
        error_message = str(e)
        print(f"Lỗi khi tạo ảnh: {error_message}")
        if image_generation_id:
            try:
                cursor.execute(
                    "UPDATE image_generations SET status = %s, error_message = %s WHERE id = %s",
                    ('failed', error_message, image_generation_id)
                )
                db.commit()
                print(f"Đã cập nhật bản ghi image_generations ID {image_generation_id} với trạng thái thất bại.")
            except Exception as update_e:
                print(f"Lỗi khi cập nhật trạng thái thất bại cho image_generations: {update_e}")
                if db: db.rollback()
        else:
            print("Lỗi xảy ra trước khi tạo bản ghi image_generations.")
        
        if "API đã hết credit" in error_message or "insufficient_balance" in error_message:
            return jsonify({"error": "Tài khoản Stability.ai của bạn đã hết số dư/credit. Vui lòng nạp thêm để tiếp tục sử dụng các model Stable Diffusion."}), 402
        elif "API Flux đã đạt giới hạn yêu cầu" in error_message:
            return jsonify({"error": "API Flux đã đạt giới hạn yêu cầu (Too Many Requests). Vui lòng đợi một lát hoặc chọn model AI khác."}), 429
        elif "Lỗi kết nối" in error_message:
            return jsonify({"error": f"Lỗi kết nối đến API. Vui lòng kiểm tra kết nối mạng của bạn: {error_message}"}), 503
        else:
            return jsonify({"error": f"Đã xảy ra lỗi không mong muốn: {error_message}"}), 500

@image_bp.route('/available-models', methods=['GET'])
def get_models():
    available_models = get_available_engines()
    available_models.append({"id": "flux-schnell", "name": "Flux.1 Schnell (Segmind)"})
    return jsonify(available_models)

@image_bp.route('/image-history', methods=['GET'])
def get_image_history():
    user_id = request.args.get('user_id')
    session_id = request.args.get('session_id') # Optional: if you want history per session

    if not user_id:
        return jsonify({"error": "User ID is required to fetch image history."}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)
    images = []

    try:
        # Nếu cột session_id không còn trong image_generations, bạn có thể bỏ phần này
        # hoặc đảm bảo nó là nullable và không được dùng để lọc nếu ảnh mới không có session_id
        query = "SELECT id,user_id, prompt, style, engine_id, generated_image_data AS image_url, status, error_message, created_at FROM image_generations WHERE user_id = %s"
        params = [user_id]

        if session_id: # Phần này sẽ chỉ lọc các ảnh có session_id nếu cột đó tồn tại và có dữ liệu
            query += " AND session_id = %s"
            params.append(session_id)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, params)
        images = cursor.fetchall()

        return jsonify(images), 200
    except Exception as e:
        print(f"Error fetching image history: {e}")
        return jsonify({"error": f"Failed to fetch image history: {str(e)}"}), 500

@image_bp.route('/delete-image/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required for deletion."}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT generated_image_data FROM image_generations WHERE id = %s AND user_id = %s", (image_id, user_id))
        image_record = cursor.fetchone()

        if not image_record:
            return jsonify({"error": "Image not found or you do not have permission to delete it."}), 404

        image_url = image_record['generated_image_data']
        
        cursor.execute("DELETE FROM image_generations WHERE id = %s AND user_id = %s", (image_id, user_id))
        db.commit()

        app_root = current_app.root_path
        
        relative_path = image_url.lstrip('/') 
        file_path = os.path.join(app_root, relative_path)

        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Đã xóa file ảnh vật lý: {file_path}")
        else:
            print(f"Cảnh báo: File ảnh vật lý không tồn tại tại đường dẫn: {file_path}")

        return jsonify({"message": "Image deleted successfully."}), 200

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi xóa ảnh: {e}")
        return jsonify({"error": f"Failed to delete image: {str(e)}"}), 500

@image_bp.route('/admin/image-history/all', methods=['GET'])
def get_all_image_history_endpoint():
    """Endpoint để admin lấy tất cả lịch sử các hình ảnh đã tạo từ mọi người dùng."""
    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)
    images = []

    try:
        # Truy vấn tất cả các bản ghi hình ảnh mà không lọc theo user_id
        query = """
        SELECT 
            ig.id, 
            ig.prompt, 
            ig.user_id,
            ig.style, 
            ig.engine_id, 
            ig.generated_image_data AS image_url, 
            ig.status, 
            ig.error_message, 
            ig.created_at,
            u.username as user_name -- Lấy tên người dùng
        FROM 
            image_generations ig
        JOIN
            users u ON ig.user_id = u.id
        ORDER BY 
            ig.created_at DESC
        """
        cursor.execute(query)
        images = cursor.fetchall()

        # Định dạng created_at thành chuỗi để gửi về frontend
        for img in images:
            if 'created_at' in img and img['created_at']:
                img['created_at'] = img['created_at'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify(images), 200
    except Exception as e:
        print(f"Lỗi khi lấy tất cả lịch sử hình ảnh (Admin): {e}")
        return jsonify({"error": f"Không thể lấy tất cả lịch sử hình ảnh: {str(e)}"}), 500

@image_bp.route('/delete-image/<int:image_id>', methods=['DELETE'])
def delete_image_endpoint(image_id):
    """Endpoint để xóa một hình ảnh đã tạo khỏi DB và file vật lý."""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID là bắt buộc để xóa."}), 400

    db = get_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)

    try:
        # Kiểm tra xem ảnh có tồn tại và thuộc về người dùng hiện tại không
        cursor.execute("SELECT generated_image_data FROM image_generations WHERE id = %s AND user_id = %s", (image_id, user_id))
        image_record = cursor.fetchone()

        if not image_record:
            return jsonify({"error": "Không tìm thấy hình ảnh hoặc bạn không có quyền xóa."}), 404

        image_url = image_record['generated_image_data']
        
        # Xóa bản ghi khỏi cơ sở dữ liệu
        cursor.execute("DELETE FROM image_generations WHERE id = %s AND user_id = %s", (image_id, user_id))
        db.commit()

        # Xóa file ảnh vật lý
        app_root = current_app.root_path
        relative_path = image_url.lstrip('/') 
        file_path = os.path.join(app_root, relative_path)

        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Đã xóa file ảnh vật lý: {file_path}")
        else:
            print(f"Cảnh báo: File ảnh vật lý không tồn tại tại đường dẫn: {file_path}")

        return jsonify({"message": "Hình ảnh đã được xóa thành công."}), 200

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi xóa ảnh: {e}")
        return jsonify({"error": f"Không thể xóa hình ảnh: {str(e)}"}), 500
