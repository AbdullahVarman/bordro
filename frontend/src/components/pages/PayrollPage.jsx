import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Modal } from '../Modal';

export function PayrollPage() {
    const { employees, timesheets, payrolls, settings, currentUser, loadAllData, showToast, MONTHS_TR } = useApp();
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);

    const formatCurrency = (amount) => new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: 'TRY', minimumFractionDigits: 2
    }).format(amount);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

    const changeMonth = (direction) => {
        let newMonth = currentMonth + direction;
        let newYear = currentYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        else if (newMonth > 11) { newMonth = 0; newYear++; }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    const calculatePayrollForEmployee = (employee) => {
        const timesheet = timesheets.find(t =>
            t.employeeId == employee.id && t.year === currentYear && t.month === currentMonth
        );

        let workedDays = 0, overtimeDays = 0;
        if (timesheet?.days) {
            Object.values(timesheet.days).forEach(status => {
                if (status === 'worked') workedDays++;
                if (status === 'overtime') { workedDays++; overtimeDays++; }
            });
        }

        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const dailySalary = employee.monthlySalary / daysInMonth;
        const grossSalary = workedDays * dailySalary;

        const sgkEmployee = grossSalary * settings.sgkRate;
        const unemployment = grossSalary * settings.unemploymentRate;
        const isExempt = employee.monthlySalary <= settings.minimumWage;
        const incomeTaxBase = grossSalary - sgkEmployee - unemployment;
        const incomeTax = isExempt ? 0 : incomeTaxBase * settings.incomeTaxRate;
        const stampTax = isExempt ? 0 : grossSalary * settings.stampTaxRate;
        const totalDeductions = sgkEmployee + unemployment + incomeTax + stampTax;
        const netSalary = grossSalary - totalDeductions;

        const existingPayroll = payrolls.find(p =>
            p.employeeId == employee.id && p.year === currentYear && p.month === currentMonth
        );

        return {
            employeeId: employee.id,
            employee,
            year: currentYear,
            month: currentMonth,
            workedDays,
            overtimeDays,
            daysInMonth,
            dailySalary,
            grossSalary,
            sgkEmployee,
            unemployment,
            incomeTax,
            stampTax,
            totalDeductions,
            netSalary,
            approved: existingPayroll?.approved || false
        };
    };

    const payrollData = useMemo(() => {
        return employees.map(emp => calculatePayrollForEmployee(emp));
    }, [employees, timesheets, currentYear, currentMonth, settings]);

    const totals = useMemo(() => {
        return payrollData.reduce((acc, p) => ({
            gross: acc.gross + p.grossSalary,
            deductions: acc.deductions + p.totalDeductions,
            net: acc.net + p.netSalary
        }), { gross: 0, deductions: 0, net: 0 });
    }, [payrollData]);

    const generatePayroll = async () => {
        try {
            for (const p of payrollData) {
                await api.savePayroll({
                    employeeId: p.employeeId,
                    year: p.year,
                    month: p.month,
                    workedDays: p.workedDays,
                    overtimeDays: p.overtimeDays,
                    daysInMonth: p.daysInMonth,
                    dailySalary: p.dailySalary,
                    grossSalary: p.grossSalary,
                    sgkEmployee: p.sgkEmployee,
                    unemployment: p.unemployment,
                    incomeTax: p.incomeTax,
                    stampTax: p.stampTax,
                    totalDeductions: p.totalDeductions,
                    netSalary: p.netSalary,
                    approved: p.approved,
                    approvedAt: null,
                    approvedBy: null
                });
            }
            await loadAllData();
            showToast('Bordro oluşturuldu', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const openDetail = (payroll) => {
        setSelectedPayroll(payroll);
        setDetailModalOpen(true);
    };

    const printPayroll = () => {
        window.print();
    };

    return (
        <section className="content-section" id="payrollSection">
            <div className="payroll-header">
                <div className="month-selector">
                    <button className="month-nav" onClick={() => changeMonth(-1)}>◀</button>
                    <span className="current-month">{MONTHS_TR[currentMonth]} {currentYear}</span>
                    <button className="month-nav" onClick={() => changeMonth(1)}>▶</button>
                </div>
                <div className="payroll-actions">
                    <button className="btn btn-secondary" onClick={generatePayroll}>
                        <span>⚙️</span> Bordro Oluştur
                    </button>
                    <button className="btn btn-primary" onClick={printPayroll}>
                        <span>🖨️</span> Yazdır / PDF
                    </button>
                </div>
            </div>

            <div className="payroll-summary-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-info">
                        <span className="stat-value">{employees.length}</span>
                        <span className="stat-label">Personel</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">💰</div>
                    <div className="stat-info">
                        <span className="stat-value">{formatCurrency(totals.gross)}</span>
                        <span className="stat-label">Toplam Brüt</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">📋</div>
                    <div className="stat-info">
                        <span className="stat-value">{formatCurrency(totals.deductions)}</span>
                        <span className="stat-label">Toplam Kesinti</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">💵</div>
                    <div className="stat-info">
                        <span className="stat-value">{formatCurrency(totals.net)}</span>
                        <span className="stat-label">Toplam Net</span>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Personel</th>
                            <th>Çalışılan Gün</th>
                            <th>Brüt Maaş</th>
                            <th>SGK</th>
                            <th>Gelir Vergisi</th>
                            <th>Net Maaş</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrollData.map(p => (
                            <tr key={p.employeeId}>
                                <td>
                                    <div className="employee-cell">
                                        <div className="employee-avatar">
                                            {p.employee.firstName?.charAt(0)}{p.employee.lastName?.charAt(0)}
                                        </div>
                                        <div className="employee-info">
                                            <span className="employee-name">{p.employee.firstName} {p.employee.lastName}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{p.workedDays}</td>
                                <td>{formatCurrency(p.grossSalary)}</td>
                                <td>{formatCurrency(p.sgkEmployee)}</td>
                                <td>{formatCurrency(p.incomeTax)}</td>
                                <td>{formatCurrency(p.netSalary)}</td>
                                <td>
                                    <button className="action-btn" onClick={() => openDetail(p)} title="Detay">📄</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {payrollData.length === 0 && (
                    <div className="empty-state visible">
                        <div className="empty-icon">💵</div>
                        <h3>Bu ay için bordro oluşturulmamış</h3>
                        <p>"Bordro Oluştur" butonuna tıklayarak bordro oluşturabilirsiniz</p>
                    </div>
                )}
            </div>

            <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Bordro Detayı">
                {selectedPayroll && (
                    <div className="modal-body">
                        <div className="payroll-detail">
                            <h3>{selectedPayroll.employee.firstName} {selectedPayroll.employee.lastName}</h3>
                            <p>{MONTHS_TR[selectedPayroll.month]} {selectedPayroll.year}</p>
                            <hr />
                            <div className="detail-row">
                                <span>Çalışılan Gün:</span>
                                <span>{selectedPayroll.workedDays}</span>
                            </div>
                            <div className="detail-row">
                                <span>Brüt Maaş:</span>
                                <span>{formatCurrency(selectedPayroll.grossSalary)}</span>
                            </div>
                            <div className="detail-row deduction">
                                <span>SGK (%{(settings.sgkRate * 100).toFixed(0)}):</span>
                                <span>-{formatCurrency(selectedPayroll.sgkEmployee)}</span>
                            </div>
                            <div className="detail-row deduction">
                                <span>İşsizlik (%{(settings.unemploymentRate * 100).toFixed(0)}):</span>
                                <span>-{formatCurrency(selectedPayroll.unemployment)}</span>
                            </div>
                            <div className="detail-row deduction">
                                <span>Gelir Vergisi:</span>
                                <span>-{formatCurrency(selectedPayroll.incomeTax)}</span>
                            </div>
                            <div className="detail-row deduction">
                                <span>Damga Vergisi:</span>
                                <span>-{formatCurrency(selectedPayroll.stampTax)}</span>
                            </div>
                            <hr />
                            <div className="detail-row total">
                                <span>Net Maaş:</span>
                                <span>{formatCurrency(selectedPayroll.netSalary)}</span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setDetailModalOpen(false)}>Kapat</button>
                    <button className="btn btn-primary" onClick={printPayroll}>🖨️ Yazdır</button>
                </div>
            </Modal>
        </section>
    );
}
