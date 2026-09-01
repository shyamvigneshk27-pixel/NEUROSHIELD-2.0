import React from 'react';
import { Activity, Brain, FileText, Settings, LogOut, Shield, Circle } from 'lucide-react';
import BackgroundDecorations from './BackgroundDecorations';

const NAV_BY_ROLE = {
    admin: [
        { id: 'Patient Records', icon: Brain, label: 'Patients' },
        { id: 'Analysis', icon: FileText, label: 'Analysis' },
        { id: 'Report Summary', icon: Activity, label: 'Reports' },
        { id: 'System Admin', icon: Shield, label: 'Admin' },
        { id: 'Settings', icon: Settings, label: 'Settings' },
    ],
    neurologist: [
        { id: 'Patient Records', icon: Brain, label: 'Patients' },
        { id: 'Analysis', icon: FileText, label: 'Analysis' },
        { id: 'Report Summary', icon: Activity, label: 'Reports' },
        { id: 'Settings', icon: Settings, label: 'Settings' },
    ],
    caregiver: [
        { id: 'Analysis', icon: FileText, label: 'Monitoring' },
        { id: 'Report Summary', icon: Activity, label: 'Reports' },
        { id: 'Settings', icon: Settings, label: 'Settings' },
    ],
    patient: [
        { id: 'Analysis', icon: FileText, label: 'Analysis' },
        { id: 'Report Summary', icon: Activity, label: 'Reports' },
        { id: 'Settings', icon: Settings, label: 'Settings' },
    ],
};

const ROLE_LABELS = {
    patient: 'Patient',
    caregiver: 'Caregiver',
    neurologist: 'Neurologist',
    admin: 'Administrator',
};

const DashboardLayout = ({ children, activeTab, onTabChange, user, onLogout }) => {
    const menuItems = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.patient;

    return (
        <div className="flex h-screen overflow-hidden" style={{ color: 'var(--text-primary)' }}>
            <BackgroundDecorations />

            {/* Sidebar -- desktop / tablet */}
            <aside
                className="hidden md:flex w-20 lg:w-64 flex-col items-center lg:items-start py-6 z-40 border-r backdrop-blur-md"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <div className="mb-10 px-5 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl transition-transform duration-200 hover:scale-105" style={{ background: 'rgba(69,123,157,0.10)' }}>
                        <Brain className="w-7 h-7" style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="hidden lg:block text-xl font-extrabold tracking-tight" style={{ color: 'var(--primary)' }}>
                        NeuroShield
                    </span>
                </div>

                <nav className="w-full space-y-1.5 px-3" aria-label="Primary">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === activeTab;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                aria-current={isActive ? 'page' : undefined}
                                className="group relative flex items-center gap-3.5 w-full p-3 rounded-xl transition-all duration-150 text-sm font-semibold"
                                style={isActive
                                    ? { background: 'rgba(69,123,157,0.12)', color: 'var(--primary)', boxShadow: '0 1px 2px rgba(29,53,87,0.05)' }
                                    : { color: 'var(--text-secondary)' }}
                            >
                                {isActive && (
                                    <span
                                        className="hidden lg:block absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                                        style={{ background: 'var(--primary)' }}
                                    />
                                )}
                                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-150 ${isActive ? 'scale-105' : 'group-hover:scale-110 group-hover:text-primary'}`} />
                                <span className="hidden lg:block transition-transform duration-150 group-hover:translate-x-0.5">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-auto w-full px-3">
                    <button
                        onClick={onLogout}
                        className="group flex items-center gap-3.5 w-full p-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:bg-red-50/70"
                        style={{ color: 'var(--danger)' }}
                    >
                        <LogOut className="w-5 h-5 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5" />
                        <span className="hidden lg:block">Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden z-10">
                <header
                    className="h-16 md:h-20 border-b flex items-center justify-between px-4 md:px-8 z-20 shrink-0 glass-header"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <div className="flex items-center gap-3">
                        <Brain className="w-6 h-6 md:hidden" style={{ color: 'var(--primary)' }} />
                        <div className="flex flex-col">
                            <h2 className="text-base md:text-lg font-bold tracking-tight" style={{ color: 'var(--primary)' }}>{activeTab}</h2>
                            <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                <span className="status-dot status-beacon" style={{ background: 'var(--success)' }} />
                                <span>System Online</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{user?.full_name}</span>
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--secondary)' }}>{ROLE_LABELS[user?.role] || user?.role}</span>
                        </div>
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ring-2 transition-transform duration-150 hover:scale-105"
                            style={{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--surface)' }}
                        >
                            {user?.full_name?.[0] || '?'}
                        </div>
                        <button onClick={onLogout} className="md:hidden p-2 rounded-lg hover:bg-red-50/60" aria-label="Log out">
                            <LogOut className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
                    {children}
                </div>
            </main>

            {/* Bottom navigation -- mobile only (section 7/32) */}
            <nav
                className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                aria-label="Primary"
            >
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeTab;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold min-h-[56px]"
                            style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default DashboardLayout;
