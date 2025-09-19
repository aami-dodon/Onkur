import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';

const STORAGE_KEY = 'onkur.auth.v1';

const AuthContext = createContext(null);

function persistSession({ token, jti, expiresAt }) {
  if (!token) return;
  const payload = {
    token,
    jti,
    expiresAt: expiresAt || null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearSessionStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    status: 'loading',
    user: null,
    token: null,
    jti: null,
    expiresAt: null,
  });
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const roleResponse = await apiRequest('/api/auth/roles');
        if (isMounted && Array.isArray(roleResponse.roles)) {
          setRoles(roleResponse.roles);
        }
      } catch (error) {
        console.warn('Unable to load roles', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        if (isMounted) {
          setAuth({ status: 'unauthenticated', user: null, token: null, jti: null, expiresAt: null });
        }
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        const profile = await apiRequest('/api/me', { token: parsed.token });
        if (!isMounted) return;
        setAuth({
          status: 'authenticated',
          user: profile,
          token: parsed.token,
          jti: parsed.jti,
          expiresAt: parsed.expiresAt || null,
        });
      } catch (error) {
        clearSessionStorage();
        if (isMounted) {
          setAuth({ status: 'unauthenticated', user: null, token: null, jti: null, expiresAt: null });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setAuthenticated = useCallback((payload) => {
    persistSession(payload);
    setAuth({
      status: 'authenticated',
      user: payload.user,
      token: payload.token,
      jti: payload.jti,
      expiresAt: payload.expiresAt || null,
    });
  }, []);

  const resetAuth = useCallback(() => {
    clearSessionStorage();
    setAuth({ status: 'unauthenticated', user: null, token: null, jti: null, expiresAt: null });
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setAuthenticated(result);
      return result.user;
    },
    [setAuthenticated]
  );

  const signup = useCallback(async ({ name, email, password, roles }) => {
    const result = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: { name, email, password, roles },
    });
    return result;
  }, []);

  const logout = useCallback(async () => {
    if (auth.token) {
      try {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          token: auth.token,
        });
      } catch (error) {
        console.warn('Logout request failed', error);
      }
    }
    resetAuth();
  }, [auth.token, resetAuth]);

  const refreshProfile = useCallback(async () => {
    if (!auth.token) {
      throw new Error('Not authenticated');
    }
    const profile = await apiRequest('/api/me', { token: auth.token });
    setAuth((prev) => ({
      ...prev,
      status: 'authenticated',
      user: profile,
    }));
    return profile;
  }, [auth.token]);

  const fetchUsers = useCallback(async () => {
    if (!auth.token) {
      throw new Error('Not authenticated');
    }
    const response = await apiRequest('/api/users', { token: auth.token });
    return Array.isArray(response.users) ? response.users : [];
  }, [auth.token]);

  const assignRole = useCallback(
    async ({ userId, role, roles: desiredRoles }) => {
      if (!auth.token) {
        throw new Error('Not authenticated');
      }
      const payload = {};
      if (Array.isArray(desiredRoles)) {
        payload.roles = desiredRoles;
      } else if (role) {
        payload.role = role;
      } else {
        throw new Error('A role selection is required');
      }
      const response = await apiRequest(`/api/users/${userId}/role`, {
        method: 'PATCH',
        token: auth.token,
        body: payload,
      });

      if (response.user && auth.user && response.user.id === auth.user.id) {
        await refreshProfile();
      }

      return response.user;
    },
    [auth.token, auth.user, refreshProfile]
  );

  const contextValue = useMemo(
    () => ({
      ...auth,
      isAuthenticated: auth.status === 'authenticated' && Boolean(auth.user),
      roles,
      login,
      signup,
      logout,
      refreshProfile,
      assignRole,
      fetchUsers,
    }),
    [assignRole, auth, fetchUsers, login, logout, refreshProfile, roles, signup]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}
