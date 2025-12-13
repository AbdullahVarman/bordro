import { useState } from 'react';
import { useApp } from '../context/AppContext';

export function LoginScreen({ onLogin }) {
    const { login, showToast } = useApp();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            onLogin();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen" id="loginScreen">
            <div className="login-container">
                <div className="login-logo">
                    <div className="login-logo-icon">🏢</div>
                    <h1>PersonelPro</h1>
                    <p>Personel Yönetim Sistemi</p>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="loginUsername">Kullanıcı Adı</label>
                        <div className="input-icon-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                id="loginUsername"
                                placeholder="Kullanıcı adınızı girin"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="loginPassword">Şifre</label>
                        <div className="input-icon-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="loginPassword"
                                placeholder="Şifrenizi girin"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                👁️
                            </button>
                        </div>
                    </div>
                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input type="checkbox" />
                            <span>Beni hatırla</span>
                        </label>
                    </div>
                    <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                    {error && <div className="login-error">{error}</div>}
                </form>
                <div className="login-footer">
                    <p>Varsayılan: admin / admin123</p>
                </div>
            </div>
        </div>
    );
}
