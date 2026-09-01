import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

const UploadSection = ({ onUpload, type = 'csv', label = 'Upload EEG Data (CSV)', accept, hint }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const validateFile = (selectedFile) => {
        if (type === 'csv' && !selectedFile.name.toLowerCase().endsWith('.csv')) {
            setError('Please upload a .csv file.');
            return false;
        }
        if (type === 'edf' && !selectedFile.name.toLowerCase().endsWith('.edf')) {
            setError('Please upload a .edf file.');
            return false;
        }
        if (type === 'image' && !selectedFile.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            return false;
        }
        setError(null);
        return true;
    };

    const acceptFile = (selectedFile) => {
        if (validateFile(selectedFile)) {
            setFile(selectedFile);
            onUpload(selectedFile);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) acceptFile(e.dataTransfer.files[0]);
    };

    const handleFileSelect = (e) => {
        if (e.target.files?.[0]) acceptFile(e.target.files[0]);
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{label}</h3>
                {error && (
                    <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                        <AlertCircle className="w-3 h-3" /> {error}
                    </span>
                )}
            </div>

            <div
                role="button"
                tabIndex={0}
                aria-label={label}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                className="group relative h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:border-slate-400 hover:shadow-sm backdrop-blur-sm"
                style={{
                    borderColor: isDragging ? 'var(--secondary)' : file ? 'var(--success)' : 'var(--border)',
                    background: isDragging ? 'rgba(69,123,157,0.10)' : file ? 'rgba(47,133,90,0.06)' : 'var(--surface-muted)',
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={accept || (type === 'csv' ? '.csv' : type === 'edf' ? '.edf' : 'image/*')}
                    onChange={handleFileSelect}
                />

                {file ? (
                    <div className="flex flex-col items-center gap-2 px-4 text-center animate-fade-in-up">
                        <div className="p-3 rounded-xl transition-transform duration-200 hover:scale-105" style={{ background: 'rgba(47,133,90,0.14)' }}>
                            <CheckCircle className="w-7 h-7" style={{ color: 'var(--success)' }} />
                        </div>
                        <p className="font-semibold text-sm truncate max-w-[220px]" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                        <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Ready for analysis — click to replace</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 text-center px-4">
                        <div className="p-3.5 rounded-xl transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-105" style={{ background: 'rgba(69,123,157,0.10)' }}>
                            <Upload className="w-6 h-6 transition-colors duration-150 group-hover:text-primary" style={{ color: 'var(--secondary)' }} />
                        </div>
                        <p className="font-semibold text-sm transition-colors duration-150 group-hover:text-primary" style={{ color: 'var(--text-primary)' }}>Drag & drop, or click to browse</p>
                        {hint && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{hint}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadSection;
