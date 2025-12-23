'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PrintPortalProps {
    children: React.ReactNode;
}

export default function PrintPortal({ children }: PrintPortalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.classList.add('has-print-portal');
        return () => {
            setMounted(false);
            document.body.classList.remove('has-print-portal');
        };
    }, []);

    if (!mounted) return null;

    // Render directly into document.body to avoid layout constraints
    return createPortal(
        <div className="print-portal-root">
            {children}
        </div>,
        document.body
    );
}
