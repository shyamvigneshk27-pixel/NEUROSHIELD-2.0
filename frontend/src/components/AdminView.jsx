import React, { useState } from 'react';
import jsPDF from 'jspdf';
import {
    Users, Shield, Clock, Download, Activity,
    FileText, Image as ImageIcon, BarChart3, Trash2
} from 'lucide-react';

// ── Standalone PDF builder (same logic as ReportSummaryView) ─────────────────
const buildRecordPdf = (record) => {
    const ar = record.prediction;
    const rs = ar?.risk_score;
    const sum = record.aiSummary || '';
    const rid = `NS-HIST-${record.id}`;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const L = 14;
    const R = PW - 14;
    const BM = 18;

    let y = 0;
    let pageNum = 1;

    const bgFill = () => { doc.setFillColor(10, 10, 15); doc.rect(0, 0, PW, PH, 'F'); };
    const drawFooter = () => {
        doc.setFillColor(10, 10, 15);
        doc.rect(0, PH - BM, PW, BM, 'F');
        doc.setDrawColor(40, 40, 55);
        doc.line(0, PH - BM, PW, PH - BM);
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 70, 85);
        doc.text('NeuroShield AI — assistive tool only.', PW / 2, PH - 6, { align: 'center' });
        doc.text(`Page ${pageNum}`, R, PH - 6, { align: 'right' });
    };
    const newPage = () => { drawFooter(); doc.addPage(); pageNum++; bgFill(); y = 18; };
    const checkY = (n = 20) => { if (y + n > PH - BM - 5) newPage(); };
    const txt = (str, x, yt, opts = {}) => {
        const { size = 10, bold = false, color = [200, 200, 200], align = 'left' } = opts;
        doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color); doc.text(String(str ?? ''), x, yt, { align });
    };
    const fill = (x, ry, w, h, c) => { doc.setFillColor(...c); doc.roundedRect(x, ry, w, h, 1.5, 1.5, 'F'); };
    const sec = (label, col = [57, 255, 20]) => {
        checkY(12); txt(label, L, y, { size: 9, bold: true, color: col });
        doc.setDrawColor(...col); doc.line(L, y + 2, R, y + 2); y += 9;
    };

    bgFill();

    // Header
    fill(0, 0, PW, 26, [12, 18, 12]);
    txt('NEUROSHIELD', L, 11, { size: 17, bold: true, color: [57, 255, 20] });
    txt('CLINICAL EEG ANALYSIS REPORT — ADMIN RECORD', L, 18, { size: 7, color: [140, 100, 250] });
    txt(record.timestamp, R, 10, { size: 8, color: [150, 150, 150], align: 'right' });
    txt(`ID: ${rid}`, R, 15, { size: 7, color: [100, 100, 120], align: 'right' });
    txt(`User: ${record.user}  |  Input: ${record.inputType?.toUpperCase()} — ${record.filename}`, R, 20, { size: 7, color: [100, 100, 120], align: 'right' });
    y = 33;

    // Diagnosis
    const isSz = ar?.label === 'Seizure';
    const lblCol = isSz ? [255, 80, 80] : [57, 255, 20];
    fill(L, y, PW - 28, 22, isSz ? [50, 10, 10] : [10, 40, 10]);
    txt('DIAGNOSIS', L + 4, y + 7, { size: 7, color: [150, 150, 150] });
    txt(ar?.label || 'N/A', L + 4, y + 16, { size: 14, bold: true, color: lblCol });
    txt('RISK SCORE', L + 65, y + 7, { size: 7, color: [150, 150, 150] });
    txt(`${rs?.toFixed?.(1) ?? '--'}%`, L + 65, y + 16, { size: 14, bold: true, color: lblCol });
    txt('CONFIDENCE', L + 130, y + 7, { size: 7, color: [150, 150, 150] });
    txt(`${ar?.confidence?.toFixed?.(1) ?? '--'}%`, L + 130, y + 16, { size: 12, bold: true, color: [220, 220, 220] });
    y += 30;

    // Bands
    if (ar?.bands) {
        sec('FREQUENCY BAND ANALYSIS');
        const bands = Object.entries(ar.bands);
        const bw = (PW - 28) / bands.length;
        const bClr = { delta: [57, 255, 20], theta: [96, 165, 250], alpha: [139, 92, 246], beta: [251, 146, 60], gamma: [248, 113, 113] };
        const bmh = 28;
        bands.forEach(([band, val], idx) => {
            const bx = L + idx * (bw + 0.8);
            const pct = Math.max(2, Math.min(100, Number(val) || 0));
            const bh = (pct / 100) * bmh;
            const col = bClr[band] || [100, 100, 200];
            fill(bx, y + bmh - bh, bw - 1, bh, col);
            txt(`${pct.toFixed(1)}%`, bx + (bw - 1) / 2, y + bmh - bh - 2, { size: 6, color: [255, 255, 255], align: 'center' });
            txt(band.toUpperCase(), bx + (bw - 1) / 2, y + bmh + 6, { size: 6, bold: true, color: [180, 180, 180], align: 'center' });
        });
        y += bmh + 14;
    }

    // Stats
    if (ar?.stats) {
        const isSpect = ar?.mode === 'spectrogram';
        sec(isSpect ? 'COMPUTED SPECTRAL FEATURES' : 'COMPUTED SIGNAL PARAMETERS');
        const stats = Object.entries(ar.stats);
        const cols = 3;
        const cw = (PW - 28) / cols;
        const rowH = 17;
        const totalRows = Math.ceil(stats.length / cols);
        checkY(totalRows * rowH + 4);
        stats.forEach(([key, val], idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const cx = L + col * (cw + 0.8);
            const cy = y + row * rowH;
            fill(cx, cy, cw - 1, rowH - 2, [18, 24, 18]);
            txt(key.replace(/_/g, ' ').toUpperCase(), cx + 3, cy + 6, { size: 6, color: [110, 110, 120] });
            txt(typeof val === 'number' ? val.toFixed(4) : String(val), cx + 3, cy + 13, { size: 10, bold: true, color: [220, 220, 220] });
        });
        y += totalRows * rowH + 8;
    }

    // Interpretation
    if (ar?.interpretation) {
        sec('SYSTEM INTERPRETATION');
        checkY(18);
        fill(L, y, PW - 28, 14, [18, 22, 18]);
        const lines = doc.splitTextToSize(ar.interpretation, PW - 36);
        lines.forEach((line, i) => txt(line, L + 4, y + 6 + i * 5, { size: 8, color: [200, 200, 200] }));
        y += Math.max(14, lines.length * 5) + 10;
    }

    // AI Summary page
    if (sum.trim().length > 0) {
        newPage();
        sec('AI CLINICAL SUMMARY (GEMINI)', [140, 100, 250]);
        const clean = sum.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^#{1,3}\s/gm, '');
        clean.split(/\n\n+/).forEach(para => {
            const trimmed = para.trim();
            if (!trimmed) return;
            checkY(10);
            const lines = doc.splitTextToSize(trimmed, PW - 28);
            lines.forEach(line => { checkY(6); txt(line, L, y, { size: 9, color: [200, 200, 200] }); y += 5.5; });
            y += 4;
        });
    }

    drawFooter();
    return doc;
};

// ── Component ─────────────────────────────────────────────────────────────────
const AdminView = ({ sessions = [], analysisHistory = [] }) => {
    const [tab, setTab] = useState('sessions');
    const [expandedId, setExpandedId] = useState(null);

    const adminSessions = sessions.filter(s => s.role === 'admin');
    const displaySessions = adminSessions.length > 0 ? adminSessions : [
        { id: 'sys', user: 'System', role: 'admin', loginTime: new Date().toLocaleString(), status: 'Active', ip: '127.0.0.1' }
    ];

    const totalAnalyses = analysisHistory.length;
    const seizureCount = analysisHistory.filter(r => r.prediction?.label === 'Seizure').length;
    const csvCount = analysisHistory.filter(r => r.inputType === 'csv').length;
    const imgCount = analysisHistory.filter(r => r.inputType === 'image').length;

    const handleDownloadRecord = (record) => {
        try {
            const doc = buildRecordPdf(record);
            doc.save(`NeuroShield_Record_${record.id}.pdf`);
        } catch (e) {
            alert('PDF error: ' + e.message);
        }
    };

    return (
        <div className="space-y-8">
            {/* Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">System Administration</h1>
                    <p className="text-[var(--text-secondary)] uppercase tracking-widest text-[10px] mt-1 font-bold">Privileged Access • Full Audit Log</p>
                </div>
                <div className="card px-6 py-3 flex items-center gap-3 border-[var(--secondary)]/20">
                    <div className="w-2 h-2 bg-[var(--secondary)] rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">System Online</span>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: Activity, label: 'Total Analyses', val: totalAnalyses, col: 'text-[var(--secondary)]', border: 'border-[var(--secondary)]/20', bg: 'bg-[var(--secondary)]/10' },
                    { icon: Shield, label: 'Seizure Detected', val: seizureCount, col: 'text-red-400', border: 'border-red-400/20', bg: 'bg-red-400/10' },
                    { icon: FileText, label: 'CSV Inputs', val: csvCount, col: 'text-blue-400', border: 'border-blue-400/20', bg: 'bg-blue-400/10' },
                    { icon: ImageIcon, label: 'Image Inputs', val: imgCount, col: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/10' },
                ].map(({ icon: Icon, label, val, col, border, bg }) => (
                    <div key={label} className={`card p-5 ${border}`}>
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-5 h-5 ${col}`} /></div>
                            <div className={`text-2xl font-black ${col}`}>{val}</div>
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest">{label}</div>
                    </div>
                ))}
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 p-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl w-fit">
                {[
                    { id: 'sessions', label: 'Login Sessions', icon: Users },
                    { id: 'history', label: 'Analysis History', icon: BarChart3 },
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === id
                            ? 'bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/30'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <Icon className="w-4 h-4" />{label}
                    </button>
                ))}
            </div>

            
                {tab === 'sessions' && (
                    <div key="sessions"
                        className="card overflow-hidden">
                        <div className="px-8 py-5 border-b border-[var(--border)] bg-[var(--surface-muted)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Shield className="w-5 h-5 text-[var(--primary)]" /> Secure User Sessions
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left bg-[var(--surface-muted)]">
                                        {['User', 'Role', 'Login Time', 'IP Address', 'Status'].map(h => (
                                            <th key={h} className="px-8 py-4 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {displaySessions.map(s => (
                                        <tr key={s.id} className="hover:bg-[var(--surface-muted)] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors">
                                                        {s.user[0]}
                                                    </div>
                                                    <span className="font-bold text-[var(--text-primary)]">{s.user}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${s.role === 'admin' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20' : 'bg-gray-500/10 text-[var(--text-secondary)] border border-gray-500/20'}`}>
                                                    {s.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-sm text-[var(--text-secondary)] font-mono">{s.loginTime}</td>
                                            <td className="px-8 py-5 text-sm text-[var(--text-secondary)] font-mono">{s.ip}</td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${s.status === 'Active' ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                                                    {s.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'history' && (
                    <div key="history"
                        className="space-y-3">
                        {analysisHistory.length === 0 ? (
                            <div className="card p-12 text-center">
                                <Activity className="w-12 h-12 text-[var(--secondary)]/20 mx-auto mb-3 animate-pulse" />
                                <p className="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-sm">No analysis records yet</p>
                                <p className="text-[var(--text-secondary)] text-xs mt-1">Records appear here automatically after each upload.</p>
                            </div>
                        ) : (
                            analysisHistory.map(record => {
                                const ar = record.prediction;
                                const isSz = ar?.label === 'Seizure';
                                const isOpen = expandedId === record.id;

                                return (
                                    <div key={record.id} className="card overflow-hidden">
                                        {/* Record header row */}
                                        <div
                                            className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--surface-muted)] transition-colors"
                                            onClick={() => setExpandedId(isOpen ? null : record.id)}
                                        >
                                            <div className={`p-2 rounded-lg ${record.inputType === 'image' ? 'bg-purple-400/10' : 'bg-blue-400/10'}`}>
                                                {record.inputType === 'image'
                                                    ? <ImageIcon className="w-4 h-4 text-purple-400" />
                                                    : <FileText className="w-4 h-4 text-blue-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-black text-[var(--text-primary)] text-sm truncate">{record.filename}</span>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase border ${isSz ? 'text-red-400 border-red-400/30 bg-red-400/10' : 'text-[var(--secondary)] border-[var(--secondary)]/30 bg-[var(--secondary)]/10'}`}>
                                                        {ar?.label}
                                                    </span>
                                                    <span className="text-[9px] text-[var(--text-secondary)] font-mono">{record.timestamp}</span>
                                                    <span className="text-[9px] text-[var(--text-secondary)] uppercase font-bold">{record.user}</span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1 flex-wrap">
                                                    <span className="text-[10px] text-[var(--text-secondary)]">Risk: <span className={`font-black ${isSz ? 'text-red-400' : 'text-[var(--secondary)]'}`}>{ar?.risk_score?.toFixed(1)}%</span></span>
                                                    <span className="text-[10px] text-[var(--text-secondary)]">Mode: <span className="text-[var(--text-primary)] font-bold">{ar?.mode === 'spectrogram' ? 'Image' : 'CSV'}</span></span>
                                                    {record.aiSummary && <span className="text-[9px] text-purple-400 font-bold">✓ AI Summary</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={e => { e.stopPropagation(); handleDownloadRecord(record); }}
                                                className="flex items-center gap-1.5 bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/30 hover:bg-[var(--secondary)] hover:text-black transition-all px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                                            >
                                                <Download className="w-3 h-3" /> PDF
                                            </button>
                                        </div>

                                        {/* Expanded detail panel */}
                                        
                                            {isOpen && (
                                                <div
                                                    className="overflow-hidden border-t border-[var(--border)]"
                                                >
                                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {/* Bands */}
                                                        {ar?.bands && (
                                                            <div>
                                                                <h4 className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-widest mb-3 flex items-center gap-1">
                                                                    <BarChart3 className="w-3 h-3" /> Frequency Bands
                                                                </h4>
                                                                <div className="flex gap-2 items-end h-16">
                                                                    {Object.entries(ar.bands).map(([band, val]) => {
                                                                        const pct = Number(val) || 0;
                                                                        const cs = { delta: 'bg-green-400', theta: 'bg-blue-400', alpha: 'bg-indigo-400', beta: 'bg-orange-400', gamma: 'bg-red-400' };
                                                                        return (
                                                                            <div key={band} className="flex-1 flex flex-col items-center gap-0.5">
                                                                                <span className="text-[8px] text-[var(--text-primary)] font-black">{pct.toFixed(0)}%</span>
                                                                                <div className="w-full bg-[var(--surface-muted)] rounded h-12 flex items-end">
                                                                                    <div className={`w-full ${cs[band] || 'bg-purple-400'} rounded`} style={{ height: `${Math.max(4, pct)}%` }} />
                                                                                </div>
                                                                                <span className="text-[7px] uppercase text-[var(--text-secondary)] font-black">{band}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Stats */}
                                                        {ar?.stats && (
                                                            <div>
                                                                <h4 className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-widest mb-3">Signal / Spectral Parameters</h4>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {Object.entries(ar.stats).map(([key, val]) => (
                                                                        <div key={key} className="bg-[var(--surface-muted)] rounded-lg p-2 border border-[var(--border)]">
                                                                            <span className="text-[7px] text-[var(--text-secondary)] uppercase font-black block">{key.replace(/_/g, ' ')}</span>
                                                                            <span className="text-xs font-black text-[var(--text-primary)]">{typeof val === 'number' ? val.toFixed(4) : val}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* AI Summary */}
                                                        {record.aiSummary && (
                                                            <div className="md:col-span-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-4">
                                                                <h4 className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest mb-2 flex items-center gap-1">
                                                                    <FileText className="w-3 h-3" /> AI Clinical Summary
                                                                </h4>
                                                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                                                                    {record.aiSummary.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^#{1,3}\s/gm, '')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            
        </div>
    );
};

export default AdminView;
