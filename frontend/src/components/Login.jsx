import React, { useState } from 'react';
import { Brain, Lock, Mail, User, HeartPulse, Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react';
import BackgroundDecorations from './BackgroundDecorations';
import { API_BASE } from '../api';

const ROLES = [
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'caregiver', label: 'Caregiver', icon: HeartPulse },
    { id: 'neurologist', label: 'Neurologist', icon: Stethoscope },
];

const Login = ({ onLogin }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [role, setRole] = useState('patient');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
        const body = mode === 'login'
            ? { email, password }
            : { email, password, full_name: fullName, role };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                onLogin({ token: data.access_token, user: data.user });
            } else {
                setError(data.detail || 'Authentication failed. Please check your details.');
            }
        } catch {
            setError('Could not reach the NeuroShield server. Confirm the backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-6 overflow-y-auto">
            <BackgroundDecorations />

            <div className="w-full max-w-md relative z-10 my-8 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-2xl mb-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <Brain className="w-9 h-9" style={{ color: 'var(--primary)' }} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--primary)' }}>NeuroShield</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>AI-assisted seizure monitoring & care coordination</p>
                </div>

                <div className="card p-8">
                    <div className="flex p-1 rounded-xl mb-6" style={{ background: 'var(--surface-muted)' }}>
                        {['login', 'register'].map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => { setMode(m); setError(''); }}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                style={mode === m
                                    ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: '0 1px 2px rgba(29,53,87,0.10)' }
                                    : { color: 'var(--text-secondary)' }}
                            >
                                {m === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="input-field"
                                        placeholder="Jane Doe"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>I am a</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {ROLES.map((r) => {
                                            const Icon = r.icon;
                                            const active = role === r.id;
                                            return (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => setRole(r.id)}
                                                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all"
                                                    style={active
                                                        ? { borderColor: 'var(--secondary)', background: 'rgba(69,123,157,0.08)', color: 'var(--primary)' }
                                                        : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {r.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10" style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10" style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder="••••••••"
                                    required
                                    minLength={mode === 'register' ? 8 : undefined}
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                            </div>
                        </div>

                        {error && (
                            <div
                                className="badge badge-danger w-full justify-start px-3 py-2 normal-case text-xs font-medium"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={isLoading} className="btn btn-primary w-full mt-2">
                            {isLoading ? 'Signing in…' : (
                                <>
                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Encrypted session · role-based access control</span>
                    </div>
                </div>

                <p className="text-center text-xs mt-6" style={{ color: 'var(--text-secondary)' }}>
                    NeuroShield is an AI-assisted monitoring prototype and does not replace clinical diagnosis or emergency services.
                </p>
            </div>
        </div>
    );
};

export default Login;
