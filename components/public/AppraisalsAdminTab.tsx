'use client';

import React, { useState } from 'react';
import { AppraisalsListTab } from './AppraisalsListTab';
import { AppraisalsFormTab } from './AppraisalsFormTab';

export default function AppraisalsAdminTab() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  if (view === 'list') {
    return (
      <AppraisalsListTab 
        onNew={() => { setEditId(null); setView('form'); }} 
        onEdit={(id) => { setEditId(id); setView('form'); }} 
      />
    );
  }
  
  return (
    <AppraisalsFormTab 
      editId={editId} 
      onCancel={() => setView('list')} 
    />
  );
}
