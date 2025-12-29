'use client';

import React, { useEffect, useState } from 'react';

// This component ensures its children are only rendered on the client side.
// It renders an empty fragment during SSR and initial hydration,
// then renders the children after the component has mounted.
// This effectively bypasses hydration mismatch errors (#310).

interface NoSsrWrapperProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const NoSsrWrapper: React.FC<NoSsrWrapperProps> = ({ children, fallback = null }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default NoSsrWrapper;
