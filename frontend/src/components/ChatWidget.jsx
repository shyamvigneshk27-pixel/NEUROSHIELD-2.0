import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { authFetch, ApiError } from '../api';

const ChatWidget = ({ context, token }) => {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: "Hello, I'm the NeuroShield Assistant. I can summarize this report or explain EEG terminology in plain language. I don't diagnose or prescribe." }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { id: Date.now(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const data = await authFetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.text, context }),
                token,
            });
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: data.answer }]);
        } catch (err) {
            const text = err instanceof ApiError && err.status === 401
                ? 'Your session expired. Please sign in again.'
                : 'The assistant is temporarily unavailable. Please try again shortly.';
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    return (
        <div className="flex flex-col h-[420px]">
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg" style={{ background: 'rgba(69,123,157,0.12)' }}>
                        <Sparkles className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>NeuroShield Assistant</h3>
                </div>
                <span className="badge badge-success">Ready</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 animate-fade-in ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: msg.sender === 'ai' ? 'rgba(69,123,157,0.12)' : 'rgba(29,53,87,0.10)' }}
                            >
                                {msg.sender === 'ai'
                                    ? <Bot className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                                    : <User className="w-4 h-4" style={{ color: 'var(--primary)' }} />}
                            </div>
                            <div
                                className="max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed"
                                style={msg.sender === 'user'
                                    ? { background: 'var(--primary)', color: '#fff', borderTopRightRadius: 4 }
                                    : { background: 'var(--surface-muted)', color: 'var(--text-primary)', borderTopLeftRadius: 4 }}
                            >
                                {msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                            </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(69,123,157,0.12)' }}>
                            <Bot className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                        </div>
                        <div className="p-4 rounded-2xl" style={{ background: 'var(--surface-muted)' }}>
                            <div className="flex gap-1.5">
                                {[0, 1, 2].map(i => (
                                    <span
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
                                        style={{ background: 'var(--secondary)', animationDelay: `${i * 0.15}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <div className="p-4 border-t mt-auto" style={{ borderColor: 'var(--border)' }}>
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask about this report…"
                        className="input-field pr-12"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        aria-label="Send message"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg disabled:opacity-40"
                        style={{ color: 'var(--secondary)' }}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatWidget;
