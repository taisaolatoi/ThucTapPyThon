import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// Component để hiển thị từng mục trong lịch sử
// Đã thêm nút xóa từng mục
const HistoryItem = ({ item, onDeleteItem }) => {
    const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
    const audioRef = useRef(null);
    const words = item.words || [];

    // Cập nhật chỉ số của từ được tô sáng dựa trên thời gian phát âm thanh
    const handleTimeUpdate = () => {
        if (!audioRef.current || !words.length) return;
        const currentTime = audioRef.current.currentTime * 1000;

        const currentWord = words.find(word => currentTime >= word.start && currentTime <= word.end);
        
        if (currentWord) {
            const wordIndex = words.indexOf(currentWord);
            if (wordIndex !== highlightedWordIndex) {
                setHighlightedWordIndex(wordIndex);
            }
        } else if (currentTime > (words[words.length - 1]?.end || 0)) {
            setHighlightedWordIndex(words.length);
        }
    };
    
    // Đặt lại highlight khi audio kết thúc
    const handleAudioEnded = () => {
      setHighlightedWordIndex(-1);
    };

    return (
        <li className="stt-history-item">
            <p className="stt-history-text">
                {words.length > 0 ? (
                    words.map((word, index) => (
                        <span
                            key={index}
                            className={`stt-word ${index <= highlightedWordIndex ? 'highlighted-word' : ''}`}
                        >
                            {word.text}{' '}
                        </span>
                    ))
                ) : (
                    <span>{item.text}</span>
                )}
            </p>
            <div className="stt-history-controls">
                <audio 
                    ref={audioRef}
                    controls
                    src={item.audioUrl}
                    className="stt-history-audio-player"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleAudioEnded}
                />
                <button 
                    onClick={() => onDeleteItem(item.id)}
                    className="stt-button stt-delete-item-button"
                >
                    Xóa 🗑️
                </button>
            </div>
            <span className="stt-history-timestamp">
                Thời gian: {new Date(item.timestamp).toLocaleString()}
            </span>
        </li>
    );
};

const SpeechToText = ({ loggedInUserId }) => {
    const [audioFile, setAudioFile] = useState(null);
    const [transcriptText, setTranscriptText] = useState('');
    const [transcriptWords, setTranscriptWords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Sẵn sàng');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [transcriptionHistory, setTranscriptionHistory] = useState([]);
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);
    const audioRef = useRef(null); 

    // Cập nhật API_URL để phù hợp với backend
    const API_URL_TRANSCRIBE = 'http://127.0.0.1:3001/api/stt/transcribe';
    const API_URL_STATUS = 'http://127.0.0.1:3001/api/stt/status';
    const API_URL_HISTORY = 'http://127.0.0.1:3001/api/stt/history';
    
    // Hàm mới để tải lịch sử từ backend
    const loadHistory = async () => {
        if (!loggedInUserId) return;
        try {
            const response = await axios.get(API_URL_HISTORY, {
                params: { user_id: loggedInUserId }
            });
            setTranscriptionHistory(response.data);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử:', error);
            setStatusMessage('Lỗi khi tải lịch sử phiên âm.');
        }
    };
    
    // Hàm mới để xóa một mục lịch sử
    const handleDeleteHistoryItem = async (itemId) => {
        if (!loggedInUserId || !window.confirm('Bạn có chắc chắn muốn xóa mục này không?')) return;
        try {
            await axios.delete(`${API_URL_HISTORY}/${itemId}`, {
                params: { user_id: loggedInUserId }
            });
            // Sau khi xóa thành công, tải lại lịch sử
            loadHistory();
        } catch (error) {
            console.error('Lỗi khi xóa mục lịch sử:', error);
            setStatusMessage('Lỗi khi xóa mục lịch sử.');
        }
    };
    
    // Hàm mới để xóa toàn bộ lịch sử
    const handleClearHistory = async () => {
        if (!loggedInUserId) return;
        if (!window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử không? Hành động này không thể hoàn tác.')) {
            return;
        }

        try {
            // Lấy danh sách các ID hiện tại để xóa từng mục một
            const idsToDelete = transcriptionHistory.map(item => item.id);
            // Cải thiện: Gửi nhiều yêu cầu xóa song song
            const deletePromises = idsToDelete.map(id => 
                axios.delete(`${API_URL_HISTORY}/${id}`, { params: { user_id: loggedInUserId } })
            );
            await Promise.all(deletePromises);
            
            setTranscriptionHistory([]);
            setStatusMessage('Đã xóa toàn bộ lịch sử phiên âm.');
        } catch (error) {
            console.error('Lỗi khi xóa toàn bộ lịch sử:', error);
            setStatusMessage('Lỗi khi xóa toàn bộ lịch sử.');
        }
    };

    const handleReset = () => {
        setAudioFile(null);
        setTranscriptText('');
        setTranscriptWords([]);
        setIsLoading(false);
        setStatusMessage('Sẵn sàng');
        setIsRecording(false);
        setRecordingTime(0);
        setIsTranscriptExpanded(false);
        audioChunksRef.current = [];
        if (audioRef.current) {
            audioRef.current.src = '';
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            handleReset();
            setAudioFile(file);
            setStatusMessage(`Đã chọn file: ${file.name}`);
        } else {
            handleReset();
            setStatusMessage('Lỗi: Vui lòng chọn một file âm thanh hợp lệ.');
        }
    };

    const startRecording = async () => {
        handleReset();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const recordedFile = new File([audioBlob], 'recorded_audio.webm', { type: audioBlob.type });
                setAudioFile(recordedFile);
                setIsRecording(false);
                setStatusMessage('Đã dừng ghi âm. Sẵn sàng phiên âm.');
                stream.getTracks().forEach(track => track.stop());
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setStatusMessage('Đang ghi âm...');
            setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prevTime => prevTime + 1);
            }, 1000);
        } catch (err) {
            console.error('Lỗi khi truy cập microphone:', err);
            setStatusMessage('Lỗi: Không thể truy cập microphone. Vui lòng kiểm tra quyền.');
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };
    
    const handleSubmit = async () => {
        if (!audioFile) {
            setStatusMessage('Lỗi: Vui lòng chọn hoặc ghi âm file âm thanh.');
            return;
        }

        setIsLoading(true);
        setStatusMessage('Đang tải lên file âm thanh...');
        setTranscriptText('');
        setTranscriptWords([]);

        const formData = new FormData();
        formData.append('audio', audioFile);
        // THAY ĐỔI: Thêm user_id vào formData
        formData.append('user_id', loggedInUserId);

        try {
            const uploadResponse = await axios.post(API_URL_TRANSCRIBE, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const transcriptId = uploadResponse.data.transcript_id;
            console.log('Transcription job started with ID:', transcriptId);

            let status = '';
            let transcriptData = null;
            let pollCount = 0;
            const maxPollAttempts = 60;

            setStatusMessage(`Đã gửi yêu cầu. Đang chờ kết quả...`);

            while (status !== 'completed' && status !== 'error' && pollCount < maxPollAttempts) {
                const pollResponse = await axios.get(`${API_URL_STATUS}/${transcriptId}`);
                status = pollResponse.data.status;

                if (status === 'completed') {
                    // THAY ĐỔI: Sử dụng trực tiếp dữ liệu từ backend
                    transcriptData = pollResponse.data;
                    setTranscriptText(transcriptData.text);
                    setTranscriptWords(transcriptData.words);
                    setStatusMessage('Phiên âm hoàn tất!');
                    
                    // THAY ĐỔI: Gọi hàm loadHistory để tải lại lịch sử từ server
                    loadHistory();
                    
                } else if (status === 'error') {
                    setStatusMessage(`Lỗi phiên âm: ${pollResponse.data.error_message || 'Không xác định'}`);
                    break;
                }
                
                pollCount++;
                if (status !== 'completed' && status !== 'error') {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            if (pollCount >= maxPollAttempts) {
                setStatusMessage('Thời gian chờ phiên âm đã hết. Vui lòng thử lại.');
            }

        } catch (err) {
            console.error('Lỗi trong quá trình STT:', err);
            setStatusMessage(err.response?.data?.error || 'Đã xảy ra lỗi không mong muốn.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReadMoreClick = () => {
      setIsTranscriptExpanded(!isTranscriptExpanded);
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
    
    useEffect(() => {
        if (loggedInUserId) {
            loadHistory();
        }
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        };
    }, [loggedInUserId]);

    return (
        <div className="stt-container">
            <h1 className="stt-title">Chuyển Giọng Nói thành Văn bản</h1>
            <p className="stt-subtitle">Sử dụng AssemblyAI để phiên âm âm thanh một cách chính xác.</p>

            <div className="stt-action-box">
                <div className="stt-section">
                    <h3 className="stt-section-title">Ghi âm trực tiếp:</h3>
                    <div className="stt-recording-controls">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isLoading}
                            className={`stt-button ${isRecording ? 'stt-button-stop' : 'stt-button-record'}`}
                        >
                            {isRecording ? 'Dừng ghi âm ⏹️' : 'Bắt đầu ghi âm ⏺️'}
                        </button>
                        {isRecording && (
                            <span className="stt-recording-timer">{formatTime(recordingTime)}</span>
                        )}
                        <button
                            onClick={handleReset}
                            className="stt-button stt-button-reset"
                            disabled={isLoading}
                        >
                            Xóa 🗑️
                        </button>
                    </div>
                </div>

                <div className="stt-divider">hoặc</div>

                <div className="stt-section">
                    <h3 className="stt-section-title">Tải file âm thanh lên:</h3>
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        disabled={isRecording || isLoading}
                        className="stt-file-input"
                    />
                </div>
            </div>
            
            {(audioFile || isRecording) && (
                <div className="stt-audio-preview">
                    {audioFile && (
                        <>
                            <p className="stt-filename">
                                File đã chọn: <span className="stt-filename-value">{audioFile.name}</span>
                            </p>
                            <audio 
                                ref={audioRef} 
                                controls 
                                src={URL.createObjectURL(audioFile)} 
                                className="stt-audio-player"
                            />
                        </>
                    )}
                </div>
            )}
            
            <button
                onClick={handleSubmit}
                disabled={isLoading || !audioFile || isRecording}
                className="stt-submit-button"
            >
                {isLoading ? (
                    <div className="stt-loading-spinner"></div>
                ) : (
                    'Chuyển thành Văn bản'
                )}
            </button>
            
            {statusMessage && statusMessage !== 'Sẵn sàng' && (
                <p className={`stt-status ${statusMessage.startsWith('Lỗi') ? 'stt-status-error' : 'stt-status-info'}`}>
                    {statusMessage}
                </p>
            )}

            {transcriptText && (
                <div className="stt-transcript-box">
                    <h3 className="stt-transcript-title">Văn bản đã phiên âm:</h3>
                    <div className={`stt-transcript-content ${isTranscriptExpanded ? 'expanded' : 'collapsed'}`}>
                        {transcriptText}
                    </div>
                    {transcriptText.length > 300 && (
                        <span onClick={handleReadMoreClick} className="stt-read-more-link">
                            {isTranscriptExpanded ? 'Thu gọn' : 'Xem thêm'}
                        </span>
                    )}
                </div>
            )}

            {transcriptionHistory.length > 0 && (
                <div className="stt-history-container">
                    <h3 className="stt-history-title">
                        Lịch sử phiên âm gần đây
                        <button onClick={handleClearHistory} className="stt-clear-history-button">
                            Xóa lịch sử 🧹
                        </button>
                    </h3>
                    <ul className="stt-history-list">
                        {transcriptionHistory.map((item, index) => (
                            <HistoryItem key={item.id} item={item} onDeleteItem={handleDeleteHistoryItem} />
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SpeechToText;
