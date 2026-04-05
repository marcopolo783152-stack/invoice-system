import { getStorePrefix } from './user-storage';

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { EmailConfig } from './email-service';

export interface GlobalSettings {
    emailConfig?: EmailConfig;
    updatedAt?: string;
    updatedBy?: string;
}

const SETTINGS_COLLECTION = 'settings';
const GLOBAL_DOC_ID = 'global_config';

/**
 * Save settings to cloud
 */
export async function saveSettingsToCloud(settings: GlobalSettings): Promise<void> {
    if (!isFirebaseConfigured() || !db) return;

    try {
        const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_DOC_ID);
        await setDoc(docRef, {
            ...settings,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Also update local storage cache immediately
        if (settings.emailConfig) {
            if (typeof window !== 'undefined') {
                localStorage.setItem('emailjs_config', JSON.stringify(settings.emailConfig));
            }
        }
    } catch (error) {
        console.error('Error saving settings to cloud:', error);
        throw error;
    }
}

/**
 * Get settings from cloud
 */
export async function getSettingsFromCloud(): Promise<GlobalSettings | null> {
    if (!isFirebaseConfigured() || !db) return null;

    try {
        const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const settings = docSnap.data() as GlobalSettings;
            // Sync to local storage
            if (settings.emailConfig && typeof window !== 'undefined') {
                localStorage.setItem('emailjs_config', JSON.stringify(settings.emailConfig));
            }
            return settings;
        }
        return null;
    } catch (error) {
        console.error('Error fetching settings from cloud:', error);
        return null;
    }
}
