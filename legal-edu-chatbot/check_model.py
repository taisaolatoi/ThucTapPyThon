# backend-python/check_gemini_models.py
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Tải biến môi trường từ file .env
load_dotenv()

# Lấy API Key từ biến môi trường
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("Lỗi: Thiếu GEMINI_API_KEY trong file .env. Vui lòng kiểm tra lại.")
    exit(1)

# Cấu hình Gemini API
genai.configure(api_key=GEMINI_API_KEY)

print("Đang lấy danh sách các model Gemini có sẵn cho API Key của bạn...")
print("-" * 50)
try:
    # Lặp qua tất cả các model mà API key của bạn có thể truy cập
    for m in genai.list_models():
        # Kiểm tra xem model có hỗ trợ phương thức generateContent (cần cho chat) hay không
        if "generateContent" in m.supported_generation_methods:
            print(f"✅ Model ID: {m.name} (Hỗ trợ generateContent)")
        else:
            print(f"❌ Model ID: {m.name} (KHÔNG hỗ trợ generateContent)")
except Exception as e:
    print(f"Lỗi khi lấy danh sách model: {e}")
    print("Có thể do API Key không đúng, chưa kích hoạt API, hoặc vấn đề kết nối.")

print("-" * 50)
print("Hoàn tất kiểm tra.")