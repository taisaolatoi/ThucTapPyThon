import React, { useState } from 'react';

const QAModal = ({ qa, onClose, onSave }) => {
  const [question, setQuestion] = useState(qa ? qa.question : '');
  const [answer, setAnswer] = useState(qa ? qa.answer : '');
  const [category, setCategory] = useState(qa ? qa.category : '');
  const [status, setStatus] = useState(qa ? qa.status : 'Active');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: qa ? qa.id : null,
      question,
      answer,
      category,
      status,
    });
  };

  return (
    <div className="cb-admin-modal-overlay">
      <div className="cb-admin-modal-content">
        <h3 className="cb-admin-modal-title">
          {qa ? 'Chỉnh sửa Q&A' : 'Thêm mới Q&A'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="cb-admin-form-group-modal">
            <label htmlFor="question" className="cb-admin-form-label-modal">
              Câu hỏi
            </label>
            <input
              type="text"
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="cb-admin-form-input-modal"
              required
            />
          </div>
          <div className="cb-admin-form-group-modal">
            <label htmlFor="answer" className="cb-admin-form-label-modal">
              Câu trả lời
            </label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows="4"
              className="cb-admin-form-textarea-modal"
              required
            ></textarea>
          </div>
          <div className="cb-admin-form-group-modal">
            <label htmlFor="category" className="cb-admin-form-label-modal">
              Danh mục
            </label>
            <input
              type="text"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="cb-admin-form-input-modal"
            />
          </div>
          <div className="cb-admin-form-group-modal">
            <label htmlFor="status" className="cb-admin-form-label-modal">
              Trạng thái
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="cb-admin-form-select-modal"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="cb-admin-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="cb-admin-modal-button cancel"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cb-admin-modal-button save"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QAModal;
