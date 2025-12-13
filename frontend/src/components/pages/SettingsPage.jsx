import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export function SettingsPage() {
    const { settings, loadAllData, showToast } = useApp();
    const [formData, setFormData] = useState({
        minimumWage: 20002.50,
        sgkRate: 14,
        unemploymentRate: 1,
        incomeTaxRate: 15,
        stampTaxRate: 0.759
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                minimumWage: settings.minimumWage || 20002.50,
                sgkRate: (settings.sgkRate || 0.14) * 100,
                unemploymentRate: (settings.unemploymentRate || 0.01) * 100,
                incomeTaxRate: (settings.incomeTaxRate || 0.15) * 100,
                stampTaxRate: (settings.stampTaxRate || 0.00759) * 100
            });
        }
    }, [settings]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleSave = async () => {
        try {
            await api.updateSettings({
                minimumWage: formData.minimumWage,
                sgkRate: formData.sgkRate / 100,
                unemploymentRate: formData.unemploymentRate / 100,
                incomeTaxRate: formData.incomeTaxRate / 100,
                stampTaxRate: formData.stampTaxRate / 100
            });
            await loadAllData();
            showToast('Ayarlar kaydedildi', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleReset = () => {
        setFormData({
            minimumWage: 20002.50,
            sgkRate: 14,
            unemploymentRate: 1,
            incomeTaxRate: 15,
            stampTaxRate: 0.759
        });
        showToast('Varsayılan değerler yüklendi', 'success');
    };

    return (
        <section className="content-section" id="settingsSection">
            <div className="settings-container">
                <div className="settings-card">
                    <h3>💰 Asgari Ücret</h3>
                    <p className="settings-description">Asgari ücret altında maaş alan personelden gelir ve damga vergisi kesilmez.</p>
                    <div className="form-group">
                        <label htmlFor="minimumWage">Brüt Asgari Ücret (₺)</label>
                        <input
                            type="number"
                            id="minimumWage"
                            name="minimumWage"
                            step="0.01"
                            min="0"
                            value={formData.minimumWage}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="settings-card">
                    <h3>📉 Kesinti Oranları</h3>
                    <p className="settings-description">Bordro hesaplamalarında kullanılacak vergi ve kesinti oranları.</p>
                    <div className="settings-grid">
                        <div className="form-group">
                            <label htmlFor="sgkRate">SGK İşçi Payı (%)</label>
                            <input
                                type="number"
                                id="sgkRate"
                                name="sgkRate"
                                step="0.01"
                                min="0"
                                max="100"
                                value={formData.sgkRate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="unemploymentRate">İşsizlik Sigortası (%)</label>
                            <input
                                type="number"
                                id="unemploymentRate"
                                name="unemploymentRate"
                                step="0.01"
                                min="0"
                                max="100"
                                value={formData.unemploymentRate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="incomeTaxRate">Gelir Vergisi (%)</label>
                            <input
                                type="number"
                                id="incomeTaxRate"
                                name="incomeTaxRate"
                                step="0.01"
                                min="0"
                                max="100"
                                value={formData.incomeTaxRate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="stampTaxRate">Damga Vergisi (%)</label>
                            <input
                                type="number"
                                id="stampTaxRate"
                                name="stampTaxRate"
                                step="0.001"
                                min="0"
                                max="100"
                                value={formData.stampTaxRate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="settings-actions">
                    <button className="btn btn-secondary" onClick={handleReset}>Varsayılanlara Dön</button>
                    <button className="btn btn-primary" onClick={handleSave}>Ayarları Kaydet</button>
                </div>
            </div>
        </section>
    );
}
