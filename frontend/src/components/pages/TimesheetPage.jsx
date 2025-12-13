import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Modal } from '../Modal';

export function TimesheetPage() {
    const {
        employees, timesheets, payrolls, settings, currentUser,
        loadAllData, showToast, setTimesheets,
        MONTHS_TR, DAYS_TR, STATUS_ICONS
    } = useApp();

    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [dayModalOpen, setDayModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);

    const isStaffUser = currentUser?.role === 'staff';

    const filteredEmployees = useMemo(() => {
        if (isStaffUser && currentUser?.employeeNumber) {
            return employees.filter(e => e.employeeNumber === currentUser.employeeNumber);
        }
        return employees;
    }, [employees, isStaffUser, currentUser]);

    // Auto-select employee for staff users
    useEffect(() => {
        if (isStaffUser && filteredEmployees.length > 0 && !selectedEmployee) {
            setSelectedEmployee(filteredEmployees[0].id.toString());
        }
    }, [isStaffUser, filteredEmployees, selectedEmployee]);

    const timesheet = useMemo(() => {
        if (!selectedEmployee) return null;
        return timesheets.find(t =>
            t.employeeId == selectedEmployee &&
            t.year === currentYear &&
            t.month === currentMonth
        ) || { employeeId: parseInt(selectedEmployee), year: currentYear, month: currentMonth, days: {} };
    }, [timesheets, selectedEmployee, currentYear, currentMonth]);

    const payroll = useMemo(() => {
        if (!selectedEmployee) return null;
        return payrolls.find(p =>
            p.employeeId == selectedEmployee &&
            p.year === currentYear &&
            p.month === currentMonth
        );
    }, [payrolls, selectedEmployee, currentYear, currentMonth]);

    const employee = employees.find(e => e.id == selectedEmployee);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const isWeekend = (year, month, day) => {
        const date = new Date(year, month, day);
        return date.getDay() === 0 || date.getDay() === 6;
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: 'TRY', minimumFractionDigits: 2
    }).format(amount);

    const summary = useMemo(() => {
        let worked = 0, notWorked = 0, leave = 0, overtime = 0;
        if (timesheet?.days) {
            Object.values(timesheet.days).forEach(status => {
                if (status === 'worked') worked++;
                else if (status === 'notWorked') notWorked++;
                else if (status === 'leave') leave++;
                else if (status === 'overtime') overtime++;
            });
        }
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const dailySalary = employee ? employee.monthlySalary / daysInMonth : 0;
        const workDays = worked + overtime;
        const calculatedSalary = workDays * dailySalary;
        return { worked, notWorked, leave, overtime, calculatedSalary };
    }, [timesheet, employee, currentYear, currentMonth]);

    const changeMonth = (direction) => {
        let newMonth = currentMonth + direction;
        let newYear = currentYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        else if (newMonth > 11) { newMonth = 0; newYear++; }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    const openDayModal = (day) => {
        if (!selectedEmployee || isStaffUser) return;
        setSelectedDay(day);
        setDayModalOpen(true);
    };

    const setDayStatus = (status) => {
        if (!selectedEmployee || !selectedDay) return;
        const updatedTimesheet = { ...timesheet, days: { ...timesheet.days, [selectedDay]: status } };
        const index = timesheets.findIndex(t =>
            t.employeeId == selectedEmployee && t.year === currentYear && t.month === currentMonth
        );
        if (index >= 0) {
            const newTimesheets = [...timesheets];
            newTimesheets[index] = updatedTimesheet;
            setTimesheets(newTimesheets);
        } else {
            setTimesheets([...timesheets, updatedTimesheet]);
        }
        setDayModalOpen(false);
    };

    const clearDayStatus = (day) => {
        if (!selectedEmployee) return;
        const newDays = { ...timesheet.days };
        delete newDays[day];
        const updatedTimesheet = { ...timesheet, days: newDays };
        const index = timesheets.findIndex(t =>
            t.employeeId == selectedEmployee && t.year === currentYear && t.month === currentMonth
        );
        if (index >= 0) {
            const newTimesheets = [...timesheets];
            newTimesheets[index] = updatedTimesheet;
            setTimesheets(newTimesheets);
        }
    };

    const resetTimesheet = () => {
        if (!selectedEmployee) {
            showToast('Lütfen önce bir personel seçin', 'warning');
            return;
        }
        if (confirm('Bu ayın puantajını sıfırlamak istediğinizden emin misiniz?')) {
            const index = timesheets.findIndex(t =>
                t.employeeId == selectedEmployee && t.year === currentYear && t.month === currentMonth
            );
            if (index >= 0) {
                const newTimesheets = [...timesheets];
                newTimesheets[index] = { ...timesheet, days: {} };
                setTimesheets(newTimesheets);
            }
            showToast('Puantaj sıfırlandı', 'success');
        }
    };

    const saveTimesheet = async () => {
        if (!selectedEmployee) {
            showToast('Lütfen önce bir personel seçin', 'warning');
            return;
        }
        try {
            await api.saveTimesheet({
                employeeId: parseInt(selectedEmployee),
                year: currentYear,
                month: currentMonth,
                days: timesheet?.days || {}
            });
            showToast('Puantaj kaydedildi', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const togglePayrollApproval = async () => {
        if (!selectedEmployee || !employee) return;
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const dailySalary = employee.monthlySalary / daysInMonth;
        const workedDays = summary.worked + summary.overtime;
        const grossSalary = workedDays * dailySalary;

        const sgkEmployee = grossSalary * settings.sgkRate;
        const unemployment = grossSalary * settings.unemploymentRate;
        const isExempt = employee.monthlySalary <= settings.minimumWage;
        const incomeTaxBase = grossSalary - sgkEmployee - unemployment;
        const incomeTax = isExempt ? 0 : incomeTaxBase * settings.incomeTaxRate;
        const stampTax = isExempt ? 0 : grossSalary * settings.stampTaxRate;
        const totalDeductions = sgkEmployee + unemployment + incomeTax + stampTax;
        const netSalary = grossSalary - totalDeductions;

        const isApproved = !payroll?.approved;

        try {
            await api.savePayroll({
                employeeId: parseInt(selectedEmployee),
                year: currentYear,
                month: currentMonth,
                workedDays,
                overtimeDays: summary.overtime,
                daysInMonth,
                dailySalary,
                grossSalary,
                sgkEmployee,
                unemployment,
                incomeTax,
                stampTax,
                totalDeductions,
                netSalary,
                approved: isApproved,
                approvedAt: isApproved ? new Date().toISOString() : null,
                approvedBy: isApproved ? currentUser?.id : null
            });
            await loadAllData();
            showToast(isApproved ? 'Bordro onaylandı' : 'Bordro onayı kaldırıldı', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const calendarCells = [];
    for (let i = 0; i < firstDay; i++) {
        calendarCells.push(<div key={`empty-${i}`} className="day-cell empty"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const weekend = isWeekend(currentYear, currentMonth, day);
        const status = timesheet?.days?.[day] || '';
        const statusIcon = STATUS_ICONS[status] || '';
        let classes = 'day-cell';
        if (weekend) classes += ' weekend';
        if (status) classes += ` ${status === 'notWorked' ? 'not-worked' : status}`;
        if (isStaffUser) classes += ' readonly';

        calendarCells.push(
            <div
                key={day}
                className={classes}
                onClick={() => openDayModal(day)}
            >
                {selectedEmployee && status && !isStaffUser && (
                    <button className="day-delete-btn" onClick={(e) => { e.stopPropagation(); clearDayStatus(day); }} title="Sil">×</button>
                )}
                <span className="day-number">{day}</span>
                <span className="day-status-icon">{statusIcon}</span>
            </div>
        );
    }

    return (
        <section className="content-section" id="timesheetSection">
            <div className="timesheet-header">
                {!isStaffUser && (
                    <div className="employee-selector">
                        <label>Personel Seçin:</label>
                        <select
                            className="filter-select"
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                        >
                            <option value="">Personel seçin...</option>
                            {filteredEmployees.map(e => (
                                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                            ))}
                        </select>
                    </div>
                )}
                {isStaffUser && employee && (
                    <div className="staff-welcome">
                        <span className="welcome-text">Hoş geldiniz, {employee.firstName} {employee.lastName}</span>
                    </div>
                )}
                <div className="month-selector">
                    <button className="month-nav" onClick={() => changeMonth(-1)}>◀</button>
                    <span className="current-month">{MONTHS_TR[currentMonth]} {currentYear}</span>
                    <button className="month-nav" onClick={() => changeMonth(1)}>▶</button>
                </div>
            </div>

            <div className="timesheet-legend">
                <div className="legend-item"><span className="legend-dot worked"></span><span>Çalıştı</span></div>
                <div className="legend-item"><span className="legend-dot not-worked"></span><span>Çalışmadı</span></div>
                <div className="legend-item"><span className="legend-dot leave"></span><span>İzinli</span></div>
                <div className="legend-item"><span className="legend-dot overtime"></span><span>Mesai</span></div>
                <div className="legend-item"><span className="legend-dot weekend"></span><span>Hafta Sonu</span></div>
            </div>

            <div className="timesheet-grid">
                {DAYS_TR.map(day => <div key={day} className="day-header">{day}</div>)}
                {calendarCells}
            </div>

            {!isStaffUser && (
                <div className="timesheet-summary" id="timesheetSummary">
                    <div className="summary-card">
                        <span className="summary-label">Çalışılan Gün</span>
                        <span className="summary-value">{summary.worked}</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">İzinli Gün</span>
                        <span className="summary-value">{summary.leave}</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Mesai Gün</span>
                        <span className="summary-value">{summary.overtime}</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Çalışılmayan Gün</span>
                        <span className="summary-value">{summary.notWorked}</span>
                    </div>
                    <div className="summary-card highlight">
                        <span className="summary-label">Hesaplanan Maaş</span>
                        <span className="summary-value">{formatCurrency(summary.calculatedSalary)}</span>
                    </div>
                </div>
            )}

            {isStaffUser && payroll?.approved && (
                <div className="staff-payroll-summary" id="staffPayrollSummary">
                    <h3>💰 Bordro Bilgileri</h3>
                    <div className="payroll-info-grid">
                        <div className="payroll-info-card">
                            <span className="info-label">Brüt Maaş</span>
                            <span className="info-value">{formatCurrency(payroll.grossSalary)}</span>
                        </div>
                        <div className="payroll-info-card deduction">
                            <span className="info-label">SGK Kesintisi</span>
                            <span className="info-value">-{formatCurrency(payroll.sgkEmployee)}</span>
                        </div>
                        <div className="payroll-info-card deduction">
                            <span className="info-label">İşsizlik Sigortası</span>
                            <span className="info-value">-{formatCurrency(payroll.unemployment)}</span>
                        </div>
                        <div className="payroll-info-card deduction">
                            <span className="info-label">Gelir Vergisi</span>
                            <span className="info-value">-{formatCurrency(payroll.incomeTax)}</span>
                        </div>
                        <div className="payroll-info-card deduction">
                            <span className="info-label">Damga Vergisi</span>
                            <span className="info-value">-{formatCurrency(payroll.stampTax)}</span>
                        </div>
                        <div className="payroll-info-card highlight">
                            <span className="info-label">Net Maaş</span>
                            <span className="info-value">{formatCurrency(payroll.netSalary)}</span>
                        </div>
                    </div>
                    <div className="payroll-status-badge approved">✓ Bordro Onaylandı</div>
                </div>
            )}

            {isStaffUser && !payroll?.approved && (
                <div className="payroll-pending">
                    <span className="pending-icon">⏳</span>
                    <span>Bu ayın bordrosu henüz onaylanmadı</span>
                </div>
            )}

            {!isStaffUser && (
                <div className="timesheet-actions">
                    <div className="approval-section">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={payroll?.approved || false}
                                onChange={togglePayrollApproval}
                            />
                            <span>Bu ayın bordrosunu onayla</span>
                        </label>
                    </div>
                    <button className="btn btn-secondary" onClick={resetTimesheet}>Sıfırla</button>
                    <button className="btn btn-primary" onClick={saveTimesheet}>Kaydet</button>
                </div>
            )}

            <Modal isOpen={dayModalOpen} onClose={() => setDayModalOpen(false)} title={`${selectedDay} ${MONTHS_TR[currentMonth]}`} size="modal-small">
                <div className="modal-body">
                    <div className="status-options">
                        <button className="status-option worked" onClick={() => setDayStatus('worked')}>
                            <span className="status-icon">✅</span>
                            <span>Çalıştı</span>
                        </button>
                        <button className="status-option not-worked" onClick={() => setDayStatus('notWorked')}>
                            <span className="status-icon">❌</span>
                            <span>Çalışmadı</span>
                        </button>
                        <button className="status-option leave" onClick={() => setDayStatus('leave')}>
                            <span className="status-icon">🏖️</span>
                            <span>İzinli</span>
                        </button>
                        <button className="status-option overtime" onClick={() => setDayStatus('overtime')}>
                            <span className="status-icon">⏰</span>
                            <span>Mesai</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
