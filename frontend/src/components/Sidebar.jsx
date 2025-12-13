import { useApp } from '../context/AppContext';

export function Sidebar({ currentSection, onSectionChange }) {
    const { hasPermission } = useApp();

    const navItems = [
        { id: 'personnel', icon: '👥', text: 'Personel' },
        { id: 'timesheet', icon: '📅', text: 'Puantaj' },
        { id: 'payroll', icon: '💵', text: 'Bordro' },
        { id: 'departments', icon: '🏛️', text: 'Birimler' },
        { id: 'reports', icon: '📊', text: 'Raporlar' },
        { id: 'users', icon: '👤', text: 'Kullanıcılar', adminOnly: true },
        { id: 'settings', icon: '⚙️', text: 'Ayarlar', adminOnly: true },
    ];

    return (
        <aside className="sidebar">
            <div className="logo">
                <div className="logo-icon">🏢</div>
                <span className="logo-text">PersonelPro</span>
            </div>
            <nav className="nav-menu">
                {navItems.map(item => {
                    if (item.adminOnly && !hasPermission('users')) return null;
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
