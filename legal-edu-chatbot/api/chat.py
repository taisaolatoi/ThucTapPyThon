import os
import psycopg2 # Import psycopg2 for PostgreSQL
from psycopg2.extras import RealDictCursor # For dictionary-like row access
import datetime # Import datetime for timestamp (for add_message)
import base64 # Import base64 for image data handling
from flask import Blueprint, request, jsonify, g
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Create a new Blueprint. 'chat' is the name of the blueprint, /api/chat is the URL prefix.
chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

# Initialize Gemini API
# Ensure GEMINI_API_KEY is loaded via dotenv in app.py when the app runs
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY is missing in environment variables when initializing chat blueprint.")

# Configure Gemini only if API_KEY is available
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="models/gemini-2.5-flash",
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
            "\n**Chủ đề hoặc dạng bài viết bạn muốn tập trung vào là gì?** (Ví dụ: kể chuyện, tả cảnh, nghị luận về một một vấn đề xã hội, cảm nhận về một tác phẩm văn học,...)"
            "\n**Mức độ khó của đề thi như thế nào?** (Ví dụ: Dễ, trung bình, khó)"
            "\n\nKhi có đầy đủ thông tin này, tôi sẽ tạo một đề thi Ngữ văn lớp 8 (phần viết) phù hợp với yêu cầu của bạn.'"
        )
    )
else:
    model = None # Or handle differently if no API key

PG_HOST = os.getenv("PG_HOST", "localhost")
PG_DBNAME = os.getenv("PG_DBNAME", "chatbot") # Set your database name
PG_USER = os.getenv("PG_USER", "postgres") # Set your username
PG_PASSWORD = os.getenv("PG_PASSWORD", "1") # Set your password
PG_PORT = os.getenv("PG_PORT", "5432")


def get_db_connection():
    """
    Connects to the PostgreSQL database and configures the cursor to return rows
    as dictionary-like objects (allowing column access by name).
    """
    try:
        conn = psycopg2.connect(
            host=PG_HOST,
            database=PG_DBNAME,
            user=PG_USER,
            password=PG_PASSWORD,
            port=PG_PORT
        )
        conn.cursor_factory = RealDictCursor # Configure cursor to return dict
        return conn
    except psycopg2.Error as e:
        print(f"PostgreSQL connection error: {e}")
        # In a production environment, you might want to log this error and exit the application
        raise # Re-raise the exception for the main application to handle

def add_message(session_id, sender, text=None, image_data=None):
    """
    Adds a new message to the messages table.
    Can be a text message or a message with an image.
    """
    print(f"--- add_message called for session_id: {session_id}, sender: {sender} ---")
    if text is None and image_data is None:
        print("Error in add_message: Message must have either text or image data.")
        return None

    conn = None
    try:
        print("add_message: Getting DB connection...")
        conn = get_db_connection()
        print("add_message: DB connection obtained.")
        cursor = conn.cursor()
        print("add_message: Cursor obtained.")
        
        print(f"add_message: Executing INSERT for session {session_id}, sender {sender}...")
        cursor.execute(
            "INSERT INTO messages (session_id, sender, text, image_data) VALUES (%s, %s, %s, %s) RETURNING id",
            (session_id, sender, text, image_data)
        )
        message_id = cursor.fetchone()['id'] # Get ID from RETURNING result by key
        print(f"add_message: Message inserted with ID: {message_id}")
        conn.commit()
        print("add_message: DB committed.")
        return message_id
    except psycopg2.Error as e:
        print(f"add_message: PostgreSQL error: Type: {type(e)}, Value: {e}")
        if conn:
            conn.rollback()
            print("add_message: DB rolled back.")
        return None
    except Exception as e:
        print(f"add_message: General error: Type: {type(e)}, Value: {e}")
        if conn:
            conn.rollback()
            print("add_message: DB rolled back.")
        return None
    finally:
        if conn:
            conn.close()
            print("add_message: DB connection closed.")

# Helper function to get DB connection from Flask's global context (g)
# This function will use the local get_db_connection
def get_db():
    if 'db' not in g:
        g.db = get_db_connection() # Use the local get_db_connection function
    return g.db

@chat_bp.teardown_app_request
def teardown_db(exception):
    """
    Closes the database connection after each request.
    """
    db = g.pop('db', None)
    if db is not None:
        db.close()

@chat_bp.route('/', methods=['POST']) # Main endpoint for chat
def chat_endpoint():
    if not model:
        return jsonify({"error": "Gemini API key is not configured. AI functionality is not active."}), 503

    data = request.get_json()
    user_id = data.get('user_id')
    session_id = data.get('session_id')
    messages = data.get('messages')

    if not user_id:
        return jsonify({"error": "user_id is required."}), 400
    if not messages:
        return jsonify({"error": "No messages provided."}), 400

    db = None # Initialize db to None
    cursor = None # Initialize cursor to None

    try:
        print("--- Starting chat_endpoint request ---")
        print(f"Received user_id: {user_id}, session_id: {session_id}")
        
        db = get_db()
        print("DB connection obtained in chat_endpoint.")
        cursor = db.cursor()
        print("Cursor obtained in chat_endpoint.")
        
        current_user_message = messages[-1]['text']
        print(f"Current user message: {current_user_message}")

        # 1. Manage Chat Session
        print("Checking session_id...")
        if not session_id:
            initial_title = current_user_message[:50] + "..." if len(current_user_message) > 50 else current_user_message
            print(f"No session_id provided. Creating new session with title: {initial_title}")
            # Use %s and RETURNING id for PostgreSQL
            cursor.execute("INSERT INTO chat_sessions (user_id, title) VALUES (%s, %s) RETURNING id", (user_id, initial_title))
            
            # --- FIX: Access 'id' by key instead of index ---
            session_row = cursor.fetchone()
            if session_row:
                session_id = session_row['id'] # Get ID from RETURNING result by key
                print(f"New session ID obtained: {session_id}")
            else:
                raise Exception("Failed to retrieve session ID after insertion.")
            # --- END FIX ---

            db.commit()
            print(f"Created new chat session with ID: {session_id}")
        else:
            print(f"Using existing session_id: {session_id}")

        # 2. Save user message to DB using the local add_message function
        print("Calling add_message for user message...")
        add_message(session_id, 'user', current_user_message)
        print("add_message for user message completed.")

        # 3. Prepare chat history for Gemini API
        print("Preparing chat history for Gemini API...")
        gemini_chat_history = []
        for msg in messages[:-1]:
            role = "user" if msg['sender'] == 'user' else "model"
            if 'imageUrl' in msg and msg['imageUrl']:
                base64_data = msg['imageUrl'].split(',')[1]
                gemini_chat_history.append({
                    "role": role,
                    "parts": [
                        {"text": msg['text']},
                        {"inlineData": {"mimeType": "image/png", "data": base64_data}}
                    ]
                })
            else:
                gemini_chat_history.append({"role": role, "parts": [{"text": msg['text']}]})
        print("Chat history prepared.")

        # 4. Call Gemini API
        print("Calling Gemini API...")
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
        print("Gemini API call successful.")

        # 5. Save bot message to DB using the local add_message function
        print("Calling add_message for bot message...")
        add_message(session_id, 'model', bot_response_text)
        print("add_message for bot message completed.")

        print("--- chat_endpoint request completed successfully ---")
        return jsonify({"response": bot_response_text, "session_id": session_id})

    except Exception as e:
        if db: # Ensure db exists before rollback
            db.rollback()
        print(f"Error calling Gemini API or processing DB: Type: {type(e)}, Value: {e}") # Enhanced logging
        return jsonify({"error": "Sorry, I cannot process your request at this time. Please try again later."}), 500

@chat_bp.route('/history/<int:session_id>', methods=['GET'])
def get_session_history(session_id):
    db = get_db()
    cursor = db.cursor()
    # Retrieve image_data for frontend display
    # Use %s as placeholder for PostgreSQL
    cursor.execute("SELECT sender, text, image_data, timestamp FROM messages WHERE session_id = %s ORDER BY timestamp ASC", (session_id,))
    messages = cursor.fetchall()

    history_data = []
    for msg in messages:
        msg_dict = dict(msg)
        if msg_dict['image_data']:
            # Convert BLOB (byte string) to Base64 string to send to frontend
            # Note: if image_data is stored as TEXT (Base64 string) then base64.b64encode is not needed
            # but you need to ensure it's a valid string.
            # If you store it as BYTEA, then base64.b64encode is needed.
            # According to the new SQL schema, you store TEXT, so just ensure it's a string.
            msg_dict['image_url'] = f"data:image/png;base64,{msg_dict['image_data']}"
        # Optionally delete raw image_data from JSON response to reduce size
        # del msg_dict['image_data']
        history_data.append(msg_dict)
    return jsonify(history_data), 200

@chat_bp.route('/sessions/<int:user_id>', methods=['GET'])
def get_user_sessions(user_id):
    db = get_db()
    cursor = db.cursor()
    # Use %s as placeholder for PostgreSQL
    cursor.execute("SELECT id, title, created_at FROM chat_sessions WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
    sessions = cursor.fetchall()

    sessions_data = []
    for session in sessions:
        session_dict = dict(session)
        # Use %s as placeholder for PostgreSQL
        cursor.execute("SELECT COUNT(*) FROM messages WHERE session_id = %s", (session['id'],))
        msg_count = cursor.fetchone()['count'] # Access by key 'count'
        session_dict['message_count'] = msg_count
        sessions_data.append(session_dict)

    return jsonify(sessions_data), 200

@chat_bp.route('/session/<int:session_id>', methods=['DELETE'])
def delete_chat_session(session_id):
    db = get_db()
    cursor = db.cursor()
    try:
        # FIX: Call execute on the cursor, not the connection
        cursor.execute("BEGIN TRANSACTION") 
        cursor.execute("DELETE FROM messages WHERE session_id = %s", (session_id,))
        cursor.execute("DELETE FROM chat_sessions WHERE id = %s", (session_id,))
        db.commit() # Commit on the connection object
        return jsonify({"message": f"Chat session {session_id} deleted successfully."}), 200
    except Exception as e:
        print(f"Error deleting chat session: {e}")
        if db: # Ensure db exists before rollback
            db.rollback() # Rollback on the connection object
        return jsonify({"error": "Could not delete chat session."}), 500
