import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export function Header({ title, subtitle, addButtonText, onAddClick }) {
    const { currentUser, logout, ROLE_LABELS } = useApp();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setDropdownOpen(false);
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
                <div className="user-menu" ref={dropdownRef}>
                    <button className="user-menu-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                        <div className="user-avatar">{getInitial(currentUser?.fullName)}</div>
                        <span className="user-name">{currentUser?.fullName || 'Kullanıcı'}</span>
                        <span className="dropdown-arrow">{dropdownOpen ? '▲' : '▼'}</span>
                    </button>
                    <div className={`user-dropdown ${dropdownOpen ? 'show' : ''}`}>
                        <div className="dropdown-header">
                            <span className="dropdown-role">{ROLE_LABELS[currentUser?.role] || 'Rol'}</span>
                        </div>
                        <button className="dropdown-item logout" onClick={handleLogout}>
                            <span>🚪</span> Çıkış Yap
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
