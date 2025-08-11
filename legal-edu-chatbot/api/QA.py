import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Blueprint, request, jsonify, g
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Tải các biến môi trường từ file .env
load_dotenv()

# Import hàm get_db_connection từ file database.py
from database import get_db_connection

# Tạo một Blueprint mới. 'qa' là tên của blueprint, /api là tiền tố URL.
qa_bp = Blueprint('qa', __name__, url_prefix='/api')

# --- Khởi tạo Gemini API ---
# Lấy khóa API từ biến môi trường
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Định nghĩa system_instruction mặc định (có thể được tải từ DB trong ứng dụng thực tế)
DEFAULT_SYSTEM_INSTRUCTION = (
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
    "\n**Chủ đề hoặc dạng bài viết bạn muốn tập trung vào là gì?** (Ví dụ: kể chuyện, tả cảnh, nghị luận về một một vấn đề xã hội, cảm nhận về một tác phẩm văn học,...)"
    "\n**Mức độ khó của đề thi như thế nào?** (Ví dụ: Dễ, trung bình, khó)"
    "\n\nKhi có đầy đủ thông tin này, tôi sẽ tạo một đề thi Ngữ văn lớp 8 (phần viết) phù hợp với yêu cầu của bạn.'"
)

# Biến toàn cục để lưu trữ system_instruction hiện tại
# Trong ứng dụng thực tế, giá trị này nên được tải từ database khi khởi động
current_system_instruction = DEFAULT_SYSTEM_INSTRUCTION

if not GEMINI_API_KEY:
    print("Lỗi: Không tìm thấy GEMINI_API_KEY trong biến môi trường.")
    model = None
else:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=current_system_instruction # Sử dụng biến này
    )

def get_db():
    """Lấy kết nối DB từ context toàn cục của Flask."""
    if 'db' not in g:
        g.db = get_db_connection()
    return g.db

@qa_bp.teardown_app_request
def teardown_db(exception):
    """Đóng kết nối cơ sở dữ liệu sau mỗi request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- Endpoint API lấy danh sách các phiên hội thoại ---
@qa_bp.route('/conversations', methods=['GET'])
def get_conversations():
    """
    Endpoint API để lấy danh sách các phiên hội thoại.
    Truy vấn CSDL để lấy thông tin phiên, tên người dùng và gộp tất cả tin nhắn
    của một phiên thành một đoạn văn bản tóm tắt ngắn để hiển thị trên frontend.
    """
    db = None
    try:
        db = get_db()
        cursor = db.cursor(cursor_factory=RealDictCursor) # Sử dụng RealDictCursor

        query = """
        SELECT
            cs.id as session_id,
            u.username as user_name,
            cs.created_at,
            STRING_AGG(m.sender || ': ' || m.text, E'\n' ORDER BY m.timestamp) as full_text,
            SUBSTRING(STRING_AGG(m.sender || ': ' || m.text, E'\n' ORDER BY m.timestamp) FOR 150) || '...' as summary
        FROM
            chat_sessions cs
        JOIN
            messages m ON cs.id = m.session_id
        JOIN
            users u ON cs.user_id = u.id
        GROUP BY
            cs.id, u.username, cs.created_at
        ORDER BY
            cs.created_at DESC;
        """
        cursor.execute(query)
        conversations = cursor.fetchall()
        
        # Chuyển đổi đối tượng datetime thành chuỗi để có thể serialize thành JSON
        for conv in conversations:
            if 'created_at' in conv and conv['created_at']:
                conv['created_at'] = conv['created_at'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({'conversations': conversations}), 200

    except psycopg2.Error as e:
        print(f"Lỗi khi lấy dữ liệu từ PostgreSQL: {e}")
        return jsonify({'error': 'Lỗi server khi lấy dữ liệu lịch sử hội thoại.'}), 500
    except Exception as e:
        print(f"Đã xảy ra lỗi không mong muốn: {e}")
        return jsonify({'error': 'Đã xảy ra lỗi không mong muốn.'}), 500
    finally:
        if db:
            db.close()

# --- Endpoint chính để tóm tắt một phiên hội thoại cụ thể bằng Gemini ---
@qa_bp.route('/summarize', methods=['POST'])
def summarize_conversation():
    """
    Endpoint backend để tóm tắt một đoạn hội thoại sử dụng API Gemini.
    Frontend gửi yêu cầu POST với session_id, backend sẽ lấy toàn bộ lịch sử
    hội thoại từ CSDL, sau đó gọi Gemini để tạo tóm tắt.
    """
    if not model:
        return jsonify({"error": "Chức năng AI không hoạt động do chưa có khóa API."}), 503
    
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({"error": "session_id là bắt buộc để tóm tắt."}), 400

    db = None
    try:
        db = get_db()
        cursor = db.cursor(cursor_factory=RealDictCursor) # Sử dụng RealDictCursor

        # Lấy toàn bộ lịch sử hội thoại của session từ DB
        cursor.execute("SELECT sender, text FROM messages WHERE session_id = %s ORDER BY timestamp ASC", (session_id,))
        messages = cursor.fetchall()
        
        if not messages:
            return jsonify({"error": "Không tìm thấy hội thoại cho session này."}), 404

        # Chuẩn bị nội dung để gửi tới Gemini
        conversation_text = ""
        for msg in messages:
            sender = "Người dùng" if msg['sender'] == 'user' else "Trợ lý AI"
            conversation_text += f"{sender}: {msg['text']}\n"
        
        print(f"Đang tóm tắt hội thoại cho session {session_id}...")
        
        # Gọi Gemini API để tạo tóm tắt
        response = model.generate_content(
            f"Tóm tắt đoạn hội thoại sau, chỉ trả về nội dung tóm tắt:\n\n{conversation_text}",
            generation_config=genai.GenerationConfig(max_output_tokens=500)
        )
        
        summary_text = response.text
        print("Tóm tắt thành công.")

        return jsonify({"summary": summary_text}), 200

    except Exception as e:
        print(f"Lỗi khi tóm tắt hội thoại: {e}")
        if db:
            db.rollback()
        return jsonify({"error": "Đã xảy ra lỗi trong quá trình tóm tắt."}), 500
    finally:
        if db:
            db.close()

@qa_bp.route('/session/<int:session_id>', methods=['DELETE'])
def delete_chat_session():
    """
    Endpoint để xóa một phiên chat và các tin nhắn liên quan.
    """
    db = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("BEGIN TRANSACTION")
        cursor.execute("DELETE FROM messages WHERE session_id = %s", (session_id,))
        cursor.execute("DELETE FROM chat_sessions WHERE id = %s", (session_id,))
        db.commit()
        return jsonify({"message": f"Chat session {session_id} deleted successfully."}), 200
    except Exception as e:
        print(f"Error deleting chat session: {e}")
        if db:
            db.rollback()
        return jsonify({"error": "Could not delete chat session."}), 500
    finally:
        if db:
            db.close()


# --- Endpoint API lấy cấu hình AI ---
@qa_bp.route('/qa/config', methods=['GET'])
def get_ai_config():
    """
    Endpoint để frontend lấy thông tin cấu hình AI hiện tại (tên model, system_instruction).
    """
    global model, current_system_instruction # Sử dụng biến global

    if model:
        return jsonify({
            "modelName": model.model_name,
            "systemInstruction": current_system_instruction
        }), 200
    else:
        return jsonify({
            "modelName": "Không khả dụng",
            "systemInstruction": "API key chưa được cấu hình hoặc model chưa khởi tạo."
        }), 200

# --- Endpoint API cập nhật cấu hình AI ---
@qa_bp.route('/qa/config', methods=['PUT'])
def update_ai_config():
    """
    Endpoint để frontend cập nhật system_instruction của AI.
    Trong ứng dụng thực tế, thay đổi này cần được lưu vào DB và/hoặc yêu cầu khởi động lại model.
    """
    global model, current_system_instruction # Sử dụng biến global
    data = request.get_json()
    new_system_instruction = data.get('system_instruction')

    if not new_system_instruction:
        return jsonify({"error": "system_instruction là bắt buộc."}), 400

    # Cập nhật biến toàn cục
    current_system_instruction = new_system_instruction
    
    # Để thay đổi system_instruction của model đang chạy, bạn cần khởi tạo lại model.
    # Đây là một ví dụ đơn giản, trong thực tế bạn có thể cần một cơ chế phức tạp hơn
    # để quản lý việc khởi tạo lại model hoặc lưu cấu hình vào DB và tải lại khi cần.
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash", # Giữ nguyên tên model
            system_instruction=current_system_instruction
        )
        print(f"AI Model re-initialized with new system instruction.")
    else:
        print("Không thể khởi tạo lại model AI: API Key bị thiếu.")


    print(f"Đã nhận yêu cầu cập nhật system_instruction: {new_system_instruction[:100]}...")
    return jsonify({"message": "Cấu hình AI đã được cập nhật thành công (cần khởi động lại server để áp dụng đầy đủ nếu không có cơ chế tải lại động).", "newSystemInstruction": new_system_instruction}), 200

