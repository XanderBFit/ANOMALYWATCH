import React, { useState } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  signInAnonymously
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2,
  Radio,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
  KeyRound,
  Radar,
  ArrowLeft,
  ChevronRight,
  Code2
} from 'lucide-react';
import { AwEmblem } from './AwButton';
import { InteractiveRadarWidget } from './InteractiveRadarWidget';
import { EmbedWidgetModal } from './EmbedWidgetModal';

interface LoginProps {
  onLoginSuccess: (alias?: string) => void;
}

type AuthMode = 'QUICK_ALIAS' | 'GOOGLE_PRIMARY' | 'EMAIL_SIGNIN' | 'EMAIL_REGISTER';

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [alias, setAlias] = useState(() => localStorage.getItem('anomalyWatch_username') || '');
  const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('EMAIL_SIGNIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showLiveDemo, setShowLiveDemo] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  const saveAliasToStorage = (chosenAlias: string) => {
    const finalAlias = chosenAlias.trim() || `OPERATIVE_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('anomalyWatch_username', finalAlias);
    if (!localStorage.getItem('anomalyWatch_specialty')) {
      localStorage.setItem('anomalyWatch_specialty', 'ANALYST');
    }
    return finalAlias;
  };

  const handleAliasEnter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    const finalAlias = saveAliasToStorage(alias);

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: finalAlias });
      } else {
        const res = await signInAnonymously(auth);
        if (res.user) {
          await updateProfile(res.user, { displayName: finalAlias });
        }
      }
      setInfoMessage(`Operative Callsign [${finalAlias}] authorized. Uplinking to HUD...`);
      setTimeout(() => onLoginSuccess(finalAlias), 350);
    } catch (err: any) {
      console.warn("Anonymous auth fallback:", err);
      setInfoMessage(`Local session established for [${finalAlias}]. Uplinking to HUD...`);
      setTimeout(() => onLoginSuccess(finalAlias), 350);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const displayName = user.displayName || user.email?.split('@')[0] || alias || 'OPERATIVE';
      const finalAlias = saveAliasToStorage(alias || displayName);
      onLoginSuccess(finalAlias);
    } catch (error: any) {
      console.error("Google authentication failed:", error);
      const code = error?.code || '';
      let msg = "Google authentication failed. ";
      if (code === 'auth/popup-blocked') {
        msg = "The sign-in popup was blocked by browser settings. Please allow popups or use the direct Operative Alias entry.";
      } else if (code === 'auth/popup-closed-by-user') {
        msg = "Authentication window was closed. Please try again.";
      } else if (code === 'auth/unauthorized-domain') {
        msg = "This domain is not in the Firebase authorized list. Please use the direct Operative Alias entry above.";
      } else {
        msg += error.message || "Please check connection and try again.";
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage("Please provide both Operative Email Address and Security Key/Password.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage("Security password must be at least 6 characters in length.");
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'EMAIL_REGISTER') {
        const res = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        const chosenAlias = saveAliasToStorage(alias.trim() || trimmedEmail.split('@')[0]);
        if (res.user) {
          await updateProfile(res.user, { displayName: chosenAlias });
        }
        setInfoMessage("Operative credentials provisioned successfully. Uplinking to HUD...");
        setTimeout(() => onLoginSuccess(chosenAlias), 450);
      } else {
        const res = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        const displayName = res.user.displayName || alias.trim() || trimmedEmail.split('@')[0];
        const chosenAlias = saveAliasToStorage(displayName);
        setInfoMessage("Operative credentials verified. Establishing uplink...");
        setTimeout(() => onLoginSuccess(chosenAlias), 450);
      }
    } catch (error: any) {
      console.error("Email auth error:", error);
      const code = error?.code || '';
      let msg = "Authentication failed: ";
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        msg = "Invalid operative email or password. Switch to 'New Operative Registration' if registering.";
      } else if (code === 'auth/email-already-in-use') {
        msg = "An operative profile already exists with this email. Switch to 'Sign In'.";
      } else if (code === 'auth/invalid-email') {
        msg = "Please enter a valid format email address (e.g., operative@agency.gov).";
      } else if (code === 'auth/weak-password') {
        msg = "Password is too weak. Please use at least 6 characters.";
      } else {
        msg += error.message || "Please verify credentials and try again.";
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setErrorMessage("Please type your operative email in the input above before requesting password reset.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setInfoMessage(`Password reset dispatch transmitted to ${email.trim()}.`);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to transmit password recovery dispatch.");
    } finally {
      setLoading(false);
    }
  };

  if (showLiveDemo) {
    return (
      <main 
        className="fixed inset-0 z-[200] bg-slate-950 text-slate-200 font-sans flex flex-col p-3 sm:p-6 overflow-y-auto custom-scrollbar"
        role="main"
      >
        <div className="max-w-6xl w-full mx-auto flex flex-col flex-1 gap-4">
          {/* Top Demo Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setShowLiveDemo(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>RETURN TO CALLSIGN SIGN-IN</span>
            </button>

            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
                GUEST PREVIEW MODE
              </span>
              <button
                onClick={() => setShowEmbedModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white font-mono text-xs font-bold tracking-wider transition-all cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>EMBED RADAR</span>
              </button>
              <button
                onClick={() => {
                  setShowLiveDemo(false);
                  onLoginSuccess(alias.trim() || 'GUEST OPERATIVE');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ufo-green hover:bg-ufo-green/90 text-black font-mono text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,255,157,0.4)] cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>UPLINK TO FULL HUD</span>
              </button>
            </div>
          </div>

          {/* Interactive Radar Component */}
          <div className="flex-1 min-h-[520px]">
            <InteractiveRadarWidget
              theme="emerald"
              defaultDomain="ALL"
              isStandalone={false}
              onUplink={(anomalyId) => {
                setShowLiveDemo(false);
                onLoginSuccess(alias.trim() || 'GUEST OPERATIVE');
              }}
              onOpenEmbedModal={() => setShowEmbedModal(true)}
            />
          </div>
        </div>

        <EmbedWidgetModal
          isOpen={showEmbedModal}
          onClose={() => setShowEmbedModal(false)}
        />
      </main>
    );
  }

  return (
    <main 
      className="fixed inset-0 z-[200] bg-anomaly-black text-slate-200 font-sans flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-[100dvh] custom-scrollbar selection:bg-ufo-green selection:text-black"
      role="main"
      aria-labelledby="auth-main-heading"
    >
      {/* Background Radar & Aura */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-20" aria-hidden="true">
        <div className="relative w-[140vw] h-[140vw] max-w-[1100px] max-h-[1100px]">
          <div className="absolute inset-0 border border-ufo-green/20 rounded-full"></div>
          <div className="absolute inset-[25%] border border-ufo-green/15 rounded-full"></div>
          <div className="absolute inset-[50%] border border-ufo-green/10 rounded-full"></div>
          <div className="absolute inset-0 radar-sweep-effect rounded-full animate-radar origin-center"></div>
        </div>
      </div>

      <div className="w-full max-w-xl relative z-10 flex flex-col items-center space-y-6 my-auto py-6">
        
        {/* Glowing Logo Header */}
        <header className="text-center space-y-2 select-none flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-ufo-green/10 border border-ufo-green/30 text-ufo-green text-[10px] font-mono font-bold tracking-[0.25em] uppercase mb-1 shadow-[0_0_15px_rgba(0,255,157,0.15)]">
            <Radio className="w-3.5 h-3.5 animate-spin text-ufo-green" aria-hidden="true" />
            <span>AUTHENTICATED ACCESS ONLY</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <AwEmblem size={36} className="text-ufo-green animate-pulse" />
            <h1 
              id="auth-main-heading"
              className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-[-0.02em] uppercase leading-none text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]"
            >
              ANOMALY <span className="text-ufo-green drop-shadow-[0_0_30px_#00ff9d]">WATCH</span>
            </h1>
          </div>

          <p className="text-xs sm:text-sm font-mono text-slate-400 uppercase tracking-[0.2em] pt-1 max-w-md">
            Tactical Intelligence HUD & Real-Time Monitor
          </p>
        </header>

        {/* Auth Main Card */}
        <div className="w-full bg-slate-950/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          {/* Ambient Corner Glow */}
          <div className="absolute top-0 right-0 w-80 h-32 bg-ufo-green/10 blur-3xl rounded-full pointer-events-none" aria-hidden="true"></div>

          {/* Status Feedback Banners */}
          <div aria-live="assertive" aria-atomic="true">
            {errorMessage && (
              <div 
                id="auth-error-banner"
                role="alert" 
                className="mb-5 p-4 bg-red-950/90 border border-red-500/80 rounded-2xl text-red-200 text-xs flex items-start gap-3 animate-fadeIn"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 leading-relaxed font-mono">
                  <strong className="block text-red-300 font-bold mb-0.5">ACCESS REJECTED:</strong>
                  {errorMessage}
                </div>
              </div>
            )}
          </div>

          <div aria-live="polite" aria-atomic="true">
            {infoMessage && (
              <div 
                id="auth-info-banner"
                role="status" 
                className="mb-5 p-4 bg-ufo-green/15 border border-ufo-green/60 rounded-2xl text-ufo-green text-xs flex items-start gap-3 animate-fadeIn"
              >
                <CheckCircle2 className="w-5 h-5 text-ufo-green shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 leading-relaxed font-mono font-bold">
                  {infoMessage}
                </div>
              </div>
            )}
          </div>

          {/* Public Interactive Demo Banner */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowLiveDemo(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-ufo-green/15 via-cyan-500/10 to-transparent border border-ufo-green/35 hover:border-ufo-green/70 hover:bg-ufo-green/20 transition-all text-left group cursor-pointer shadow-[0_0_20px_rgba(0,255,157,0.12)]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-ufo-green/20 text-ufo-green group-hover:scale-110 transition-transform">
                  <Radar className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-xs uppercase tracking-wider text-white">
                      TEST INTERACTIVE RADAR DEMO
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black bg-ufo-green text-black uppercase">
                      NO SIGN-IN REQUIRED
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400">
                    360° radar sweep, live anomaly blips & vector telemetry
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ufo-green group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </button>
          </div>

          {/* PRIMARY FLOW: Operative Alias Entry Form */}
          <form onSubmit={handleAliasEnter} className="space-y-4">
            <div className="space-y-2 text-left">
              <label 
                htmlFor="operative-alias-entry" 
                className="flex items-center justify-between text-xs font-mono uppercase text-white font-bold tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-ufo-green" aria-hidden="true" />
                  Operative Callsign / Alias
                </span>
                <span className="text-[10px] text-ufo-green/80 font-normal">ENTER NAME TO ACCESS</span>
              </label>

              <div className="relative">
                <input
                  id="operative-alias-entry"
                  name="alias"
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="e.g. CIPHER_LEAD, AGENT_FOX, VORTEX-9"
                  maxLength={28}
                  autoFocus
                  autoComplete="nickname"
                  className="w-full bg-black/70 border-2 border-white/20 hover:border-ufo-green/50 focus:border-ufo-green text-white font-mono text-base font-bold rounded-2xl px-5 py-4 focus:ring-4 focus:ring-ufo-green/20 focus:outline-none transition-all placeholder:text-slate-600 shadow-inner"
                />
              </div>
            </div>

            {/* Primary Entry Button */}
            <button
              type="submit"
              disabled={loading}
              aria-label="Enter Anomaly Watch HUD with written alias"
              className="w-full py-4 px-6 bg-gradient-to-r from-ufo-green via-emerald-400 to-teal-300 hover:from-emerald-400 hover:to-teal-200 text-black font-display font-black text-xs sm:text-sm uppercase tracking-[0.25em] rounded-2xl transition-all shadow-[0_0_30px_rgba(0,255,157,0.4)] hover:shadow-[0_0_45px_rgba(0,255,157,0.7)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufo-green"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-black" aria-hidden="true" />
                  <span>INITIALIZING TACTICAL UPLINK...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-black text-black" aria-hidden="true" />
                  <span>ENTER ANOMALY WATCH</span>
                  <ArrowRight className="w-4 h-4 text-black" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Tactical Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative bg-slate-950 px-3 text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500 font-bold">
              OR CLOUD SIGN-IN OPTIONS
            </div>
          </div>

          {/* Secondary Auth Options */}
          <div className="space-y-3">
            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              aria-label="Sign in securely with Google Account"
              className="w-full py-3.5 px-6 bg-white/90 hover:bg-white text-slate-900 font-display font-bold text-xs uppercase tracking-[0.15em] rounded-2xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufo-green border border-white/20"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>CONTINUE WITH GOOGLE</span>
            </button>

            {/* Toggle Advanced Email / Password Credentials */}
            <button
              type="button"
              onClick={() => setShowAdvancedAuth(!showAdvancedAuth)}
              className="w-full py-2.5 px-4 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400 hover:text-ufo-green transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-ufo-green" />
              <span>{showAdvancedAuth ? "HIDE EMAIL / PASSWORD LOGIN" : "USE EMAIL / PASSWORD CREDENTIALS"}</span>
            </button>

            {showAdvancedAuth && (
              <div className="pt-3 border-t border-white/10 space-y-4 animate-fadeIn">
                {/* Tabs */}
                <div 
                  role="tablist" 
                  aria-label="Operative Authentication Mode"
                  className="grid grid-cols-2 gap-2 p-1 bg-black/60 border border-white/10 rounded-2xl"
                >
                  <button
                    type="button"
                    role="tab"
                    id="tab-signin"
                    aria-selected={authMode !== 'EMAIL_REGISTER'}
                    aria-controls="panel-credentials"
                    onClick={() => {
                      setAuthMode('EMAIL_SIGNIN');
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      authMode !== 'EMAIL_REGISTER'
                        ? 'bg-ufo-green/20 text-ufo-green border border-ufo-green/40 shadow-inner'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="tab-register"
                    aria-selected={authMode === 'EMAIL_REGISTER'}
                    aria-controls="panel-credentials"
                    onClick={() => {
                      setAuthMode('EMAIL_REGISTER');
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      authMode === 'EMAIL_REGISTER'
                        ? 'bg-ufo-green/20 text-ufo-green border border-ufo-green/40 shadow-inner'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Register
                  </button>
                </div>

                {/* Email Form */}
                <form 
                  id="panel-credentials"
                  role="tabpanel"
                  onSubmit={handleEmailAuth}
                  className="space-y-3"
                  noValidate
                >
                  <div className="space-y-1 text-left">
                    <label 
                      htmlFor="operative-email-input" 
                      className="block text-[11px] font-mono uppercase text-slate-300 font-bold tracking-wider"
                    >
                      Operative Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="operative-email-input"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="operative@domain.com"
                        autoComplete="email"
                        className="w-full bg-black/60 border border-white/15 text-white font-mono text-xs rounded-xl pl-10 pr-4 py-2.5 focus:border-ufo-green focus:outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <label 
                        htmlFor="operative-password-input" 
                        className="block text-[11px] font-mono uppercase text-slate-300 font-bold tracking-wider"
                      >
                        Security Key / Password
                      </label>
                      {authMode === 'EMAIL_SIGNIN' && (
                        <button
                          type="button"
                          onClick={handlePasswordReset}
                          className="text-[10px] font-mono text-slate-400 hover:text-ufo-green underline cursor-pointer"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="operative-password-input"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete={authMode === 'EMAIL_REGISTER' ? "new-password" : "current-password"}
                        className="w-full bg-black/60 border border-white/15 text-white font-mono text-xs rounded-xl pl-10 pr-10 py-2.5 focus:border-ufo-green focus:outline-none transition-all placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 p-1"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-ufo-green hover:bg-emerald-400 text-black font-display font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {authMode === 'EMAIL_REGISTER' ? 'REGISTER & ENTER' : 'AUTHENTICATE & ENTER'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Security Protocols Notice */}
          <footer className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3 h-3 text-ufo-green" aria-hidden="true" />
              FIREBASE TLS 1.3 ENCRYPTION
            </span>
            <span className="text-slate-400">
              HUD CLEARANCE PROTOCOL
            </span>
          </footer>
        </div>
      </div>

      <EmbedWidgetModal
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
      />
    </main>
  );
};

export default Login;

