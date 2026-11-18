import { API_BASE_URL as CONFIGURED_API_BASE } from '@/services/api';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ContactInfo { phone1: string; phone2: string; instagram: string; address: string }
interface ContactContextType {
  contactInfo: ContactInfo;
  updateContactInfo: (info: ContactInfo) => Promise<void>;
  refreshContactInfo: () => Promise<ContactInfo | null>;
}
const ContactContext = createContext<ContactContextType | undefined>(undefined);
const API = (import.meta.env.VITE_API_URL || CONFIGURED_API_BASE).replace(/\/$/, '');
const defaults: ContactInfo = { phone1: '', phone2: '', instagram: '', address: '' };

export const ContactProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(defaults);
  const refreshContactInfo = useCallback(async () => {
    const response = await fetch(`${API}/public/contact.php`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Tidak dapat mengambil pengaturan kontak dari server.');
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Gagal memuat kontak.');
    setContactInfo(result.data || defaults);
    return result.data as ContactInfo | null;
  }, []);
  useEffect(() => { refreshContactInfo().catch(error => console.error(error)); }, [refreshContactInfo]);
  const updateContactInfo = async (info: ContactInfo) => {
    const response = await fetch(`${API}/public/contact.php`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      body: JSON.stringify(info),
    });
    const result = await response.json();
    if (response.status === 401) {
      localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user');
      throw Object.assign(new Error(result.message || 'Sesi admin berakhir.'), { status: 401 });
    }
    if (!response.ok || !result.success) throw new Error(result.message || `Gagal menyimpan kontak (HTTP ${response.status}).`);
    setContactInfo(info);
  };
  return <ContactContext.Provider value={{ contactInfo, updateContactInfo, refreshContactInfo }}>{children}</ContactContext.Provider>;
};
export const useContact = () => {
  const context = useContext(ContactContext);
  if (!context) throw new Error('useContact must be used within a ContactProvider');
  return context;
};
