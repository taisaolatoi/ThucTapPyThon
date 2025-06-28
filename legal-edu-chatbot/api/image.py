import os
from flask import Flask, request, jsonify
from flask_cors import CORS # Để xử lý CORS (Cross-Origin Resource Sharing)
import requests
import base64
from googletrans import Translator # Thêm import Translator
from dotenv import load_dotenv # Thêm import này để tải biến môi trường từ .env

# Tải các biến môi trường từ file .env (nếu có).
# Đảm bảo bạn đã cài đặt python-dotenv: pip install python-dotenv
load_dotenv()

app = Flask(__name__)
# Cho phép tất cả các nguồn gốc (origins) để đơn giản hóa việc phát triển.
# Trong môi trường sản phẩm, bạn nên chỉ định rõ ràng các nguồn gốc được phép.
CORS(app)

# --- CẤU HÌNH API KEY SEGMIND ---
# Ưu tiên lấy API Key từ biến môi trường để bảo mật.
# Bạn cần thiết lập biến môi trường này trước khi chạy ứng dụng Flask.
# Ví dụ (trên Linux/macOS): export SEGMIND_API_KEY="SG_YOUR_ACTUAL_API_KEY_HERE"
# Hoặc (trên Windows CMD): set SEGMIND_API_KEY="SG_YOUR_ACTUAL_API_KEY_HERE"
# Hoặc đặt trong file .env: SEGMIND_API_KEY="SG_YOUR_ACTUAL_API_KEY_HERE"
SEGMIND_API_KEY = os.environ.get("SEGMIND_API_KEY")

# TÙY CHỌN: Nếu bạn muốn nhúng trực tiếp API Key vào mã (KHÔNG NÊN DÙNG TRONG SẢN PHẨM):
# SEGMIND_API_KEY = "SG_YOUR_ACTUAL_API_KEY_HERE" # Thay thế bằng API Key của bạn

# Endpoint API của Segmind cho mô hình SDXL 1.0 Text-to-Image
SEGMIND_API_URL = "https://api.segmind.com/v1/sdxl1.0-txt2img"

# Khởi tạo Translator
translator = Translator()

# Hàm dịch prompt tiếng Việt sang tiếng Anh
def translate_prompt_viet_to_eng(viet_prompt):
    try:
        # Dịch prompt sang tiếng Anh
        eng_prompt = translator.translate(viet_prompt, dest='en').text
        return eng_prompt
    except Exception as e:
        # Nếu có lỗi dịch, trả về prompt gốc và ghi log lỗi
        print(f"Lỗi khi dịch prompt: {e}. Sử dụng prompt gốc.")
        return viet_prompt

@app.route('/generate-image', methods=['POST'])
def generate_image():
    # Kiểm tra API Key
    if not SEGMIND_API_KEY:
        return jsonify({"error": "API Key Segmind chưa được cấu hình. Vui lòng thiết lập biến môi trường SEGMIND_API_KEY hoặc nhúng trực tiếp vào mã (chỉ để thử nghiệm)."}), 500

    try:
        # Nhận dữ liệu JSON từ yêu cầu của frontend
        data = request.get_json()
        viet_prompt = data.get('prompt', 'Một quả táo đỏ đơn giản trên nền trắng') # Prompt mặc định bằng tiếng Việt
        
        # Dịch prompt tiếng Việt sang tiếng Anh
        eng_prompt = translate_prompt_viet_to_eng(viet_prompt)

        # Lấy các cài đặt khác từ frontend hoặc sử dụng giá trị mặc định
        image_settings = {
            "prompt": eng_prompt, # Sử dụng prompt đã dịch
            "scheduler": data.get('scheduler', "dpmpp_2m_karras"),
            "num_inference_steps": data.get('num_inference_steps', 20),
            "guidance_scale": data.get('guidance_scale', 7.0),
            "negative_prompt": data.get('negative_prompt', "blurry, low quality, deformed, ugly, bad anatomy, text, watermark, signature"),
            "samples": data.get('samples', 1),
            "seed": data.get('seed', None),
            "width": data.get('width', 512),
            "height": data.get('height', 512)
        }

        # Thiết lập headers cho yêu cầu đến Segmind API
        headers = {
            "X-API-KEY": SEGMIND_API_KEY,
            "Content-Type": "application/json"
        }

        # Gửi yêu cầu POST đến Segmind API
        segmind_response = requests.post(SEGMIND_API_URL, headers=headers, json=image_settings)
        segmind_response.raise_for_status() # Kiểm tra lỗi HTTP từ Segmind

        segmind_data = segmind_response.json()

        # Trả về URL ảnh hoặc dữ liệu base64 về frontend
        if segmind_data and segmind_data.get("url"):
            return jsonify({"imageUrl": segmind_data["url"]}), 200
        elif segmind_data and segmind_data.get("image"):
            # Trả về dữ liệu base64 để frontend có thể hiển thị trực tiếp
            return jsonify({"imageUrl": f"data:image/png;base64,{segmind_data['image']}"}), 200
        else:
            return jsonify({"error": "Không nhận được dữ liệu hình ảnh từ Segmind."}), 500

    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        error_message = e.response.text
        if status_code == 401:
            return jsonify({"error": "Lỗi xác thực API Segmind. Vui lòng kiểm tra API Key của bạn và đảm bảo nó hợp lệ."}), 401
        elif status_code == 429:
            return jsonify({"error": "Đã đạt giới hạn yêu cầu (Too Many Requests) từ Segmind. Vui lòng chờ 5 phút và thử lại."}), 429
        elif status_code == 400:
            return jsonify({"error": f"Yêu cầu không hợp lệ đến Segmind: {error_message}"}), 400
        else:
            return jsonify({"error": f"Lỗi từ Segmind API: {status_code} - {error_message}"}), status_code
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Lỗi kết nối đến Segmind API: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Lỗi nội bộ máy chủ: {str(e)}"}), 500

if __name__ == '__main__':
    # Chạy ứng dụng Flask. Trong môi trường sản phẩm, bạn nên sử dụng Gunicorn hoặc tương tự.
    app.run(host='0.0.0.0', port=5000, debug=True)
