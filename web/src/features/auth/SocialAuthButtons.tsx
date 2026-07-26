'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/services/auth.service';
import type { AuthResponse } from '@/types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'small' | 'medium' | 'large';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
            }
          ) => void;
          prompt: (
            notification?: (n: {
              isNotDisplayed: () => boolean;
              getNotDisplayedReason: () => string;
            }) => void
          ) => void;
        };
      };
    };
    FB?: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: { authResponse?: { accessToken?: string } }) => void,
        options?: { scope?: string }
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export interface SocialAuthButtonsProps {
  role?: string;
  onSuccess?: (data: AuthResponse) => void;
  onError?: (error: string) => void;
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
}

// Module-scope state for Google GSI — survive React Strict Mode remounts
let initializedClientId: string | null = null;
let currentCredentialHandler: ((response: { credential?: string }) => void) | null = null;

function GoogleIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function FacebookIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={`${className} fill-[#1877F2]`} viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function SocialAuthButtons({
  role,
  onSuccess,
  onError,
  loading = false,
  setLoading,
}: SocialAuthButtonsProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  const googleContainerRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [fbReady, setFbReady] = useState(false);

  // Keep latest prop callbacks in ref so handleGoogleCredentialResponse and handleFacebookClick use fresh references
  const callbacksRef = useRef({ role, onSuccess, onError, setLoading });
  useEffect(() => {
    callbacksRef.current = { role, onSuccess, onError, setLoading };
  }, [role, onSuccess, onError, setLoading]);

  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      const { role: currentRole, onSuccess: cbSuccess, onError: cbError, setLoading: cbSetLoading } =
        callbacksRef.current;
      if (!response.credential) {
        cbSetLoading?.(false);
        cbError?.('Google authentication failed: missing ID token credential.');
        return;
      }
      cbSetLoading?.(true);
      try {
        const data = await AuthService.googleLogin(response.credential, currentRole);
        cbSuccess?.(data);
      } catch (err: unknown) {
        cbSetLoading?.(false);
        const msg = err instanceof Error ? err.message : 'Google login failed';
        cbError?.(msg);
      }
    },
    []
  );
  // Keep module-scope handler pointing to current component's credential dispatcher
  useEffect(() => {
    currentCredentialHandler = handleGoogleCredentialResponse;
  }, [handleGoogleCredentialResponse]);

  const ensureGoogleInitialized = useCallback(() => {
    if (!googleClientId || !window.google?.accounts?.id) return false;
    if (initializedClientId === googleClientId) return true;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => currentCredentialHandler?.(response),
      auto_select: false,
    });
    initializedClientId = googleClientId;
    return true;
  }, [googleClientId]);

  const renderGoogleButtonIntoContainer = useCallback(() => {
    if (!googleClientId || !window.google?.accounts?.id || !googleContainerRef.current) return false;
    try {
      const containerWidth = googleContainerRef.current.offsetWidth || 384;
      const widthToUse = Math.max(200, Math.min(400, containerWidth));
      googleContainerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleContainerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: widthToUse,
      });
      setGoogleReady(true);
      return true;
    } catch (err) {
      console.error('Failed to render Google button:', err);
      return false;
    }
  }, [googleClientId]);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!googleClientId) return;

    if (ensureGoogleInitialized() && renderGoogleButtonIntoContainer()) return;

    const checkInterval = setInterval(() => {
      ensureGoogleInitialized();
      if (renderGoogleButtonIntoContainer()) {
        clearInterval(checkInterval);
      }
    }, 100);

    let script = document.getElementById('google-gsi-script') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.warn('Google GSI script failed to load');
      };
      document.head.appendChild(script);
    }

    const handleLoad = () => {
      ensureGoogleInitialized();
      if (renderGoogleButtonIntoContainer()) {
        clearInterval(checkInterval);
      }
    };
    script.addEventListener('load', handleLoad);

    return () => {
      clearInterval(checkInterval);
      script?.removeEventListener('load', handleLoad);
    };
  }, [googleClientId, ensureGoogleInitialized, renderGoogleButtonIntoContainer]);

  // Initialize Facebook SDK
  useEffect(() => {
    if (!facebookAppId) return;

    const initFB = () => {
      if (window.FB) {
        try {
          window.FB.init({
            appId: facebookAppId,
            cookie: true,
            xfbml: true,
            version: 'v19.0',
          });
        } catch {
          /* Already initialized */
        }
        setFbReady(true);
        return true;
      }
      return false;
    };

    if (initFB()) return;

    const previousInit = window.fbAsyncInit;
    window.fbAsyncInit = function () {
      if (previousInit) previousInit();
      initFB();
    };

    const checkInterval = setInterval(() => {
      if (initFB()) {
        clearInterval(checkInterval);
      }
    }, 100);

    let script = document.getElementById('facebook-jssdk') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        console.warn('Facebook SDK script failed to load');
      };
      document.head.appendChild(script);
    }

    return () => {
      clearInterval(checkInterval);
    };
  }, [facebookAppId]);

  const handleFacebookClick = () => {
    if (window.location.protocol !== 'https:') {
      callbacksRef.current.onError?.('Facebook Login requires HTTPS. Test on https://eventing.moteo.fun or through an HTTPS tunnel.');
      return;
    }

    const { role: currentRole, onSuccess: cbSuccess, onError: cbError, setLoading: cbSetLoading } =
      callbacksRef.current;

    if (!facebookAppId) {
      cbError?.('Facebook login is not configured in this environment.');
      return;
    }

    if (!window.FB) {
      cbError?.('Facebook SDK is loading or blocked by your browser. Please try again.');
      return;
    }

    cbSetLoading?.(true);
    try {
      window.FB.login(
        (response) => {
          if (response.authResponse?.accessToken) {
            AuthService.facebookLogin(response.authResponse.accessToken, currentRole)
              .then((data) => cbSuccess?.(data))
              .catch((err: unknown) => {
                cbSetLoading?.(false);
                const msg = err instanceof Error ? err.message : 'Facebook login failed';
                cbError?.(msg);
              });
          } else {
            cbSetLoading?.(false);
          }
        },
        { scope: 'public_profile,email' }
      );
    } catch (err: unknown) {
      cbSetLoading?.(false);
      const msg = err instanceof Error ? err.message : 'Facebook login failed';
      cbError?.(msg);
    }
  };

  const handleGoogleFallbackClick = () => {
    const { onError: cbError } = callbacksRef.current;
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      cbError?.('Google Sign-In is loading or blocked by your browser. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full" data-testid="social-auth-buttons">
      {/* Google Section */}
      {!googleClientId ? (
        <Button
          type="button"
          variant="outline"
          disabled
          data-testid="google-auth-button"
          aria-label="Google sign-in disabled"
          title="Google login disabled: NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured"
          className="rounded-xl h-11 text-xs font-bold opacity-60 cursor-not-allowed w-full flex items-center justify-center gap-2 border-[var(--surface-border)]"
        >
          <GoogleIcon className="grayscale opacity-50 size-4" />
          <span>Google</span>
          <span className="text-[10px] text-[var(--text-muted)] font-normal">(Disabled)</span>
        </Button>
      ) : (
        <div
          data-testid="google-auth-container"
          className={`relative w-full min-h-[44px] flex items-center justify-center border border-[var(--surface-border)] rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-colors ${
            loading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div ref={googleContainerRef} className="w-full h-full flex items-center justify-center" />
          {!googleReady && (
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              data-testid="google-auth-button"
              aria-label="Sign in with Google"
              onClick={handleGoogleFallbackClick}
              className="absolute inset-0 rounded-xl h-11 text-xs font-bold cursor-pointer w-full flex items-center justify-center gap-2"
            >
              <GoogleIcon className="size-4" />
              <span>Google</span>
            </Button>
          )}
        </div>
      )}

      {/* Facebook Section */}
      {!facebookAppId ? (
        <Button
          type="button"
          variant="outline"
          disabled
          data-testid="facebook-auth-button"
          aria-label="Facebook sign-in disabled"
          title="Facebook login disabled: NEXT_PUBLIC_FACEBOOK_APP_ID is not configured"
          className="rounded-xl h-11 text-xs font-bold opacity-60 cursor-not-allowed w-full flex items-center justify-center gap-2 border-[var(--surface-border)]"
        >
          <FacebookIcon className="grayscale opacity-50 size-4" />
          <span>Facebook</span>
          <span className="text-[10px] text-[var(--text-muted)] font-normal">(Disabled)</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={loading || !fbReady}
          data-testid="facebook-auth-button"
          aria-label="Sign in with Facebook"
          onClick={handleFacebookClick}
          className="rounded-xl h-11 text-xs font-bold cursor-pointer w-full flex items-center justify-center gap-2 border-[var(--surface-border)]"
        >
          <FacebookIcon className="size-4" />
          <span>Facebook</span>
          {!fbReady && (
            <span className="text-[10px] text-[var(--text-muted)] font-normal">(Loading...)</span>
          )}
        </Button>
      )}
    </div>
  );
}


