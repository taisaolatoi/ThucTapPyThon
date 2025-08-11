import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv, set_key, find_dotenv

# Tạo một Blueprint mới. 'settings' là tên của blueprint, /api/settings là tiền tố URL.
settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

# Helper để đọc biến môi trường (đảm bảo .env được tải)
def get_env_variable(key):
    load_dotenv() # Luôn tải lại .env để đảm bảo giá trị mới nhất
    return os.getenv(key)

# Helper để cập nhật biến môi trường trong file .env
# CẢNH BÁO: Việc ghi vào file .env trực tiếp từ ứng dụng web không được khuyến khích trong môi trường sản phẩm thực tế
# vì lý do bảo mật và yêu cầu khởi động lại server để thay đổi có hiệu lực.
def update_env_variable(key, value):
    dotenv_path = find_dotenv()
    if not dotenv_path:
        # Nếu không tìm thấy .env, tạo một file mới
        with open('.env', 'w') as f:
            pass
        dotenv_path = find_dotenv() # Tìm lại đường dẫn sau khi tạo

    set_key(dotenv_path, key, value)
    load_dotenv(override=True) # Tải lại biến môi trường vào process hiện tại
    print(f"Đã cập nhật .env: {key}={value}. Cần khởi động lại server để thay đổi có hiệu lực hoàn toàn.")

@settings_bp.route('/api-keys', methods=['GET'])
def get_api_keys():
    """
    Endpoint để lấy các API Keys hiện tại (hiển thị toàn bộ giá trị) từ biến môi trường.
    """
    gemini_key = get_env_variable("GEMINI_API_KEY")
    stability_key = get_env_variable("STABILITY_API_KEY")
    segmind_key = get_env_variable("SEGMENT_API_KEY")
    assemblyai_key = get_env_variable("ASSEMBLYAI_API_KEY") # Thêm AssemblyAI API Key

    return jsonify({
        "geminiApiKey": gemini_key if gemini_key else "Chưa thiết lập",
        "stabilityApiKey": stability_key if stability_key else "Chưa thiết lập",
        "segmindApiKey": segmind_key if segmind_key else "Chưa thiết lập",
        "assemblyaiApiKey": assemblyai_key if assemblyai_key else "Chưa thiết lập" # Trả về AssemblyAI API Key
    })

@settings_bp.route('/api-keys', methods=['PUT'])
def update_api_keys():
    """
    Endpoint để cập nhật các API Keys trong file .env.
    """
    data = request.get_json()
    
    gemini_key = data.get('geminiApiKey')
    stability_key = data.get('stabilityApiKey')
    segmind_key = data.get('segmindApiKey')
    assemblyai_key = data.get('assemblyaiApiKey') # Lấy AssemblyAI API Key từ request

    try:
        if gemini_key is not None: # Sử dụng 'is not None' để cho phép giá trị rỗng được lưu
            update_env_variable("GEMINI_API_KEY", gemini_key)
        if stability_key is not None:
            update_env_variable("STABILITY_API_KEY", stability_key)
        if segmind_key is not None:
            update_env_variable("SEGMENT_API_KEY", segmind_key)
        if assemblyai_key is not None: # Cập nhật AssemblyAI API Key
            update_env_variable("ASSEMBLYAI_API_KEY", assemblyai_key)
        
        return jsonify({"message": "API Keys đã được cập nhật trong .env. Vui lòng khởi động lại server để thay đổi có hiệu lực."}), 200
    except Exception as e:
        print(f"Lỗi khi cập nhật API Keys: {e}")
        return jsonify({"error": "Không thể cập nhật API Keys."}), 500

