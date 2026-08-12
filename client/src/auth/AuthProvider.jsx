import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, get, ref } from "firebase/database";
import { AuthContext } from "./authContext";
import { isValidRole } from "./roles";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const db = getDatabase();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(null);
      setUserProfile(null);
      setRole(null);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      try {
        const userSnapshot = await get(ref(db, `users/${firebaseUser.uid}`));
        const databaseUser = userSnapshot.exists() ? userSnapshot.val() : null;
        const databaseRole = databaseUser?.role;

        if (!databaseUser) {
          setAccessError("Your account may have been deleted by an administrator. Please contact an administrator if you need access.");
          await signOut(auth);
          return;
        }

        if (!isValidRole(databaseRole)) {
          setAccessError("User access not found. Please contact an administrator.");
          await signOut(auth);
          return;
        }

        setAccessError("");
        setUser(firebaseUser);
        setUserProfile(databaseUser);
        setRole(databaseRole);
      } catch (err) {
        console.error("Failed to verify user access:", err);
        setRole(null);
        setUser(null);
        setUserProfile(null);
        setAccessError("Your account could not be verified. Please contact an administrator if you need access.");
        await signOut(auth);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Re-read the signed-in user's RTDB record. Called after the Profile page
   * saves changes so the navbar picks up the new name/photo without a reload.
   */
  const refreshUserProfile = useCallback(async () => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) return;
    try {
      const snapshot = await get(ref(getDatabase(), `users/${currentUser.uid}`));
      if (snapshot.exists()) setUserProfile(snapshot.val());
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      userProfile,
      role,
      loading,
      accessError,
      refreshUserProfile,
      clearAccessError: () => setAccessError(""),
    }),
    [user, userProfile, role, loading, accessError, refreshUserProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
