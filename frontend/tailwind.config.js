/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // --- Mandatory NeuroShield palette ---
                honeydew: "#f1faee",
                "frosted-blue": "#a8dadc",
                cerulean: "#457b9d",
                "oxford-navy": "#1d3557",

                background: "var(--background)",
                surface: "var(--surface)",
                "surface-muted": "var(--surface-muted)",
                primary: "var(--primary)",
                secondary: "var(--secondary)",
                accent: "var(--accent)",
                "text-primary": "var(--text-primary)",
                "text-secondary": "var(--text-secondary)",
                border: "var(--border)",
                success: "var(--success)",
                warning: "var(--warning)",
                danger: "var(--danger)",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                card: '0 1px 2px rgba(29, 53, 87, 0.06), 0 1px 3px rgba(29, 53, 87, 0.08)',
                'card-hover': '0 4px 12px rgba(29, 53, 87, 0.10)',
                focus: '0 0 0 3px rgba(69, 123, 157, 0.25)',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: 0, transform: 'translateY(4px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.55 },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.25s ease-out',
                'pulse-soft': 'pulse-soft 2.2s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
