// src/components/ChatContent.jsx
import React, { useState, useEffect, useRef } from 'react';
import './chatbox.css';

// Import các thư viện React Markdown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Plugin cho GitHub Flavored Markdown (bảng, task lists, strikethrough)
import rehypeRaw from 'rehype-raw'; // Plugin cho phép HTML raw (cẩn thận với XSS)

const API_BASE_URL = 'http://localhost:3001/api';

const ChatContent = ({ loggedInUserId, loggedInUsername, onLogout, activeSessionId, setActiveSessionId }) => {
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatSegments, setChatSegments] = useState([]);
    const [showChatSegments, setShowChatSegments] = useState(false);
    const messagesEndRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    const [isImageMode, setIsImageMode] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    const [generatedImageUrl, setGeneratedImageUrl] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // useEffect(() => {
    //     scrollToBottom();
    // }, [chatMessages, isLoading]);

    useEffect(() => {
        if (loggedInUserId) {
            fetchChatSegments(loggedInUserId);
        }
    }, [loggedInUserId]);

    useEffect(() => {
        if (activeSessionId) {
            fetchChatMessages(activeSessionId);
            setIsImageMode(false);
        } else {
            setChatMessages([]);
            setGeneratedImageUrl('');
        }
    }, [activeSessionId]);

    const fetchChatSegments = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/chat/sessions/${userId}`);
            if (!response.ok) {
                throw new Error('Không thể tải các phiên chat.');
            }
            const data = await response.json();
            setChatSegments(data);
        } catch (error) {
            console.error('Lỗi khi tải các phiên chat:', error);
        }
    };

    const fetchChatMessages = async (sessionId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);
            if (!response.ok) {
                throw new Error('Không thể tải lịch sử tin nhắn.');
            }
            const data = await response.json();
            const formattedMessages = data.map(msg => ({
                sender: msg.sender,
                text: msg.text,
                imageUrl: msg.image_url,
                timestamp: msg.timestamp
            }));
            setChatMessages(formattedMessages);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử tin nhắn:', error);
        }
    };

    const handleStartNewChat = () => {
        setActiveSessionId(null);
        setChatMessages([]);
        setChatInput('');
        setGeneratedImageUrl('');
        setIsImageMode(false);
        setShowChatSegments(false);
        setIsLoading(false);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isLoading) return;

        const newMessage = { sender: 'user', text: chatInput };
        setChatMessages(prevMessages => [...prevMessages, newMessage]);
        setChatInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: loggedInUserId,
                    session_id: activeSessionId,
                    messages: [...chatMessages, newMessage],
                }),
            });

            if (!response.ok) {
                throw new Error('Lỗi khi gửi tin nhắn đến AI.');
            }

            const data = await response.json();
            const botResponse = { sender: 'model', text: data.response };
            setChatMessages(prevMessages => [...prevMessages, botResponse]);

            if (data.session_id && data.session_id !== activeSessionId) {
                setActiveSessionId(data.session_id);
                fetchChatSegments(loggedInUserId);
            }
        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
            setChatMessages(prevMessages => [
                ...prevMessages,
                { sender: 'system', text: `Lỗi: Không thể nhận phản hồi. ${error.message}` }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteChatSession = async (sessionId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phiên chat này không?')) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Không thể xóa phiên chat.');
            }
            alert('Phiên chat đã được xóa.');
            if (activeSessionId === sessionId) {
                handleStartNewChat();
            } else {
                fetchChatSegments(loggedInUserId);
            }
        } catch (error) {
            console.error('Lỗi khi xóa phiên chat:', error);
            alert(`Lỗi: ${error.message}`);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt.trim() || isLoading) return;

        setGeneratedImageUrl('');
        setChatMessages(prevMessages => [...prevMessages, { sender: 'user', text: `Yêu cầu tạo ảnh: "${imagePrompt}"` }]);
        setImagePrompt('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/image/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: imagePrompt }),
            });

            const data = await response.json();

            if (response.ok) {
                const imageUrl = data.image_url;
                setGeneratedImageUrl(imageUrl);
                setChatMessages(prevMessages => [...prevMessages, {
                    sender: 'model',
                    text: 'Đây là hình ảnh của bạn:',
                    imageUrl: imageUrl
                }]);
            } else {
                console.error('Lỗi tạo ảnh:', data.error);
                setChatMessages(prevMessages => [
                    ...prevMessages,
                    { sender: 'system', text: `Lỗi khi tạo ảnh: ${data.error || 'Vui lòng thử lại.'}` }
                ]);
            }
        } catch (error) {
            console.error('Lỗi khi gọi API tạo ảnh:', error);
            setChatMessages(prevMessages => [
                ...prevMessages,
                { sender: 'system', text: `Lỗi kết nối khi tạo ảnh. ${error.message}` }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderers = {
        // Render paragraphs với class "my-paragraph"
        p: ({ node, ...props }) => <p className="my-paragraph" {...props} />,
        // Render unordered lists với class "my-list"
        ul: ({ node, ...props }) => <ul className="my-list" {...props} />,
        // Render strong/bold text với class "my-bold-text"
        strong: ({ node, ...props }) => <strong className="my-bold-text" {...props} />,
        // ... bạn có thể định nghĩa cho bất kỳ thẻ HTML nào khác mà Markdown tạo ra
    };

    return (
        <div className="chat-container">
            <header className="chat-header">
                <button className="toggle-sidebar-btn" onClick={() => setShowChatSegments(!showChatSegments)}>
                    {showChatSegments ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x-square"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    )}
                    <span className="button-text">{showChatSegments ? 'Ẩn Chat' : 'Hiện Chat'}</span>
                </button>
                <div className="user-info">
                    Chào mừng, {loggedInUsername}!
                </div>
                <button className="logout-btn" onClick={onLogout}>Đăng xuất</button>
            </header>

            {/* Overlay cho sidebar khi ẩn/hiện trên mobile hoặc màn hình nhỏ */}
            {showChatSegments && <div className="sidebar-overlay" onClick={() => setShowChatSegments(false)}></div>}

            <aside className={`chat-segments-sidebar ${showChatSegments ? 'show' : ''}`}>
                <div className="sidebar-header">
                    <h3>Các đoạn chat của bạn</h3>
                    <div className="sidebar-buttons-group">
                        <button className="sidebar-button" onClick={handleStartNewChat}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-plus-circle"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            <span>Chat Mới</span>
                        </button>
                        <button className="sidebar-button" onClick={() => {
                            setIsImageMode(true);
                            setChatMessages([]);
                            setGeneratedImageUrl('');
                            setImagePrompt('');
                            setActiveSessionId(null);
                            setShowChatSegments(false);
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-image"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            <span>Tạo ảnh</span>
                        </button>
                    </div>
                </div>
                <ul className="chat-list">
                    {chatSegments.length === 0 ? (
                        <li className="no-segments">Chưa có đoạn chat nào.</li>
                    ) : (
                        chatSegments.map(segment => (
                            <li key={segment.id} className={segment.id === activeSessionId ? 'active' : ''}>
                                <span onClick={() => {
                                    setActiveSessionId(segment.id);
                                    setShowChatSegments(false);
                                }}>
                                    {segment.title} ({segment.message_count})
                                </span>
                                <button className="delete-chat-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteChatSession(segment.id);
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </aside>

            <main className="chat-main-content">
                <div className="chat-messages">
                    {isImageMode && !generatedImageUrl && chatMessages.length === 0 && (
                        <div className="image-intro-message">
                            <p>Bạn đang ở chế độ tạo ảnh. Hãy mô tả hình ảnh bạn muốn tạo:</p>
                            <ul>
                                <li>**Chủ thể chính:** (ví dụ: một con mèo, một chiếc xe hơi)</li>
                                <li>**Hành động/tư thế:** (ví dụ: đang ngủ, đang chạy)</li>
                                <li>**Môi trường/bối cảnh:** (ví dụ: trong rừng, trên bãi biển)</li>
                                <li>**Phong cách nghệ thuật:** (ví dụ: tranh sơn dầu, ảnh chân thực, hoạt hình 3D)</li>
                                <li>**Màu sắc/ánh sáng:** (ví dụ: tông màu ấm, ánh sáng bình minh)</li>
                            </ul>
                            <p>Càng nhiều chi tiết, kết quả càng tốt!</p>
                        </div>
                    )}

                    {/* Hiển thị tin nhắn chat */}
                    {chatMessages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>
                            {msg.sender === 'user' && <span className="message-sender">Bạn: </span>}
                            {msg.sender === 'model' && <span className="message-sender">AI: </span>}
                            {msg.sender === 'system' && <span className="message-sender system-message">Hệ thống: </span>}
                            {/* DÙNG ReactMarkdown Ở ĐÂY */}
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={renderers} // Truyền đối tượng renderers vào đây
                            >
                                {msg.text}
                            </ReactMarkdown>
                            {msg.imageUrl && (
                                <div className="generated-image-wrapper">
                                    <img src={msg.imageUrl} alt="Generated" className="generated-image" />
                                    <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="download-image-link">Tải ảnh</a>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message model loading-message">
                            <span className="message-sender">AI: </span>
                            Đang trả lời
                            <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                    {isImageMode ? (
                        <>
                            <input
                                type="text"
                                className="chat-input-field"
                                placeholder="Nhập mô tả ảnh bạn muốn tạo..."
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleGenerateImage();
                                    }
                                }}
                                disabled={isLoading}
                            />
                            <button className="chat-send-button" onClick={handleGenerateImage} disabled={isLoading}>
                                {isLoading ? (
                                    <span className="spinner"></span>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                        <span>Tạo ảnh</span>
                                    </>
                                )}
                            </button>
                            <button className="cancel-image-mode-btn" onClick={() => setIsImageMode(false)} disabled={isLoading}>Trở lại Chat</button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                className="chat-input-field"
                                placeholder="Nhập tin nhắn của bạn..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSendMessage();
                                    }
                                }}
                                disabled={isLoading}
                            />
                            <button className="chat-send-button" onClick={handleSendMessage} disabled={isLoading}>
                                {isLoading ? (
                                    <span className="spinner"></span>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                        <span>Gửi</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChatContent;