import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SaveIcon, InfinityIcon } from 'lucide-react'; // Thêm icon Save và Infinity

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    siteName: 'Hệ thống Chatbot AI',
    defaultLanguage: 'Tiếng Việt',
    chatbotName: 'Bot Hỗ Trợ',
    geminiApiKey: 'Đang tải...',
    stabilityApiKey: 'Đang tải...',
    segmindApiKey: 'Đang tải...',
    assemblyaiApiKey: 'Đang tải...', // Thêm state cho AssemblyAI API Key
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', 'loading_error'

  const API_BASE_URL = 'http://localhost:3001/api'; // Đảm bảo URL này khớp với backend của bạn

  // Hàm tải cài đặt API Keys từ backend
  const fetchApiKeys = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/api-keys`);
      setSettings(prevSettings => ({
        ...prevSettings,
        geminiApiKey: response.data.geminiApiKey,
        stabilityApiKey: response.data.stabilityApiKey,
        segmindApiKey: response.data.segmindApiKey,
        assemblyaiApiKey: response.data.assemblyaiApiKey, // Cập nhật state từ phản hồi backend
      }));
    } catch (error) {
      console.error('Lỗi khi tải API Keys:', error);
      setSaveStatus('loading_error');
      setTimeout(() => setSaveStatus(null), 5000); // Ẩn thông báo lỗi sau 5 giây
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [id]: value,
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null); // Reset trạng thái lưu

    try {
      const response = await axios.put(`${API_BASE_URL}/settings/api-keys`, {
        geminiApiKey: settings.geminiApiKey,
        stabilityApiKey: settings.stabilityApiKey,
        segmindApiKey: settings.segmindApiKey,
        assemblyaiApiKey: settings.assemblyaiApiKey, // Gửi AssemblyAI API Key lên backend
      });
      console.log('Phản hồi từ backend:', response.data);
      setSaveStatus('success');
      // Sau khi lưu thành công, tải lại API keys để hiển thị giá trị đã che mới
      fetchApiKeys(); 
    } catch (error) {
      console.error('Lỗi khi lưu cài đặt:', error.response ? error.response.data : error.message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000); // Ẩn thông báo sau 3 giây
    }
  };

  return (
    <div className="cb-admin-section-container">

      {/* Thông báo trạng thái */}
      {saveStatus === 'success' && (
        <div className="app-alert success" role="alert">
          <span className="app-alert-text">Cài đặt đã được lưu thành công! Vui lòng khởi động lại server để thay đổi API Keys có hiệu lực.</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">Lỗi khi lưu cài đặt. Vui lòng thử lại.</span>
        </div>
      )}
      {saveStatus === 'loading_error' && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">Không thể tải API Keys. Vui lòng kiểm tra kết nối backend.</span>
        </div>
      )}

      <div className="cb-admin-card">
        <h4 className="cb-admin-card-title">Cài đặt chung</h4>
        <form onSubmit={handleSaveSettings}>
         

          {/* Phần API Keys */}
          <div className="cb-admin-settings-form-group">
            <label htmlFor="geminiApiKey" className="cb-admin-settings-label">
              API Key Gemini
            </label>
            <input
              type="text"
              id="geminiApiKey"
              value={settings.geminiApiKey}
              onChange={handleChange}
              className="cb-admin-settings-input"
              placeholder="Nhập API Key Gemini"
            />
          </div>
          <div className="cb-admin-settings-form-group">
            <label htmlFor="stabilityApiKey" className="cb-admin-settings-label">
              API Key Stability AI
            </label>
            <input
              type="text"
              id="stabilityApiKey"
              value={settings.stabilityApiKey}
              onChange={handleChange}
              className="cb-admin-settings-input"
              placeholder="Nhập API Key Stability AI"
            />
          </div>
          <div className="cb-admin-settings-form-group">
            <label htmlFor="segmindApiKey" className="cb-admin-settings-label">
              API Key Segmind
            </label>
            <input
              type="text"
              id="segmindApiKey"
              value={settings.segmindApiKey}
              onChange={handleChange}
              className="cb-admin-settings-input"
              placeholder="Nhập API Key Segmind"
            />
          </div>
          <div className="cb-admin-settings-form-group">
            <label htmlFor="assemblyaiApiKey" className="cb-admin-settings-label">
              API Key AssemblyAI
            </label>
            <input
              type="text"
              id="assemblyaiApiKey"
              value={settings.assemblyaiApiKey}
              onChange={handleChange}
              className="cb-admin-settings-input"
              placeholder="Nhập API Key AssemblyAI"
            />
          </div>

          <div className="cb-admin-settings-save-button-container">
            <button
              type="submit"
              className="cb-admin-settings-save-button"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <InfinityIcon className="app-button-spinner" size={16} /> Đang lưu...
                </>
              ) : (
                <>
                  <SaveIcon size={16} /> Lưu Cài đặt
                </>
              )}
            </button>
          </div>
          <p className="cb-admin-settings-note">
            Lưu ý: Việc thay đổi API Keys sẽ được lưu vào file `.env` của server. Bạn **cần khởi động lại server** để các thay đổi này có hiệu lực hoàn toàn.
          </p>
        </form>
      </div>
    </div>
  );
};

export default SystemSettings;
