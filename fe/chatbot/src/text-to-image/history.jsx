import React, { useState, useEffect } from 'react';
import './history.css'; // Import CSS styles for the component
import { FaTrash } from 'react-icons/fa'; // Import icon thùng rác từ react-icons

const ImageHistory = ({ loggedInUserId, activeSessionId }) => {
    const [historyImages, setHistoryImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isVisible, setIsVisible] = useState(true); // State to manage history section visibility

    // State for custom confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [imageToDeleteId, setImageToDeleteId] = useState(null);
    const [deleteError, setDeleteError] = useState(null); // Specific error for delete operation

    // Function to toggle history section visibility
    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    // Function to fetch image history
    useEffect(() => {
        const fetchImageHistory = async () => {
            if (!loggedInUserId) {
                setError("User ID is missing. Cannot fetch image history.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null); // Clear main error when fetching history

            try {
                let url = `http://localhost:3001/api/image-history?user_id=${loggedInUserId}`;
                if (activeSessionId) {
                    url += `&session_id=${activeSessionId}`;
                }

                const response = await fetch(url);
                if (!response.ok) {
                    let errorData = {};
                    try {
                        errorData = await response.json();
                    } catch (jsonError) {
                        const text = await response.text();
                        throw new Error(`Server responded with non-JSON content or status ${response.status}: ${text.substring(0, 100)}...`);
                    }
                    throw new Error(errorData.error || 'Failed to fetch image history.');
                }

                const data = await response.json();
                setHistoryImages(data);
            } catch (err) {
                console.error("Error fetching image history:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchImageHistory();
    }, [loggedInUserId, activeSessionId]); // Re-fetch when user_id or activeSessionId changes

    // Function to initiate delete confirmation
    const confirmDelete = (imageId) => {
        setImageToDeleteId(imageId);
        setShowConfirmModal(true);
        setDeleteError(null); // Clear previous delete error
    };

    // Function to handle actual deletion after confirmation
    const executeDelete = async () => {
        setShowConfirmModal(false); // Hide the modal
        if (!imageToDeleteId) return; // Should not happen if modal is shown correctly

        if (!loggedInUserId) {
            setDeleteError("User ID is missing. Cannot delete image.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:3001/api/delete-image/${imageToDeleteId}?user_id=${loggedInUserId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete image.');
            }

            setHistoryImages(prevImages => prevImages.filter(image => image.id !== imageToDeleteId));
            console.log(`Image with ID ${imageToDeleteId} deleted successfully.`);
            setImageToDeleteId(null); // Reset ID after successful deletion

        } catch (err) {
            console.error("Error deleting image:", err);
            setDeleteError(err.message);
        }
    };

    // Function to cancel deletion
    const cancelDelete = () => {
        setShowConfirmModal(false);
        setImageToDeleteId(null);
        setDeleteError(null);
    };

    return (
        <div className="image-history-container">
            <button onClick={toggleVisibility} className="toggle-button">
                {isVisible ? 'Ẩn Lịch Sử Ảnh' : 'Hiện Lịch Sử Ảnh'}
            </button>

            {isVisible && (
                <div className="history-content-wrapper">
                    <h2>Lịch sử Ảnh đã Tạo</h2>
                    {loading && <div className="loading-message">Đang tải lịch sử ảnh...</div>}
                    {error && <div className="error-message">Lỗi: {error}</div>}

                    {!loading && !error && historyImages.length === 0 && (
                        <div className="no-history">Chưa có ảnh nào được tạo.</div>
                    )}

                    {!loading && !error && historyImages.length > 0 && (
                        <div className="image-grid">
                            {historyImages.map((image) => (
                                <div key={image.id} className="image-card">
                                    <button className="delete-button" onClick={() => confirmDelete(image.id)} title="Xóa ảnh này">
                                        <FaTrash />
                                    </button>

                                    {image.status === 'success' ? (
                                        <img src={`http://127.0.0.1:5500/legal-edu-chatbot${image.image_url}`} alt={`Generated: ${image.prompt}`} className="generated-image" />
                                    ) : (
                                        <div className="image-placeholder">
                                            <p>Ảnh lỗi hoặc đang chờ</p>
                                            {image.error_message && <p className="error-text">{image.error_message}</p>}
                                        </div>
                                    )}
                                    <div className="image-info">
                                        <p className="image-prompt"><strong>Prompt:</strong> {image.prompt}</p>
                                        {/* <p className="image-style"><strong>Phong cách:</strong> {image.style}</p>
                                        <p className="image-engine"><strong>Mô hình:</strong> {image.engine_id}</p> */}
                                        <p className="image-date"><strong>Thời gian:</strong> {new Date(image.created_at).toLocaleString()}</p>
                                        <p className={`image-status status-${image.status}`}>
                                            <strong>Trạng thái:</strong> {image.status === 'success' ? 'Thành công' : image.status === 'failed' ? 'Thất bại' : 'Đang chờ'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="confirm-modal-overlay">
                    <div className="confirm-modal">
                        <h3>Xác nhận xóa ảnh</h3>
                        <p>Bạn có chắc chắn muốn xóa ảnh này không? Hành động này không thể hoàn tác.</p>
                        {deleteError && <p className="modal-error-message">{deleteError}</p>}
                        <div className="modal-actions">
                            <button className="modal-button cancel" onClick={cancelDelete}>Hủy</button>
                            <button className="modal-button confirm" onClick={executeDelete}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageHistory;



