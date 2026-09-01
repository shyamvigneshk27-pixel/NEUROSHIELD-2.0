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
                className="hidden md:flex w-20 lg:w-64 flex-col items-center lg:items-start py-6 z-40 border-r"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <div className="mb-10 px-5 flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(69,123,157,0.10)' }}>
                        <Brain className="w-7 h-7" style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="hidden lg:block text-xl font-extrabold tracking-tight" style={{ color: 'var(--primary)' }}>
                        NeuroShield
                    </span>
                </div>

                <nav className="w-full space-y-1 px-3" aria-label="Primary">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === activeTab;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                aria-current={isActive ? 'page' : undefined}
                                className="flex items-center gap-4 w-full p-3.5 rounded-xl transition-colors duration-150 text-sm font-semibold"
                                style={isActive
                                    ? { background: 'rgba(69,123,157,0.10)', color: 'var(--primary)' }
                                    : { color: 'var(--text-secondary)' }}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="hidden lg:block">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-auto w-full px-3">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-4 w-full p-3.5 rounded-xl text-sm font-semibold transition-colors"
                        style={{ color: 'var(--danger)' }}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span className="hidden lg:block">Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden z-10">
                <header
                    className="h-16 md:h-20 border-b flex items-center justify-between px-4 md:px-8 z-20 shrink-0"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                    <div className="flex items-center gap-3">
                        <Brain className="w-6 h-6 md:hidden" style={{ color: 'var(--primary)' }} />
                        <div className="flex flex-col">
                            <h2 className="text-base md:text-lg font-bold" style={{ color: 'var(--primary)' }}>{activeTab}</h2>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                <Circle className="w-2 h-2 fill-current" style={{ color: 'var(--success)' }} />
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
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                            style={{ background: 'var(--primary)', color: '#fff' }}
                        >
                            {user?.full_name?.[0] || '?'}
                        </div>
                        <button onClick={onLogout} className="md:hidden" aria-label="Log out">
                            <LogOut className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 pb-24 md:pb-8 animate-fade-in">
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
