# backend-python/chat.py
import os
from flask import Blueprint, request, jsonify, g
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Tạo một Blueprint mới. 'chat' là tên của blueprint, /api/chat là tiền tố URL.
chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

# Khởi tạo Gemini API
# Cần đảm bảo GEMINI_API_KEY đã được load qua dotenv trong app.py khi app chạy
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    # Nếu chạy riêng file này để test, bạn cần dotenv.load_dotenv() ở đây
    # Nhưng khi được import vào app.py, app.py sẽ lo phần này
    print("Lỗi: Thiếu GEMINI_API_KEY trong biến môi trường khi khởi tạo chat blueprint.")
    # Có thể raise ValueError hoặc chỉ cảnh báo nếu muốn app vẫn chạy mà không có chức năng AI
    # raise ValueError("GEMINI_API_KEY is not set in environment variables.")

# Cấu hình Gemini chỉ khi API_KEY có
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="models/gemini-2.0-flash",
        system_instruction=(
            "Bạn là một trợ lý AI chuyên về luật pháp Việt Nam và giáo dục. "
            "Khi được hỏi về luật pháp Việt Nam, hãy cung cấp thông tin chính xác và chi tiết, "
            "luôn tham khảo các văn bản pháp luật nếu có thể (ghi rõ tên văn bản nếu biết), và giải thích rõ ràng, dễ hiểu. "
            "Hãy trình bày câu trả lời theo từng đoạn văn ngắn hoặc gạch đầu dòng để dễ đọc. "
            "Khi sử dụng các cụm từ in đậm (ví dụ: **Số lượng câu hỏi**), hãy đảm bảo chúng luôn nằm trên một dòng mới hoặc có dấu xuống dòng trước đó."
            "\n\n"
            "Khi được yêu cầu tạo đề thi cho giáo dục, hãy hỏi rõ về các thông tin cần thiết: "
            "Môn học, cấp độ (ví dụ: lớp 1, THCS, THPT), số lượng câu hỏi, và loại câu hỏi (trắc nghiệm, tự luận, điền số, v.v.). "
            "Hãy trình bày các yêu cầu này dưới dạng danh sách hoặc gạch đầu dòng để người dùng dễ theo dõi. "
            "Đảm bảo mỗi mục gạch đầu dòng hoặc in đậm đều bắt đầu trên một dòng mới."
            "\n\n"
            "Luôn giữ thái độ chuyên nghiệp, khách quan và thân thiện. "
            "Tránh trả lời các câu hỏi ngoài hai lĩnh vực chính này hoặc các câu hỏi không phù hợp. "
            "Nếu không có đủ thông tin hoặc không thể trả lời một cách chính xác, "
            "hãy thông báo rằng bạn không thể hỗ trợ trong trường hợp đó một cách lịch sự."
            "\n\n"
            "**Ví dụ về cách trả lời khi yêu cầu thông tin tạo đề thi (chú ý xuống dòng cho các mục in đậm):**"
            "\n"
            "Người dùng: 'tạo đề thi môn ngữ văn lớp 8 (phần viết)'"
            "\n"
            "Bạn: 'Tuyệt vời! Để tôi tạo một đề thi Ngữ văn lớp 8 (phần viết) phù hợp, vui lòng cho tôi biết thêm một số thông tin sau nhé:"
            "\n**Số lượng câu hỏi bạn mong muốn là bao nhiêu?** (Ví dụ: 1 câu, 2 câu,...) Thông thường đề thi viết văn lớp 8 chỉ có 1 câu hỏi chính."
            "\n**Chủ đề hoặc dạng bài viết bạn muốn tập trung vào là gì?** (Ví dụ: kể chuyện, tả cảnh, nghị luận về một vấn đề xã hội, cảm nhận về một tác phẩm văn học,...)"
            "\n**Mức độ khó của đề thi như thế nào?** (Ví dụ: Dễ, trung bình, khó)"
            "\n\nKhi có đầy đủ thông tin này, tôi sẽ tạo một đề thi Ngữ văn lớp 8 (phần viết) phù hợp với yêu cầu của bạn.'"
        )
    )
else:
    model = None # Hoặc xử lý khác nếu không có API key

# Helper function để lấy kết nối CSDL từ Flask's global context (g)
# Hàm này sẽ sử dụng get_db_connection từ database.py mà app.py đã cấu hình
def get_db():
    if 'db' not in g:
        from database import get_db_connection # Import cục bộ để tránh circular import
        g.db = get_db_connection()
    return g.db

@chat_bp.route('/', methods=['POST']) # Endpoint chính để chat
def chat_endpoint():
    if not model:
        return jsonify({"error": "Gemini API key không được cấu hình. Chức năng AI không hoạt động."}), 503

    data = request.get_json()
    user_id = data.get('user_id')
    session_id = data.get('session_id')
    messages = data.get('messages')

    if not user_id:
        return jsonify({"error": "user_id là bắt buộc."}), 400
    if not messages:
        return jsonify({"error": "Không có tin nhắn nào được cung cấp."}), 400

    db = get_db()
    cursor = db.cursor()
    current_user_message = messages[-1]['text']

    try:
        # 1. Quản lý Chat Session
        if not session_id:
            initial_title = current_user_message[:50] + "..." if len(current_user_message) > 50 else current_user_message
            cursor.execute("INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)", (user_id, initial_title))
            session_id = cursor.lastrowid
            db.commit()
            print(f"Đã tạo phiên chat mới với ID: {session_id}")

        # 2. Lưu tin nhắn của người dùng vào CSDL
        cursor.execute("INSERT INTO messages (session_id, sender, text) VALUES (?, ?, ?)",
                       (session_id, 'user', current_user_message))
        db.commit()

        # 3. Chuẩn bị lịch sử chat cho Gemini API
        gemini_chat_history = []
        for msg in messages[:-1]:
            role = "user" if msg['sender'] == 'user' else "model"
            gemini_chat_history.append({"role": role, "parts": [{"text": msg['text']}]})

        # 4. Gọi Gemini API
        chat = model.start_chat(history=gemini_chat_history)
        response = chat.send_message(
            current_user_message,
            generation_config=genai.GenerationConfig(
                max_output_tokens=1000,
                temperature=0.7,
                top_p=0.95,
                top_k=60,
            ),
            safety_settings=[
                {"category": HarmCategory.HARM_CATEGORY_HARASSMENT, "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
                {"category": HarmCategory.HARM_CATEGORY_HATE_SPEECH, "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
                {"category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
                {"category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
            ]
        )
        bot_response_text = response.text

        # 5. Lưu tin nhắn của bot vào CSDL
        cursor.execute("INSERT INTO messages (session_id, sender, text) VALUES (?, ?, ?)",
                       (session_id, 'model', bot_response_text))
        db.commit()

        return jsonify({"response": bot_response_text, "session_id": session_id})

    except Exception as e:
        print(f"Lỗi khi gọi Gemini API hoặc xử lý CSDL: {e}")
        if db:
            db.rollback()
        return jsonify({"error": "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau."}), 500

@chat_bp.route('/history/<int:session_id>', methods=['GET'])
def get_session_history(session_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT sender, text, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
    messages = cursor.fetchall()
    return jsonify([dict(msg) for msg in messages]), 200

@chat_bp.route('/sessions/<int:user_id>', methods=['GET'])
def get_user_sessions(user_id):
    db = get_db()
    cursor = db.cursor()
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

@chat_bp.route('/session/<int:session_id>', methods=['DELETE'])
def delete_chat_session(session_id):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
        db.commit()
        return jsonify({"message": f"Phiên chat {session_id} đã được xóa thành công."}), 200
    except Exception as e:
        print(f"Lỗi khi xóa phiên chat: {e}")
        db.rollback()
        return jsonify({"error": "Không thể xóa phiên chat."}), 500