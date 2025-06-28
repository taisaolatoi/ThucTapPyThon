// src/auth/auth.js
import React, { useState } from 'react';
import './auth.css';

const API_BASE_URL = 'http://localhost:3001/api'; // Giữ nguyên URL này để khớp với Backend Blueprint

const AuthPage = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState('login'); // 'login', 'register', 'forgotPassword'
    const [email, setEmail] = useState(''); // Email cho form forgot password, hoặc là username cho login/register
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState(''); // Dùng cho trường username khi đăng ký

    // Thêm các state để quản lý thông báo và trạng thái loading
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Hàm để reset thông báo và trạng thái
    const resetFormStates = () => {
        setMessage('');
        setError('');
        setIsLoading(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        resetFormStates(); // Reset trạng thái trước khi gửi yêu cầu
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: email, password }), // Vẫn gửi 'username' như bạn muốn
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                console.log('User data:', data);
                onLoginSuccess(data.user_id, data.username);
            } else {
                setError(data.error);
            }
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu đăng nhập:', error);
            setError('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        resetFormStates(); // Reset trạng thái trước khi gửi yêu cầu
        setIsLoading(true);

        if (password !== confirmPassword) {
            setError('Mật khẩu và xác nhận mật khẩu không khớp!');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username, email: email, password }), // Gửi cả username và email
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message + ' Vui lòng đăng nhập.');
                resetFormStates(); // Reset tất cả sau khi đăng ký thành công
                setMode('login'); // Chuyển về chế độ đăng nhập
            } else {
                setError(data.error);
            }
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu đăng ký:', error);
            setError('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPasswordSubmit = async (e) => {
        e.preventDefault();
        resetFormStates(); // Reset trạng thái trước khi gửi yêu cầu
        setIsLoading(true);

        if (!email) { // Email ở đây là giá trị từ input 'Tên người dùng / Email' của form forgot password
            setError('Vui lòng nhập tên người dùng hoặc địa chỉ email của bạn.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email }), // Backend sẽ tìm theo email HOẶC username từ giá trị này
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setEmail(''); // Xóa email sau khi gửi thành công
            } else {
                setError(data.error || 'Đã xảy ra lỗi khi yêu cầu đặt lại mật khẩu.');
            }
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu quên mật khẩu:', error);
            setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-card">
                <div className="login-form-section">
                    {mode === 'login' && (
                        <>
                            <h2 className="form-title">Đăng nhập</h2>
                            <form onSubmit={handleLoginSubmit} className="form-container">
                                <div className="form-group">
                                    <label htmlFor="email-login" className="form-label">
                                        Tên người dùng / Email
                                    </label>
                                    <input
                                        type="text" // Giữ nguyên type="text"
                                        id="email-login"
                                        name="email"
                                        className="form-input"
                                        placeholder="Nhập tên người dùng hoặc email của bạn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="password-login" className="form-label">
                                        Mật khẩu
                                    </label>
                                    <input
                                        type="password"
                                        id="password-login"
                                        name="password"
                                        className="form-input"
                                        placeholder="Nhập mật khẩu của bạn"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-options">
                                    <div className="remember-me">
                                        <input
                                            id="remember-me"
                                            name="remember-me"
                                            type="checkbox"
                                            className="checkbox-input"
                                        />
                                        <label htmlFor="remember-me" className="checkbox-label">
                                            Ghi nhớ đăng nhập
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode('forgotPassword');
                                            resetFormStates(); // Reset trạng thái khi chuyển mode
                                        }}
                                        className="forgot-password-link"
                                        disabled={isLoading}
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                {message && <p className="success-message">{message}</p>}
                                {error && <p className="error-message">{error}</p>}
                                <div>
                                    <button type="submit" className="submit-button" disabled={isLoading}>
                                        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                                    </button>
                                </div>
                            </form>
                            <div className="signup-link">
                                Chưa có tài khoản?{' '}
                                <button type="button" onClick={() => {
                                    setMode('register');
                                    resetFormStates(); // Reset trạng thái khi chuyển mode
                                }} className="link-text" disabled={isLoading}>
                                    Đăng ký
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'register' && (
                        <>
                            <h2 className="form-title">Đăng ký tài khoản mới</h2>
                            <form onSubmit={handleRegisterSubmit} className="form-container">
                                <div className="form-group">
                                    <label htmlFor="username-register" className="form-label">
                                        Tên người dùng
                                    </label>
                                    <input
                                        type="text"
                                        id="username-register"
                                        name="username"
                                        className="form-input"
                                        placeholder="Nhập tên người dùng của bạn"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email-register" className="form-label">
                                        Email (Không bắt buộc)
                                    </label>
                                    <input
                                        type="email"
                                        id="email-register"
                                        name="email"
                                        className="form-input"
                                        placeholder="example@email.com (Không bắt buộc)"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="password-register" className="form-label">
                                        Mật khẩu
                                    </label>
                                    <input
                                        type="password"
                                        id="password-register"
                                        name="password"
                                        className="form-input"
                                        placeholder="Nhập mật khẩu"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="confirm-password-register" className="form-label">
                                        Xác nhận mật khẩu
                                    </label>
                                    <input
                                        type="password"
                                        id="confirm-password-register"
                                        name="confirmPassword"
                                        className="form-input"
                                        placeholder="Nhập lại mật khẩu"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                {message && <p className="success-message">{message}</p>}
                                {error && <p className="error-message">{error}</p>}
                                <div>
                                    <button type="submit" className="submit-button" disabled={isLoading}>
                                        {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
                                    </button>
                                </div>
                                <div className="back-to-login">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode('login');
                                            resetFormStates(); // Reset trạng thái khi chuyển mode
                                        }}
                                        className="link-text"
                                        disabled={isLoading}
                                    >
                                        Đã có tài khoản? Quay lại Đăng nhập
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {mode === 'forgotPassword' && (
                        <>
                            <h2 className="form-title">Quên mật khẩu?</h2>
                            <p className="form-description">
                                Vui lòng nhập tên người dùng hoặc email của bạn để nhận mật khẩu mới.
                            </p>
                            <form onSubmit={handleForgotPasswordSubmit} className="form-container">
                                <div className="form-group">
                                    <label htmlFor="email-forgot" className="form-label">
                                        Tên người dùng / Email
                                    </label>
                                    <input
                                        type="text" // Giữ nguyên type="text"
                                        id="email-forgot"
                                        name="email"
                                        className="form-input"
                                        placeholder="Nhập tên người dùng hoặc email của bạn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                {message && <p className="success-message">{message}</p>}
                                {error && <p className="error-message">{error}</p>}
                                <div>
                                    <button type="submit" className="submit-button" disabled={isLoading}>
                                        {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                                    </button>
                                </div>
                                <div className="back-to-login">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode('login');
                                            resetFormStates(); // Reset trạng thái khi chuyển mode
                                        }}
                                        className="link-text"
                                        disabled={isLoading}
                                    >
                                        Quay lại Đăng nhập
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                <div className="login-graphic-section">
                    <div className="graphic-content">
                        <h2 className="graphic-title">
                            {mode === 'login' && 'Đăng nhập'}
                            {mode === 'register' && 'Đăng ký'}
                            {mode === 'forgotPassword' && 'Khôi phục mật khẩu'}
                        </h2>
                        <p className="graphic-subtitle">
                            {mode === 'login' && 'Chào mừng trở lại.'}
                            {mode === 'register' && 'Tạo tài khoản mới của bạn.'}
                            {mode === 'forgotPassword' && 'Chúng tôi sẽ giúp bạn.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;