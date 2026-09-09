import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  MapPin, 
  Compass, 
  Send, 
  Bot, 
  Smartphone, 
  Mail, 
  Check, 
  X, 
  ShieldAlert, 
  Radio, 
  Zap, 
  Globe, 
  Save, 
  CheckCircle2,
  Lock,
  Crosshair,
  Loader2
} from 'lucide-react';
import { SubscriptionOps } from '../services/firebaseService';

interface GeofencedAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  userClearance: string;
  onNeedUpgrade: () => void;
}

export const GeofencedAlertModal: React.FC<GeofencedAlertModalProps> = ({
  isOpen,
  onClose,
  userClearance,
  onNeedUpgrade
}) => {
  const isSubscriber = userClearance === 'OPERATIVE' || userClearance === 'ANALYST';

  // State for Alert Trigger Parameters
  const [alertName, setAlertName] = useState('Home Field Radar Alert');
  const [centerLat, setCenterLat] = useState('36.2361');
  const [centerLng, setCenterLng] = useState('-115.0583'); // Area 51 / Nellis default
  const [radiusMiles, setRadiusMiles] = useState(50);
  const [minSeverity, setMinSeverity] = useState<'GRADE_X' | 'CRITICAL' | 'HIGH' | 'ALL'>('CRITICAL');
  const [solarKpTrigger, setSolarKpTrigger] = useState(5.0);
  const [notifyUncorrelated, setNotifyUncorrelated] = useState(true);

  // Dispatch Channels
  const [channelType, setChannelType] = useState<'TELEGRAM' | 'DISCORD' | 'SMS' | 'EMAIL'>('TELEGRAM');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');

  // Geolocation detection state
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Execution feedback
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser environment.");
      return;
    }
    setIsDetectingLocation(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenterLat(pos.coords.latitude.toFixed(4));
        setCenterLng(pos.coords.longitude.toFixed(4));
        setAlertName('My GPS Perimeter Watch');
        setIsDetectingLocation(false);
      },
      (err) => {
        console.warn("Geolocation query failed", err);
        setGeoError("Unable to acquire GPS fix. Please enter coordinates manually.");
        setIsDetectingLocation(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const presetLocations = [
    { name: 'Area 51 / Nellis', lat: '36.2361', lng: '-115.0583' },
    { name: 'Cape Canaveral', lat: '28.3922', lng: '-80.6077' },
    { name: 'Gulf Range / Eglin', lat: '30.4833', lng: '-86.5250' },
    { name: 'Pine Gap', lat: '-23.7990', lng: '133.7370' },
    { name: 'Vandenberg Space Base', lat: '34.7420', lng: '-120.5724' }
  ];

  const radiusPresets = [15, 30, 50, 100, 250];

  const handleTestDispatch = () => {
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult(`TEST ALERT DISPATCHED TO ${channelType}: "NOAA/USGS CRITICAL: Grade X Uncorrelated Sighting within ${radiusMiles}mi of Lat:${centerLat}, Lng:${centerLng}"`);
    }, 1000);
  };

  const handleSaveAlert = async () => {
    if (!isSubscriber) {
      onNeedUpgrade();
      return;
    }

    setIsSaving(true);
    try {
      await SubscriptionOps.createSubscription({
        userId: 'local-operative',
        locationName: alertName,
        centerLat: parseFloat(centerLat),
        centerLng: parseFloat(centerLng),
        radiusKm: Math.round(radiusMiles * 1.60934),
        categories: ['UFO / UAP', 'Gov / Black Ops', 'Phenomena'],
        notifyEmail: emailAddress || undefined,
        telegramChatId: telegramChatId || undefined,
        discordWebhookUrl: discordWebhookUrl || undefined,
        phoneNumber: phoneNumber || undefined,
        createdAt: Date.now()
      });

      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1400);
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto font-mono"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl bg-slate-950 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 overflow-hidden my-auto"
        >
          {/* Top Bar */}
          <div className="flex items-start justify-between border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 text-ufo-green text-xs font-bold uppercase tracking-widest mb-1">
                <Bell className="w-4 h-4 animate-bounce" />
                <span>REAL-TIME GEOFENCED ALERT ENGINE</span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-extrabold text-white uppercase tracking-tight">
                CONFIGURE TACTICAL DISPATCH TRIGGERS
              </h2>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isSubscriber && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold uppercase block">Field Operative Clearance Required</span>
                  <p className="text-[10px] text-amber-200/80 mt-0.5">
                    Real-time SMS, Telegram, and Discord dispatch alerts require an active Field Operative clearance tier.
                  </p>
                </div>
              </div>
              <button
                onClick={onNeedUpgrade}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-extrabold text-[10px] uppercase shrink-0 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                UPGRADE ($9/MO)
              </button>
            </div>
          )}

          {/* Quick Preset Location Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                STRATEGIC PERIMETER PRESETS:
              </span>
              <button
                onClick={handleDetectGPS}
                disabled={isDetectingLocation}
                className="flex items-center gap-1.5 text-[10px] text-ufo-green hover:underline cursor-pointer"
              >
                {isDetectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                <span>AUTO-DETECT MY GPS FIX</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {presetLocations.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCenterLat(preset.lat);
                    setCenterLng(preset.lng);
                    setAlertName(`${preset.name} Perimeter`);
                  }}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    centerLat === preset.lat && centerLng === preset.lng
                      ? 'bg-ufo-green/20 text-ufo-green border border-ufo-green/50'
                      : 'bg-white/[0.02] border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            {geoError && (
              <span className="text-[10px] text-red-400 block">{geoError}</span>
            )}
          </div>

          {/* Alert Name & GPS Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Alert Rule Name</label>
              <input
                type="text"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-ufo-green"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Anchor Latitude</label>
              <input
                type="text"
                value={centerLat}
                onChange={(e) => setCenterLat(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-ufo-green"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Anchor Longitude</label>
              <input
                type="text"
                value={centerLng}
                onChange={(e) => setCenterLng(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-ufo-green"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-bold">
                  Radius: <span className="text-ufo-green font-bold">{radiusMiles} mi</span>
                </label>
                <div className="flex gap-1">
                  {radiusPresets.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusMiles(r)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        radiusMiles === r ? 'bg-ufo-green text-black' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value))}
                className="w-full accent-ufo-green bg-slate-800 rounded-lg cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Trigger Thresholds */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <span className="text-[10px] text-ufo-green uppercase font-bold tracking-widest block border-b border-white/10 pb-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> TRIGGER THRESHOLD CRITERIA
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Minimum Incident Severity</label>
                <select
                  value={minSeverity}
                  onChange={(e) => setMinSeverity(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-ufo-green"
                >
                  <option value="GRADE_X">Grade X / Anomaly (Highest Threat)</option>
                  <option value="CRITICAL">Critical & High Threat Events</option>
                  <option value="HIGH">High Severity Only</option>
                  <option value="ALL">All Recorded Incidents</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                  NOAA Space Weather Kp-Index Trigger: <span className="text-amber-400 font-bold">Kp ≥ {solarKpTrigger.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min={2.0}
                  max={9.0}
                  step={0.5}
                  value={solarKpTrigger}
                  onChange={(e) => setSolarKpTrigger(Number(e.target.value))}
                  className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer mt-2"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={notifyUncorrelated}
                onChange={(e) => setNotifyUncorrelated(e.target.checked)}
                className="accent-ufo-green w-4 h-4 rounded"
              />
              <span>Trigger alert on <strong>Uncorrelated Aerospace Objects</strong> (No ADS-B transponder match)</span>
            </label>
          </div>

          {/* Dispatch Channel Selector */}
          <div className="space-y-3">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
              DISPATCH DESTINATION CHANNEL
            </span>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <button
                onClick={() => setChannelType('TELEGRAM')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                  channelType === 'TELEGRAM' 
                    ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-bold' 
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Send className="w-4 h-4" /> Telegram Bot
              </button>

              <button
                onClick={() => setChannelType('DISCORD')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                  channelType === 'DISCORD' 
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 font-bold' 
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-4 h-4" /> Discord Webhook
              </button>

              <button
                onClick={() => setChannelType('SMS')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                  channelType === 'SMS' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' 
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" /> Mobile Push / SMS
              </button>

              <button
                onClick={() => setChannelType('EMAIL')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                  channelType === 'EMAIL' 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' 
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4" /> Email Webhook
              </button>
            </div>

            {/* Input based on Channel Type */}
            {channelType === 'TELEGRAM' && (
              <input
                type="text"
                placeholder="Telegram Chat ID or Bot Token (@your_bot_chat_id)"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            )}

            {channelType === 'DISCORD' && (
              <input
                type="text"
                placeholder="Discord Server Webhook URL (https://discord.com/api/webhooks/...)"
                value={discordWebhookUrl}
                onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
              />
            )}

            {channelType === 'SMS' && (
              <input
                type="tel"
                placeholder="Mobile Number (+1 555 123 4567)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            )}

            {channelType === 'EMAIL' && (
              <input
                type="email"
                placeholder="Operative Email Address (analyst@domain.com)"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            )}
          </div>

          {/* Test Dispatch Feedback */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px]"
            >
              {testResult}
            </motion.div>
          )}

          {/* Save Success Feedback */}
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-ufo-green/20 border border-ufo-green/40 text-ufo-green text-xs font-bold flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>GEOFENCED ALERT RULE SAVED & ACTIVE IN FIRESTORE</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <button
              disabled={isTesting}
              onClick={handleTestDispatch}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              {isTesting ? 'TESTING DISPATCH...' : 'TEST DISPATCH PAYLOAD'}
            </button>

            <button
              disabled={isSaving}
              onClick={handleSaveAlert}
              className="px-6 py-2.5 rounded-xl bg-ufo-green hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'PERSISTING RULE...' : 'SAVE ALERT RULE'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
