import React from 'react';

/**
 * Restrained clinical backdrop. Replaces the previous neon/glow/mesh-gradient
 * treatment (see git history) with a near-flat surface consistent with the
 * mandated design tokens -- a serious healthcare product, not a neon dashboard.
 */
const BackgroundDecorations = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
            <div className="absolute inset-0" style={{ background: 'var(--background)' }} />
            <div
                className="absolute inset-0 opacity-[0.4]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 15% 10%, rgba(168,218,220,0.35), transparent 45%), radial-gradient(circle at 85% 90%, rgba(69,123,157,0.10), transparent 50%)',
                }}
            />
        </div>
    );
};

export default BackgroundDecorations;
