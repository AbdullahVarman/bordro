import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';

export function ReportsPage() {
    const { employees, departments, timesheets, payrolls, settings, currentUser, MONTHS_TR } = useApp();
    const [reportType, setReportType] = useState('summary');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const isManager = currentUser?.role === 'manager';
    const managerDeptId = currentUser?.departmentId;
    const managerDept = isManager ? departments.find(d => d.id == managerDeptId) : null;

    // Filter employees based on manager's department
    const filteredEmployees = useMemo(() => {
        if (isManager && managerDeptId) {
            return employees.filter(e => e.departmentId == managerDeptId);
        }
        return employees;
    }, [employees, isManager, managerDeptId]);

    // Filter departments for manager (only their own)
    const filteredDepartments = useMemo(() => {
        if (isManager && managerDeptId) {
            return departments.filter(d => d.id == managerDeptId);
        }
        return departments;
    }, [departments, isManager, managerDeptId]);

    const formatCurrency = (amount) => new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: 'TRY', minimumFractionDigits: 2
    }).format(amount);

    // Summary statistics
    const summaryStats = useMemo(() => {
        const activeEmployees = filteredEmployees.filter(e => e.status === 'active');
        const totalSalary = filteredEmployees.reduce((sum, e) => sum + (e.monthlySalary || 0), 0);
        const avgSalary = filteredEmployees.length > 0 ? totalSalary / filteredEmployees.length : 0;

        const filteredEmpIds = filteredEmployees.map(e => e.id);
        const monthPayrolls = payrolls.filter(p =>
            p.year === selectedYear && p.month === selectedMonth && filteredEmpIds.includes(p.employeeId)
        );
        const totalGross = monthPayrolls.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
        const totalNet = monthPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
        const totalDeductions = monthPayrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);

        return {
            totalEmployees: filteredEmployees.length,
            activeEmployees: activeEmployees.length,
            inactiveEmployees: filteredEmployees.length - activeEmployees.length,
            totalDepartments: filteredDepartments.length,
            totalSalary,
            avgSalary,
            totalGross,
            totalNet,
            totalDeductions,
            approvedPayrolls: monthPayrolls.filter(p => p.approved).length,
            pendingPayrolls: monthPayrolls.filter(p => !p.approved).length
        };
    }, [filteredEmployees, filteredDepartments, payrolls, selectedYear, selectedMonth]);

    // Department report
    const departmentReport = useMemo(() => {
        return filteredDepartments.map(dept => {
            const deptEmployees = filteredEmployees.filter(e => e.departmentId == dept.id);
            const totalSalary = deptEmployees.reduce((sum, e) => sum + (e.monthlySalary || 0), 0);
            const activeCount = deptEmployees.filter(e => e.status === 'active').length;
            return {
                ...dept,
                employeeCount: deptEmployees.length,
                activeCount,
                totalSalary,
                avgSalary: deptEmployees.length > 0 ? totalSalary / deptEmployees.length : 0
            };
        });
    }, [filteredDepartments, filteredEmployees]);

    // Monthly payroll report
    const payrollReport = useMemo(() => {
        return filteredEmployees.map(emp => {
            const payroll = payrolls.find(p =>
                p.employeeId == emp.id && p.year === selectedYear && p.month === selectedMonth
            );
            const timesheet = timesheets.find(t =>
                t.employeeId == emp.id && t.year === selectedYear && t.month === selectedMonth
            );

            let workedDays = 0;
            if (timesheet?.days) {
                Object.values(timesheet.days).forEach(status => {
                    if (status === 'worked' || status === 'overtime') workedDays++;
                });
            }

            return {
                employee: emp,
                workedDays,
                grossSalary: payroll?.grossSalary || 0,
                netSalary: payroll?.netSalary || 0,
                totalDeductions: payroll?.totalDeductions || 0,
                approved: payroll?.approved || false
            };
        });
    }, [filteredEmployees, payrolls, timesheets, selectedYear, selectedMonth]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <section className="content-section" id="reportsSection">
            {isManager && managerDept && (
                <div className="manager-dept-info">
                    <span className="dept-badge">🏛️ {managerDept.name} Raporları</span>
                </div>
            )}

            <div className="report-controls">
                <div className="report-type-selector">
                    <button
                        className={`report-tab ${reportType === 'summary' ? 'active' : ''}`}
                        onClick={() => setReportType('summary')}
                    >
                        📊 Özet Rapor
                    </button>
                    <button
                        className={`report-tab ${reportType === 'department' ? 'active' : ''}`}
                        onClick={() => setReportType('department')}
                    >
                        🏛️ Birim Raporu
                    </button>
                    <button
                        className={`report-tab ${reportType === 'payroll' ? 'active' : ''}`}
                        onClick={() => setReportType('payroll')}
                    >
                        💵 Bordro Raporu
                    </button>
                </div>
                <div className="report-filters">
                    <select
                        className="filter-select"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {MONTHS_TR.map((month, i) => (
                            <option key={i} value={i}>{month}</option>
                        ))}
                    </select>
                    <select
                        className="filter-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {[2023, 2024, 2025, 2026].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        🖨️ Yazdır
                    </button>
                </div>
            </div>

            {reportType === 'summary' && (
                <div className="report-content">
                    <h3>📊 {isManager ? `${managerDept?.name} - ` : ''}Genel Özet - {MONTHS_TR[selectedMonth]} {selectedYear}</h3>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon blue">👥</div>
                            <div className="stat-info">
                                <span className="stat-value">{summaryStats.totalEmployees}</span>
                                <span className="stat-label">{isManager ? 'Birim Personeli' : 'Toplam Personel'}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon green">✅</div>
                            <div className="stat-info">
                                <span className="stat-value">{summaryStats.activeEmployees}</span>
                                <span className="stat-label">Aktif Personel</span>
                            </div>
                        </div>
                        {!isManager && (
                            <div className="stat-card">
                                <div className="stat-icon purple">🏛️</div>
                                <div className="stat-info">
                                    <span className="stat-value">{summaryStats.totalDepartments}</span>
                                    <span className="stat-label">Birim Sayısı</span>
                                </div>
                            </div>
                        )}
                        <div className="stat-card">
                            <div className="stat-icon orange">💰</div>
                            <div className="stat-info">
                                <span className="stat-value">{formatCurrency(summaryStats.avgSalary)}</span>
                                <span className="stat-label">Ortalama Maaş</span>
                            </div>
                        </div>
                    </div>

                    <div className="report-section">
                        <h4>💵 Aylık Bordro Özeti</h4>
                        <div className="report-table">
                            <div className="report-row">
                                <span>Toplam Brüt Maaş:</span>
                                <strong>{formatCurrency(summaryStats.totalGross)}</strong>
                            </div>
                            <div className="report-row">
                                <span>Toplam Kesinti:</span>
                                <strong className="text-danger">-{formatCurrency(summaryStats.totalDeductions)}</strong>
                            </div>
                            <div className="report-row highlight">
                                <span>Toplam Net Maaş:</span>
                                <strong>{formatCurrency(summaryStats.totalNet)}</strong>
                            </div>
                            <div className="report-row">
                                <span>Onaylanan Bordro:</span>
                                <strong>{summaryStats.approvedPayrolls} / {filteredEmployees.length}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reportType === 'department' && (
                <div className="report-content">
                    <h3>🏛️ {isManager ? `${managerDept?.name} - ` : ''}Birim Raporu</h3>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Birim</th>
                                    <th>Personel Sayısı</th>
                                    <th>Aktif</th>
                                    <th>Toplam Maaş</th>
                                    <th>Ortalama Maaş</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departmentReport.map(dept => (
                                    <tr key={dept.id}>
                                        <td><strong>{dept.name}</strong></td>
                                        <td>{dept.employeeCount}</td>
                                        <td>{dept.activeCount}</td>
                                        <td>{formatCurrency(dept.totalSalary)}</td>
                                        <td>{formatCurrency(dept.avgSalary)}</td>
                                    </tr>
                                ))}
                                {departmentReport.length === 0 && (
                                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>Birim bulunamadı</td></tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td><strong>TOPLAM</strong></td>
                                    <td><strong>{filteredEmployees.length}</strong></td>
                                    <td><strong>{filteredEmployees.filter(e => e.status === 'active').length}</strong></td>
                                    <td><strong>{formatCurrency(summaryStats.totalSalary)}</strong></td>
                                    <td><strong>{formatCurrency(summaryStats.avgSalary)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {reportType === 'payroll' && (
                <div className="report-content">
                    <h3>💵 {isManager ? `${managerDept?.name} - ` : ''}Bordro Raporu - {MONTHS_TR[selectedMonth]} {selectedYear}</h3>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Personel</th>
                                    <th>Çalışılan Gün</th>
                                    <th>Brüt Maaş</th>
                                    <th>Kesinti</th>
                                    <th>Net Maaş</th>
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrollReport.map(row => (
                                    <tr key={row.employee.id}>
                                        <td>
                                            <div className="employee-cell">
                                                <div className="employee-avatar">
                                                    {row.employee.firstName?.charAt(0)}{row.employee.lastName?.charAt(0)}
                                                </div>
                                                <span>{row.employee.firstName} {row.employee.lastName}</span>
                                            </div>
                                        </td>
                                        <td>{row.workedDays}</td>
                                        <td>{formatCurrency(row.grossSalary)}</td>
                                        <td className="text-danger">-{formatCurrency(row.totalDeductions)}</td>
                                        <td><strong>{formatCurrency(row.netSalary)}</strong></td>
                                        <td>
                                            <span className={`status-badge ${row.approved ? 'active' : 'inactive'}`}>
                                                <span className="status-dot"></span>
                                                {row.approved ? 'Onaylı' : 'Bekliyor'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {payrollReport.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Personel bulunamadı</td></tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td><strong>TOPLAM</strong></td>
                                    <td></td>
                                    <td><strong>{formatCurrency(summaryStats.totalGross)}</strong></td>
                                    <td className="text-danger"><strong>-{formatCurrency(summaryStats.totalDeductions)}</strong></td>
                                    <td><strong>{formatCurrency(summaryStats.totalNet)}</strong></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}
