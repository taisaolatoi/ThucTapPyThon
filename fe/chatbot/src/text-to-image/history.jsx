import React, { useState, useEffect } from 'react';
import './history.css'; // Import CSS styles for the component
import { FaTrash, FaDownload } from 'react-icons/fa'; // Import icon thùng rác và tải xuống

const ImageHistory = ({ loggedInUserId, activeSessionId }) => {
    const [historyImages, setHistoryImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isVisible, setIsVisible] = useState(true); 

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [imageToDeleteId, setImageToDeleteId] = useState(null);
    const [deleteError, setDeleteError] = useState(null); 

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    // Function to fetch image history (Giữ nguyên)
    useEffect(() => {
        const fetchImageHistory = async () => {
            if (!loggedInUserId) {
                setError("User ID is missing. Cannot fetch image history.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null); 

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
    }, [loggedInUserId, activeSessionId]); 

    // Hàm Confirm/Execute/Cancel Delete (Giữ nguyên)
    const confirmDelete = (imageId) => {
        setImageToDeleteId(imageId);
        setShowConfirmModal(true);
        setDeleteError(null); 
    };

    const executeDelete = async () => {
        // ... (Logic xóa giữ nguyên) ...
        setShowConfirmModal(false); 
        if (!imageToDeleteId) return; 

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
            setImageToDeleteId(null); 

        } catch (err) {
            console.error("Error deleting image:", err);
            setDeleteError(err.message);
        }
    };

    const cancelDelete = () => {
        setShowConfirmModal(false);
        setImageToDeleteId(null);
        setDeleteError(null);
    };

    // CHỨC NĂNG TẢI XUỐNG CẬP NHẬT
const handleDownload = async (imageUrl, prompt) => {
    // 1. Xây dựng URL đầy đủ của ảnh
    const fullImageUrl = `http://127.0.0.1:5500/legal-edu-chatbot${imageUrl}`;

    try {
        // 2. Fetch (lấy) dữ liệu ảnh dưới dạng Blob (dữ liệu nhị phân)
        const response = await fetch(fullImageUrl);
        if (!response.ok) {
            throw new Error('Không thể tải file ảnh từ đường dẫn.');
        }

        const imageBlob = await response.blob();
        
        // 3. Tạo URL đối tượng (Object URL) từ Blob
        const objectUrl = window.URL.createObjectURL(imageBlob);

        // 4. Tạo thẻ <a> ảo để kích hoạt hành vi download
        const link = document.createElement('a');
        link.href = objectUrl;

        // 5. Đặt tên file tải xuống
        const date = new Date().toISOString().slice(0, 10);
        // Làm sạch prompt để đặt tên file
        const cleanPrompt = prompt.replace(/[^a-z0-9]/gi, '_').substring(0, 30); 
        link.download = `AI_Image_${cleanPrompt}_${date}.png`; 
        
        // 6. Kích hoạt download
        document.body.appendChild(link);
        link.click();
        
        // 7. Dọn dẹp: xóa thẻ <a> ảo và giải phóng Object URL
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
        
    } catch (error) {
        console.error("Lỗi tải xuống ảnh:", error);
        // Thông báo cho người dùng biết lỗi nếu cần
        alert(`Lỗi tải xuống: ${error.message}`);
    }
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
                                    <div className="image-actions">
                                        <button className="delete-button" onClick={() => confirmDelete(image.id)} title="Xóa ảnh này">
                                            <FaTrash />
                                        </button>
                                        
                                        {/* Nút Tải xuống với Class mới */}
                                        {image.status === 'success' && (
                                            <button 
                                                className="download-icon-button" // Class mới
                                                onClick={() => handleDownload(image.image_url, image.prompt)} 
                                                title="Tải xuống ảnh"
                                            >
                                                <FaDownload />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Phần hiển thị ảnh giữ nguyên */}
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
                                        <p className="image-style"><strong>Phong cách:</strong> {image.style}</p>
                                        <p className="image-engine"><strong>Mô hình:</strong> {image.engine_id}</p>
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

            {/* Modal Xác nhận giữ nguyên */}
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