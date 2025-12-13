const API_URL = '';

async function request(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers },
            credentials: 'include'
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(text || 'API hatası');
        }

        if (!response.ok) {
            throw new Error(data.error || 'API hatası');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export const api = {
    // Auth
    login: (username, password) => request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout: () => request('/api/logout', { method: 'POST' }),
    me: () => request('/api/me'),

    // Employees
    getEmployees: () => request('/api/employees'),
    createEmployee: (data) => request('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
    updateEmployee: (id, data) => request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEmployee: (id) => request(`/api/employees/${id}`, { method: 'DELETE' }),

    // Departments
    getDepartments: () => request('/api/departments'),
    createDepartment: (data) => request('/api/departments', { method: 'POST', body: JSON.stringify(data) }),
    updateDepartment: (id, data) => request(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDepartment: (id) => request(`/api/departments/${id}`, { method: 'DELETE' }),

    // Timesheets
    getTimesheets: () => request('/api/timesheets'),
    saveTimesheet: (data) => request('/api/timesheets', { method: 'POST', body: JSON.stringify(data) }),

    // Payrolls
    getPayrolls: () => request('/api/payrolls'),
    savePayroll: (data) => request('/api/payrolls', { method: 'POST', body: JSON.stringify(data) }),
    deletePayroll: (id) => request(`/api/payrolls/${id}`, { method: 'DELETE' }),

    // Users
    getUsers: () => request('/api/users'),
    createUser: (data) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),

    // Settings
    getSettings: () => request('/api/settings'),
    updateSettings: (data) => request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
