import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, sendEmailVerification, signOut, onAuthStateChanged, fetchSignInMethodsForEmail } from 'firebase/auth';
import { OWNER_UID, OWNER_EMAIL } from './access-policy';
import { app, db } from './firebase';
import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const loginWithEmail = async (email: string, pass: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return { user: userCredential.user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message };
    }
};

export const registerWithEmail = async (name: string, email: string, pass: string, phone?: string) => {
    try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
            return { user: null, error: "An account with this email already exists." };
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(userCredential.user);
        
        // Save profile
        await setDoc(doc(db as Firestore, 'showroom_customers', userCredential.user.uid), {
            name,
            email,
            phone: phone || '',
            createdAt: new Date().toISOString()
        });

        return { user: userCredential.user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message };
    }
};

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Check if customer profile exists, if not create it
        const docRef = doc(db as Firestore, 'showroom_customers', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            await setDoc(docRef, {
                name: user.displayName || 'Google User',
                email: user.email,
                phone: user.phoneNumber || '',
                createdAt: new Date().toISOString()
            });
        }
        
        return { user, error: null };
    } catch (error: any) {
        if (error.code === 'auth/account-exists-with-different-credential') {
            return { user: null, error: "An account already exists with the same email address but different sign-in credentials. Please sign in using a password." };
        }
        return { user: null, error: error.message };
    }
};

export const resetPassword = async (email: string) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, error: null };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') return { success: true, error: null };
        return { success: false, error: error.message };
    }
};

export const logout = async () => {
    await signOut(auth);
};

// Legacy UI calls this for staff-mode display; data permissions are enforced by rules.
export const checkIsAdmin = async (uid: string, email?: string | null) => {
 const user = auth.currentUser;
 if (!user || user.uid !== uid || user.isAnonymous || !user.emailVerified) return false;
 try {
  const snap = await getDoc(doc(db, 'showroom_roles', uid));
  const data = snap.data();
  const owner = uid === OWNER_UID && user.email?.toLowerCase() === OWNER_EMAIL;
  return !!data && data.email?.toLowerCase() === user.email?.toLowerCase() && data.active !== false && (data.active === true || owner)
    && (data.role === 'admin' ? owner : ['general_manager','seller','custom'].includes(data.role));
 } catch { return false; }
};
