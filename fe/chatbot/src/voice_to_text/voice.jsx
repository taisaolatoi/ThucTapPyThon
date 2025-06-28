// src/components/Content/TextToSpeechContent.jsx
import React, { useState, useRef } from 'react';
import './voice.css';

const Voice = () => {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('vi-VN'); // Mặc định tiếng Việt
  const [voice, setVoice] = useState('Google Vietnamese'); // Giọng mặc định
  const [speed, setSpeed] = useState(1); // Tốc độ mặc định 1x
  const [pitch, setPitch] = useState(1); // Cao độ mặc định 1
  const [status, setStatus] = useState(''); // Trạng thái quá trình chuyển đổi
  const audioRef = useRef(null); // Để tham chiếu đến thẻ audio

  const availableVoices = {
    'vi-VN': ['Google Vietnamese', 'Vi male 1', 'Vi female 1'], // Ví dụ các giọng tiếng Việt
    'en-US': ['Google US English', 'Microsoft Zira - English (United States)', 'Microsoft David - English (United States)'],
    'ja-JP': ['Google Japanese', 'Ja male 1', 'Ja female 1'],
  };

  const handleTextToSpeech = () => {
    if (!text.trim()) {
      setStatus('Vui lòng nhập văn bản để chuyển đổi.');
      return;
    }

    setStatus('Đang chuyển đổi...');

    // Sử dụng Web Speech API (nếu trình duyệt hỗ trợ) để giả lập
    // Trong thực tế, bạn sẽ gửi văn bản này lên một API backend để chuyển đổi
    const synthesis = window.speechSynthesis;
    if (!synthesis) {
      setStatus('Trình duyệt của bạn không hỗ trợ Web Speech API.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Tìm giọng nói phù hợp
    const voices = synthesis.getVoices();
    const selectedVoice = voices.find(v => v.name === voice && v.lang === language);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
      // Fallback nếu không tìm thấy giọng đã chọn
      utterance.lang = language;
    }

    utterance.rate = speed; // Tốc độ (0.1 - 10)
    utterance.pitch = pitch; // Cao độ (0 - 2)

    utterance.onend = () => {
      setStatus('Chuyển đổi hoàn tất.');
      // Trong thực tế, sau khi API trả về audio, bạn sẽ set src cho audioRef.current
      // For demo, just play the synthesized speech
    };

    utterance.onerror = (event) => {
      setStatus(`Lỗi khi chuyển đổi: ${event.error}`);
    };

    synthesis.speak(utterance);

    // Dưới đây là phần code giả lập cho việc tải xuống hoặc phát trực tiếp
    // Trong môi trường thực tế, bạn sẽ nhận một URL audio từ backend và gán vào audioRef.current.src
    // Ví dụ:
    // audioRef.current.src = 'URL_AUDIO_TU_BACKEND.mp3';
    // audioRef.current.play();
  };

  const handleDownload = () => {
    // Trong môi trường thực tế, bạn sẽ cần một API backend để tạo và cung cấp file audio để tải xuống.
    // Đây chỉ là một placeholder.
    setStatus('Tính năng tải xuống đang được phát triển hoặc cần API backend.');
    alert('Tính năng tải xuống đang được phát triển.');
  };

  // Cập nhật danh sách giọng nói khi ngôn ngữ thay đổi
  React.useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const filteredVoices = voices.filter(v => v.lang === language);
      if (filteredVoices.length > 0) {
        setVoice(filteredVoices[0].name); // Chọn giọng đầu tiên của ngôn ngữ đó
      } else {
        setVoice(''); // Không có giọng nào
      }
    };

    // Lắng nghe sự kiện voiceschanged nếu trình duyệt tải giọng nói không đồng bộ
    window.speechSynthesis.onvoiceschanged = updateVoices;
    updateVoices(); // Gọi lần đầu khi component mount

    return () => {
      window.speechSynthesis.onvoiceschanged = null; // Dọn dẹp event listener
    };
  }, [language]);


  return (
    <div className="main-content-padding">
      <div className="tts-page">
        <div className="tts-header">
          <div className="tts-breadcrumb">
            Trang chủ &gt; <span>Tạo Voice</span>
          </div>
          <h1 className="tts-main-title">Chuyển văn bản thành giọng nói</h1>
        </div>

        <div className="tts-section">
          <h2 className="tts-section-title">Nhập văn bản của bạn</h2>
          <textarea
            className="tts-textarea"
            placeholder="Nhập văn bản bạn muốn chuyển đổi thành giọng nói tại đây..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>
        </div>

        <div className="tts-section">
          <h2 className="tts-section-title">Tùy chọn giọng nói</h2>
          <div className="tts-options-grid">
            <div className="tts-option-group">
              <label htmlFor="language-select">Ngôn ngữ</label>
              <select
                id="language-select"
                className="tts-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="vi-VN">Tiếng Việt</option>
                <option value="en-US">English (US)</option>
                <option value="ja-JP">日本語 (Japanese)</option>
                {/* Thêm các ngôn ngữ khác nếu cần */}
              </select>
            </div>

            <div className="tts-option-group">
              <label htmlFor="voice-select">Giọng nói</label>
              <select
                id="voice-select"
                className="tts-select"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
              >
                {window.speechSynthesis.getVoices().filter(v => v.lang === language).map(v => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                ))}
                 {/* Fallback/Default options if Web Speech API is not ready */}
                 {window.speechSynthesis.getVoices().filter(v => v.lang === language).length === 0 && (
                    <option value="">Không có giọng nói khả dụng</option>
                 )}
              </select>
            </div>

            <div className="tts-option-group">
              <label htmlFor="speed-range">Tốc độ ({speed.toFixed(1)}x)</label>
              <input
                type="range"
                id="speed-range"
                className="tts-range-input"
                min="0.5"
                max="2"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              />
            </div>

            <div className="tts-option-group">
              <label htmlFor="pitch-range">Cao độ ({pitch.toFixed(1)})</label>
              <input
                type="range"
                id="pitch-range"
                className="tts-range-input"
                min="0"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="tts-action-buttons">
          <button className="tts-button primary" onClick={handleTextToSpeech}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline-block mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
            </svg>
            Nghe thử
          </button>
          <button className="tts-button secondary" onClick={handleDownload}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline-block mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Tải xuống MP3
          </button>
        </div>

        {status && <div className="tts-status-message">{status}</div>}

        {/* Audio element để phát lại âm thanh */}
        <audio ref={audioRef} controls style={{ width: '100%', marginTop: '20px', display: status === 'Chuyển đổi hoàn tất.' ? 'block' : 'none' }}>
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}
export default Voice;