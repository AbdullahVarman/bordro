import { useState } from 'react';
import { useApp } from '../context/AppContext';

export function Header({ title, subtitle, addButtonText, onAddClick }) {
    const { currentUser, logout, ROLE_LABELS } = useApp();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
    };

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'U';

    return (
        <header className="header">
            <div className="header-left">
                <h1 className="page-title">{title}</h1>
                <p className="page-subtitle">{subtitle}</p>
            </div>
            <div className="header-right">
                {addButtonText && (
                    <button className="btn btn-primary" onClick={onAddClick}>
                        <span className="btn-icon">+</span>
                        <span>{addButtonText}</span>
                    </button>
                )}
                <div className="user-menu">
                    <button className="user-menu-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                        <div className="user-avatar">{getInitial(currentUser?.fullName)}</div>
                        <span className="user-name">{currentUser?.fullName || 'Kullanıcı'}</span>
                        <span className="dropdown-arrow">▼</span>
                    </button>
                    {dropdownOpen && (
                        <div className="user-dropdown" style={{ display: 'block' }}>
                            <div className="dropdown-header">
                                <span className="dropdown-role">{ROLE_LABELS[currentUser?.role] || 'Rol'}</span>
                            </div>
                            <a href="#" className="dropdown-item" onClick={(e) => e.preventDefault()}>
                                <span>👤</span> Profilim
                            </a>
                            <a href="#" className="dropdown-item logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                                <span>🚪</span> Çıkış Yap
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
