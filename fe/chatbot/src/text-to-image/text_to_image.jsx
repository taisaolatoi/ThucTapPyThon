import React, { useState, useEffect } from 'react';
import './text_to_image.css'; // Import CSS styles for the component
import History from './history' // Assuming 'history' is the ImageHistory component

// Component Chat_image nhận loggedInUserId và activeSessionId,
// và thêm setActiveSessionId để cập nhật ID phiên mới từ backend
const Chat_image = ({ loggedInUserId, activeSessionId, setActiveSessionId }) => {
  // State cho form tạo ảnh
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('design');
  const [engineId, setEngineId] = useState('stable-diffusion-xl-1024-v1-0');
  const [loading, setLoading] = useState(false); // Dùng chung cho cả tạo ảnh và tải mô hình
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);

  // State để hiển thị ảnh và prompt đã tạo gần đây nhất
  const [displayedImageUrl, setDisplayedImageUrl] = useState(null);
  const [displayedPrompt, setDisplayedPrompt] = useState('');

  // Fetch các mô hình AI có sẵn khi component được mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/available-models');
        if (!response.ok) {
          throw new Error('Failed to fetch available models.');
        }
        const data = await response.json();
        setAvailableModels(data);
        // Đặt engineId mặc định nếu có mô hình và giá trị mặc định hiện tại không có trong danh sách
        if (data.length > 0 && !data.some(model => model.id === engineId)) {
          setEngineId(data[0].id);
        }
      } catch (err) {
        console.error("Error fetching models:", err);
        setError("Không thể tải các mô hình AI. Vui lòng kiểm tra máy chủ backend.");
      }
    };
    fetchModels();
  }, []);

  // Hàm handleSubmit để xử lý việc tạo ảnh
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDisplayedImageUrl(null); // Xóa ảnh cũ khi bắt đầu tạo ảnh mới
    setDisplayedPrompt(''); // Xóa prompt cũ

    console.log("ID người dùng:", loggedInUserId);
    // console.log("ID phiên chat hiện tại (trước khi gửi):", activeSessionId); // Removed: session_id is no longer sent for image generation

    // Đảm bảo user_id có sẵn
    if (!loggedInUserId) {
      setError("ID người dùng bị thiếu. Không thể tạo ảnh.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style,
          engine_id: engineId,
          user_id: loggedInUserId,
          // Removed: session_id is no longer sent in the body for image generation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image.');
      }

      const data = await response.json();
      // Cập nhật state để hiển thị ảnh và prompt mới tạo
      setDisplayedImageUrl(data.image_url);
      setDisplayedPrompt(prompt); // Lưu prompt đã dùng để hiển thị
      setPrompt(''); // Xóa prompt trong ô nhập liệu sau khi gửi

      // Removed: Logic để cập nhật activeSessionId từ phản hồi tạo ảnh
      // Vì việc tạo ảnh không còn liên quan đến việc tạo/cập nhật session chat nữa.
      // if (data.session_id && data.session_id !== activeSessionId) {
      //   setActiveSessionId(data.session_id);
      //   console.log("ID phiên chat đã được cập nhật thành:", data.session_id);
      // } else {
      //   console.log("ID phiên chat không thay đổi:", activeSessionId);
      // }

      console.log("Ảnh đã được tạo."); // Simplified log message

    } catch (err) {
      setError(err.message);
      console.error("Error generating image:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="Form_Image">
        {/* Form tạo ảnh */}
        <div className="image-generation-form">
          <h2>Tạo Ảnh Mới</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="prompt">Nhập mô tả ảnh (Tiếng Việt hoặc Tiếng Anh):</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Một cô gái Việt Nam mặc áo dài, phong cảnh đồng quê"
                rows="3"
                required
              ></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="style">Phong cách:</label>
              <select id="style" value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="design">Design</option>
                <option value="realistic">Realistic</option>
                <option value="cartoon">Cartoon</option>
                <option value="abstract">Abstract</option>
                {/* Thêm các phong cách khác nếu cần */}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="engine">Mô hình AI:</label>
              <select id="engine" value={engineId} onChange={(e) => setEngineId(e.target.value)}>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo và gửi ảnh'}
            </button>
          </form>
        </div>

        {error && <p className="error-message">Lỗi: {error}</p>}

        {/* Hiển thị ảnh đã tạo gần đây nhất và prompt */}
        {displayedImageUrl && (
          <div className="image-result">
            <h2>Ảnh đã tạo:</h2>
            <p className="generated-prompt">Prompt: "{displayedPrompt}"</p>
            {/* Sử dụng đường dẫn tương đối hoặc đường dẫn đầy đủ nếu cần proxy */}
            <img src={`http://127.0.0.1:5500/legal-edu-chatbot${displayedImageUrl}`} alt="Generated Content" />
          </div>
        )}
      </div>
      <div className="Form_History">
        {/* Hiển thị lịch sử ảnh đã tạo */}
        {/* activeSessionId vẫn được truyền vào History, nếu History cần nó cho mục đích khác (ví dụ: chat history) */}
        {/* Nếu History chỉ hiển thị ảnh của user, activeSessionId có thể không cần thiết */}
        <History loggedInUserId={loggedInUserId} activeSessionId={activeSessionId} />
      </div>
    </>
  );
}
export default Chat_image;
