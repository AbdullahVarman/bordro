import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Toast } from './components/Toast';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PersonnelPage } from './components/pages/PersonnelPage';
import { DepartmentsPage } from './components/pages/DepartmentsPage';
import { TimesheetPage } from './components/pages/TimesheetPage';
import { PayrollPage } from './components/pages/PayrollPage';
import { UsersPage } from './components/pages/UsersPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { ReportsPage } from './components/pages/ReportsPage';

function AppContent() {
    const { currentUser, loading, hasPermission } = useApp();
    const role = currentUser?.role;

    // Default section based on role
    const getDefaultSection = () => {
        if (role === 'staff') return 'timesheet';
        return 'personnel';
    };

    const [currentSection, setCurrentSection] = useState('personnel');

    // Set default section when user logs in
    useEffect(() => {
        if (currentUser) {
            setCurrentSection(getDefaultSection());
        }
    }, [currentUser?.id]);

    if (loading) {
        return (
            <div className="login-screen">
                <div className="login-container">
                    <div className="login-logo">
                        <div className="login-logo-icon">🏢</div>
                        <h1>PersonelPro</h1>
                        <p>Yükleniyor...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <LoginScreen onLogin={() => { }} />;
    }

    const sectionConfig = {
        personnel: {
            title: 'Personel Yönetimi',
            subtitle: role === 'manager' ? 'Biriminize ait personel kayıtları' : 'Tüm personel kayıtlarını görüntüleyin ve yönetin',
            addButton: 'Yeni Personel'
        },
        timesheet: {
            title: role === 'staff' ? 'Puantajım' : 'Puantaj',
            subtitle: role === 'staff' ? 'Çalışma günlerinizi görüntüleyin' : 'Personel çalışma günlerini takip edin',
            addButton: null
        },
        departments: {
            title: 'Birimler',
            subtitle: 'Departman ve birimleri yönetin',
            addButton: 'Yeni Birim'
        },
        reports: {
            title: 'Raporlar',
            subtitle: role === 'manager' ? 'Biriminize ait raporlar' : 'Özet ve detaylı raporlar',
            addButton: null
        },
        users: {
            title: 'Kullanıcı Yönetimi',
            subtitle: 'Sistem kullanıcılarını yönetin',
            addButton: 'Yeni Kullanıcı'
        },
        payroll: {
            title: 'Bordro',
            subtitle: role === 'manager' ? 'Biriminize ait maaş bordroları' : 'Aylık maaş bordrosu ve kesintiler',
            addButton: null
        },
        settings: {
            title: 'Ayarlar',
            subtitle: 'Sistem ayarları ve kesinti oranları',
            addButton: null
        }
    };

    const config = sectionConfig[currentSection] || sectionConfig.personnel;

    // Hide add button for managers on personnel (they shouldn't add new employees)
    const showAddButton = role === 'admin' ? config.addButton : null;

    const handleAddClick = () => {
        if (currentSection === 'personnel') {
            window.dispatchEvent(new CustomEvent('openPersonnelModal'));
        } else if (currentSection === 'departments') {
            window.dispatchEvent(new CustomEvent('openDepartmentModal'));
        } else if (currentSection === 'users') {
            window.dispatchEvent(new CustomEvent('openUserModal'));
        }
    };

    const renderSection = () => {
        switch (currentSection) {
            case 'personnel':
                return role !== 'staff' ? <PersonnelPage /> : null;
            case 'departments':
                return role === 'admin' ? <DepartmentsPage /> : null;
            case 'timesheet':
                return <TimesheetPage />;
            case 'payroll':
                return role !== 'staff' ? <PayrollPage /> : null;
            case 'users':
                return role === 'admin' ? <UsersPage /> : null;
            case 'settings':
                return role === 'admin' ? <SettingsPage /> : null;
            case 'reports':
                return role !== 'staff' ? <ReportsPage /> : null;
            default:
                return role === 'staff' ? <TimesheetPage /> : <PersonnelPage />;
        }
    };

    return (
        <div className="app-container" id="appContainer">
            <Sidebar currentSection={currentSection} onSectionChange={setCurrentSection} />
            <main className="main-content">
                <Header
                    title={config.title}
                    subtitle={config.subtitle}
                    addButtonText={showAddButton}
                    onAddClick={handleAddClick}
                />
                {renderSection()}
            </main>
            <Toast />
        </div>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}
