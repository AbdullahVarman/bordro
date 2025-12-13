import { useState } from 'react';
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
    const [currentSection, setCurrentSection] = useState('personnel');
    const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
    const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
    const [userModalOpen, setUserModalOpen] = useState(false);

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
            subtitle: 'Tüm personel kayıtlarını görüntüleyin ve yönetin',
            addButton: 'Yeni Personel'
        },
        timesheet: {
            title: 'Puantaj',
            subtitle: 'Personel çalışma günlerini takip edin',
            addButton: null
        },
        departments: {
            title: 'Birimler',
            subtitle: 'Departman ve birimleri yönetin',
            addButton: 'Yeni Birim'
        },
        reports: {
            title: 'Raporlar',
            subtitle: 'Özet ve detaylı raporlar',
            addButton: null
        },
        users: {
            title: 'Kullanıcı Yönetimi',
            subtitle: 'Sistem kullanıcılarını yönetin',
            addButton: 'Yeni Kullanıcı'
        },
        payroll: {
            title: 'Bordro',
            subtitle: 'Aylık maaş bordrosu ve kesintiler',
            addButton: null
        },
        settings: {
            title: 'Ayarlar',
            subtitle: 'Sistem ayarları ve kesinti oranları',
            addButton: null
        }
    };

    const config = sectionConfig[currentSection] || sectionConfig.personnel;

    const handleAddClick = () => {
        if (currentSection === 'personnel') {
            // Trigger modal in PersonnelPage
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
                return <PersonnelPage />;
            case 'departments':
                return <DepartmentsPage />;
            case 'timesheet':
                return <TimesheetPage />;
            case 'payroll':
                return <PayrollPage />;
            case 'users':
                return hasPermission('users') ? <UsersPage /> : null;
            case 'settings':
                return hasPermission('users') ? <SettingsPage /> : null;
            case 'reports':
                return <ReportsPage />;
            default:
                return <PersonnelPage />;
        }
    };

    return (
        <div className="app-container" id="appContainer">
            <Sidebar currentSection={currentSection} onSectionChange={setCurrentSection} />
            <main className="main-content">
                <Header
                    title={config.title}
                    subtitle={config.subtitle}
                    addButtonText={config.addButton}
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
