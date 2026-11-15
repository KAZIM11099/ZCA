import { useEffect, useRef, useState } from 'react';

const googleScriptId = 'google-identity-services';
let initializedGoogleClientId = '';
let activeGoogleCredentialHandler = null;

export function GoogleSignIn({ onCredential, disabled = false }) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [loadError, setLoadError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return undefined;
    let active = true;
    let resizeObserver;
    const handleCredential = (credential) => {
      if (active && credential) onCredentialRef.current(credential);
    };
    activeGoogleCredentialHandler = handleCredential;

    const renderButton = () => {
      if (!active || !buttonRef.current || !window.google?.accounts?.id) return;
      const container = buttonRef.current;
      container.replaceChildren();
      if (initializedGoogleClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => activeGoogleCredentialHandler?.(credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        initializedGoogleClientId = clientId;
      }
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.max(200, Math.floor(container.clientWidth)),
      });
      setLoadError('');
    };

    const script = document.getElementById(googleScriptId);
    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      const identityScript = script || document.createElement('script');
      if (!script) {
        identityScript.id = googleScriptId;
        identityScript.src = 'https://accounts.google.com/gsi/client';
        identityScript.async = true;
        identityScript.defer = true;
      }

      const handleLoad = () => renderButton();
      const handleError = () => {
        if (active) setLoadError('Google sign-in could not be loaded. Please try again later.');
      };
      identityScript.addEventListener('load', handleLoad);
      identityScript.addEventListener('error', handleError);
      if (!script) document.head.appendChild(identityScript);
      if (identityScript.dataset.loaded === 'true') renderButton();
      identityScript.addEventListener('load', () => { identityScript.dataset.loaded = 'true'; }, { once: true });

      resizeObserver = new ResizeObserver(renderButton);
      if (buttonRef.current) resizeObserver.observe(buttonRef.current);
    }

    return () => {
      active = false;
      if (activeGoogleCredentialHandler === handleCredential) activeGoogleCredentialHandler = null;
      resizeObserver?.disconnect();
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <p className="text-center text-sm text-stone" role="status">
        Google sign-in needs a Web OAuth client ID to be configured.
      </p>
    );
  }

  return (
    <div>
      <div ref={buttonRef} className={`google-sign-in ${disabled ? 'pointer-events-none opacity-60' : ''}`} aria-label="Continue with Google" />
      {loadError && <p className="mt-2 text-center text-sm text-red-700" role="alert">{loadError}</p>}
    </div>
  );
}

