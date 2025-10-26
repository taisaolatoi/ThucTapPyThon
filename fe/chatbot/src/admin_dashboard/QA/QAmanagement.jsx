import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SummaryModal from './Sumary_Modal.jsx'; // Đã sửa lỗi đường dẫn từ 'Sumary_Modal' sang 'Summary_Modal'
import { InfinityIcon, Trash2Icon, ChevronLeft, ChevronRight, SearchIcon, SaveIcon } from 'lucide-react';

const QAManagement = () => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summarizingSessionId, setSummarizingSessionId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [deleteStatus, setDeleteStatus] = useState(null);

  // Thêm state cho cấu hình AI
  const [aiConfig, setAiConfig] = useState({ modelName: '', systemInstruction: '' });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveStatus, setConfigSaveStatus] = useState(null); // 'success' hoặc 'error'

  const API_BASE_URL = 'http://localhost:3001/api';

  // Hàm lấy danh sách hội thoại từ backend
  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/conversations`);
      setConversations(response.data.conversations);
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu hội thoại:', err);
      setError('Không thể lấy dữ liệu. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm lấy cấu hình AI từ backend
  const fetchAIConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/qa/config`);
      setAiConfig(response.data);
    } catch (err) {
      console.error('Lỗi khi lấy cấu hình AI:', err);
      // Hiển thị lỗi nếu không thể tải cấu hình AI
      setConfigSaveStatus('error_load');
      setTimeout(() => setConfigSaveStatus(null), 5000);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchAIConfig(); // Gọi để lấy cấu hình AI khi component mount
  }, []);

  const handleSummarizeConversation = async (sessionId) => {
    setSummaryLoading(true);
    setSummarizingSessionId(sessionId);
    setCurrentSummary('');
    setShowSummaryModal(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/summarize`, { session_id: sessionId });
      setCurrentSummary(response.data.summary);
    } catch (err) {
      console.error('Lỗi khi tóm tắt hội thoại:', err);
      setCurrentSummary('Đã xảy ra lỗi trong quá trình tóm tắt.');
    } finally {
      setSummaryLoading(false);
      setSummarizingSessionId(null);
    }
  };

  const confirmDelete = (sessionId) => {
    setDeletingSessionId(sessionId);
    setShowDeleteModal(true);
  };

  const handleDeleteConversation = async () => {
    if (!deletingSessionId) return;

    try {
      await axios.delete(`${API_BASE_URL}/chat/session/${deletingSessionId}`);
      setDeleteStatus('success');
      fetchConversations();
    } catch (err) {
      console.error('Lỗi khi xóa phiên chat:', err);
      setDeleteStatus('error');
    } finally {
      setShowDeleteModal(false);
      setDeletingSessionId(null);
      setTimeout(() => setDeleteStatus(null), 3000);
    }
  };

  // Xử lý thay đổi trong form cấu hình AI
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setAiConfig(prevConfig => ({
      ...prevConfig,
      [name]: value
    }));
  };

  // Xử lý lưu cấu hình AI
  const handleSaveAIConfig = async () => {
    setIsSavingConfig(true);
    setConfigSaveStatus(null);
    try {
      // Gửi chỉ systemInstruction vì modelName thường là cố định hoặc được quản lý bởi backend
      await axios.put(`${API_BASE_URL}/qa/config`, {
        system_instruction: aiConfig.systemInstruction
      });
      setConfigSaveStatus('success');
    } catch (err) {
      console.error('Lỗi khi lưu cấu hình AI:', err);
      setConfigSaveStatus('error');
    } finally {
      setIsSavingConfig(false);
      setTimeout(() => setConfigSaveStatus(null), 3000);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    String(conv.user_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(conv.session_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConversations = filteredConversations.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="app-container">
      <h3 className="app-title">Quản lý Lịch sử Hội thoại</h3>

      {deleteStatus === 'success' && (
        <div className="app-alert success" role="alert">
          <span className="app-alert-text">Xóa phiên chat thành công!</span>
        </div>
      )}
      {deleteStatus === 'error' && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">Không thể xóa phiên chat. Vui lòng thử lại.</span>
        </div>
      )}
      {error && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">{error}</span>
        </div>
      )}
      {configSaveStatus === 'success' && (
        <div className="app-alert success" role="alert">
          <span className="app-alert-text">Cấu hình AI đã được lưu thành công!</span>
        </div>
      )}
      {configSaveStatus === 'error' && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">Lỗi khi lưu cấu hình AI. Vui lòng thử lại.</span>
        </div>
      )}
      {configSaveStatus === 'error_load' && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">Không thể tải cấu hình AI.</span>
        </div>
      )}

      {/* Phần Lịch sử Hội thoại */}
      <div className="app-card">
        <div className="app-header">
          <h4 className="app-subtitle">Lịch sử Hội thoại</h4>
          <div className="app-search-container">
            <input
              type="text"
              placeholder="Tìm kiếm theo người dùng hoặc ID phiên..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
              }}
              className="app-search-input"
            />
            {/* <SearchIcon className="app-search-icon" size={18} /> */}
          </div>
        </div>

        <div className="app-table-wrapper">
          {isLoading ? (
            <div className="app-loading-state">
              <InfinityIcon className="app-loading-spinner" />
              <p className="app-loading-text">Đang tải dữ liệu...</p>
            </div>
          ) : 
            filteredConversations.length === 0 ? (
                <p className="app-no-data">Không tìm thấy hội thoại nào.</p>
          ) : (
            <>
              <table className="app-table">
                <thead>
                  <tr>
                    <th>ID Phiên</th>
                    <th>Người dùng</th>
                    <th>Tóm tắt</th>
                    <th>Thời gian tạo</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConversations.map((conv) => (
                    <tr key={conv.session_id} className="app-table-row">
                      <td className="app-table-cell">{conv.session_id}</td>
                      <td className="app-table-cell">{conv.user_name}</td>
                      <td className="app-table-cell truncate">{conv.summary}</td>
                      <td className="app-table-cell">{new Date(conv.created_at).toLocaleString()}</td> {/* Định dạng thời gian */}
                      <td className="app-table-cell">
                        <div className="app-actions">
                          <button
                            onClick={() => handleSummarizeConversation(conv.session_id)}
                            disabled={summarizingSessionId === conv.session_id}
                            className="app-button summary"
                            title="Tóm tắt hội thoại"
                          >
                            {summarizingSessionId === conv.session_id ? (
                              <InfinityIcon className="app-button-spinner" size={16} />
                            ) : (
                              <InfinityIcon size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => confirmDelete(conv.session_id)}
                            className="app-button delete"
                            title="Xóa phiên chat"
                          >
                            <Trash2Icon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <nav className="pagination-nav"> {/* Sử dụng class pagination-nav */}
                  <ul className="pagination-list"> {/* Sử dụng class pagination-list */}
                    <li className={`pagination-item ${currentPage === 1 ? 'disabled' : ''}`}> {/* Sử dụng class pagination-item */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="pagination-button" /* Sử dụng class pagination-button */
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, index) => (
                      <li key={index + 1} className={`pagination-item ${currentPage === index + 1 ? 'active' : ''}`}>
                        <button
                          onClick={() => handlePageChange(index + 1)} // Dùng index + 1
                          className="pagination-button"
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`pagination-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Phần Cấu hình AI */}
      <div className="app-card" style={{ marginTop: '2rem' }}>
        <h4 className="app-subtitle">Cấu hình AI</h4>
        <div className="ai-config-section">
          <div className="ai-config-item">
            <label className="ai-config-label">Model đang sử dụng:</label>
            <span className="ai-config-value">{aiConfig.modelName || 'Đang tải...'}</span>
          </div>
          <div className="ai-config-item full-width">
            <label htmlFor="systemInstruction" className="ai-config-label">Hướng dẫn hệ thống (System Instruction):</label>
            <textarea
              id="systemInstruction"
              name="systemInstruction"
              value={aiConfig.systemInstruction}
              onChange={handleConfigChange}
              className="ai-config-textarea"
              rows="8"
              placeholder="Nhập hướng dẫn cho AI tại đây..."
            ></textarea>
          </div>
          <div className="ai-config-actions">
            <button
              onClick={handleSaveAIConfig}
              disabled={isSavingConfig}
              className="app-button primary"
            >
              {isSavingConfig ? (
                <>
                  <InfinityIcon className="app-button-spinner" size={16} /> Đang lưu...
                </>
              ) : (
                <>
                  <SaveIcon size={16} /> Lưu cấu hình AI
                </>
              )}
            </button>
          </div>
          {/* <p className="ai-config-note">
            Lưu ý: API Key được quản lý an toàn trên máy chủ và không thể thay đổi trực tiếp từ giao diện này.
            Việc thay đổi "Hướng dẫn hệ thống" sẽ được áp dụng cho các tương tác AI mới.
          </p> */}
        </div>
      </div>

      {showSummaryModal && (
        <SummaryModal
          summary={currentSummary}
          loading={summaryLoading}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

      {showDeleteModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-content">
            <h3 className="app-modal-title">Xác nhận xóa</h3>
            <p className="app-modal-text">Bạn có chắc chắn muốn xóa phiên chat này không? Hành động này không thể hoàn tác.</p>
            <div className="app-modal-actions">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="app-modal-button cancel"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConversation}
                className="app-modal-button delete"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QAManagement;
