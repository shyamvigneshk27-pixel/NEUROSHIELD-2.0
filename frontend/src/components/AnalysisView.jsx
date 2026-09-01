import React, { useState } from 'react';
import UploadSection from './UploadSection';
import SignalViewer from './SignalViewer';
import RiskGauge from './RiskGauge';
import ChatWidget from './ChatWidget';
import { LayoutDashboard, Activity, BarChart3, ShieldAlert, BadgeInfo, AlertTriangle } from 'lucide-react';

const BAND_RANGES = {
    delta: '0.5–4 Hz', theta: '4–8 Hz', alpha: '8–13 Hz', beta: '13–30 Hz', gamma: '30+ Hz',
};
const BAND_COLORS = {
    delta: 'var(--secondary)', theta: 'var(--primary)', alpha: 'var(--accent)',
    beta: 'var(--warning)', gamma: 'var(--danger)',
};

const AnalysisView = ({
    signalData,
    riskScore,
    analysisResult,
    loading,
    uploadError,
    handleCsvUpload,
    token,
}) => {
    const [subTab, setSubTab] = useState('Overview');

    const subTabs = [
        { id: 'Overview', icon: LayoutDashboard },
        { id: 'Signal Graphs', icon: Activity },
        { id: 'Frequency Analysis', icon: BarChart3 },
        { id: 'Risk Assessment', icon: ShieldAlert },
        { id: 'AI Assistant', icon: BadgeInfo },
    ];

    const renderSubTabContent = () => {
        switch (subTab) {
            case 'Overview':
                return (
                    <div className="space-y-6">
                        <div className="card p-6 md:p-8">
                            <h3 className="text-base font-bold mb-5 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(69,123,157,0.10)', color: 'var(--secondary)' }}>1</span>
                                Upload EEG Signal
                            </h3>
                            <UploadSection
                                onUpload={handleCsvUpload}
                                type="csv"
                                label="EEG Signal (CSV)"
                                hint="178-sample raw signal window, wide or long format"
                            />
                        </div>

                        {uploadError && (
                            <div className="card p-4 flex items-start gap-3" style={{ borderColor: 'var(--danger)' }}>
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Analysis failed</p>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{uploadError}</p>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="card p-6 flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--secondary)' }} />
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Processing signal…</span>
                            </div>
                        )}

                        {!loading && analysisResult && (
                            <div className="card p-6 animate-fade-in">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Monitoring Summary</h4>
                                    <span className={`badge ${analysisResult.label === 'Seizure' ? 'badge-danger' : 'badge-success'}`}>
                                        {analysisResult.label || 'Analyzed'}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                    NeuroShield detected a signal pattern consistent with{' '}
                                    <strong>{analysisResult.label === 'Seizure' ? 'elevated seizure-related activity' : 'stable neural activity'}</strong>.
                                    This result is intended to support review by a qualified healthcare professional and is not a medical diagnosis.
                                </p>
                            </div>
                        )}
                    </div>
                );

            case 'Signal Graphs':
                return (
                    <div className="h-[420px]">
                        <SignalViewer data={signalData} loading={loading} />
                    </div>
                );

            case 'Frequency Analysis':
                return (
                    <div className="card p-6 md:p-8 min-h-[400px]">
                        <div className="mb-8">
                            <h4 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Oscillation Band Map</h4>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Spectral power distribution across neural oscillation bands.</p>
                        </div>

                        {analysisResult?.bands ? (
                            <div className="flex items-end justify-between gap-4 md:gap-6 h-56 px-2">
                                {Object.entries(analysisResult.bands).map(([band, value]) => {
                                    const percentage = typeof value === 'number' ? value : 0;
                                    return (
                                        <div key={band} className="flex-1 flex flex-col items-center h-full relative">
                                            <div className="absolute -top-8 left-0 right-0 flex justify-center">
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--surface-muted)', color: 'var(--text-primary)' }}>
                                                    {percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full flex flex-col justify-end h-full">
                                                <div
                                                    className="w-full rounded-t-lg transition-[height] duration-500"
                                                    style={{ height: `${Math.max(8, Math.min(100, percentage))}%`, background: BAND_COLORS[band] || 'var(--secondary)' }}
                                                />
                                            </div>
                                            <div className="mt-3 text-center">
                                                <span className="text-xs font-bold uppercase" style={{ color: 'var(--text-primary)' }}>{band}</span>
                                                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{BAND_RANGES[band]}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-56 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--border)' }}>
                                <Activity className="w-8 h-8" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No spectral data yet</span>
                                <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>Upload an EEG signal to compute oscillation band power.</p>
                            </div>
                        )}
                    </div>
                );

            case 'Risk Assessment':
                return (
                    <div className="card p-6 md:p-10 flex items-center justify-center min-h-[360px]">
                        <div className="w-full max-w-sm">
                            <RiskGauge score={riskScore} />
                        </div>
                    </div>
                );

            case 'AI Assistant':
                return (
                    <div className="card overflow-hidden">
                        <ChatWidget context={analysisResult ? JSON.stringify(analysisResult) : null} token={token} />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-1 p-1 rounded-2xl w-fit" style={{ background: 'var(--surface-muted)' }}>
                {subTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = subTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                            style={isActive
                                ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: '0 1px 2px rgba(29,53,87,0.10)' }
                                : { color: 'var(--text-secondary)' }}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.id}
                        </button>
                    );
                })}
            </div>

            <div key={subTab} className="animate-fade-in">
                {renderSubTabContent()}
            </div>
        </div>
    );
};

export default AnalysisView;
