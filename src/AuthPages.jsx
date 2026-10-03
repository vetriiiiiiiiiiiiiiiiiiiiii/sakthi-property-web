import React, { useState, useEffect, useRef } from 'react';
import {
  login,
  loginWithGoogle,
  requestResetOtp,
  verifyResetOtp,
  resetPassword,
} from './authApi';

function AuthIcon({ name, size = 18 }) {
  const icons = {
    home: (
      <>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6 10.5V20h12v-9.5" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 21c0-3.7 3-6 7-6s7 2.3 7 6" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="16" r="3" />
        <path d="m10.5 13.5 7-7m-2 0 2 2m-4-4 2 2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v5c0 5-3.3 8.4-8 10-4.7-1.6-8-5-8-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.6" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
        <path d="M9.9 5.2A10.9 10.9 0 0 1 12 5c6 0 9.5 7 9.5 7a17.6 17.6 0 0 1-3.1 4.1" />
        <path d="M6.2 6.3C3.7 8 2.5 12 2.5 12S6 19 12 19c1.2 0 2.3-.2 3.3-.5" />
      </>
    ),
    arrowRight: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    arrowLeft: (
      <>
        <path d="M19 12H5" />
        <path d="M11 18l-6-6 6-6" />
      </>
    ),
    check: (
      <>
        <path d="M5 12.5 9.5 17 19 7.5" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name] || null}
    </svg>
  );
}

export function GoogleIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="google-icon"
      aria-hidden="true"
    >
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

export function SakthiLogo() {
  return (
    <div className="auth-card-logo">
      <img
        className="auth-card-logo-image"
        src="/sakthi-property-logo.png"
        alt="Sakthi Property — Building Your Tomorrow"
      />
    </div>
  );
}

function GoogleSetupModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel modal-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-modal-title"
      >
        <div className="modal-header">
          <h3 id="google-modal-title">Google Authentication</h3>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <AuthIcon name="arrowLeft" size={16} />
          </button>
        </div>
        <div
          className="modal-body"
          style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}
        >
          <p style={{ marginBottom: '12px' }}>
            To connect live Google accounts in production:
          </p>
          <ol
            style={{
              paddingLeft: '20px',
              margin: '0 0 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <li>
              Create an OAuth 2.0 Client ID in{' '}
              <strong>Google Cloud Console</strong>.
            </li>
            <li>
              Set <code>VITE_GOOGLE_CLIENT_ID</code> in root <code>.env</code>.
            </li>
            <li>
              Set <code>GOOGLE_CLIENT_ID</code> in <code>server/.env</code>.
            </li>
          </ol>
          <p>
            Restart the frontend and backend after changing these values. Google
            sign-in is available only to verified Google accounts that the server
            has authorized.
          </p>
        </div>
        <div
          className="modal-footer"
          style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}
        >
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function LoginPage({ onLoginSuccess, onForgotPassword }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef(null);

  // Google Identity Services returns a signed ID token to this callback.
  // The API verifies that token before creating a local session.
  useEffect(() => {
    const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleButtonRef.current) return undefined;

    let cancelled = false;
    const initialize = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            setGoogleLoading(true);
            setError('');
            const user = await loginWithGoogle(response.credential);
            onLoginSuccess(user);
          } catch (err) {
            setError(err.message || 'Google sign-in failed.');
          } finally {
            setGoogleLoading(false);
          }
        },
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 360,
      });
    };

    const existingScript = document.getElementById('google-gsi-client');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = initialize;
      script.onerror = () => setError('Unable to load Google sign-in. Please try again.');
      document.body.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initialize();
    } else {
      existingScript.addEventListener('load', initialize, { once: true });
    }
    return () => {
      cancelled = true;
      existingScript?.removeEventListener('load', initialize);
    };
  }, [onLoginSuccess]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (import.meta.env?.VITE_STANDALONE_MODE === 'true') {
        onLoginSuccess({
          id: 'standalone-admin',
          username: username.trim(),
          email: '',
          role: 'Administrator',
          profilePhoto: null,
        });
        return;
      }
      const user = await login(username.trim(), password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="auth-card" role="region" aria-label="Login form">
        <div className="auth-card-head">
          <span className="auth-kicker">ADMINISTRATOR PORTAL</span>
          <h1>Sign In</h1>
          <p>
            Enter your administrator credentials or continue with your Google account.
          </p>
        </div>

        {error && (
          <div
            className="auth-error"
            role="alert"
            style={{ marginBottom: '16px' }}
          >
            {error}
          </div>
        )}

        {import.meta.env?.VITE_GOOGLE_CLIENT_ID ? (
          <div
            ref={googleButtonRef}
            className="google-sign-in"
            aria-label="Continue with Google"
            aria-busy={googleLoading}
          />
        ) : (
          <button
            type="button"
            className="btn-google"
            onClick={() => setShowGoogleModal(true)}
            disabled={loading}
          >
            <GoogleIcon size={19} />
            <span>Continue with Google</span>
          </button>
        )}

        <div className="auth-divider">
          <span>or sign in with password</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <div className="auth-input">
              <AuthIcon name="user" size={17} />
              <input
                type="text"
                name="username"
                placeholder="e.g. razi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
          </label>

          <label>
            Password
            <div className="auth-input">
              <AuthIcon name="lock" size={17} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-visibility"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <AuthIcon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
          </label>

          <div className="auth-forgot">
            <button
              type="button"
              className="auth-link"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || googleLoading}
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <AuthIcon name="arrowRight" size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '22px' }}>
          <div className="auth-security-note">
            <strong>Enterprise Security</strong>
            <span>
              Sessions are protected with HTTP-only cookies and cryptographic
              hashing.
            </span>
          </div>
        </div>
      </div>

      <GoogleSetupModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
      />
    </>
  );
}

export function ForgotPasswordFlow({ onBackToLogin, onResetSuccess }) {
  const [step, setStep] = useState('request'); // 'request' | 'verify' | 'new_password' | 'done'
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  async function handleRequestOtp(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your administrator email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await requestResetOtp(email.trim());
      setVerificationToken(data.verificationToken || '');
      setStatusMessage(
        data.message || 'If registered, a verification code has been sent.'
      );
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Could not send verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await verifyResetOtp(verificationToken, otp.trim());
      setResetToken(data.resetToken || '');
      setStep('new_password');
    } catch (err) {
      setError(err.message || 'Verification code is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('Password must contain a lowercase letter.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain an uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain a number.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Password must contain a special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(resetToken, newPassword);
      setStep('done');
      if (onResetSuccess) {
        onResetSuccess();
      }
    } catch (err) {
      setError(
        err.message || 'Could not reset password. Session may have expired.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card" role="region" aria-label="Password recovery">
      <SakthiLogo />

      {step === 'request' && (
        <>
          <div className="auth-card-head">
            <span className="auth-kicker">PASSWORD RECOVERY</span>
            <h1>Reset Password</h1>
            <p>Enter your administrator email to receive a 6-digit reset code.</p>
          </div>

          {error && (
            <div
              className="auth-error"
              role="alert"
              style={{ marginBottom: '14px' }}
            >
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleRequestOtp}>
            <label>
              Administrator Email
              <div className="auth-input">
                <AuthIcon name="mail" size={17} />
                <input
                  type="email"
                  placeholder="admin@sakthiproperty.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </label>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Sending code...' : 'Send Verification Code'}
            </button>

            <button type="button" className="auth-back" onClick={onBackToLogin}>
              <AuthIcon name="arrowLeft" size={14} /> Back to Sign In
            </button>
          </form>
        </>
      )}

      {step === 'verify' && (
        <>
          <div className="auth-card-head" style={{ textAlign: 'center' }}>
            <div className="otp-icon" style={{ margin: '0 auto 12px' }}>
              <AuthIcon name="key" size={24} />
            </div>
            <span className="auth-kicker">VERIFICATION</span>
            <h1>Enter 6-Digit Code</h1>
            <p className="otp-help">
              We sent a verification code to <strong>{email}</strong>.
            </p>
          </div>

          {statusMessage && (
            <div className="auth-success" style={{ marginBottom: '14px' }}>
              {statusMessage}
            </div>
          )}
          {error && (
            <div
              className="auth-error"
              role="alert"
              style={{ marginBottom: '14px' }}
            >
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <label>
              Verification Code
              <div className="auth-input">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{
                    textAlign: 'center',
                    letterSpacing: '6px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                  autoFocus
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                className="auth-back"
                onClick={() => setStep('request')}
              >
                <AuthIcon name="arrowLeft" size={14} /> Change email
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={handleRequestOtp}
                disabled={loading}
              >
                Resend code
              </button>
            </div>
          </form>
        </>
      )}

      {step === 'new_password' && (
        <>
          <div className="auth-card-head">
            <span className="auth-kicker">NEW CREDENTIALS</span>
            <h1>Set New Password</h1>
            <p>Create a secure password with at least 12 characters.</p>
          </div>

          {error && (
            <div
              className="auth-error"
              role="alert"
              style={{ marginBottom: '14px' }}
            >
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleResetPassword}>
            <label>
              New Password
              <div className="auth-input">
                <AuthIcon name="lock" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 12 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="auth-visibility"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <AuthIcon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </label>

            <label>
              Confirm Password
              <div className="auth-input">
                <AuthIcon name="lock" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <div
              style={{
                fontSize: '11px',
                color: '#68778d',
                lineHeight: '1.5',
                margin: '4px 0 8px',
              }}
            >
              Requirement: Minimum 12 characters, uppercase letter, lowercase
              letter, number, and special character.
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Updating password...' : 'Save New Password'}
            </button>
          </form>
        </>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div
            className="otp-icon"
            style={{
              margin: '0 auto 16px',
              background: '#e5f7ec',
              color: '#1f9d55',
            }}
          >
            <AuthIcon name="check" size={26} />
          </div>
          <span className="auth-kicker">SUCCESS</span>
          <h1 style={{ marginBottom: '10px' }}>Password Changed</h1>
          <p style={{ color: '#68778d', fontSize: '13px', marginBottom: '24px' }}>
            Your administrator password has been updated. You can now sign in
            with your new password.
          </p>
          <button type="button" className="auth-submit" onClick={onBackToLogin}>
            Sign In Now
          </button>
        </div>
      )}
    </div>
  );
}

export default function AuthShell({ onLoginSuccess }) {
  const [view, setView] = useState('login'); // 'login' | 'forgot'

  return (
    <div className="auth-shell">
      <aside className="auth-brand-panel">
        <img
          className="auth-brand-logo"
          src="/sakthi-property-logo.png"
          alt="Sakthi Property — Building Your Tomorrow"
        />
        <div className="auth-brand-line" />
        <div className="auth-trust">
          <AuthIcon name="shield" size={16} />
          <span>Secure Administrative Management</span>
        </div>
        <div className="auth-footer">
          Better Properties
          <br />
          Brighter Future
        </div>
      </aside>

      <main className="auth-content">
        {view === 'login' ? (
          <LoginPage
            onLoginSuccess={onLoginSuccess}
            onForgotPassword={() => setView('forgot')}
          />
        ) : (
          <ForgotPasswordFlow
            onBackToLogin={() => setView('login')}
            onResetSuccess={() => {}}
          />
        )}
      </main>
    </div>
  );
}
