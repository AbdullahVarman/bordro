import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Modal } from '../Modal';

export function PersonnelPage() {
    const { employees, departments, loadAllData, showToast } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);

    useEffect(() => {
        const handleOpen = () => { setEditingEmployee(null); setModalOpen(true); };
        window.addEventListener('openPersonnelModal', handleOpen);
        return () => window.removeEventListener('openPersonnelModal', handleOpen);
    }, []);

    const formatCurrency = (amount) => new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: 'TRY', minimumFractionDigits: 2
    }).format(amount);

    const getInitials = (firstName, lastName) =>
        (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '').toUpperCase();

    const calculateDailySalary = (monthly) => (monthly / 30).toFixed(2);

    const filteredEmployees = employees.filter(emp => {
        const matchSearch = (emp.firstName + ' ' + emp.lastName).toLowerCase().includes(searchTerm.toLowerCase());
        const matchDept = !deptFilter || emp.departmentId == deptFilter;
        const matchStatus = !statusFilter || emp.status === statusFilter;
        return matchSearch && matchDept && matchStatus;
    });

    const totalSalary = employees.reduce((sum, e) => sum + (e.monthlySalary || 0), 0);
    const activeCount = employees.filter(e => e.status === 'active').length;

    const openModal = (employee = null) => {
        setEditingEmployee(employee);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingEmployee(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            firstName: form.firstName.value.trim(),
            lastName: form.lastName.value.trim(),
            employeeNumber: form.employeeNumber.value.trim(),
            tcNo: form.tcNo.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim(),
            address: form.address.value.trim(),
            departmentId: form.department.value || null,
            startDate: form.startDate.value,
            monthlySalary: parseFloat(form.monthlySalary.value) || 0,
            status: form.status.value
        };

        try {
            if (editingEmployee) {
                await api.updateEmployee(editingEmployee.id, data);
                showToast('Personel güncellendi', 'success');
            } else {
                await api.createEmployee(data);
                showToast('Personel eklendi', 'success');
            }
            await loadAllData();
            closeModal();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
            try {
                await api.deleteEmployee(id);
                await loadAllData();
                showToast('Personel silindi', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    };

    return (
        <section className="content-section" id="personnelSection">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-info">
                        <span className="stat-value">{employees.length}</span>
                        <span className="stat-label">Toplam Personel</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-info">
                        <span className="stat-value">{activeCount}</span>
                        <span className="stat-label">Aktif Personel</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">🏛️</div>
                    <div className="stat-info">
                        <span className="stat-value">{departments.length}</span>
                        <span className="stat-label">Birim Sayısı</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">💰</div>
                    <div className="stat-info">
                        <span className="stat-value">{formatCurrency(totalSalary)}</span>
                        <span className="stat-label">Toplam Maaş</span>
                    </div>
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Personel ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <select className="filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                        <option value="">Tüm Birimler</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Personel</th>
                            <th>Özlük No</th>
                            <th>Birim</th>
                            <th>Maaş (Aylık)</th>
                            <th>Durum</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map(emp => {
                            const dept = departments.find(d => d.id == emp.departmentId);
                            return (
                                <tr key={emp.id}>
                                    <td>
                                        <div className="employee-cell">
                                            <div className="employee-avatar">{getInitials(emp.firstName, emp.lastName)}</div>
                                            <div className="employee-info">
                                                <span className="employee-name">{emp.firstName} {emp.lastName}</span>
                                                <span className="employee-email">{emp.email || '-'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{emp.employeeNumber || '-'}</td>
                                    <td>{dept?.name || '-'}</td>
                                    <td>{formatCurrency(emp.monthlySalary)}</td>
                                    <td>
                                        <span className={`status-badge ${emp.status}`}>
                                            <span className="status-dot"></span>
                                            {emp.status === 'active' ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="action-btn" onClick={() => openModal(emp)} title="Düzenle">✏️</button>
                                        <button className="action-btn delete" onClick={() => handleDelete(emp.id)} title="Sil">🗑️</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredEmployees.length === 0 && (
                    <div className="empty-state visible">
                        <div className="empty-icon">📋</div>
                        <h3>Henüz personel eklenmemiş</h3>
                        <p>Yeni personel eklemek için yukarıdaki butona tıklayın</p>
                    </div>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={closeModal} title={editingEmployee ? 'Personel Düzenle' : 'Yeni Personel Ekle'}>
                <form className="modal-body" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="firstName">Ad *</label>
                            <input type="text" id="firstName" name="firstName" required defaultValue={editingEmployee?.firstName || ''} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lastName">Soyad *</label>
                            <input type="text" id="lastName" name="lastName" required defaultValue={editingEmployee?.lastName || ''} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="employeeNumber">Özlük Numarası *</label>
                            <input type="text" id="employeeNumber" name="employeeNumber" required placeholder="Örn: P001" defaultValue={editingEmployee?.employeeNumber || ''} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="tcNo">TC Kimlik No</label>
                            <input type="text" id="tcNo" name="tcNo" maxLength="11" pattern="[0-9]{11}" defaultValue={editingEmployee?.tcNo || ''} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="phone">Telefon</label>
                            <input type="tel" id="phone" name="phone" defaultValue={editingEmployee?.phone || ''} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">E-posta</label>
                        <input type="email" id="email" name="email" defaultValue={editingEmployee?.email || ''} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="address">Adres</label>
                        <textarea id="address" name="address" rows="2" defaultValue={editingEmployee?.address || ''}></textarea>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="department">Birim</label>
                            <select id="department" name="department" defaultValue={editingEmployee?.departmentId || ''}>
                                <option value="">Birim seçin...</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="startDate">İşe Giriş Tarihi</label>
                            <input type="date" id="startDate" name="startDate" defaultValue={editingEmployee?.startDate || ''} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="monthlySalary">Aylık Maaş (₺) *</label>
                            <input type="number" id="monthlySalary" name="monthlySalary" min="0" step="0.01" required defaultValue={editingEmployee?.monthlySalary || ''} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="dailySalary">Günlük Maaş (₺)</label>
                            <input type="number" id="dailySalary" name="dailySalary" readOnly value={editingEmployee ? calculateDailySalary(editingEmployee.monthlySalary) : ''} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="status">Durum</label>
                        <select id="status" name="status" defaultValue={editingEmployee?.status || 'active'}>
                            <option value="active">Aktif</option>
                            <option value="inactive">Pasif</option>
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>İptal</button>
                        <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}

export function openEmployeeModalFromParent(setModalOpen) {
    setModalOpen(true);
}
