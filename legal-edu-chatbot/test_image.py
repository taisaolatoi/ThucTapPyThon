import google.generativeai as genai
from PIL import Image
from io import BytesIO
import base64

# Cấu hình API key
genai.configure(api_key="YOUR_API_KEY")  # 🔁 thay bằng API key thật

# Khởi tạo mô hình
model = genai.GenerativeModel(
    model_name="models/gemini-2.0-flash-exp-image-generation"
)

# Prompt yêu cầu
prompt = "Create a 3D rendered image of a flying pig with wings and a top hat over a futuristic green city."

# Gọi API (không truyền generation_config nếu không chắc định dạng!)
response = model.generate_content(prompt)

# In và xử lý phản hồi
for part in response.parts:
    if hasattr(part, "inline_data"):
        image_data = base64.b64decode(part.inline_data.data)
        image = Image.open(BytesIO(image_data))
        image.save("output.png")
        print("Ảnh đã lưu thành công: output.png")
        image.show()
    elif hasattr(part, "text"):
        print("Phản hồi văn bản:", part.text)
