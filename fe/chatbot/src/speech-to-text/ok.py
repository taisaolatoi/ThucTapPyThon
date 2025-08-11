import os
import requests
import time
import json
import psycopg2 # Cần import psycopg2
from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor # Import để kết quả trả về là dictionary

# Giả định db.py nằm cùng cấp hoặc có thể import được.
from database import get_db_connection

# Tạo Blueprint mới cho chức năng Speech-to-Text
stt_bp = Blueprint('stt', __name__, url_prefix='/api/stt')

# Cấu hình AssemblyAI API
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2"

if not ASSEMBLYAI_API_KEY:
    print("Error: ASSEMBLYAI_API_KEY is missing in environment variables when initializing STT blueprint.")
    # Trong môi trường production, bạn có thể cân nhắc raise một exception ở đây
    # raise EnvironmentError("ASSEMBLYAI_API_KEY is not set.")

# --- Định nghĩa thư mục tải lên tạm thời và đảm bảo nó tồn tại ---
TEMP_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_audio_uploads')
try:
    if not os.path.exists(TEMP_UPLOAD_DIR):
        os.makedirs(TEMP_UPLOAD_DIR)
        print(f"Created temporary upload directory: {TEMP_UPLOAD_DIR}")
except OSError as e:
    print(f"CRITICAL ERROR: Could not create temporary directory {TEMP_UPLOAD_DIR}: {e}")

# Global dictionary to temporarily store `audio_url` and `user_id`
# This is a simple solution for this example. In a production app,
# you would use a persistent, scalable solution like Redis.
transcript_metadata = {}

# --- Helper function to upload audio to AssemblyAI ---
def upload_audio_to_assemblyai(audio_file_path):
    """Uploads a local audio file to AssemblyAI and returns its URL."""
    if not ASSEMBLYAI_API_KEY:
        return None, "AssemblyAI API key not configured."

    headers = {"authorization": ASSEMBLYAI_API_KEY}
    upload_url = f"{ASSEMBLYAI_BASE_URL}/upload"

    try:
        with open(audio_file_path, "rb") as f:
            response = requests.post(upload_url, headers=headers, data=f)
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            return response.json()["upload_url"], None
    except requests.exceptions.HTTPError as e:
        error_detail = e.response.json().get('error', str(e)) if e.response else str(e)
        print(f"Error uploading audio to AssemblyAI (HTTPError): {error_detail}")
        return None, f"Upload failed: {error_detail}"
    except requests.exceptions.RequestException as e:
        print(f"Error uploading audio to AssemblyAI (RequestException): {e}")
        return None, f"Upload failed: {e}"
    except Exception as e:
        print(f"Unexpected error during audio upload: {e}")
        return None, f"Unexpected error: {e}"

# --- Helper function to transcribe audio from URL ---
def transcribe_audio_from_url(audio_url):
    """Sends an audio URL to AssemblyAI for transcription and returns the transcript ID."""
    if not ASSEMBLYAI_API_KEY:
        return None, "AssemblyAI API key not configured."

    headers = {"authorization": ASSEMBLYAI_API_KEY, "Content-Type": "application/json"}
    
    # THAY ĐỔI ĐÃ SỬA: Bỏ dòng language_code để không bị lỗi 400 Bad Request
    data = {
        "audio_url": audio_url,
        "speech_model": "universal",
        "word_timestamps": True,
        # Đã thêm lại dòng language_code để phù hợp với phiên bản code bạn đã chạy thành công
        "language_code": "vi"
    }

    transcript_url = f"{ASSEMBLYAI_BASE_URL}/transcript"
    try:
        response = requests.post(transcript_url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()['id'], None
    except requests.exceptions.HTTPError as e:
        error_detail = e.response.json().get('error', str(e)) if e.response else str(e)
        print(f"Error submitting transcription job to AssemblyAI (HTTPError): {error_detail}")
        return None, f"Transcription job submission failed: {error_detail}"
    except requests.exceptions.RequestException as e:
        print(f"Error submitting transcription job to AssemblyAI (RequestException): {e}")
        return None, f"Transcription job submission failed: {e}"
    except Exception as e:
        print(f"Unexpected error during transcription job submission: {e}")
        return None, f"Unexpected error: {e}"

# --- API Endpoint for Transcribing uploaded audio ---
@stt_bp.route('/transcribe', methods=['POST'])
def transcribe_uploaded_audio_endpoint():
    """
    Handles audio file upload and initiates transcription.
    Expects a FormData object with an 'audio' file and 'user_id'.
    """
    if not ASSEMBLYAI_API_KEY:
        return jsonify({"error": "AssemblyAI API key is not configured. STT functionality is not active."}), 503

    # Lấy user_id từ form data hoặc headers. 
    # Ở đây giả sử nó được gửi trong form data.
    # Trong ứng dụng thực tế, nên lấy từ session hoặc token xác thực.
    user_id = request.form.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required."}), 400

    if not os.path.exists(TEMP_UPLOAD_DIR) or not os.access(TEMP_UPLOAD_DIR, os.W_OK):
        error_msg = f"Server error: Temporary directory '{TEMP_UPLOAD_DIR}' does not exist or is not writable."
        print(f"ERROR: {error_msg}")
        return jsonify({"error": error_msg}), 500

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided in the request."}), 400

    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({"error": "No selected audio file."}), 400

    temp_audio_path = os.path.join(TEMP_UPLOAD_DIR, audio_file.filename)
    
    try:
        audio_file.save(temp_audio_path)
        print(f"Saved temporary audio file to: {temp_audio_path}")

        # 1. Upload audio to AssemblyAI
        uploaded_audio_url, upload_error = upload_audio_to_assemblyai(temp_audio_path)
        if upload_error:
            return jsonify({"error": upload_error}), 500
        print(f"Audio uploaded to AssemblyAI: {uploaded_audio_url}")

        # 2. Submit for transcription
        transcript_id, transcribe_error = transcribe_audio_from_url(uploaded_audio_url)
        if transcribe_error:
            return jsonify({"error": transcribe_error}), 500
        print(f"Transcription job submitted with ID: {transcript_id}")

        # Store metadata for later retrieval
        transcript_metadata[transcript_id] = {
            'user_id': user_id,
            'audio_url': uploaded_audio_url
        }

        return jsonify({"transcript_id": transcript_id}), 202

    except Exception as e:
        print(f"An unexpected error occurred in transcribe_uploaded_audio_endpoint: {e}")
        return jsonify({"error": f"Internal server error: {e}"}), 500
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            print(f"Removed temporary audio file: {temp_audio_path}")

# --- API Endpoint to poll for transcription status and result ---
@stt_bp.route('/status/<string:transcript_id>', methods=['GET'])
def get_transcription_status(transcript_id):
    """
    Polls AssemblyAI for the status of a transcription job.
    If 'completed', it saves the result to the database.
    """
    if not ASSEMBLYAI_API_KEY:
        return jsonify({"error": "AssemblyAI API key is not configured. STT functionality is not active."}), 503

    polling_endpoint = f"{ASSEMBLYAI_BASE_URL}/transcript/{transcript_id}"
    headers = {"authorization": ASSEMBLYAI_API_KEY}

    try:
        response = requests.get(polling_endpoint, headers=headers)
        response.raise_for_status()
        transcription_result = response.json()

        status = transcription_result['status']
        print(f"Polling status for {transcript_id}: {status}")

        if status == 'completed':
            user_id = transcript_metadata.get(transcript_id, {}).get('user_id')
            audio_url = transcript_metadata.get(transcript_id, {}).get('audio_url')
            
            # Kiểm tra xem có user_id và audio_url không
            if not user_id or not audio_url:
                 return jsonify({"status": "error", "error_message": "Missing user_id or audio_url metadata."}), 500

            # Lấy thông tin cần thiết từ kết quả của AssemblyAI
            transcribed_text = transcription_result['text']
            word_timestamps = transcription_result['words'] # Mảng các đối tượng từ

            # --- Lưu kết quả vào cơ sở dữ liệu ---
            conn = None
            try:
                # Sử dụng cursor với RealDictCursor để kết quả trả về là dictionary
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO stt_history (id, user_id, transcribed_text, word_timestamps, audio_url)
                    VALUES (%s, %s, %s, %s, %s);
                    """,
                    (transcript_id, user_id, transcribed_text, json.dumps(word_timestamps), audio_url)
                )
                conn.commit()
                print(f"Successfully saved transcription for ID {transcript_id} to database.")
            except psycopg2.Error as db_err:
                print(f"Database error while saving transcription: {db_err}")
                if conn:
                    conn.rollback()
                # Vẫn trả về kết quả thành công cho người dùng, nhưng log lỗi DB
            finally:
                if conn:
                    conn.close()
            
            # Xóa metadata tạm thời
            if transcript_id in transcript_metadata:
                del transcript_metadata[transcript_id]
            
            # Trả về kết quả hoàn chỉnh, bao gồm cả word_timestamps
            return jsonify({
                "status": "completed",
                "text": transcribed_text,
                "words": word_timestamps,
                "audio_url": audio_url
            }), 200

        elif status == 'error':
            error_message = transcription_result.get('error', 'Unknown transcription error from AssemblyAI.')
            # Xóa metadata tạm thời khi có lỗi
            if transcript_id in transcript_metadata:
                del transcript_metadata[transcript_id]
            return jsonify({"status": "error", "error_message": error_message}), 500
        else:
            return jsonify({"status": status}), 200 # Return current processing status

    except requests.exceptions.HTTPError as e:
        error_detail = e.response.json().get('error', str(e)) if e.response else str(e)
        print(f"Error polling AssemblyAI status (HTTPError): {error_detail}")
        return jsonify({"error": f"Failed to get transcription status: {error_detail}"}), 500
    except requests.exceptions.RequestException as e:
        print(f"Error polling AssemblyAI status (RequestException): {e}")
        return jsonify({"error": f"Failed to get transcription status: {e}"}), 500
    except Exception as e:
        print(f"Unexpected error in get_transcription_status: {e}")
        return jsonify({"error": f"Internal server error: {e}"}), 500

# --- API Endpoint để lấy lịch sử phiên âm của người dùng ---
@stt_bp.route('/history', methods=['GET'])
def get_user_stt_history():
    """
    Lấy toàn bộ lịch sử phiên âm của một người dùng từ cơ sở dữ liệu.
    """
    # Trong ứng dụng thực tế, user_id nên được lấy từ session hoặc JWT
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required."}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor) # Sử dụng RealDictCursor
        cursor.execute(
            "SELECT id, transcribed_text, word_timestamps, audio_url, created_at FROM stt_history WHERE user_id = %s ORDER BY created_at DESC;",
            (user_id,)
        )
        history = cursor.fetchall()
        # Chuyển đổi kết quả từ dict cursor thành list of dicts
        # và sửa key created_at để phù hợp với frontend
        formatted_history = [
            {
                "id": item['id'],
                "text": item['transcribed_text'],
                "words": item['word_timestamps'],
                "audioUrl": item['audio_url'],
                "timestamp": item['created_at'].isoformat()
            } for item in history
        ]
        return jsonify(formatted_history), 200
    except psycopg2.Error as e:
        print(f"Database error while fetching history: {e}")
        return jsonify({"error": "Failed to fetch history from database."}), 500
    finally:
        if conn:
            conn.close()

# --- API Endpoint để xóa một mục trong lịch sử phiên âm ---
@stt_bp.route('/history/<string:transcript_id>', methods=['DELETE'])
def delete_stt_history_item(transcript_id):
    """
    Xóa một mục lịch sử phiên âm cụ thể của người dùng.
    """
    # user_id nên được lấy từ session để đảm bảo an toàn
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required."}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM stt_history WHERE id = %s AND user_id = %s;",
            (transcript_id, user_id)
        )
        if cursor.rowcount == 0:
            return jsonify({"error": "Item not found or you do not have permission to delete it."}), 404
        conn.commit()
        print(f"Successfully deleted transcription for ID {transcript_id} for user {user_id}.")
        return jsonify({"message": "Item deleted successfully."}), 200
    except psycopg2.Error as e:
        print(f"Database error while deleting item: {e}")
        if conn:
            conn.rollback()
        return jsonify({"error": "Failed to delete item from database."}), 500
    finally:
        if conn:
            conn.close()
