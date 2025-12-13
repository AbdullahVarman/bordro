import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export function SettingsPage() {
    const { settings, loadAllData, showToast } = useApp();
    const [formData, setFormData] = useState({
        minimumWage: 20002.50,
        sgkRate: 14,
        unemploymentRate: 1,
        stampTaxRate: 0.759
    });

    const [taxBrackets, setTaxBrackets] = useState([
        { limit: 110000, rate: 15 },
        { limit: 230000, rate: 20 },
        { limit: 580000, rate: 27 },
        { limit: 3000000, rate: 35 },
        { limit: null, rate: 40 }
    ]);

    useEffect(() => {
        if (settings) {
            setFormData({
                minimumWage: settings.minimumWage || 20002.50,
                sgkRate: (settings.sgkRate || 0.14) * 100,
                unemploymentRate: (settings.unemploymentRate || 0.01) * 100,
                stampTaxRate: (settings.stampTaxRate || 0.00759) * 100
            });

            if (settings.taxBrackets) {
                try {
                    const brackets = typeof settings.taxBrackets === 'string'
                        ? JSON.parse(settings.taxBrackets)
                        : settings.taxBrackets;
                    setTaxBrackets(brackets.map(b => ({
                        limit: b.limit,
                        rate: b.rate * 100
                    })));
                } catch (e) {
                    console.error('Tax brackets parse error:', e);
                }
            }
        }
    }, [settings]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleBracketChange = (index, field, value) => {
        const newBrackets = [...taxBrackets];
        if (field === 'limit') {
            newBrackets[index].limit = value === '' ? null : parseFloat(value);
        } else {
            newBrackets[index].rate = parseFloat(value) || 0;
        }
        setTaxBrackets(newBrackets);
    };

    const handleSave = async () => {
        try {
            await api.updateSettings({
                minimumWage: formData.minimumWage,
                sgkRate: formData.sgkRate / 100,
                unemploymentRate: formData.unemploymentRate / 100,
                incomeTaxRate: taxBrackets[0].rate / 100, // İlk dilim için geriye uyumluluk
                stampTaxRate: formData.stampTaxRate / 100,
                taxBrackets: JSON.stringify(taxBrackets.map(b => ({
                    limit: b.limit,
                    rate: b.rate / 100
                })))
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
            stampTaxRate: 0.759
        });
        setTaxBrackets([
            { limit: 110000, rate: 15 },
            { limit: 230000, rate: 20 },
            { limit: 580000, rate: 27 },
            { limit: 3000000, rate: 35 },
            { limit: null, rate: 40 }
        ]);
        showToast('2025 varsayılan değerler yüklendi', 'success');
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: 'TRY', minimumFractionDigits: 0
    }).format(amount);

    return (
        <section className="content-section" id="settingsSection">
            <div className="settings-container">
                <div className="settings-card">
                    <h3>💰 Asgari Ücret</h3>
                    <p className="settings-description">Asgari ücret tutarına denk gelen gelir vergisi tüm çalışanlara istisna olarak uygulanır.</p>
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
                    <h3>📊 Gelir Vergisi Dilimleri (2025)</h3>
                    <p className="settings-description">Yıllık kümülatif gelire göre artan oranlı vergi hesaplanır. Bir ay içinde dilim geçişi olursa kademeli hesaplama yapılır.</p>
                    <div className="tax-brackets-table">
                        <div className="tax-bracket-header">
                            <span>Dilim Üst Sınırı (₺)</span>
                            <span>Vergi Oranı (%)</span>
                        </div>
                        {taxBrackets.map((bracket, index) => (
                            <div key={index} className="tax-bracket-row">
                                <div className="bracket-range">
                                    <span className="bracket-from">
                                        {index === 0 ? '0' : formatCurrency(taxBrackets[index - 1].limit)}
                                    </span>
                                    <span className="bracket-to">→</span>
                                    {bracket.limit === null ? (
                                        <span className="bracket-unlimited">Sınırsız</span>
                                    ) : (
                                        <input
                                            type="number"
                                            value={bracket.limit}
                                            onChange={(e) => handleBracketChange(index, 'limit', e.target.value)}
                                            min="0"
                                            step="1000"
                                        />
                                    )}
                                </div>
                                <div className="bracket-rate">
                                    <input
                                        type="number"
                                        value={bracket.rate}
                                        onChange={(e) => handleBracketChange(index, 'rate', e.target.value)}
                                        min="0"
                                        max="100"
                                        step="1"
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="settings-card">
                    <h3>📉 Diğer Kesintiler</h3>
                    <p className="settings-description">SGK ve diğer yasal kesinti oranları.</p>
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
                    <button className="btn btn-secondary" onClick={handleReset}>2025 Varsayılanlara Dön</button>
                    <button className="btn btn-primary" onClick={handleSave}>Ayarları Kaydet</button>
                </div>
            </div>
        </section>
    );
}
