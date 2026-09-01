import React from 'react';

/**
 * High-performance, GPU-composited EEG neural waveform background.
 * Uses lightweight SVGs with CSS translate3d transforms (0% CPU / RAM overhead)
 * that simulate live multi-channel EEG frequency oscillations and seizure spike discharges.
 */
const BackgroundDecorations = () => {
    // Single seamless 1000px wide EEG pattern containing normal rhythms + paroxysmal spike complexes
    const eegPathA = "M 0 50 Q 25 45, 50 55 T 100 50 Q 125 42, 150 58 T 200 50 L 220 48 L 226 12 L 234 88 L 240 28 L 248 64 Q 275 78, 305 50 T 360 50 Q 385 45, 410 55 T 460 50 L 480 48 L 485 8 L 493 92 L 500 22 L 507 68 Q 535 80, 565 50 T 620 50 Q 645 44, 670 56 T 720 50 L 740 48 L 746 15 L 754 86 L 760 30 L 768 62 Q 795 76, 825 50 T 880 50 Q 910 44, 940 56 T 1000 50";
    
    // Channel B: Higher frequency beta/gamma bursts and sharp transients
    const eegPathB = "M 0 45 Q 15 38, 30 52 T 60 45 Q 75 35, 90 55 T 120 45 L 135 44 L 140 10 L 146 82 L 152 24 L 158 58 Q 180 68, 205 45 T 250 45 Q 270 38, 290 52 T 330 45 L 345 43 L 350 5 L 357 88 L 363 18 L 370 62 Q 395 72, 420 45 T 470 45 Q 490 38, 510 52 T 550 45 L 565 44 L 570 12 L 577 84 L 583 26 L 590 60 Q 615 70, 640 45 T 690 45 Q 715 36, 740 54 T 780 45 L 795 44 L 800 8 L 807 86 L 814 20 L 820 60 Q 845 70, 870 45 T 920 45 Q 945 38, 970 52 T 1000 45";

    // Channel C: Slower rhythmic theta/delta baseline waves
    const eegPathC = "M 0 55 Q 35 30, 70 75 T 140 55 Q 180 32, 220 78 T 300 55 L 315 54 L 320 20 L 327 86 L 333 34 L 340 65 Q 380 85, 420 55 T 500 55 Q 540 30, 580 78 T 660 55 L 675 54 L 680 18 L 687 88 L 694 30 L 700 64 Q 740 86, 780 55 T 860 55 Q 900 32, 940 76 T 1000 55";

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
            {/* Background base layer */}
            <div className="absolute inset-0" style={{ background: 'var(--background)' }} />

            {/* Clinical EEG Telemetry Square Grid (Clean & Balanced) */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(69, 123, 157, 0.08) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(69, 123, 157, 0.08) 1px, transparent 1px),
                        linear-gradient(to right, rgba(29, 53, 87, 0.12) 1.5px, transparent 1.5px),
                        linear-gradient(to bottom, rgba(29, 53, 87, 0.12) 1.5px, transparent 1.5px)
                    `,
                    backgroundSize: '24px 24px, 24px 24px, 96px 96px, 96px 96px',
                }}
            />

            {/* Subtle soft ambient radial glow accents */}
            <div
                className="absolute inset-0 opacity-[0.45]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 12% 18%, rgba(168,218,220,0.35), transparent 50%), radial-gradient(circle at 88% 82%, rgba(69,123,157,0.14), transparent 55%)',
                }}
            />

            {/* Wave 1: Upper Section (Spike & Wave Discharges) */}
            <div className="absolute top-[18%] left-0 w-[200%] h-24 opacity-[0.38] overflow-hidden">
                <div className="flex w-full h-full eeg-wave-1">
                    <svg className="w-1/2 h-full shrink-0" viewBox="0 0 1000 100" preserveAspectRatio="none">
                        <path d={eegPathA} fill="none" stroke="var(--secondary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <svg className="w-1/2 h-full shrink-0" viewBox="0 0 1000 100" preserveAspectRatio="none">
                        <path d={eegPathA} fill="none" stroke="var(--secondary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {/* Wave 2: Lower Section (Rhythmic Oscillation Sweeps) */}
            <div className="absolute top-[68%] left-0 w-[200%] h-24 opacity-[0.32] overflow-hidden">
                <div className="flex w-full h-full eeg-wave-2">
                    <svg className="w-1/2 h-full shrink-0" viewBox="0 0 1000 100" preserveAspectRatio="none">
                        <path d={eegPathB} fill="none" stroke="var(--primary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <svg className="w-1/2 h-full shrink-0" viewBox="0 0 1000 100" preserveAspectRatio="none">
                        <path d={eegPathB} fill="none" stroke="var(--primary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default BackgroundDecorations;
