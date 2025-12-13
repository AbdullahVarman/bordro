import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Modal } from '../Modal';

export function TimesheetPage({ initialEmployeeId }) {
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

    // Auto-select employee for staff users or from initialEmployeeId
    useEffect(() => {
        if (initialEmployeeId && !isStaffUser) {
            setSelectedEmployee(initialEmployeeId.toString());
        } else if (isStaffUser && filteredEmployees.length > 0 && !selectedEmployee) {
            setSelectedEmployee(filteredEmployees[0].id.toString());
        }
    }, [isStaffUser, filteredEmployees, selectedEmployee, initialEmployeeId]);

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
    // Monday = 0, Sunday = 6 (adjusted for Monday start)
    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Convert Sunday=0 to 6, Mon=1 to 0, etc.
    };
    const isWeekend = (year, month, day) => {
        const date = new Date(year, month, day);
        return date.getDay() === 0 || date.getDay() === 6;
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: 'TRY', minimumFractionDigits: 2
    }).format(amount);

    // Auto-fill weekends as weekend holiday (paid)
    const autoFillWeekends = () => {
        if (!selectedEmployee) return;
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const newDays = { ...(timesheet?.days || {}) };
        for (let day = 1; day <= daysInMonth; day++) {
            if (isWeekend(currentYear, currentMonth, day)) {
                newDays[day] = 'weekend';
            }
        }
        updateTimesheetDays(newDays);
    };

    // Auto-fill weekdays as worked
    const autoFillWeekdays = () => {
        if (!selectedEmployee) return;
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const newDays = { ...(timesheet?.days || {}) };
        for (let day = 1; day <= daysInMonth; day++) {
            if (!isWeekend(currentYear, currentMonth, day)) {
                newDays[day] = 'worked';
            }
        }
        updateTimesheetDays(newDays);
    };

    // Helper to update timesheet days
    const updateTimesheetDays = (newDays) => {
        const updatedTimesheet = {
            employeeId: parseInt(selectedEmployee),
            year: currentYear,
            month: currentMonth,
            days: newDays
        };
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
    };

    const summary = useMemo(() => {
        let worked = 0, notWorked = 0, paidLeave = 0, unpaidLeave = 0, overtime = 0, sickLeave = 0, weekend = 0, publicHoliday = 0;
        if (timesheet?.days) {
            Object.values(timesheet.days).forEach(status => {
                if (status === 'worked') worked++;
                else if (status === 'notWorked') notWorked++;
                else if (status === 'paidLeave') paidLeave++;
                else if (status === 'unpaidLeave') unpaidLeave++;
                else if (status === 'overtime') overtime++;
                else if (status === 'sickLeave') sickLeave++;
                else if (status === 'weekend') weekend++;
                else if (status === 'publicHoliday') publicHoliday++;
            });
        }
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const dailySalary = employee ? employee.monthlySalary / daysInMonth : 0;
        // Paid days include: worked, overtime, paidLeave, weekend, publicHoliday
        const paidDays = worked + overtime + paidLeave + weekend + publicHoliday;
        const calculatedSalary = paidDays * dailySalary;
        return { worked, notWorked, paidLeave, unpaidLeave, overtime, sickLeave, weekend, publicHoliday, paidDays, calculatedSalary };
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

    // Get tax brackets from settings
    const getTaxBrackets = () => {
        if (settings.taxBrackets) {
            try {
                return typeof settings.taxBrackets === 'string'
                    ? JSON.parse(settings.taxBrackets)
                    : settings.taxBrackets;
            } catch (e) {
                console.error('Tax brackets parse error:', e);
            }
        }
        return [
            { limit: 110000, rate: 0.15 },
            { limit: 230000, rate: 0.20 },
            { limit: 580000, rate: 0.27 },
            { limit: 3000000, rate: 0.35 },
            { limit: null, rate: 0.40 }
        ];
    };

    const calculateProgressiveTax = (incomeTaxBase, previousCumulativeIncome) => {
        const brackets = getTaxBrackets();
        let tax = 0;
        let remainingIncome = incomeTaxBase;
        let currentCumulative = previousCumulativeIncome;

        for (const bracket of brackets) {
            if (remainingIncome <= 0) break;
            const bracketLimit = bracket.limit || Infinity;
            const roomInBracket = Math.max(0, bracketLimit - currentCumulative);
            if (roomInBracket > 0) {
                const taxableInThisBracket = Math.min(remainingIncome, roomInBracket);
                tax += taxableInThisBracket * bracket.rate;
                remainingIncome -= taxableInThisBracket;
                currentCumulative += taxableInThisBracket;
            }
        }
        return tax;
    };

    const getCumulativeIncomeBefore = (employeeId) => {
        let cumulative = 0;
        for (let month = 0; month < currentMonth; month++) {
            const p = payrolls.find(pr =>
                pr.employeeId == employeeId && pr.year === currentYear && pr.month === month
            );
            if (p) {
                cumulative += (p.grossSalary || 0) - (p.sgkEmployee || 0) - (p.unemployment || 0);
            }
        }
        return cumulative;
    };

    const togglePayrollApproval = async () => {
        if (!selectedEmployee || !employee) return;
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const dailySalary = employee.monthlySalary / daysInMonth;
        const workedDays = summary.worked + summary.overtime;
        const grossSalary = workedDays * dailySalary;

        const sgkEmployee = grossSalary * settings.sgkRate;
        const unemployment = grossSalary * settings.unemploymentRate;
        const incomeTaxBase = grossSalary - sgkEmployee - unemployment;

        // Kümülatif ve kademeli vergi hesabı
        const previousCumulative = getCumulativeIncomeBefore(parseInt(selectedEmployee));
        const calculatedIncomeTax = calculateProgressiveTax(incomeTaxBase, previousCumulative);

        // Asgari ücret istisnası
        const minWageSgk = settings.minimumWage * settings.sgkRate;
        const minWageUnemployment = settings.minimumWage * settings.unemploymentRate;
        const minWageIncomeTaxBase = settings.minimumWage - minWageSgk - minWageUnemployment;
        const minWageIncomeTaxExemption = calculateProgressiveTax(minWageIncomeTaxBase, 0);
        const incomeTax = Math.max(0, calculatedIncomeTax - minWageIncomeTaxExemption);

        // Damga Vergisi İstisnası
        const minWageStampTaxExemption = settings.minimumWage * settings.stampTaxRate;
        const calculatedStampTax = grossSalary * settings.stampTaxRate;
        const stampTax = Math.max(0, calculatedStampTax - minWageStampTaxExemption);

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
                        {selectedEmployee && (
                            <div className="quick-fill-buttons">
                                <button className="btn btn-sm btn-secondary" onClick={autoFillWeekends} title="Hafta sonlarını tatil işaretle">
                                    📅 H.Sonu Tatil
                                </button>
                                <button className="btn btn-sm btn-primary" onClick={autoFillWeekdays} title="Hafta içlerini çalıştı işaretle">
                                    ✅ H.İçi Çalıştı
                                </button>
                            </div>
                        )}
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
                <div className="legend-item"><span className="legend-dot paidLeave"></span><span>Ücretli İzin</span></div>
                <div className="legend-item"><span className="legend-dot unpaidLeave"></span><span>Ücretsiz İzin</span></div>
                <div className="legend-item"><span className="legend-dot overtime"></span><span>Mesai</span></div>
                <div className="legend-item"><span className="legend-dot sickLeave"></span><span>Raporlu</span></div>
                <div className="legend-item"><span className="legend-dot weekend"></span><span>H.Sonu Tatili</span></div>
                <div className="legend-item"><span className="legend-dot publicHoliday"></span><span>Resmi Tatil</span></div>
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
                        <button className="status-option paidLeave" onClick={() => setDayStatus('paidLeave')}>
                            <span className="status-icon">🏖️</span>
                            <span>Ücretli İzin</span>
                        </button>
                        <button className="status-option unpaidLeave" onClick={() => setDayStatus('unpaidLeave')}>
                            <span className="status-icon">🚫</span>
                            <span>Ücretsiz İzin</span>
                        </button>
                        <button className="status-option overtime" onClick={() => setDayStatus('overtime')}>
                            <span className="status-icon">⏰</span>
                            <span>Mesai</span>
                        </button>
                        <button className="status-option sickLeave" onClick={() => setDayStatus('sickLeave')}>
                            <span className="status-icon">🏥</span>
                            <span>Raporlu</span>
                        </button>
                        <button className="status-option weekend" onClick={() => setDayStatus('weekend')}>
                            <span className="status-icon">🌙</span>
                            <span>H.Sonu Tatili</span>
                        </button>
                        <button className="status-option publicHoliday" onClick={() => setDayStatus('publicHoliday')}>
                            <span className="status-icon">🎉</span>
                            <span>Resmi Tatil</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
