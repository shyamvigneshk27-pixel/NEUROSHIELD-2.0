import React, { useEffect, useState } from 'react';
import { User, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { authFetch } from '../api';

const RELATIONSHIP_LABELS = {
    self: 'You',
    caregiver_of: 'You are the caregiver',
    assigned_neurologist: 'Assigned to you',
    admin: 'All patients',
};

const PatientRecordsView = ({ token }) => {
    const [patients, setPatients] = useState(null); // null = loading
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        authFetch('/patients/mine', { token })
            .then((data) => { if (!cancelled) { setPatients(data); setError(''); } })
            .catch((err) => { if (!cancelled) setError(err.message || 'Could not load patient records.'); });
        return () => { cancelled = true; };
    }, [token, reloadKey]);

    const reload = () => {
        setPatients(null);
        setError('');
        setReloadKey((k) => k + 1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Patient Records</h3>
                <button onClick={reload} className="btn btn-secondary text-xs px-3 py-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {error && (
                <div className="card p-6 flex flex-col items-center gap-2 text-center" style={{ borderColor: 'var(--danger)' }}>
                    <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Couldn't load this list</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                    <button onClick={reload} className="btn btn-secondary text-xs mt-2">Retry</button>
                </div>
            )}

            {!error && patients === null && (
                <div className="card p-10 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--secondary)' }} />
                </div>
            )}

            {!error && patients && patients.length === 0 && (
                <div className="card p-10 flex flex-col items-center gap-2 text-center">
                    <Users className="w-8 h-8" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No linked patients yet</p>
                    <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                        Patient-caregiver and patient-neurologist linking is managed by an administrator during onboarding.
                    </p>
                </div>
            )}

            {!error && patients && patients.length > 0 && (
                <div className="card overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[480px]">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Patient</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Email</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Relationship</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.map((p) => (
                                <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(69,123,157,0.10)' }}>
                                                <User className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                                            </div>
                                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{p.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                                    <td className="p-4">
                                        <span className="badge badge-info">{RELATIONSHIP_LABELS[p.relationship] || p.relationship}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PatientRecordsView;
