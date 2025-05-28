import google.generativeai as genai
from dotenv import load_dotenv
import os

# Load biến môi trường
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Kiểm tra xem có API key không
if not api_key:
    raise ValueError("API key không tồn tại. Kiểm tra file .env")

genai.configure(api_key=api_key)

def generate_content(prompt, mode="law"):
    model = genai.GenerativeModel('gemini-pro')
    
    if mode == "law":
        prompt = f"""Bạn là luật sư ảo. Hãy trả lời chính xác, ngắn gọn về pháp luật Việt Nam:
        Câu hỏi: {prompt}
        Trả lời:"""
    elif mode == "education":
        prompt = f"""Tạo đề bài phù hợp với học sinh:
        Yêu cầu: {prompt}
        Đề bài:"""
    
    response = model.generate_content(prompt)
    
    # Kiểm tra thuộc tính trả về
    try:
        return response.text
    except AttributeError:
        return response.candidates[0].content.parts[0].text

# Ví dụ gọi hàm
print(generate_content("Quy định về tội trộm cắp tài sản?", mode="law"))
