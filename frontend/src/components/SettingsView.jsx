import React from 'react';
import { ShieldCheck, Lock, Globe, Mail, Info } from 'lucide-react';

const SettingsView = ({ user }) => {
    return (
        <div className="max-w-3xl space-y-6">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Account & Security</h3>

            <div className="card p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Full name</span>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</p>
                    </div>
                    <div>
                        <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><Mail className="w-3 h-3" /> Email</span>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{user?.email}</p>
                    </div>
                    <div>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Role</span>
                        <p className="text-sm font-semibold mt-0.5 capitalize" style={{ color: 'var(--text-primary)' }}>{user?.role}</p>
                    </div>
                    <div>
                        <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><Globe className="w-3 h-3" /> Language</span>
                        <p className="text-sm font-semibold mt-0.5 uppercase" style={{ color: 'var(--text-primary)' }}>{user?.locale || 'en'}</p>
                    </div>
                </div>
            </div>

            <div className="card p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <ShieldCheck className="w-4 h-4" style={{ color: 'var(--secondary)' }} /> Security
                </h4>
                {[
                    { label: 'Password hashing', desc: 'bcrypt, salted per account', status: 'Enabled' },
                    { label: 'Session tokens', desc: 'JWT, expires automatically', status: 'Enabled' },
                    { label: 'Role-based access control', desc: 'Patient / Caregiver / Neurologist / Admin scoping', status: 'Enabled' },
                ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                        <div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{setting.label}</div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{setting.desc}</div>
                        </div>
                        <span className="badge badge-success">{setting.status}</span>
                    </div>
                ))}
            </div>

            <div className="card p-4 flex items-start gap-3">
                <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Notification preferences, two-factor authentication, and multi-channel alert routing (WhatsApp / push) are configured
                    through the n8n care-coordination workflows and will appear here once wired to your account in a follow-up release.
                </p>
            </div>
        </div>
    );
};

export default SettingsView;
