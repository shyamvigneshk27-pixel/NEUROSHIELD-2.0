import React from 'react';
import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';

const RiskGauge = ({ score }) => {
    const hasScore = typeof score === 'number' && !Number.isNaN(score);
    const normalizedScore = Math.min(Math.max(score || 0, 0), 100);
    const rotation = (normalizedScore / 100) * 180 - 90;

    const getTone = (s) => {
        if (s < 30) return { color: 'var(--success)', bg: 'rgba(47,133,90,0.12)' };
        if (s < 70) return { color: 'var(--warning)', bg: 'rgba(192,132,26,0.14)' };
        return { color: 'var(--danger)', bg: 'rgba(197,48,48,0.12)' };
    };

    const getStatus = (s) => {
        if (s < 20) return 'Stable';
        if (s < 50) return 'Watchful';
        if (s < 80) return 'Elevated';
        return 'High Risk';
    };

    const tone = getTone(normalizedScore);

    if (!hasScore) {
        return (
            <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center h-full">
                <Activity className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No analysis yet</p>
                <p className="text-xs max-w-[220px]" style={{ color: 'var(--text-secondary)' }}>
                    Upload an EEG recording to see the current seizure risk indicator here.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center p-6 w-full">
            <div className="flex items-center gap-2 mb-6 self-start w-full">
                <Activity className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Current Seizure Risk</h3>
            </div>

            <div className="relative w-full max-w-[260px] flex flex-col items-center">
                <div className="relative w-full aspect-[2/1] flex items-center justify-center">
                    <svg viewBox="0 0 200 110" className="w-full h-full">
                        <path d="M 20 100 A 80 80 0 0 1 180 100" stroke="var(--border)" strokeWidth="14" fill="none" strokeLinecap="round" />
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            stroke={tone.color}
                            strokeWidth="14"
                            fill="none"
                            strokeLinecap="round"
                            pathLength="100"
                            strokeDasharray={`${normalizedScore} 100`}
                            style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
                        />
                        <circle cx="100" cy="100" r="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
                        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '100px 100px', transition: 'transform 0.8s ease-out' }}>
                            <line x1="100" y1="100" x2="100" y2="42" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="100" cy="100" r="4" fill="var(--primary)" />
                        </g>
                    </svg>
                </div>

                <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight" style={{ color: tone.color }}>
                        {Math.round(normalizedScore)}
                    </span>
                    <span className="text-lg font-bold" style={{ color: tone.color, opacity: 0.6 }}>%</span>
                </div>
            </div>

            <div className="mt-6 w-full flex items-center justify-between card p-4">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Status</span>
                    <span className="text-sm font-bold" style={{ color: tone.color }}>{getStatus(normalizedScore)}</span>
                </div>
                <div className="p-2.5 rounded-xl" style={{ background: tone.bg, color: tone.color }}>
                    {normalizedScore > 70 ? <AlertTriangle className="w-5 h-5" /> : normalizedScore > 30 ? <Activity className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </div>
            </div>

            <p className="mt-4 text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                This is a detected signal pattern, not a medical diagnosis. Discuss results with a qualified healthcare professional.
            </p>
        </div>
    );
};

export default RiskGauge;
