
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Modal } from '../Modal';

export function DepartmentsPage() {
    const { departments, employees, loadAllData, showToast } = useApp();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);

    useEffect(() => {
        const handleOpen = () => { setEditingDept(null); setModalOpen(true); };
        window.addEventListener('openDepartmentModal', handleOpen);
        return () => window.removeEventListener('openDepartmentModal', handleOpen);
    }, []);

    const formatCurrency = (amount) => new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: 'TRY', minimumFractionDigits: 2
    }).format(amount);

    const openModal = (dept = null) => {
        setEditingDept(dept);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingDept(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            name: form.deptName.value.trim(),
            description: form.deptDescription.value.trim()
        };

        try {
            if (editingDept) {
                await api.updateDepartment(editingDept.id, data);
                showToast('Birim güncellendi', 'success');
            } else {
                await api.createDepartment(data);
                showToast('Birim eklendi', 'success');
            }
            await loadAllData();
            closeModal();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        const empCount = employees.filter(e => e.departmentId == id).length;
        if (empCount > 0) {
            showToast('Bu birimde personel bulunuyor, önce personelleri taşıyın', 'error');
            return;
        }

        if (confirm('Bu birimi silmek istediğinizden emin misiniz?')) {
            try {
                await api.deleteDepartment(id);
                await loadAllData();
                showToast('Birim silindi', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    };

    return (
        <section className="content-section" id="departmentsSection">
            <div className="departments-grid">
                {departments.map(dept => {
                    const empCount = employees.filter(e => e.departmentId == dept.id).length;
                    const totalSalary = employees
                        .filter(e => e.departmentId == dept.id)
                        .reduce((sum, e) => sum + (e.monthlySalary || 0), 0);

                    return (
                        <div key={dept.id} className="department-card">
                            <div className="department-header">
                                <div className="department-icon">🏛️</div>
                                <div className="department-actions">
                                    <button className="action-btn" onClick={() => openModal(dept)}>✏️</button>
                                    <button className="action-btn delete" onClick={() => handleDelete(dept.id)}>🗑️</button>
                                </div>
                            </div>
                            <h3 className="department-name">{dept.name}</h3>
                            <p className="department-description">{dept.description || 'Açıklama yok'}</p>
                            <div className="department-stats">
                                <div className="dept-stat">
                                    <span className="dept-stat-value">{empCount}</span>
                                    <span className="dept-stat-label">Personel</span>
                                </div>
                                <div className="dept-stat">
                                    <span className="dept-stat-value">{formatCurrency(totalSalary)}</span>
                                    <span className="dept-stat-label">Toplam Maaş</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {departments.length === 0 && (
                <div className="empty-state visible">
                    <div className="empty-icon">🏛️</div>
                    <h3>Henüz birim eklenmemiş</h3>
                    <p>Yeni birim eklemek için yukarıdaki butona tıklayın</p>
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={closeModal} title={editingDept ? 'Birim Düzenle' : 'Yeni Birim Ekle'} size="modal-small">
                <form className="modal-body" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="deptName">Birim Adı *</label>
                        <input type="text" id="deptName" name="deptName" required defaultValue={editingDept?.name || ''} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="deptDescription">Açıklama</label>
                        <textarea id="deptDescription" name="deptDescription" rows="3" defaultValue={editingDept?.description || ''}></textarea>
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
