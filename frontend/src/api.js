// Centralized API client. Base URL is configurable via VITE_API_BASE so this
// is never a hardcoded production URL (see .env.example).
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

/**
 * Fetch wrapper that attaches the JWT, throws ApiError with a readable message
 * on failure, and lets callers distinguish 401 (session expired) from other
 * errors without repeating boilerplate in every component.
 */
export async function authFetch(path, { token, ...options } = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
        throw new ApiError('Cannot reach the NeuroShield server. Check your connection and try again.', 0);
    }

    if (!response.ok) {
        let detail = `Request failed (${response.status}).`;
        try {
            const data = await response.json();
            detail = data.detail || detail;
        } catch { /* non-JSON error body */ }
        throw new ApiError(detail, response.status);
    }

    return response.json();
}
