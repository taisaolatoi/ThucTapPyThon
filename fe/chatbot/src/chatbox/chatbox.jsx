// src/components/ChatContent.jsx
import React, { useState, useEffect, useRef } from 'react';
import './chatbox.css';

// Import các thư viện React Markdown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Plugin cho GitHub Flavored Markdown (bảng, task lists, strikethrough)
import rehypeRaw from 'rehype-raw'; // Plugin cho phép HTML raw (cẩn thận với XSS)

// Removed: import { useNotification } from '../NotificationSystem';

const API_BASE_URL = 'http://localhost:3001/api';

const ChatContent = ({username, loggedInUserId, loggedInUsername, onLogout, activeSessionId, setActiveSessionId }) => {
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatSegments, setChatSegments] = useState([]);
    const [showChatSegments, setShowChatSegments] = useState(false);
    const messagesEndRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null); // Re-introduced for general errors

    // States for custom chat session deletion modal
    const [showChatDeleteConfirmModal, setShowChatDeleteConfirmModal] = useState(false);
    const [sessionToDeleteId, setSessionToDeleteId] = useState(null);
    const [chatDeleteError, setChatDeleteError] = useState(null); // Specific error for delete operation

    // Removed: Get notification functions from context
    // const { showSuccessNotification, showErrorNotification } = useNotification();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // useEffect(() => {
    //     scrollToBottom();
    // }, [chatMessages, isLoading]); // Keep this commented out or uncomment if you want auto-scroll

    useEffect(() => {
        if (loggedInUserId) {
            fetchChatSegments(loggedInUserId);
        }
    }, [loggedInUserId]);

    useEffect(() => {
        if (activeSessionId) {
            fetchChatMessages(activeSessionId);
        } else {
            setChatMessages([]);
        }
    }, [activeSessionId]);

    const fetchChatSegments = async (userId) => {
        setError(null); // Clear general error before fetching
        try {
            const response = await fetch(`${API_BASE_URL}/chat/sessions/${userId}`);
            if (!response.ok) {
                throw new Error('Không thể tải các phiên chat.');
            }
            const data = await response.json();
            setChatSegments(data);
        } catch (error) {
            console.error('Lỗi khi tải các phiên chat:', error);
            setError(`Lỗi khi tải các phiên chat: ${error.message}`); // Use local error state
        }
    };

    const fetchChatMessages = async (sessionId) => {
        setError(null); // Clear general error before fetching
        try {
            const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);
            if (!response.ok) {
                throw new Error('Không thể tải lịch sử tin nhắn.');
            }
            const data = await response.json();
            const formattedMessages = data.map(msg => ({
                sender: msg.sender,
                text: msg.text,
                // imageUrl: msg.image_url, // Removed image_url
                timestamp: msg.timestamp
            }));
            setChatMessages(formattedMessages);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử tin nhắn:', error);
            setError(`Lỗi khi tải lịch sử tin nhắn: ${error.message}`); // Use local error state
        }
    };

    const handleStartNewChat = () => {
        setActiveSessionId(null);
        setChatMessages([]);
        setChatInput('');
        setShowChatSegments(false);
        setIsLoading(false);
        setError(null); // Clear error on new chat
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isLoading) return;

        const newMessage = { sender: 'user', text: chatInput };
        setChatMessages(prevMessages => [...prevMessages, newMessage]);
        setChatInput('');
        setIsLoading(true);
        setError(null); // Clear error before sending new message

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
                const errorData = await response.json();
                throw new Error(errorData.error || 'Lỗi khi gửi tin nhắn đến AI.');
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
            setError(`Lỗi khi gửi tin nhắn: ${error.message}`); // Use local error state
        } finally {
            setIsLoading(false);
        }
    };

    // Function to initiate chat session deletion confirmation
    const confirmDeleteChatSession = (sessionId) => {
        setSessionToDeleteId(sessionId);
        setShowChatDeleteConfirmModal(true);
        setChatDeleteError(null); // Clear previous delete error
    };

    // Function to handle actual chat session deletion after confirmation
    const executeDeleteChatSession = async () => {
        setShowChatDeleteConfirmModal(false); // Hide the modal
        if (!sessionToDeleteId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/chat/session/${sessionToDeleteId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Không thể xóa phiên chat.');
            }
            if (activeSessionId === sessionToDeleteId) {
                handleStartNewChat();
            } else {
                fetchChatSegments(loggedInUserId);
            }
            setSessionToDeleteId(null); // Reset ID after successful deletion
        } catch (error) {
            console.error('Lỗi khi xóa phiên chat:', error);
            setChatDeleteError(error.message); // Use local error state for modal
        }
    };

    // Function to cancel chat session deletion
    const cancelDeleteChatSession = () => {
        setShowChatDeleteConfirmModal(false);
        setSessionToDeleteId(null);
        setChatDeleteError(null);
    };

    const renderers = {
        // Render paragraphs with class "my-paragraph"
        p: ({ node, ...props }) => <p className="my-paragraph" {...props} />,
        // Render unordered lists with class "my-list"
        ul: ({ node, ...props }) => <ul className="my-list" {...props} />,
        // Render strong/bold text with class "my-bold-text"
        strong: ({ node, ...props }) => <strong className="my-bold-text" {...props} />,
        // ... you can define for any other HTML tags that Markdown generates
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
                    chào mừng {username}!
                </div>
                
                {/* <button className="logout-btn" onClick={onLogout}>Đăng xuất</button> */}
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
                        {/* Removed "Tạo ảnh" button */}
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
                                    confirmDeleteChatSession(segment.id); // Call custom confirm
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
                    {error && <div className="error-message">Lỗi: {error}</div>} {/* Display general error */}

                    {/* Display chat messages */}
                    {chatMessages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>
                            {msg.sender === 'user' && <span className="message-sender">{username}: </span>}
                            {msg.sender === 'model' && <span className="message-sender">AI: </span>}
                            {msg.sender === 'system' && <span className="message-sender system-message">Hệ thống: </span>}
                            {/* Use ReactMarkdown here */}
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={renderers} // Pass renderers object here
                            >
                                {msg.text}
                            </ReactMarkdown>
                            {/* Removed image display block */}
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
                    {/* Only chat input remains */}
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
                </div>
            </main>

            {/* Custom Confirmation Modal for Chat Session Deletion */}
            {showChatDeleteConfirmModal && (
                <div className="confirm-modal-overlay">
                    <div className="confirm-modal">
                        <h3>Xác nhận xóa phiên chat</h3>
                        <p>Bạn có chắc chắn muốn xóa phiên chat này không? Hành động này không thể hoàn tác.</p>
                        {chatDeleteError && <p className="modal-error-message">{chatDeleteError}</p>} {/* Display specific error */}
                        <div className="modal-actions">
                            <button className="modal-button cancel" onClick={cancelDeleteChatSession}>Hủy</button>
                            <button className="modal-button confirm" onClick={executeDeleteChatSession}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatContent;
