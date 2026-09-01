import React from 'react';
import { ShieldCheck, User, Globe, Mail, Info, CheckCircle2 } from 'lucide-react';

const SettingsView = ({ user }) => {
    return (
        <div className="max-w-3xl space-y-6 animate-fade-in-up">
            <h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Account & Security</h3>

            <div className="card card-interactive p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <User className="w-3.5 h-3.5" style={{ color: 'var(--secondary)' }} /> Profile Information
                    </h4>
                    <span className="badge badge-info capitalize">{user?.role}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                    <div className="p-3 rounded-xl transition-colors hover:bg-slate-50/70">
                        <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--text-secondary)' }}>Full name</span>
                        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</p>
                    </div>
                    <div className="p-3 rounded-xl transition-colors hover:bg-slate-50/70">
                        <span className="text-[11px] font-semibold tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                            <Mail className="w-3 h-3" /> Email
                        </span>
                        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{user?.email}</p>
                    </div>
                    <div className="p-3 rounded-xl transition-colors hover:bg-slate-50/70">
                        <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--text-secondary)' }}>Role Access</span>
                        <p className="text-sm font-bold mt-0.5 capitalize" style={{ color: 'var(--text-primary)' }}>{user?.role}</p>
                    </div>
                    <div className="p-3 rounded-xl transition-colors hover:bg-slate-50/70">
                        <span className="text-[11px] font-semibold tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                            <Globe className="w-3 h-3" /> Preferred Language
                        </span>
                        <p className="text-sm font-bold mt-0.5 uppercase" style={{ color: 'var(--text-primary)' }}>{user?.locale || 'en'}</p>
                    </div>
                </div>
            </div>

            <div className="card card-interactive p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--secondary)' }} /> Security & Access Controls
                    </h4>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {[
                        { label: 'Password hashing', desc: 'bcrypt, salted per account', status: 'Enabled' },
                        { label: 'Session tokens', desc: 'JWT, expires automatically', status: 'Enabled' },
                        { label: 'Role-based access control', desc: 'Patient / Caregiver / Neurologist / Admin scoping', status: 'Enabled' },
                    ].map((setting, i) => (
                        <div key={i} className="flex items-center justify-between py-3 transition-colors hover:bg-slate-50/60 px-2 rounded-lg">
                            <div>
                                <div className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    {setting.label}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{setting.desc}</div>
                            </div>
                            <span className="badge badge-success flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {setting.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card p-4.5 flex items-start gap-3.5 border-l-4" style={{ borderLeftColor: 'var(--secondary)' }}>
                <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--secondary)' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Notification preferences, two-factor authentication, and multi-channel alert routing (WhatsApp / push) are configured
                    through the n8n care-coordination workflows and will appear here once wired to your account in a follow-up release.
                </p>
            </div>
        </div>
    );
};

export default SettingsView;
