import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Zap, 
  Check, 
  Star, 
  X, 
  BellRing, 
  History, 
  FileSpreadsheet, 
  Video, 
  Rss, 
  Bot, 
  Sparkles,
  Lock,
  Unlock,
  CreditCard,
  Building2,
  Loader2
} from 'lucide-react';
import { createCheckoutSession, PRICING_PLANS } from '../src/lib/stripe/subscriptionService';

interface ClearancePricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredFeature?: string;
  onUpgradeSuccess?: (tier: string) => void;
}

export type ClearanceTier = 'OBSERVER' | 'OPERATIVE' | 'ANALYST';

export const ClearancePricingModal: React.FC<ClearancePricingModalProps> = ({
  isOpen,
  onClose,
  requiredFeature,
  onUpgradeSuccess
}) => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [activeTier, setActiveTier] = useState<ClearanceTier>(() => {
    const saved = localStorage.getItem('anomaly_clearance_tier');
    return (saved as ClearanceTier) || 'OBSERVER';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTier = async (tier: ClearanceTier) => {
    setErrorMessage(null);
    if (tier === 'OBSERVER') {
      localStorage.setItem('anomaly_clearance_tier', 'OBSERVER');
      setActiveTier('OBSERVER');
      window.dispatchEvent(new CustomEvent('anomaly-clearance-updated', { detail: { tier: 'OBSERVER' } }));
      if (onUpgradeSuccess) onUpgradeSuccess('OBSERVER');
      return;
    }

    setIsProcessing(true);
    setProcessingTier(tier);

    try {
      // Find matching price ID
      const plan = PRICING_PLANS.find(p => p.id === (tier === 'OPERATIVE' ? 'operative' : 'creator_analyst'));
      const priceId = billingCycle === 'ANNUAL' ? plan?.stripePriceIdYearly : plan?.stripePriceIdMonthly;

      if (!priceId) {
        throw new Error("No Stripe Price ID configured for selected tier.");
      }

      console.log(`[Stripe Checkout] Initiating checkout for ${tier} (${billingCycle}) with price ${priceId}...`);
      const checkoutUrl = await createCheckoutSession(priceId, undefined, tier, billingCycle);

      if (checkoutUrl) {
        // Check if URL is simulated or real Stripe Checkout
        if (checkoutUrl.includes('dev_simulated=true')) {
          localStorage.setItem('anomaly_clearance_tier', tier);
          setActiveTier(tier);
          setActivationSuccess(`AUTHORIZING CLEARANCE TIER: ${tier} (${billingCycle})`);
          window.dispatchEvent(new CustomEvent('anomaly-clearance-updated', { detail: { tier } }));
          if (onUpgradeSuccess) onUpgradeSuccess(tier);

          setTimeout(() => {
            setActivationSuccess(null);
            setIsProcessing(false);
            setProcessingTier(null);
            onClose();
          }, 1500);
        } else {
          // Redirect user to Stripe Checkout page
          window.location.href = checkoutUrl;
        }
      }
    } catch (err: any) {
      console.error("[Stripe Checkout Error]:", err);
      setErrorMessage(err.message || "Failed to initiate Stripe Checkout session. Please try again.");
      setIsProcessing(false);
      setProcessingTier(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto font-mono">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl bg-slate-950 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 overflow-hidden my-auto"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-ufo-green/10 blur-3xl pointer-events-none rounded-full" />

          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-ufo-green text-xs font-bold uppercase tracking-widest mb-1">
                <Shield className="w-4 h-4 animate-pulse" />
                <span>OPERATIVE SUBSCRIPTION & CLEARANCE TIER MATRIX</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white uppercase tracking-tight">
                UPGRADE YOUR OSINT INTELLIGENCE CAPACITY
              </h2>
              {requiredFeature && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>RESTRICTED FEATURE GATE: {requiredFeature}</span>
                </div>
              )}
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${billingCycle === 'MONTHLY' ? 'text-white' : 'text-slate-500'}`}>
              MONTHLY BILLING
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'MONTHLY' ? 'ANNUAL' : 'MONTHLY')}
              className="relative w-14 h-7 rounded-full bg-slate-800 p-1 border border-white/10 transition-colors"
            >
              <motion.div 
                className="w-5 h-5 rounded-full bg-ufo-green shadow-lg"
                animate={{ x: billingCycle === 'ANNUAL' ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${billingCycle === 'ANNUAL' ? 'text-ufo-green' : 'text-slate-500'}`}>
                ANNUAL BILLING
              </span>
              <span className="text-[9px] font-extrabold bg-ufo-green/20 text-ufo-green px-2 py-0.5 rounded-full border border-ufo-green/30">
                SAVE 18%
              </span>
            </div>
          </div>

          {/* Notification Toast */}
          {activationSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-ufo-green/20 border border-ufo-green/50 text-ufo-green text-center text-xs font-bold tracking-widest flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>{activationSuccess}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-300 text-center text-xs font-bold flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">

            {/* TIER 1: PUBLIC OBSERVER */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
              activeTier === 'OBSERVER' 
                ? 'bg-slate-900/90 border-ufo-green/50 shadow-[0_0_30px_rgba(0,255,157,0.1)]' 
                : 'bg-slate-950/60 border-white/10 hover:border-white/20'
            }`}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">PUBLIC ACCESS</span>
                  {activeTier === 'OBSERVER' && (
                    <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                      CURRENT TIER
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white uppercase">PUBLIC OBSERVER</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold text-white">$0</span>
                    <span className="text-xs text-slate-500">/ forever</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Ideal for casual watchers monitoring basic global sensor telemetry.
                </p>

                <div className="border-t border-white/10 pt-4 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                    <span>Live Global Radar Map (Last 48h data)</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                    <span>Standard Telemetry (USGS & NOAA feeds)</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                    <span>Community Sighting Submissions</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500 line-through">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Real-time Geofenced SMS/Telegram Alerts</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500 line-through">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Historical Archive Scrubbing (&gt;48h)</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500 line-through">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>One-Click Media Studio Dossier Export</span>
                  </div>
                </div>
              </div>

              <button
                disabled={activeTier === 'OBSERVER' || isProcessing}
                onClick={() => handleSelectTier('OBSERVER')}
                className="mt-6 w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold uppercase transition-all disabled:opacity-50"
              >
                {activeTier === 'OBSERVER' ? 'ACTIVE CLEARANCE' : 'SWITCH TO OBSERVER'}
              </button>
            </div>

            {/* TIER 2: FIELD OPERATIVE (POPULAR) */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between transition-all relative ${
              activeTier === 'OPERATIVE' 
                ? 'bg-slate-900/90 border-ufo-green/80 shadow-[0_0_35px_rgba(0,255,157,0.2)]' 
                : 'bg-slate-900/70 border-ufo-green/30 hover:border-ufo-green/50'
            }`}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-ufo-green text-black font-extrabold text-[9px] uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                RECOMMENDED FOR SKYWATCHERS
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-ufo-green font-bold tracking-widest uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" /> FIELD OPERATIVE
                  </span>
                  {activeTier === 'OPERATIVE' && (
                    <span className="text-[9px] bg-ufo-green/20 text-ufo-green font-bold px-2.5 py-0.5 rounded-full border border-ufo-green/40">
                      CURRENT TIER
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white uppercase">FIELD OPERATIVE</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold text-ufo-green">
                      {billingCycle === 'ANNUAL' ? '$7.40' : '$9.00'}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  {billingCycle === 'ANNUAL' && (
                    <p className="text-[10px] text-slate-500 mt-0.5">$89 billed annually</p>
                  )}
                </div>

                <p className="text-xs text-slate-300">
                  For active investigators, skywatchers, and drone operators needing early alerts.
                </p>

                <div className="border-t border-white/10 pt-4 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-white">
                    <Check className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                    <span><strong>Everything in Public Observer</strong></span>
                  </div>
                  <div className="flex items-start gap-2 text-white">
                    <BellRing className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                    <span><strong>Real-Time Geofenced Alerts</strong> (SMS, Telegram, Webhooks)</span>
                  </div>
                  <div className="flex items-start gap-2 text-white">
                    <History className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                    <span><strong>30-Day Historical Archive Scrubbing</strong></span>
                  </div>
                  <div className="flex items-start gap-2 text-white">
                    <Rss className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                    <span><strong>Subscriber RSS Podcast Feed</strong> for Audio Briefings</span>
                  </div>
                  <div className="flex items-start gap-2 text-white">
                    <Check className="w-4 h-4 text-ufo-green shrink-0 mt-0.5" />
                    <span>High-Refresh Ad-Free Radar HUD</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500 line-through">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>One-Click Media Studio Dossier Export</span>
                  </div>
                </div>
              </div>

              <button
                disabled={isProcessing}
                onClick={() => handleSelectTier('OPERATIVE')}
                className="mt-6 w-full py-3 rounded-2xl bg-ufo-green hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing && processingTier === 'OPERATIVE' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>CONNECTING STRIPE...</span>
                  </>
                ) : activeTier === 'OPERATIVE' ? (
                  'ACTIVE CLEARANCE'
                ) : (
                  `UPGRADE TO OPERATIVE (${billingCycle === 'ANNUAL' ? '$89/YR' : '$9/MO'})`
                )}
              </button>
            </div>

            {/* TIER 3: OSINT ANALYST / CREATOR */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
              activeTier === 'ANALYST' 
                ? 'bg-slate-900/90 border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.2)]' 
                : 'bg-slate-950/60 border-amber-500/30 hover:border-amber-500/50'
            }`}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase flex items-center gap-1">
                    <Star className="w-3 h-3" /> CREATOR / ANALYST
                  </span>
                  {activeTier === 'ANALYST' && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40">
                      CURRENT TIER
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white uppercase">OSINT ANALYST</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold text-amber-400">
                      {billingCycle === 'ANNUAL' ? '$24.10' : '$29.00'}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  {billingCycle === 'ANNUAL' && (
                    <p className="text-[10px] text-slate-500 mt-0.5">$290 billed annually</p>
                  )}
                </div>

                <p className="text-xs text-slate-300">
                  For YouTubers, podcasters, journalists, and professional OSINT researchers.
                </p>

                <div className="border-t border-white/10 pt-4 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-white">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Everything in Field Operative</strong></span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-300">
                    <Video className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>One-Click Media Studio Export</strong> (PDF/PNG & Script Pack)</span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-300">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Multi-Year Historical Archive</strong> (CSV, GeoJSON, KML)</span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Priority Gemini AI Deep-Dive Engine</strong></span>
                  </div>
                  <div className="flex items-start gap-2 text-white">
                    <Bot className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>API Access (10,000 requests/mo)</span>
                  </div>
                </div>
              </div>

              <button
                disabled={isProcessing}
                onClick={() => handleSelectTier('ANALYST')}
                className="mt-6 w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing && processingTier === 'ANALYST' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>CONNECTING STRIPE...</span>
                  </>
                ) : activeTier === 'ANALYST' ? (
                  'ACTIVE CLEARANCE'
                ) : (
                  `UPGRADE TO ANALYST (${billingCycle === 'ANNUAL' ? '$290/YR' : '$29/MO'})`
                )}
              </button>
            </div>

          </div>

          {/* Footer Security Note */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Encrypted Stripe billing via Firebase Authentication. Cancel anytime with 1-click.</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
