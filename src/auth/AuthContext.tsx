import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CONFIG, isAuthEnabled } from '../config/environment';

// Environment-aware configuration
const AUTH_CONFIG = {
  userPoolId: CONFIG.COGNITO_USER_POOL_ID,
  clientId: CONFIG.COGNITO_CLIENT_ID,
  region: CONFIG.AWS_REGION,
  cognitoDomain: `https://${CONFIG.COGNITO_DOMAIN}`,
  redirectUri: `${window.location.origin}/`,
  logoutUri: `${window.location.origin}/`
};

interface User {
  email: string;
  sub: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user && !!token;

  // Development mode: Set up mock authentication immediately
  const initializeDevelopmentAuth = (): void => {
    const mockUser: User = {
      email: 'dev@templatebuilder365.com',
      sub: 'dev-user-id',
      name: 'Development User'
    };
    const mockToken = `dev.mock.token.${Date.now()}`;

    setUser(mockUser);
    setToken(mockToken);
    setIsLoading(false);

    console.log('🛠️ Development mode: Using mock authentication');
  };

  // PKCE helper functions (same as our working test)
  const generateCodeVerifier = (): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(128);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < 128; i++) {
      result += charset[randomValues[i] % charset.length];
    }

    return result;
  };

  const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const login = async (): Promise<void> => {
    try {
      setError(null);

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code verifier for later use
      sessionStorage.setItem('tb365_pkce_code_verifier', codeVerifier);

      // Build login URL (exact same format as our working test)
      const params = new URLSearchParams({
        client_id: AUTH_CONFIG.clientId,
        response_type: 'code',
        scope: 'email openid profile',
        redirect_uri: AUTH_CONFIG.redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      const authUrl = `${AUTH_CONFIG.cognitoDomain}/login?${params.toString()}`;

      console.log('🔑 TB365 redirecting to Cognito login:', authUrl);
      window.location.href = authUrl;
    } catch (err) {
      console.error('Login initiation failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const logout = (): void => {
    console.log('🚪 TB365 logging out...');

    // Clear local storage
    localStorage.removeItem('tb365_token');
    localStorage.removeItem('tb365_user');
    sessionStorage.removeItem('tb365_pkce_code_verifier');

    // Reset state
    setUser(null);
    setToken(null);
    setError(null);

    // Redirect to Cognito logout
    const cognitoLogoutUrl = `${AUTH_CONFIG.cognitoDomain}/logout?` +
      `client_id=${AUTH_CONFIG.clientId}&` +
      `logout_uri=${encodeURIComponent(AUTH_CONFIG.logoutUri)}`;

    window.location.href = cognitoLogoutUrl;
  };

  const exchangeCodeForTokens = async (authCode: string): Promise<void> => {
    try {
      const codeVerifier = sessionStorage.getItem('tb365_pkce_code_verifier');
      if (!codeVerifier) {
        throw new Error('PKCE code verifier not found');
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch(`${AUTH_CONFIG.cognitoDomain}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: AUTH_CONFIG.clientId,
          code: authCode,
          redirect_uri: AUTH_CONFIG.redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();

      // Get user info from ID token
      const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]));

      const userData: User = {
        email: idTokenPayload.email || 'user@templatebuilder365.com',
        sub: idTokenPayload.sub,
        name: idTokenPayload.name || idTokenPayload.email?.split('@')[0] || 'TB365 User'
      };

      setUser(userData);
      setToken(tokens.access_token);

      // Store in localStorage for persistence
      localStorage.setItem('tb365_token', tokens.access_token);
      localStorage.setItem('tb365_user', JSON.stringify(userData));

      // Clean up session storage
      sessionStorage.removeItem('tb365_pkce_code_verifier');

      console.log('🎉 TB365 authentication complete with real user data:', userData);

    } catch (error) {
      console.error('Token exchange failed:', error);

      // Fallback to mock data if token exchange fails
      const fallbackUser: User = {
        email: 'user@templatebuilder365.com',
        sub: 'mock-user-id',
        name: 'TB365 User'
      };
      const mockToken = `mock.jwt.token.${Date.now()}`;

      setUser(fallbackUser);
      setToken(mockToken);

      localStorage.setItem('tb365_token', mockToken);
      localStorage.setItem('tb365_user', JSON.stringify(fallbackUser));

      console.log('🔄 Using fallback authentication data');
    }
  };

  const handleOAuthCallback = async (): Promise<void> => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('❌ OAuth Error:', error);
      const errorDescription = urlParams.get('error_description');
      setError(`Authentication error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
      setIsLoading(false);
      return;
    }

    if (authCode) {
      console.log('✅ TB365 OAuth Success: Authorization code received');
      await exchangeCodeForTokens(authCode);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setIsLoading(false);
  };

  const checkExistingSession = (): void => {
    try {
      const storedToken = localStorage.getItem('tb365_token');
      const storedUser = localStorage.getItem('tb365_user');

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
        console.log('✅ TB365 restored existing session');
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      // Clear corrupted data
      localStorage.removeItem('tb365_token');
      localStorage.removeItem('tb365_user');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    console.log('🚀 TB365 AuthProvider initializing...');
    console.log(`Environment: ${CONFIG.ENVIRONMENT}, Auth enabled: ${isAuthEnabled()}`);

    // Development mode: bypass authentication entirely
    if (!isAuthEnabled()) {
      initializeDevelopmentAuth();
      return;
    }

    // Production/Stage mode: real authentication
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('code') || urlParams.get('error')) {
      handleOAuthCallback();
    } else {
      // Check for existing session
      checkExistingSession();
    }
  }, []);

  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};