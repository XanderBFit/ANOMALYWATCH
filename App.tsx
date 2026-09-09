import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import NavBar from './components/NavBar';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import GlobalAlertHud from './components/GlobalAlertHud';
import AgentProfile from './components/AgentProfile';
import { AudioProvider } from './contexts/AudioContext';
import { PresenceService, isCloudEnabled, handleSyncError, UserOps } from './services/firebaseService';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { AppView, GlobalAlert, AgentIdentity, AlertSubscription } from './types';
import { triggerTacticalVibration } from './services/geminiService';
import { ProgressionService, XP_VALUES } from './services/progressionService';
import { SubscriptionOps } from './services/firebaseService';
import { PersonalizationPanel } from './components/PersonalizationPanel';
import QuickCaptureButton from './components/QuickCaptureButton';
import { AnomalyWatchAssistant } from './components/AnomalyWatchAssistant';
import { TopHeader } from './components/TopHeader';
import { SpaceWeatherBar } from './components/SpaceWeatherBar';
import { autoRunBatchSeedIfNeeded } from './services/seedService';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { GeofencedAlertModal } from './components/GeofencedAlertModal';
import { InteractiveRadarWidget } from './components/InteractiveRadarWidget';

// Lazy-loaded heavy components for code splitting & smaller initial bundle size
const Dashboard = lazy(() => import('./components/Dashboard'));
const Analyzer = lazy(() => import('./components/Analyzer'));
const OpsLog = lazy(() => import('./components/OpsLog'));
const Investigate = lazy(() => import('./components/Investigate'));
const SourceNexus = lazy(() => import('./components/SourceNexus'));
const VideoIntel = lazy(() => import('./components/VideoIntel'));
const BriefingRoom = lazy(() => import('./components/BriefingRoom'));
const ProtocolManual = lazy(() => import('./components/ProtocolManual'));
const CelestialTracker = lazy(() => import('./components/CelestialTracker'));
const OldschoolChatroom = lazy(() => import('./components/OldschoolChatroom'));
const AnomalyMap = lazy(() => import('./components/AnomalyMap').then(m => ({ default: m.AnomalyMap })));
const IntelligencePatternEngine = lazy(() => import('./components/IntelligencePatternEngine').then(m => ({ default: m.IntelligencePatternEngine })));

const ViewLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px] font-mono text-ufo-green text-xs tracking-widest uppercase">
    <div className="flex items-center space-x-3 animate-pulse">
      <div className="w-5 h-5 border-2 border-ufo-green border-t-transparent rounded-full animate-spin"></div>
      <span>DECRYPTING INTEL NODE...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<string>('ANALYST');
  const [initialOpsLogFilter, setInitialOpsLogFilter] = useState<string | null>(null);
  const [initialSearchTerm, setInitialSearchTerm] = useState<string>('');
  const [investigationTopic, setInvestigationTopic] = useState<string | null>(null);
  
  const [alerts, setAlerts] = useState<GlobalAlert[]>([]);
  
  const [systemHealth, setSystemHealth] = useState({ ai: 'ACTIVE', cloud: 'SYNCING', vault: 'SECURE' });
  const [cloudStatus, setCloudStatus] = useState(isCloudEnabled());
  const [isNavCollapsed, setIsNavCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  
  const [showProfile, setShowProfile] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState<AlertSubscription[]>([]);
  const [isUplinked, setIsUplinked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('anomalyWatch_session_active') === 'true';
  });

  // Check if standalone embed widget mode is requested via URL query params
  const isWidgetMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'widget' || params.get('embed') === 'true';
  }, []);

  const widgetConfig = useMemo(() => {
    if (typeof window === 'undefined') return { theme: 'emerald' as const, domain: 'ALL' as const };
    const params = new URLSearchParams(window.location.search);
    const theme = (params.get('theme') as any) || 'emerald';
    const domain = (params.get('domain') as any) || 'ALL';
    return { theme, domain };
  }, []);

  useEffect(() => {
    autoRunBatchSeedIfNeeded().catch(err => {
      console.warn("Batch archive seed initialization warning:", err);
    });
  }, []);

  useEffect(() => {
    // Safety timeout: ensure loadingAuth never gets stuck if auth state resolution is delayed
    const authTimeout = setTimeout(() => {
      setLoadingAuth(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(authTimeout);
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const chosenName = userData.displayName || currentUser.displayName || localStorage.getItem('anomalyWatch_username') || 'OPERATIVE';
            setUsername(chosenName);
            setSpecialty(userData.specialty || 'ANALYST');
          } else {
            const userEmail = currentUser.email || `agent_${currentUser.uid.slice(0, 8)}@anomalywatch.internal`;
            const defaultName = currentUser.displayName || localStorage.getItem('anomalyWatch_username') || (currentUser.isAnonymous ? 'GUEST OPERATIVE' : 'OPERATIVE');

            await UserOps.updateUser(currentUser.uid, {
              uid: currentUser.uid,
              email: userEmail,
              role: 'client',
              displayName: defaultName
            });
            setUsername(defaultName);
          }
        } catch (err) {
          console.warn("User profile synchronization warning:", err);
          setUsername(currentUser.displayName || localStorage.getItem('anomalyWatch_username') || (currentUser.isAnonymous ? 'GUEST OPERATIVE' : 'OPERATIVE'));
        } finally {
          setLoadingAuth(false);
        }
      } else {
        const storedLocal = localStorage.getItem('anomalyWatch_username');
        if (storedLocal) {
          setUsername(storedLocal);
        }
        setLoadingAuth(false);
      }
    });

    const handleSessionReset = () => {
      sessionStorage.removeItem('anomalyWatch_session_active');
      setIsUplinked(false);
    };

    window.addEventListener('anomaly-logout', handleSessionReset);

    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
      window.removeEventListener('anomaly-logout', handleSessionReset);
    };
  }, []);

  useEffect(() => {
    if (!cloudStatus || !user) return;

    try {
      const presenceCleanup = PresenceService.trackPresence(user.uid, username || 'Anonymous');
      return () => {
        if (typeof presenceCleanup === 'function') presenceCleanup();
      };
    } catch (e) {
      handleSyncError(e);
    }
  }, [cloudStatus, user, username]);

  // Global Tactical Keyboard Navigation & Custom Event Handlers
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is actively typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGeofenceModal(prev => !prev);
      } else if (e.key === '1') {
        e.preventDefault();
        handleSetView('dashboard');
      } else if (e.key === '2') {
        e.preventDefault();
        handleSetView('patternEngine');
      } else if (e.key === '3') {
        e.preventDefault();
        handleSetView('map');
      } else if (e.key === '4') {
        e.preventDefault();
        handleSetView('chatroom');
      } else if (e.key === '5') {
        e.preventDefault();
        handleSetView('briefing');
      } else if (e.key === '6') {
        e.preventDefault();
        handleSetView('opslog');
      }
    };

    const handleToggleShortcuts = () => setShowShortcutsModal(prev => !prev);
    const handleToggleGeofence = () => setShowGeofenceModal(prev => !prev);

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('toggle-shortcuts-modal', handleToggleShortcuts);
    window.addEventListener('toggle-geofence-modal', handleToggleGeofence);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('toggle-shortcuts-modal', handleToggleShortcuts);
      window.removeEventListener('toggle-geofence-modal', handleToggleGeofence);
    };
  }, []);

  const handleSetView = useCallback((newView: AppView, options?: { filter?: string; investigation?: string; query?: string }) => {
    triggerTacticalVibration(30);
    setCurrentView(newView);
    if (options?.filter) setInitialOpsLogFilter(options.filter);
    if (options?.investigation) setInvestigationTopic(options.investigation);
    if (options?.query) setInitialSearchTerm(options.query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = (term: string) => {
    setInitialSearchTerm(term);
    handleSetView('briefing', { query: term });
  };

  const handleOnboardingComplete = (identity: { username: string; specialty: string }) => {
    setUsername(identity.username);
    setSpecialty(identity.specialty);
    localStorage.setItem('anomalyWatch_username', identity.username);
    localStorage.setItem('anomalyWatch_specialty', identity.specialty);
    ProgressionService.addXP(XP_VALUES.CREATE_CASE, "OPERATIVE ONBOARDING COMPLETE");
    if (user) {
      UserOps.updateUser(user.uid, {
        displayName: identity.username,
        specialty: identity.specialty
      });
    }
  };

  const handleProfileUpdate = (identity: AgentIdentity) => {
    setUsername(identity.username);
    setSpecialty(identity.specialty);
    if (user) {
      UserOps.updateUser(user.uid, {
        displayName: identity.username,
        specialty: identity.specialty,
        ...identity
      });
    }
  };

  // Direct standalone widget rendering for external iframes & embeds
  if (isWidgetMode) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col p-1 sm:p-2 overflow-hidden">
        <InteractiveRadarWidget
          theme={widgetConfig.theme}
          defaultDomain={widgetConfig.domain}
          isStandalone={true}
          onUplink={(targetId) => {
            const dest = targetId ? `${window.location.origin}/?anomaly=${targetId}` : window.location.origin;
            window.open(dest, '_blank');
          }}
        />
      </div>
    );
  }

  if (loadingAuth) {
    return (
      <div className="fixed inset-0 z-[200] bg-black text-ufo-green font-mono flex items-center justify-center p-4">
        <div className="flex items-center space-x-3 text-lg animate-pulse">
          <div className="w-6 h-6 border-4 border-ufo-green border-t-transparent rounded-full animate-spin"></div>
          <span>ESTABLISHING SECURE UPLINK...</span>
        </div>
      </div>
    );
  }

  // Always show Main Anomaly Watch Screen with Alias first on app load
  if (!isUplinked || !user) {
    return (
      <Login 
        onLoginSuccess={(chosenAlias) => {
          const activeAlias = chosenAlias || localStorage.getItem('anomalyWatch_username') || username || 'OPERATIVE';
          setUsername(activeAlias);
          sessionStorage.setItem('anomalyWatch_session_active', 'true');
          setIsUplinked(true);
        }} 
      />
    );
  }

  if (!username) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <AudioProvider>
      <div className="relative min-h-screen bg-anomaly-black text-slate-200 selection:bg-ufo-green selection:text-black">
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 grid-pattern opacity-40"></div>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-anomaly-black to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-anomaly-black to-transparent"></div>
          
          {/* Subtle Vertical Accents */}
          <div className="v-line left-[20%] opacity-20"></div>
          <div className="v-line left-[40%] opacity-10"></div>
          <div className="v-line left-[60%] opacity-10"></div>
          <div className="v-line left-[80%] opacity-20"></div>
        </div>

        <GlobalAlertHud 
          alerts={alerts} 
          onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))} 
          onNavigate={(v) => handleSetView(v)}
        />
        <AgentProfile isOpen={showProfile} onClose={() => setShowProfile(false)} onUpdate={handleProfileUpdate} />

        <NavBar 
          currentView={currentView} 
          setView={(v) => handleSetView(v)} 
          onSearch={handleSearch} 
          specialty={specialty}
          setSpecialty={(s) => { setSpecialty(s); }}
          onOpenProfile={() => setShowProfile(true)}
          onOpenPersonalization={() => setShowPersonalization(true)}
          cloudStatus={cloudStatus}
          isCollapsed={isNavCollapsed}
          onToggleCollapse={() => setIsNavCollapsed(prev => !prev)}
        />

        <PersonalizationPanel 
          isOpen={showPersonalization} 
          onClose={() => setShowPersonalization(false)}
          onPreferencesChange={async (categories, keywords) => {
            if (cloudStatus && user) {
              try {
                await SubscriptionOps.subscribeToAlerts({
                   category: categories.join(','),
                   keywords: keywords,
                   location: ''
                });
              } catch (e) {
                console.error("Cloud sub failed", e);
              }
            }
          }}
        />

        {/* Global Keyboard Shortcuts Cheat Sheet Modal */}
        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
        />

        {/* Geofenced Dispatch Alerts Engine Modal */}
        <GeofencedAlertModal
          isOpen={showGeofenceModal}
          onClose={() => setShowGeofenceModal(false)}
          userClearance="ANALYST"
          onNeedUpgrade={() => {}}
        />

        <main className={`transition-all duration-300 ${isNavCollapsed ? 'lg:ml-20 md:ml-20' : 'lg:ml-80 md:ml-20'} pt-16 px-3 sm:px-6 md:px-8 lg:px-12 relative z-10 min-h-[100dvh] pb-32 md:pb-36 overflow-y-auto custom-scrollbar`}>
          <div className="max-w-[1700px] mx-auto space-y-4">
            <SpaceWeatherBar />
            <TopHeader 
              onOpenProfile={() => setShowProfile(true)}
              cloudStatus={cloudStatus}
              username={username || 'OPERATIVE'}
              specialty={specialty}
              onOpenGeofence={() => setShowGeofenceModal(true)}
              onOpenShortcuts={() => setShowShortcutsModal(true)}
            />
            <Suspense fallback={<ViewLoadingFallback />}>
              {currentView === 'dashboard' && <Dashboard setView={(v, f) => handleSetView(v as AppView, { filter: f })} specialty={specialty} subscriptions={userSubscriptions} />}
              {currentView === 'nexus' && <SourceNexus />}
              {currentView === 'analyzer' && <Analyzer setView={(v, f, i) => handleSetView(v as AppView, { filter: f, investigation: i })} />}
              {currentView === 'videointel' && <VideoIntel setView={(v) => handleSetView(v as AppView)} />}
              {currentView === 'opslog' && <OpsLog initialFilterCategory={initialOpsLogFilter} />}
              {currentView === 'investigate' && <Investigate setView={(v) => handleSetView(v as AppView)} initialTopic={investigationTopic} />}
              {currentView === 'briefing' && <BriefingRoom initialQuery={initialSearchTerm} setView={(v) => handleSetView(v as AppView)} />}
              {currentView === 'protocols' && <ProtocolManual />}
              {currentView === 'celestial' && <CelestialTracker />}
              {currentView === 'patternEngine' && <IntelligencePatternEngine />}
              {currentView === 'map' && <AnomalyMap />}
              {currentView === 'chatroom' && <OldschoolChatroom />}
              {currentView === 'radarWidget' && (
                <div className="p-2 sm:p-4 rounded-3xl bg-slate-950/80 border border-white/10 shadow-2xl">
                  <InteractiveRadarWidget
                    theme="emerald"
                    defaultDomain="ALL"
                    isStandalone={false}
                    onUplink={() => handleSetView('dashboard')}
                  />
                </div>
              )}
            </Suspense>
          </div>
        </main>
        <QuickCaptureButton />
        <AnomalyWatchAssistant onNavigateToInvestigate={(topic) => handleSetView('investigate', { investigation: topic })} />
      </div>
    </AudioProvider>
  );
};

export default App;
