
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Modal } from '../Modal';

export function UsersPage() {
    const { users, departments, loadAllData, showToast, ROLE_LABELS } = useApp();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState('staff');

    useEffect(() => {
        const handleOpen = () => { setEditingUser(null); setSelectedRole('staff'); setModalOpen(true); };
        window.addEventListener('openUserModal', handleOpen);
        return () => window.removeEventListener('openUserModal', handleOpen);
    }, []);

    const openModal = (user = null) => {
        setEditingUser(user);
        setSelectedRole(user?.role || 'staff');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingUser(null);
        setSelectedRole('staff');
    };

    const handleRoleChange = (e) => {
        setSelectedRole(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const role = form.userRole.value;
        const employeeNumber = form.userEmployeeNumber?.value?.trim() || null;
        const departmentId = form.userDepartmentId?.value ? parseInt(form.userDepartmentId.value) : null;

        if (role === 'staff' && !employeeNumber) {
            showToast('Personel rolü için özlük numarası zorunludur', 'error');
            return;
        }

        if (role === 'manager' && !departmentId) {
            showToast('Yönetici rolü için sorumlu birim seçilmelidir', 'error');
            return;
        }

        const data = {
            username: form.userUsername.value.trim(),
            password: form.userPassword.value || undefined,
            fullName: form.userFullName.value.trim(),
            role,
            employeeNumber: role === 'staff' ? employeeNumber : null,
            departmentId: role === 'manager' ? departmentId : null
        };

        if (!editingUser && !data.password) {
            showToast('Yeni kullanıcı için şifre zorunludur', 'error');
            return;
        }

        try {
            if (editingUser) {
                await api.updateUser(editingUser.id, data);
                showToast('Kullanıcı güncellendi', 'success');
            } else {
                await api.createUser(data);
                showToast('Kullanıcı eklendi', 'success');
            }
            await loadAllData();
            closeModal();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
            try {
                await api.deleteUser(id);
                await loadAllData();
                showToast('Kullanıcı silindi', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('tr-TR');
    };

    const getDepartmentName = (deptId) => {
        const dept = departments.find(d => d.id == deptId);
        return dept?.name || '-';
    };

    return (
        <section className="content-section" id="usersSection">
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Kullanıcı</th>
                            <th>Kullanıcı Adı</th>
                            <th>Rol</th>
                            <th>Sorumlu Birim</th>
                            <th>Son Giriş</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="employee-cell">
                                        <div className="employee-avatar">{user.fullName?.charAt(0) || 'U'}</div>
                                        <div className="employee-info">
                                            <span className="employee-name">{user.fullName}</span>
                                            {user.employeeNumber && (
                                                <span className="employee-email">Özlük: {user.employeeNumber}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>{user.username}</td>
                                <td>
                                    <span className={`status-badge ${user.role}`}>
                                        {ROLE_LABELS[user.role] || user.role}
                                    </span>
                                </td>
                                <td>{user.role === 'manager' ? getDepartmentName(user.departmentId) : '-'}</td>
                                <td>{formatDate(user.lastLogin)}</td>
                                <td>
                                    <button className="action-btn" onClick={() => openModal(user)} title="Düzenle">✏️</button>
                                    <button className="action-btn delete" onClick={() => handleDelete(user.id)} title="Sil">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={modalOpen} onClose={closeModal} title={editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'} size="modal-small">
                <form className="modal-body" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="userFullName">Ad Soyad *</label>
                        <input type="text" id="userFullName" name="userFullName" required defaultValue={editingUser?.fullName || ''} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="userUsername">Kullanıcı Adı *</label>
                        <input type="text" id="userUsername" name="userUsername" required defaultValue={editingUser?.username || ''} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="userPassword">Şifre {editingUser ? '' : '*'}</label>
                        <input type="password" id="userPassword" name="userPassword" />
                        <small className="form-hint">Düzenlemede boş bırakılırsa değişmez</small>
                    </div>
                    <div className="form-group">
                        <label htmlFor="userRole">Rol *</label>
                        <select
                            id="userRole"
                            name="userRole"
                            required
                            value={selectedRole}
                            onChange={handleRoleChange}
                        >
                            <option value="admin">Admin</option>
                            <option value="manager">Yönetici</option>
                            <option value="staff">Personel</option>
                        </select>
                    </div>

                    {selectedRole === 'manager' && (
                        <div className="form-group">
                            <label htmlFor="userDepartmentId">Sorumlu Birim *</label>
                            <select
                                id="userDepartmentId"
                                name="userDepartmentId"
                                required
                                defaultValue={editingUser?.departmentId || ''}
                            >
                                <option value="">Birim seçin...</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <small className="form-hint">Yönetici sadece bu birimdeki personelleri görebilir</small>
                        </div>
                    )}

                    {selectedRole === 'staff' && (
                        <div className="form-group">
                            <label htmlFor="userEmployeeNumber">Özlük Numarası *</label>
                            <input type="text" id="userEmployeeNumber" name="userEmployeeNumber" placeholder="Örn: P001" defaultValue={editingUser?.employeeNumber || ''} />
                            <small className="form-hint">Personel rolü için zorunlu, personel tanımlarındaki özlük numarası ile eşleşmeli</small>
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>İptal</button>
                        <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
