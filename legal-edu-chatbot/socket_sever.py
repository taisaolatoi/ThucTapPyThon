import os
import json
import base64
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import assemblyai as aai
from assemblyai.realtime import RealtimeClient, AudioSentEvent, TranscriptReceivedEvent, SessionTerminatedEvent

# Khởi tạo Flask + Socket.IO
socket_app = Flask(__name__)
CORS(socket_app, resources={r"/*": {"origins": "http://localhost:3000"}})
socketio = SocketIO(socket_app, cors_allowed_origins="*")

# Khóa API AssemblyAI
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY", "c38b523c9e874380beb111406c32a739")
aai.settings.api_key = ASSEMBLYAI_API_KEY

# Lưu trữ RealtimeClient cho mỗi session
active_clients = {}

# --- CALLBACK ---
def on_open(session_id, client):
    print(f"[{session_id}] 🎙️ Kết nối Realtime AssemblyAI đã mở.")

def on_error(session_id, client, error: Exception):
    print(f"[{session_id}] ❌ Realtime AssemblyAI Error: {error}")
    socketio.emit('realtime_error', {'message': str(error)}, room=session_id)

def on_close(session_id, client):
    print(f"[{session_id}] ⏹️ Kết nối Realtime AssemblyAI đã đóng.")
    active_clients.pop(session_id, None)

def on_event(session_id, client, event):
    if isinstance(event, TranscriptReceivedEvent):
        transcript = event.transcript
        if transcript.text:
            is_final = transcript.status == aai.TranscriptStatus.completed
            socketio.emit('realtime_text', {'text': transcript.text, 'is_final': is_final}, room=session_id)
            status_str = "[FINAL]" if is_final else "[PARTIAL]"
            print(f"[{session_id}] {status_str}: {transcript.text}")
    elif isinstance(event, SessionTerminatedEvent):
        print(f"[{session_id}] 🛑 Phiên AssemblyAI kết thúc: {event.message}")
        socketio.emit('realtime_error', {'message': f'Phiên STT kết thúc: {event.message}'}, room=session_id)

# --- SOCKET.IO EVENTS ---
@socketio.on('connect')
def handle_connect():
    session_id = request.sid
    print(f"✅ Client {session_id} đã kết nối Socket.IO. Khởi tạo Realtime Client...")

    try:
        realtime_client = RealtimeClient(
            sample_rate=48000,  # Khớp với MediaRecorder
            on_open=lambda client: on_open(session_id, client),
            on_error=lambda client, error: on_error(session_id, client, error),
            on_close=lambda client: on_close(session_id, client),
            on_event=lambda client, event: on_event(session_id, client, event),
            end_of_speech_timeout=3.0
        )
        realtime_client.connect()
        active_clients[session_id] = realtime_client
        emit('server_message', {'message': 'Kết nối Socket.IO & Realtime STT thành công!'})
    except Exception as e:
        print(f"Lỗi khởi tạo Realtime Client: {e}")
        emit('realtime_error', {'message': f'Lỗi khởi tạo dịch vụ STT: {e}'})

@socketio.on('send_audio')
def handle_send_audio(data):
    session_id = request.sid
    client = active_clients.get(session_id)
    if not client:
        print(f"[{session_id}] Lỗi: Realtime client không tồn tại.")
        return

    try:
        base64_audio = data.get('audio')
        if not base64_audio:
            print(f"[{session_id}] Không nhận được dữ liệu audio.")
            return
        audio_bytes = base64.b64decode(base64_audio)
        client.send(audio_bytes)
    except Exception as e:
        print(f"[{session_id}] Lỗi xử lý/gửi audio: {e}")

@socketio.on('disconnect')
def handle_disconnect():
    session_id = request.sid
    print(f"❌ Client {session_id} ngắt kết nối Socket.IO")
    client = active_clients.pop(session_id, None)
    if client:
        client.close()

# --- RUN SERVER ---
if __name__ == "__main__":
    print("🔊 Socket.IO server đang chạy tại http://localhost:3002")
    socketio.run(socket_app, host="0.0.0.0", port=3002, debug=True, allow_unsafe_werkzeug=True)
