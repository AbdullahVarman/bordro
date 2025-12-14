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
        // Default 2025 brackets
        return [
            { limit: 110000, rate: 0.15 },
            { limit: 230000, rate: 0.20 },
            { limit: 580000, rate: 0.27 },
            { limit: 3000000, rate: 0.35 },
            { limit: null, rate: 0.40 }
        ];
    };

    // Calculate progressive income tax with bracket transitions
    const calculateProgressiveTax = (incomeTaxBase, previousCumulativeIncome) => {
        const brackets = getTaxBrackets();
        let tax = 0;
        let remainingIncome = incomeTaxBase;
        let currentCumulative = previousCumulativeIncome;

        for (const bracket of brackets) {
            if (remainingIncome <= 0) break;

            const bracketLimit = bracket.limit || Infinity;
            const bracketStart = currentCumulative;

            // How much room is left in this bracket?
            const roomInBracket = Math.max(0, bracketLimit - bracketStart);

            if (roomInBracket > 0) {
                // How much of this month's income falls in this bracket?
                const taxableInThisBracket = Math.min(remainingIncome, roomInBracket);
                tax += taxableInThisBracket * bracket.rate;
                remainingIncome -= taxableInThisBracket;
                currentCumulative += taxableInThisBracket;
            }
        }

        return tax;
    };

    // Get cumulative income for employee up to but not including current month
    const getCumulativeIncomeBefore = (employeeId) => {
        let cumulative = 0;
        for (let month = 0; month < currentMonth; month++) {
            const payroll = payrolls.find(p =>
                p.employeeId == employeeId && p.year === currentYear && p.month === month
            );
            if (payroll) {
                // Cumulative is based on income tax base (gross - sgk - unemployment)
                cumulative += (payroll.grossSalary || 0) - (payroll.sgkEmployee || 0) - (payroll.unemployment || 0);
            }
        }
        return cumulative;
    };

    const calculatePayrollForEmployee = (employee) => {
        const timesheet = timesheets.find(t =>
            t.employeeId == employee.id && t.year === currentYear && t.month === currentMonth
        );

        let workedDays = 0, overtimeDays = 0, paidLeaveDays = 0, weekendDays = 0, publicHolidayDays = 0;
        let weekdayOvertimeHours = 0, weekendOvertimeHours = 0, holidayOvertimeHours = 0;
        if (timesheet?.days) {
            Object.entries(timesheet.days).forEach(([day, dayValue]) => {
                const status = typeof dayValue === 'object' ? dayValue.status : dayValue;
                const hours = typeof dayValue === 'object' ? dayValue.hours : 0;
                const onWeekend = typeof dayValue === 'object' ? dayValue.isWeekend : false;
                const onHoliday = typeof dayValue === 'object' ? dayValue.isHoliday : false;

                if (status === 'worked') workedDays++;
                else if (status === 'overtime') {
                    workedDays++;
                    overtimeDays++;
                    // Priority: holiday > weekend > weekday
                    if (onHoliday) holidayOvertimeHours += hours || 0;
                    else if (onWeekend) weekendOvertimeHours += hours || 0;
                    else weekdayOvertimeHours += hours || 0;
                }
                else if (status === 'paidLeave') paidLeaveDays++;
                else if (status === 'weekend') weekendDays++;
                else if (status === 'publicHoliday') publicHolidayDays++;
            });
        }
        // All paid days at regular 1x rate
        const totalPaidDays = workedDays + paidLeaveDays + weekendDays + publicHolidayDays;

        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const dailySalary = employee.monthlySalary / daysInMonth;
        const hourlyRate = dailySalary / (settings.dailyWorkHours || 8);
        const baseSalary = totalPaidDays * dailySalary;
        // Different multipliers for weekday vs weekend vs holiday overtime
        const weekdayOvertimePay = weekdayOvertimeHours * hourlyRate * (settings.overtimeMultiplier || 1.5);
        const weekendOvertimePay = weekendOvertimeHours * hourlyRate * (settings.weekendMultiplier || 2.0);
        const holidayOvertimePay = holidayOvertimeHours * hourlyRate * (settings.holidayMultiplier || 2.0);
        const overtimePay = weekdayOvertimePay + weekendOvertimePay + holidayOvertimePay;
        const grossSalary = baseSalary + overtimePay;

        const sgkEmployee = grossSalary * settings.sgkRate;
        const unemployment = grossSalary * settings.unemploymentRate;
        const incomeTaxBase = grossSalary - sgkEmployee - unemployment;

        // Kümülatif gelir hesabı
        const previousCumulative = getCumulativeIncomeBefore(employee.id);

        // Kademeli gelir vergisi hesabı
        const calculatedIncomeTax = calculateProgressiveTax(incomeTaxBase, previousCumulative);

        // Asgari ücret istisnası (aylık)
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

        const existingPayroll = payrolls.find(p =>
            p.employeeId == employee.id && p.year === currentYear && p.month === currentMonth
        );

        return {
            id: existingPayroll?.id,
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
            approved: existingPayroll?.approved || false,
            hasPayroll: !!existingPayroll
        };
    };

    const payrollData = useMemo(() => {
        return employees.map(emp => calculatePayrollForEmployee(emp));
    }, [employees, timesheets, payrolls, currentYear, currentMonth, settings]);

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
                if (p.workedDays === 0) continue; // Çalışmayan personel için bordro oluşturma

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

    const deletePayroll = async (payroll) => {
        if (!payroll.id) {
            showToast('Bu personel için bordro henüz oluşturulmamış', 'warning');
            return;
        }
        if (confirm(`${payroll.employee.firstName} ${payroll.employee.lastName} için bordroyu silmek istediğinizden emin misiniz?`)) {
            try {
                await api.deletePayroll(payroll.id);
                await loadAllData();
                showToast('Bordro silindi', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    };

    const openDetail = (payroll) => {
        setSelectedPayroll(payroll);
        setDetailModalOpen(true);
    };

    const printPayroll = () => {
        if (!selectedPayroll) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bordro - ${selectedPayroll.employee.firstName} ${selectedPayroll.employee.lastName}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    h2 { text-align: center; margin-bottom: 5px; }
                    .period { text-align: center; color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
                    .section-header td { background: #f5f5f5; font-weight: bold; border-bottom: 2px solid #ccc; }
                    .value { text-align: right; font-weight: 500; font-family: monospace; }
                    .highlight td { background: #e8f5e9; font-weight: bold; }
                    .deduction td { color: #c00; }
                    .total-deduction td { background: #ffebee; font-weight: bold; color: #c00; border-top: 2px solid #c00; }
                    .net-header td { background: #e3f2fd; }
                    .net td { background: #bbdefb; font-weight: bold; font-size: 1.1em; color: #1565c0; }
                    .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; }
                    .signatures { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    .sig-box { text-align: center; }
                    .sig-box p { margin: 0 0 40px 0; color: #666; }
                    .sig-line { border-top: 1px solid #333; width: 150px; margin: 0 auto; }
                    .date { text-align: right; color: #999; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <h2>BORDRO</h2>
                <p class="period">${MONTHS_TR[selectedPayroll.month]} ${selectedPayroll.year}</p>
                <table>
                    <tr class="section-header"><td colspan="2">👤 Personel Bilgileri</td></tr>
                    <tr><td>Ad Soyad</td><td class="value">${selectedPayroll.employee.firstName} ${selectedPayroll.employee.lastName}</td></tr>
                    <tr><td>Özlük No</td><td class="value">${selectedPayroll.employee.employeeNumber || '-'}</td></tr>
                    <tr><td>Aylık Brüt Maaş</td><td class="value">${formatCurrency(selectedPayroll.employee.monthlySalary)}</td></tr>
                    
                    <tr class="section-header"><td colspan="2">📅 Çalışma Bilgileri</td></tr>
                    <tr><td>Aydaki Gün Sayısı</td><td class="value">${selectedPayroll.daysInMonth}</td></tr>
                    <tr><td>Çalışılan Gün</td><td class="value">${selectedPayroll.workedDays}</td></tr>
                    <tr><td>Mesai Günü</td><td class="value">${selectedPayroll.overtimeDays}</td></tr>
                    <tr><td>Günlük Ücret</td><td class="value">${formatCurrency(selectedPayroll.dailySalary)}</td></tr>
                    
                    <tr class="section-header"><td colspan="2">💰 Kazançlar</td></tr>
                    <tr class="highlight"><td>Brüt Maaş</td><td class="value">${formatCurrency(selectedPayroll.grossSalary)}</td></tr>
                    
                    <tr class="section-header"><td colspan="2">📉 Kesintiler</td></tr>
                    <tr class="deduction"><td>SGK İşçi Payı (%${(settings.sgkRate * 100).toFixed(1)})</td><td class="value">-${formatCurrency(selectedPayroll.sgkEmployee)}</td></tr>
                    <tr class="deduction"><td>İşsizlik Sigortası (%${(settings.unemploymentRate * 100).toFixed(1)})</td><td class="value">-${formatCurrency(selectedPayroll.unemployment)}</td></tr>
                    <tr class="deduction"><td>Gelir Vergisi (İstisna sonrası)</td><td class="value">-${formatCurrency(selectedPayroll.incomeTax)}</td></tr>
                    <tr class="deduction"><td>Damga Vergisi (%${(settings.stampTaxRate * 100).toFixed(3)})</td><td class="value">-${formatCurrency(selectedPayroll.stampTax)}</td></tr>
                    <tr class="total-deduction"><td>Toplam Kesinti</td><td class="value">-${formatCurrency(selectedPayroll.totalDeductions)}</td></tr>
                    
                    <tr class="net-header"><td colspan="2">💵 Net Ödeme</td></tr>
                    <tr class="net"><td>Net Maaş</td><td class="value">${formatCurrency(selectedPayroll.netSalary)}</td></tr>
                </table>
                <div class="footer">
                    <div class="signatures">
                        <div class="sig-box"><p>İşveren İmza</p><div class="sig-line"></div></div>
                        <div class="sig-box"><p>Personel İmza</p><div class="sig-line"></div></div>
                    </div>
                    <p class="date">Düzenleme Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
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
                            <th>Durum</th>
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
                                <td><strong>{formatCurrency(p.netSalary)}</strong></td>
                                <td>
                                    {p.hasPayroll ? (
                                        <span className={`status-badge ${p.approved ? 'active' : 'inactive'}`}>
                                            <span className="status-dot"></span>
                                            {p.approved ? 'Onaylı' : 'Bekliyor'}
                                        </span>
                                    ) : (
                                        <span className="status-badge">
                                            <span className="status-dot"></span>
                                            Oluşturulmadı
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <button className="action-btn" onClick={() => openDetail(p)} title="Detay">📄</button>
                                    {p.hasPayroll && (
                                        <button className="action-btn delete" onClick={() => deletePayroll(p)} title="Sil">🗑️</button>
                                    )}
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
                    <div className="modal-body payroll-print-area" id="payrollPrintArea">
                        <div className="payroll-slip">
                            <div className="slip-header">
                                <h2>BORDRO</h2>
                                <p className="slip-period">{MONTHS_TR[selectedPayroll.month]} {selectedPayroll.year}</p>
                            </div>

                            <table className="payroll-slip-table">
                                <tbody>
                                    <tr className="section-header">
                                        <td colSpan="2">👤 Personel Bilgileri</td>
                                    </tr>
                                    <tr>
                                        <td>Ad Soyad</td>
                                        <td className="value">{selectedPayroll.employee.firstName} {selectedPayroll.employee.lastName}</td>
                                    </tr>
                                    <tr>
                                        <td>Özlük No</td>
                                        <td className="value">{selectedPayroll.employee.employeeNumber || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td>Aylık Brüt Maaş</td>
                                        <td className="value">{formatCurrency(selectedPayroll.employee.monthlySalary)}</td>
                                    </tr>

                                    <tr className="section-header">
                                        <td colSpan="2">📅 Çalışma Bilgileri</td>
                                    </tr>
                                    <tr>
                                        <td>Aydaki Gün Sayısı</td>
                                        <td className="value">{selectedPayroll.daysInMonth}</td>
                                    </tr>
                                    <tr>
                                        <td>Çalışılan Gün</td>
                                        <td className="value">{selectedPayroll.workedDays}</td>
                                    </tr>
                                    <tr>
                                        <td>Mesai Günü</td>
                                        <td className="value">{selectedPayroll.overtimeDays}</td>
                                    </tr>
                                    <tr>
                                        <td>Günlük Ücret</td>
                                        <td className="value">{formatCurrency(selectedPayroll.dailySalary)}</td>
                                    </tr>

                                    <tr className="section-header">
                                        <td colSpan="2">💰 Kazançlar</td>
                                    </tr>
                                    <tr className="highlight-row">
                                        <td>Brüt Maaş</td>
                                        <td className="value">{formatCurrency(selectedPayroll.grossSalary)}</td>
                                    </tr>

                                    <tr className="section-header">
                                        <td colSpan="2">📉 Kesintiler</td>
                                    </tr>
                                    <tr className="deduction-row">
                                        <td>SGK İşçi Payı (%{(settings.sgkRate * 100).toFixed(1)})</td>
                                        <td className="value">-{formatCurrency(selectedPayroll.sgkEmployee)}</td>
                                    </tr>
                                    <tr className="deduction-row">
                                        <td>İşsizlik Sigortası (%{(settings.unemploymentRate * 100).toFixed(1)})</td>
                                        <td className="value">-{formatCurrency(selectedPayroll.unemployment)}</td>
                                    </tr>
                                    <tr className="deduction-row">
                                        <td>Gelir Vergisi (İstisna sonrası)</td>
                                        <td className="value">-{formatCurrency(selectedPayroll.incomeTax)}</td>
                                    </tr>
                                    <tr className="deduction-row">
                                        <td>Damga Vergisi (%{(settings.stampTaxRate * 100).toFixed(3)})</td>
                                        <td className="value">-{formatCurrency(selectedPayroll.stampTax)}</td>
                                    </tr>
                                    <tr className="total-deduction-row">
                                        <td>Toplam Kesinti</td>
                                        <td className="value">-{formatCurrency(selectedPayroll.totalDeductions)}</td>
                                    </tr>

                                    <tr className="section-header net-section">
                                        <td colSpan="2">💵 Net Ödeme</td>
                                    </tr>
                                    <tr className="net-row">
                                        <td>Net Maaş</td>
                                        <td className="value">{formatCurrency(selectedPayroll.netSalary)}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="slip-footer">
                                <div className="signature-area">
                                    <div className="signature-box">
                                        <p>İşveren İmza</p>
                                        <div className="signature-line"></div>
                                    </div>
                                    <div className="signature-box">
                                        <p>Personel İmza</p>
                                        <div className="signature-line"></div>
                                    </div>
                                </div>
                                <p className="print-date">Düzenleme Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
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
