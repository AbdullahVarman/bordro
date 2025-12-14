import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const STATUS_ICONS = {
    worked: '✅',
    notWorked: '❌',
    paidLeave: '🏖️',
    unpaidLeave: '🚫',
    overtime: '⏰',
    sickLeave: '🏥',
    weekend: '🌙',
    publicHoliday: '🎉'
};
const ROLE_LABELS = { admin: 'Admin', manager: 'Yönetici', staff: 'Personel' };
const PERMISSIONS = {
    admin: ['all'],
    manager: ['employees', 'departments', 'timesheets', 'payroll', 'reports'],
    staff: ['timesheet_self']
};

export function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [timesheets, setTimesheets] = useState([]);
    const [payrolls, setPayrolls] = useState([]);
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState({
        sgkRate: 0.14,
        unemploymentRate: 0.01,
        incomeTaxRate: 0.15,
        stampTaxRate: 0.00759,
        minimumWage: 20002.50
    });
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    const hasPermission = useCallback((permission) => {
        if (!currentUser) return false;
        const perms = PERMISSIONS[currentUser.role];
        return perms?.includes('all') || perms?.includes(permission);
    }, [currentUser]);

    const loadAllData = useCallback(async (user = null) => {
        const activeUser = user || currentUser;
        try {
            const [emps, depts, sheets, pays, sets] = await Promise.all([
                api.getEmployees(),
                api.getDepartments(),
                api.getTimesheets(),
                api.getPayrolls(),
                api.getSettings()
            ]);
            setEmployees(emps);
            setDepartments(depts);
            setTimesheets(sheets);
            setPayrolls(pays);
            if (sets) setSettings(sets);

            if (activeUser?.role === 'admin') {
                const usrs = await api.getUsers();
                setUsers(usrs);
            }
        } catch (error) {
            console.error('Data load error:', error);
        }
    }, [currentUser]);

    const checkAuth = useCallback(async () => {
        try {
            const { user } = await api.me();
            setCurrentUser(user);
            if (user) await loadAllData(user);
        } catch {
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    }, [loadAllData]);

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (username, password) => {
        const { user } = await api.login(username, password);
        setCurrentUser(user);
        await loadAllData(user);
        return user;
    };

    const logout = async () => {
        await api.logout();
        setCurrentUser(null);
        setEmployees([]);
        setDepartments([]);
        setTimesheets([]);
        setPayrolls([]);
        setUsers([]);
    };

    const value = {
        currentUser,
        employees,
        departments,
        timesheets,
        payrolls,
        users,
        settings,
        loading,
        toasts,
        login,
        logout,
        loadAllData,
        showToast,
        hasPermission,
        setEmployees,
        setDepartments,
        setTimesheets,
        setPayrolls,
        setUsers,
        setSettings,
        MONTHS_TR,
        DAYS_TR,
        STATUS_ICONS,
        ROLE_LABELS,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
