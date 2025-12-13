import { useApp } from '../context/AppContext';

export function Sidebar({ currentSection, onSectionChange }) {
    const { currentUser, hasPermission } = useApp();
    const role = currentUser?.role;

    const navItems = [
        { id: 'personnel', icon: '👥', text: 'Personel', roles: ['admin', 'manager'] },
        { id: 'timesheet', icon: '📅', text: 'Puantaj', roles: ['admin', 'manager', 'staff'] },
        { id: 'payroll', icon: '💵', text: 'Bordro', roles: ['admin', 'manager'] },
        { id: 'departments', icon: '🏛️', text: 'Birimler', roles: ['admin'] },
        { id: 'reports', icon: '📊', text: 'Raporlar', roles: ['admin', 'manager'] },
        { id: 'users', icon: '👤', text: 'Kullanıcılar', roles: ['admin'] },
        { id: 'settings', icon: '⚙️', text: 'Ayarlar', roles: ['admin'] },
    ];

    return (
        <aside className="sidebar">
            <div className="logo">
                <div className="logo-icon">🏢</div>
                <span className="logo-text">PersonelPro</span>
            </div>
            <nav className="nav-menu">
                {navItems.map(item => {
                    if (!item.roles.includes(role)) return null;
                    return (
                        <a
                            key={item.id}
                            href="#"
                            className={`nav-item ${currentSection === item.id ? 'active' : ''}`}
                            onClick={(e) => { e.preventDefault(); onSectionChange(item.id); }}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-text">{item.text}</span>
                        </a>
                    );
                })}
            </nav>
            <div className="sidebar-footer">
                <div className="version">v2.0.0</div>
            </div>
        </aside>
    );
}
