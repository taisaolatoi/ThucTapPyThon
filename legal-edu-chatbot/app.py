from flask import Flask, request, jsonify, send_file, render_template
from gemini_service import generate_content
from tts_service import text_to_speech

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    response = generate_content(data["prompt"], data.get("mode", "law"))
    return jsonify({"response": response})

@app.route("/api/tts", methods=["POST"])
def tts():
    text = request.json.get("text", "")
    audio_buffer = text_to_speech(text)
    return send_file(audio_buffer, mimetype="audio/mp3")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)