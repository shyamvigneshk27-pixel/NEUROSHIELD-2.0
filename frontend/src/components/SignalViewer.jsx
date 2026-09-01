import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';

const SignalViewer = ({ data, loading }) => {
    const chartData = useMemo(
        () => (data && data.length > 0 ? data.map((val, idx) => ({ time: idx, value: val })) : []),
        [data],
    );

    return (
        <div className="card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Activity className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                    EEG Waveform
                </h3>
                <span className="badge badge-neutral">
                    {loading ? 'Processing…' : data ? '178-sample window' : 'No signal loaded'}
                </span>
            </div>

            <div className="flex-1 min-h-[220px] w-full rounded-xl overflow-hidden relative" style={{ background: 'var(--surface-muted)' }}>
                {!data || data.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6" style={{ color: 'var(--text-secondary)' }}>
                        <Activity className="w-6 h-6 opacity-40" />
                        <p className="text-sm font-medium">Upload an EEG signal to view the waveform</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <XAxis dataKey="time" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Line type="monotone" dataKey="value" stroke="var(--secondary)" strokeWidth={2} dot={false} animationDuration={800} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default SignalViewer;
