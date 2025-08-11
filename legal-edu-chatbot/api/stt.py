import os
import requests
import time
from flask import Blueprint, request, jsonify

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
# Đảm bảo thư mục tồn tại ngay khi Blueprint được khởi tạo
try:
    if not os.path.exists(TEMP_UPLOAD_DIR):
        os.makedirs(TEMP_UPLOAD_DIR)
        print(f"Created temporary upload directory: {TEMP_UPLOAD_DIR}")
except OSError as e:
    # Log lỗi nghiêm trọng nếu không thể tạo thư mục
    print(f"CRITICAL ERROR: Could not create temporary directory {TEMP_UPLOAD_DIR}: {e}")
    # Trong trường hợp này, các yêu cầu tải lên sẽ thất bại,
    # nhưng không thể trả về lỗi HTTP ở đây vì đây là code khởi tạo Blueprint, không phải endpoint.
    # Lỗi sẽ được bắt ở hàm transcribe_uploaded_audio_endpoint.

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
        # Cố gắng lấy chi tiết lỗi từ phản hồi của AssemblyAI
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
    # THAY ĐỔI QUAN TRỌNG: Chỉ định language_code là 'vi' cho tiếng Việt
    data = {
        "audio_url": audio_url,
        "speech_model": "universal", # Vẫn dùng universal model
        "language_code": "vi"        # <--- THÊM DÒNG NÀY ĐỂ CHỈ ĐỊNH TIẾNG VIỆT
    }

    transcript_url = f"{ASSEMBLYAI_BASE_URL}/transcript"
    try:
        response = requests.post(transcript_url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()['id'], None
    except requests.exceptions.HTTPError as e:
        # Cố gắng lấy chi tiết lỗi từ phản hồi của AssemblyAI
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
    Expects a FormData object with an 'audio' file.
    """
    if not ASSEMBLYAI_API_KEY:
        return jsonify({"error": "AssemblyAI API key is not configured. STT functionality is not active."}), 503

    # Kiểm tra xem thư mục tạm thời có tồn tại và có thể ghi được không
    if not os.path.exists(TEMP_UPLOAD_DIR) or not os.access(TEMP_UPLOAD_DIR, os.W_OK):
        error_msg = f"Server error: Temporary directory '{TEMP_UPLOAD_DIR}' does not exist or is not writable."
        print(f"ERROR: {error_msg}")
        return jsonify({"error": error_msg}), 500

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided in the request."}), 400

    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({"error": "No selected audio file."}), 400

    # Save the uploaded file temporarily to the defined directory
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

        # Frontend will poll /api/stt/status/<transcript_id> for results
        return jsonify({"transcript_id": transcript_id}), 202 # 202 Accepted, job is processing

    except Exception as e:
        print(f"An unexpected error occurred in transcribe_uploaded_audio_endpoint: {e}")
        return jsonify({"error": f"Internal server error: {e}"}), 500
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            print(f"Removed temporary audio file: {temp_audio_path}")

# --- API Endpoint to poll for transcription status and result ---
@stt_bp.route('/status/<string:transcript_id>', methods=['GET'])
def get_transcription_status(transcript_id):
    """
    Polls AssemblyAI for the status of a transcription job.
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
            return jsonify({"status": "completed", "text": transcription_result['text']}), 200
        elif status == 'error':
            # Trả về thông báo lỗi cụ thể hơn từ AssemblyAI nếu có
            error_message = transcription_result.get('error', 'Unknown transcription error from AssemblyAI.')
            return jsonify({"status": "error", "error_message": error_message}), 500
        else:
            return jsonify({"status": status}), 200 # Return current processing status
    except requests.exceptions.HTTPError as e:
        # Cố gắng lấy chi tiết lỗi từ phản hồi của AssemblyAI
        error_detail = e.response.json().get('error', str(e)) if e.response else str(e)
        print(f"Error polling AssemblyAI status (HTTPError): {error_detail}")
        return jsonify({"error": f"Failed to get transcription status: {error_detail}"}), 500
    except requests.exceptions.RequestException as e:
        print(f"Error polling AssemblyAI status (RequestException): {e}")
        return jsonify({"error": f"Failed to get transcription status: {e}"}), 500
    except Exception as e:
        print(f"Unexpected error in get_transcription_status: {e}")
        return jsonify({"error": f"Internal server error: {e}"}), 500