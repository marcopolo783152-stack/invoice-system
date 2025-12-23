
export interface AuditEntry {
    timestamp: string;
    user: string;
    action: string;
    details: string;
}

export function logActivity(action: string, details: string) {
    if (typeof window === 'undefined') return;

    // Get current user from session first, then local
    const userStr = sessionStorage.getItem('mp-invoice-user') || localStorage.getItem('mp-invoice-user');
    let userName = 'Unknown';
    if (userStr) {
        try {
            const userObj = JSON.parse(userStr);
            userName = userObj.fullName || userObj.username || 'System';
        } catch (e) {
            userName = 'System';
        }
    }

    // Load existing logs
    const logStr = localStorage.getItem('mp-audit-log');
    let log: AuditEntry[] = [];
    if (logStr) {
        try {
            log = JSON.parse(logStr);
            if (!Array.isArray(log)) log = [];
        } catch (e) {
            log = [];
        }
    }

    // Add new entry at top
    log.unshift({
        timestamp: new Date().toISOString(),
        user: userName,
        action,
        details
    });

    // Cap at 200 entries to save space
    if (log.length > 200) {
        log = log.slice(0, 200);
    }

    localStorage.setItem('mp-audit-log', JSON.stringify(log));
}

export function getAuditLogs(): AuditEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const logStr = localStorage.getItem('mp-audit-log');
        return logStr ? JSON.parse(logStr) : [];
    } catch (e) {
        return [];
    }
}
