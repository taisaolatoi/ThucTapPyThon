// src/components/ChatContent.jsx
import React, { useState, useEffect, useRef } from 'react';
import './chatbox.css';

// Import các thư viện React Markdown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Plugin cho GitHub Flavored Markdown (bảng, task lists, strikethrough)
import rehypeRaw from 'rehype-raw'; // Plugin cho phép HTML raw (cẩn thận với XSS)

// Removed: import { useNotification } from '../NotificationSystem';

const API_BASE_URL = 'http://localhost:3001/api';

const ChatContent = ({ username, loggedInUserId, loggedInUsername, onLogout, activeSessionId, setActiveSessionId }) => {
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

    const [editingSessionId, setEditingSessionId] = useState(null);
    const [newSessionTitle, setNewSessionTitle] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleMainContentClick = () => {
        if (showChatSegments) {
            setShowChatSegments(false);
        }
    };

    const handleUpdateChatTitle = async (sessionId) => {
        if (!newSessionTitle.trim() || newSessionTitle.length < 3) {
            setError('Tên chat phải có ít nhất 3 ký tự.');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    new_title: newSessionTitle,
                    user_id: loggedInUserId, // Thêm user_id để bảo mật
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Không thể cập nhật tên chat.');
            }

            // Tải lại danh sách chatSegments sau khi cập nhật thành công
            await fetchChatSegments(loggedInUserId);

            // Reset trạng thái chỉnh sửa
            setEditingSessionId(null);
            setNewSessionTitle('');

        } catch (error) {
            console.error('Lỗi khi cập nhật tên chat:', error);
            setError(`Lỗi khi cập nhật: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
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
                                {/* THAY THẾ TOÀN BỘ NỘI DUNG LI NÀY: */}
                                {editingSessionId === segment.id ? (
                                    <div className="edit-title-group">
                                        <input
                                            type="text"
                                            value={newSessionTitle}
                                            onChange={(e) => setNewSessionTitle(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleUpdateChatTitle(segment.id);
                                                }
                                            }}
                                            className="edit-title-input"
                                            disabled={isLoading}
                                        />
                                        <button
                                            className="save-chat-btn"
                                            onClick={() => handleUpdateChatTitle(segment.id)}
                                            disabled={isLoading}
                                        >
                                            {/* Biểu tượng lưu (tick) */}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </button>
                                        <button
                                            className="cancel-edit-btn"
                                            onClick={() => setEditingSessionId(null)}
                                            disabled={isLoading}
                                        >
                                            {/* Biểu tượng hủy (x) */}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span onClick={() => {
                                            setActiveSessionId(segment.id);
                                            setShowChatSegments(false);
                                            if (window.innerWidth <= 768) {
                                                setShowChatSegments(false);
                                            }
                                        }}>
                                            {segment.title} ({segment.message_count})
                                        </span>

                                        {/* Nhóm nút hành động */}
                                        <div className="chat-actions-group">
                                            {/* Nút chỉnh sửa */}
                                            <button
                                                className="edit-chat-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSessionId(segment.id);
                                                    setNewSessionTitle(segment.title);
                                                }}
                                                title="Chỉnh sửa tên đoạn chat"
                                            >
                                                {/* Biểu tượng chỉnh sửa (bút chì) */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>

                                            {/* Nút xóa (Giữ nguyên logic cũ của bạn) */}
                                            <button className="delete-chat-btn" onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDeleteChatSession(segment.id);
                                            }} title="Xóa đoạn chat">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            </aside>

            <main className="chat-main-content" onClick={handleMainContentClick}>
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
