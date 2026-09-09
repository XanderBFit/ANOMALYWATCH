import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquareCode, 
  Terminal, 
  Volume2, 
  VolumeX, 
  Users, 
  Send, 
  Sparkles, 
  Radio, 
  ShieldAlert, 
  Hash, 
  Dices, 
  Smile, 
  Activity, 
  RefreshCw, 
  Zap, 
  Search,
  Bot,
  Flame,
  CheckCircle2,
  Lock,
  Unlock,
  Key,
  Shield,
  Circle,
  MessageCircle,
  X,
  ChevronDown,
  UserCheck,
  Clock,
  FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { CommsOps, PresenceService } from '../services/firebaseService';
import { generateTacticalChatResponse } from '../services/geminiService';
import { AwButton, AwEmblem } from './AwButton';

export interface ChannelInfo {
  id: string;
  name: string;
  topic: string;
  category: 'CORE' | 'PHENOMENA' | 'INTEL' | 'OFFTOPIC' | 'DM';
  isDm?: boolean;
  dmPartner?: string;
  unreadCount?: number;
}

export type OperativeStatus = 'ONLINE' | 'AWAY' | 'IN_FIELD' | 'DECODING';

const STATUS_CONFIG: Record<OperativeStatus, { label: string; color: string; badge: string; bg: string; border: string }> = {
  ONLINE: {
    label: 'ONLINE',
    color: 'text-ufo-green',
    badge: 'bg-ufo-green',
    bg: 'bg-ufo-green/10',
    border: 'border-ufo-green/30'
  },
  AWAY: {
    label: 'AWAY',
    color: 'text-amber-400',
    badge: 'bg-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  },
  IN_FIELD: {
    label: 'IN FIELD',
    color: 'text-red-400',
    badge: 'bg-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30'
  },
  DECODING: {
    label: 'DECODING',
    color: 'text-cyan-400',
    badge: 'bg-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30'
  }
};

const DEFAULT_CHANNELS: ChannelInfo[] = [
  { id: 'general', name: 'general', topic: 'Global Operative Lounge & Real-time Anomaly Dispatch', category: 'CORE' },
  { id: 'uap-sighting-lounge', name: 'uap-sighting-lounge', topic: 'Live Trans-Medium & Aerial Phenomena Telemetry Discussions', category: 'PHENOMENA' },
  { id: 'black-ops-theory', name: 'black-ops-theory', topic: 'Declassified Programs, Groom Lake, & Black Budget Aviation', category: 'INTEL' },
  { id: 'signal-anomalies', name: 'signal-anomalies', topic: 'Numbers Stations, VLF Bursts, Satellite Spikes, & RF Intercepts', category: 'INTEL' },
  { id: 'paranormal-lounge', name: 'paranormal-lounge', topic: 'High Strangeness, Skinwalker Ranch, Cryptids, & Quantum Spikes', category: 'PHENOMENA' },
  { id: 'off-duty-cafe', name: 'off-duty-cafe', topic: 'Cyber-Cafe, Retro Hardware, Terminal Hacking, & Casual Banter', category: 'OFFTOPIC' },
];

// ASCII Smileys & Tactical Badges
const RETRO_EMOTICONS = [
  { label: 'Alien', text: '👽 [👾 ALIEN_DETECTED]' },
  { label: 'UFO', text: '🛸 [🛸 UAP_VECTOR]' },
  { label: 'Radar', text: '📡 [📡 SIGNAL_SURGE]' },
  { label: 'Hazard', text: '⚠️ [⚠️ CLASS_4_ANOMALY]' },
  { label: 'Lenny', text: '( ͡° 景 ͡°)' },
  { label: 'Shrug', text: '¯\\_(ツ)_/¯' },
  { label: 'Glasses', text: '(•_•) ( •_•)>⌐■-■ (⌐■_■)' },
  { label: 'Shock', text: 'Σ(っ °Д °;)っ' },
  { label: 'Table Flip', text: '(╯°□°)╯︵ ┻━┻' },
  { label: 'Salute', text: 'o7' },
];

/**
 * CipherMessage Component:
 * Renders hexadecimal transmission cipher animation with matrix-style decoding scramble.
 */
const CipherMessage: React.FC<{
  text: string;
  isCipherActive: boolean;
  themeColor: string;
}> = ({ text, isCipherActive }) => {
  const [isDecrypted, setIsDecrypted] = useState(!isCipherActive);
  const [displayText, setDisplayText] = useState(text);

  // Helper to encode string into hex stream
  const toHexStream = (str: string) => {
    return str
      .split('')
      .map(c => `0x${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`)
      .join(' ');
  };

  useEffect(() => {
    if (!isCipherActive) {
      setIsDecrypted(true);
      setDisplayText(text);
    } else {
      setIsDecrypted(false);
      setDisplayText(toHexStream(text));
    }
  }, [text, isCipherActive]);

  const triggerMatrixDecode = () => {
    if (isDecrypted) {
      setIsDecrypted(false);
      setDisplayText(toHexStream(text));
      return;
    }

    let frame = 0;
    const maxFrames = 15;
    const hexChars = '0123456789ABCDEF';

    const interval = setInterval(() => {
      frame++;
      setDisplayText(() => {
        return text
          .split('')
          .map((char, index) => {
            if (index < (frame / maxFrames) * text.length) {
              return char;
            }
            if (char === ' ') return ' ';
            return hexChars[Math.floor(Math.random() * hexChars.length)];
          })
          .join('');
      });

      if (frame >= maxFrames) {
        clearInterval(interval);
        setDisplayText(text);
        setIsDecrypted(true);
      }
    }, 35);
  };

  if (!isCipherActive) {
    return <span>{text}</span>;
  }

  return (
    <div className="flex flex-col gap-1.5 my-1">
      <div 
        onClick={triggerMatrixDecode}
        className={`font-mono text-xs cursor-pointer transition-all select-none p-2 rounded-xl border ${
          isDecrypted 
            ? 'bg-white/[0.04] border-white/10 text-emerald-300' 
            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 font-bold tracking-widest break-all shadow-[0_0_10px_rgba(0,255,157,0.1)]'
        }`}
      >
        {displayText}
      </div>
      <button
        onClick={triggerMatrixDecode}
        className={`self-start text-[9px] px-2 py-0.5 rounded-lg border font-mono flex items-center gap-1 transition-all ${
          isDecrypted
            ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
        }`}
      >
        {isDecrypted ? <Lock className="w-2.5 h-2.5 text-slate-400" /> : <Unlock className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />}
        <span>{isDecrypted ? 'RE-ENCRYPT CIPHER' : 'CLICK TO DECRYPT TRANSMISSION'}</span>
      </button>
    </div>
  );
};

/**
 * Formats timestamps into precise UTC string representations for tactical communication telemetry.
 */
export const formatUtcTimestamp = (ts: any): { fullUtc: string; timeUtc: string; isoUtc: string } => {
  let date: Date;
  if (ts?.toMillis && typeof ts.toMillis === 'function') {
    date = new Date(ts.toMillis());
  } else if (ts?.toDate && typeof ts.toDate === 'function') {
    date = ts.toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else if (typeof ts === 'number') {
    date = new Date(ts);
  } else if (typeof ts === 'string') {
    date = new Date(ts);
  } else {
    date = new Date();
  }

  if (isNaN(date.getTime())) {
    date = new Date();
  }

  const iso = date.toISOString();
  const datePart = iso.substring(0, 10);
  const timePart = iso.substring(11, 19);

  return {
    fullUtc: `${datePart} ${timePart} UTC`,
    timeUtc: `${timePart} UTC`,
    isoUtc: iso
  };
};

export const OldschoolChatroom: React.FC = () => {
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputVal, setInputVal] = useState<string>('');
  const [username, setUsername] = useState<string>(localStorage.getItem('anomalyWatch_username') || 'OPERATIVE_77');
  const [specialty, setSpecialty] = useState<string>(localStorage.getItem('anomalyWatch_specialty') || 'ANALYST');
  const [userStatus, setUserStatus] = useState<OperativeStatus>('ONLINE');

  // DM Channels state
  const [dmList, setDmList] = useState<{ partner: string; channelId: string; unread?: boolean }[]>([]);
  const [unreadDmsCount, setUnreadDmsCount] = useState<number>(0);
  const [shakeEffect, setShakeEffect] = useState<boolean>(false);
  const [latestDmAlert, setLatestDmAlert] = useState<{ partner: string; text: string; channelId: string } | null>(null);

  // Active Channel Ref to access in subscription listener
  const activeChannelRef = useRef<string>(activeChannel);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // UI Toggles & Cipher Animation
  const [cipherActive, setCipherActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [crtMode, setCrtMode] = useState<boolean>(true);
  const [themeColor, setThemeColor] = useState<'green' | 'amber' | 'cyan'>('green');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showRoster, setShowRoster] = useState<boolean>(true);
  const [showStatusMenu, setShowStatusMenu] = useState<boolean>(false);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [utcClock, setUtcClock] = useState<string>('');
  const prevMessagesCountRef = useRef<number>(0);

  // Function to export conversation log to Secure Intel PDF
  const exportChatToPdf = () => {
    try {
      playSound('command');
      const doc = new jsPDF();
      const channelName = isDmChannel ? `@${channelObj.dmPartner || 'OPERATIVE'}` : `#${activeChannel}`;
      const exportTime = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(0, 255, 157); // ufo-green
      doc.setFont('courier', 'bold');
      doc.setFontSize(16);
      doc.text('FREQUENCY-99 // SECURE INTEL LOG', 14, 14);

      doc.setTextColor(226, 232, 240);
      doc.setFontSize(9);
      doc.setFont('courier', 'normal');
      doc.text(`CLASSIFIED COMMUNICATION TELEMETRY // CHANNEL: ${channelName.toUpperCase()}`, 14, 22);
      doc.text(`TIMESTAMP: ${exportTime} | OPERATIVE: ${username} [${specialty}]`, 14, 27);

      // Metadata Box
      doc.setDrawColor(51, 65, 85);
      doc.line(14, 34, 196, 34);

      let yPos = 42;
      const pageHeight = 280;

      if (currentChannelMessages.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(10);
        doc.text('No transmission records captured in current buffer.', 14, yPos);
      } else {
        currentChannelMessages.forEach((msg, idx) => {
          if (yPos > pageHeight) {
            doc.addPage();
            yPos = 20;
          }

          const utc = formatUtcTimestamp(msg.timestamp);
          const isSystem = msg.type === 'SYSTEM' || msg.sender === 'SYSTEM_BOT';
          const isAction = msg.type === 'ACTION';
          const isAi = msg.sender === 'ANOMALY_AI' || msg.type === 'AI';

          // Time + Sender line
          doc.setFont('courier', 'bold');
          doc.setFontSize(8);

          if (isSystem) {
            doc.setTextColor(234, 179, 8); // yellow-500
            doc.text(`[${utc.fullUtc}] SYSTEM ALERT:`, 14, yPos);
          } else if (isAction) {
            doc.setTextColor(168, 85, 247); // purple-500
            doc.text(`[${utc.fullUtc}] * ${msg.sender}:`, 14, yPos);
          } else if (isAi) {
            doc.setTextColor(6, 182, 212); // cyan-500
            doc.text(`[${utc.fullUtc}] <ANOMALY_AI>:`, 14, yPos);
          } else {
            doc.setTextColor(0, 255, 157); // green
            doc.text(`[${utc.fullUtc}] <${msg.sender}> [${msg.specialty || 'AGENT'}]:`, 14, yPos);
          }

          yPos += 4;

          // Message content text wrapping
          doc.setFont('courier', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42); // dark text if printed, but let's use dark slate
          doc.setTextColor(30, 41, 59);

          const lines = doc.splitTextToSize(msg.text, 180);
          doc.text(lines, 16, yPos);
          yPos += lines.length * 4.5 + 4;
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`CLASSIFIED // ANOMALY WATCH INTEL VAULT // PAGE ${i} OF ${totalPages}`, 14, 290);
      }

      const fileName = `INTEL_LOG_${channelName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF Export Error:', err);
    }
  };

  // Live UTC Tactical Clock Timer
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const iso = now.toISOString();
      setUtcClock(`${iso.substring(0, 10)} ${iso.substring(11, 19)} UTC`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Online agents roster
  const [onlineAgents, setOnlineAgents] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Simulated fallback agents with explicit presence status
  const simulatedAgents = [
    { uid: 'bot1', username: 'Cyber_Ghost_09', specialty: 'SIGINT', status: 'ONLINE', ping: '18ms', badge: 'RECON' },
    { uid: 'bot2', username: 'Vanguard_Prime', specialty: 'CELESTIAL', status: 'DECODING', ping: '24ms', badge: 'ELITE' },
    { uid: 'bot3', username: 'AeroSec_Lead', specialty: 'AVIONICS', status: 'IN_FIELD', ping: '42ms', badge: 'COMMAND' },
    { uid: 'bot4', username: 'Signal_Raven', specialty: 'DECRYPTOR', status: 'AWAY', ping: '12ms', badge: 'ANALYST' },
    { uid: 'bot5', username: 'ANOMALY_AI', specialty: 'SENTIENT_CORE', status: 'ONLINE', ping: '1ms', badge: 'AI_BOT' }
  ];

  // Sound generator
  const playSound = (type: 'key' | 'receive' | 'send' | 'join' | 'command' | 'cipher') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'key') {
        osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'receive') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'send') {
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.07);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'command' || type === 'cipher') {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.1);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (e) {
      // Audio context error muted
    }
  };

  // Sync presence status with Firebase PresenceService
  useEffect(() => {
    PresenceService.updatePresence(username, username, specialty, userStatus);
    const unsubPresence = PresenceService.subscribeToAgents((agents) => {
      setOnlineAgents(agents);
    });

    const unsubComms = CommsOps.subscribeToComms((allMsgs) => {
      // Detect newly arrived messages for screen-shake & DM alert
      if (prevMessagesCountRef.current > 0 && allMsgs.length > prevMessagesCountRef.current) {
        const newMsgs = allMsgs.slice(prevMessagesCountRef.current);
        const incomingDm = newMsgs.find(m => {
          if (!m.channel || !m.channel.startsWith('dm_')) return false;
          if (m.sender === username) return false;
          const parts = m.channel.replace('dm_', '').split('_');
          return parts.includes(username);
        });

        if (incomingDm) {
          const parts = incomingDm.channel.replace('dm_', '').split('_');
          const partner = parts.find(p => p !== username) || incomingDm.sender;

          // Trigger tactical screen-shake effect
          setShakeEffect(true);
          setTimeout(() => setShakeEffect(false), 700);

          // Alert notification banner
          setLatestDmAlert({
            partner,
            text: incomingDm.text,
            channelId: incomingDm.channel
          });

          // Mark DM as unread if user is not currently in that channel
          setDmList(prev => {
            const exists = prev.find(d => d.channelId === incomingDm.channel);
            if (exists) {
              return prev.map(d => d.channelId === incomingDm.channel ? { ...d, unread: activeChannelRef.current !== incomingDm.channel } : d);
            } else {
              return [...prev, { partner, channelId: incomingDm.channel, unread: activeChannelRef.current !== incomingDm.channel }];
            }
          });

          playSound('receive');
        } else {
          playSound('receive');
        }
      } else {
        playSound('receive');
      }

      prevMessagesCountRef.current = allMsgs.length;
      setMessages(allMsgs);

      // Auto-detect private message links for the current user
      const foundDms: { partner: string; channelId: string }[] = [];
      allMsgs.forEach(m => {
        if (m.channel && m.channel.startsWith('dm_')) {
          const parts = m.channel.replace('dm_', '').split('_');
          if (parts.includes(username)) {
            const partner = parts.find(p => p !== username) || parts[0];
            if (!foundDms.some(d => d.channelId === m.channel)) {
              foundDms.push({ partner, channelId: m.channel });
            }
          }
        }
      });

      if (foundDms.length > 0) {
        setDmList(prev => {
          const merged = [...prev];
          foundDms.forEach(fd => {
            if (!merged.some(m => m.channelId === fd.channelId)) {
              merged.push({ ...fd, unread: false });
            }
          });
          return merged;
        });
      }
    });

    return () => {
      unsubPresence();
      unsubComms();
    };
  }, [username, specialty, userStatus]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  // Filter messages for active channel
  const currentChannelMessages = messages.filter(m => (m.channel || 'general') === activeChannel);

  // Derive current channel details
  const isDmChannel = activeChannel.startsWith('dm_');
  const activeDmObj = dmList.find(d => d.channelId === activeChannel);

  const channelObj: ChannelInfo = isDmChannel ? {
    id: activeChannel,
    name: `@${activeDmObj?.partner || 'PRIVATE_OPERATIVE'}`,
    topic: `256-Bit Encrypted Point-to-Point Direct Tactical Uplink with ${activeDmObj?.partner || 'OPERATIVE'}`,
    category: 'DM',
    isDm: true,
    dmPartner: activeDmObj?.partner
  } : (DEFAULT_CHANNELS.find(c => c.id === activeChannel) || DEFAULT_CHANNELS[0]);

  // Open Direct Message channel with partner
  const openDirectMessage = (partnerName: string) => {
    if (partnerName === username) return;
    const channelId = `dm_${[username, partnerName].sort().join('_')}`;
    
    setDmList(prev => {
      if (!prev.some(d => d.channelId === channelId)) {
        return [...prev, { partner: partnerName, channelId }];
      }
      return prev;
    });

    setActiveChannel(channelId);
    playSound('command');
  };

  // Handle Slash Commands or Normal Messages
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text) return;

    setInputVal('');
    setShowEmojiPicker(false);

    // 1. Slash command parsing
    if (text.startsWith('/')) {
      playSound('command');
      const parts = text.slice(1).split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (cmd === 'nick') {
        if (!args) {
          addSystemMessage(`[SYSTEM] Usage: /nick <new_callsign>`);
          return;
        }
        const newNick = args.trim().replace(/\s+/g, '_');
        localStorage.setItem('anomalyWatch_username', newNick);
        setUsername(newNick);
        addSystemMessage(`[IRC_SYSTEM] Handle updated to *** ${newNick} ***`);
        CommsOps.sendMessage(`* Operative callsign updated to ${newNick}`, 'ACTION', activeChannel, newNick);
        return;
      }

      if (cmd === 'msg' || cmd === 'query' || cmd === 'pm') {
        const spaceIndex = args.indexOf(' ');
        if (spaceIndex === -1) {
          addSystemMessage(`[SYSTEM] Usage: /msg <callsign> <message>`);
          return;
        }
        const targetUser = args.substring(0, spaceIndex).trim();
        const msgText = args.substring(spaceIndex + 1).trim();
        
        const dmChannelId = `dm_${[username, targetUser].sort().join('_')}`;
        openDirectMessage(targetUser);
        CommsOps.sendMessage(msgText, 'MESSAGE', dmChannelId, username);
        playSound('send');
        return;
      }

      if (cmd === 'status') {
        const validStatuses: OperativeStatus[] = ['ONLINE', 'AWAY', 'IN_FIELD', 'DECODING'];
        const newStatus = args.toUpperCase().replace(' ', '_') as OperativeStatus;
        if (!validStatuses.includes(newStatus)) {
          addSystemMessage(`[SYSTEM] Invalid status. Choose: ONLINE, AWAY, IN_FIELD, DECODING`);
          return;
        }
        setUserStatus(newStatus);
        addSystemMessage(`[PRESENCE] Status set to: ${newStatus}`);
        return;
      }

      if (cmd === 'me') {
        if (!args) return;
        CommsOps.sendMessage(`* ${username} ${args}`, 'ACTION', activeChannel, username);
        playSound('send');
        return;
      }

      if (cmd === 'clear') {
        setMessages([]);
        addSystemMessage(`[IRC_SYSTEM] Terminal console buffer purged.`);
        return;
      }

      if (cmd === 'cipher') {
        setCipherActive(!cipherActive);
        playSound('cipher');
        addSystemMessage(`[CIPHER] Hexadecimal transmission encryption mode: ${!cipherActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
        return;
      }

      if (cmd === 'whois') {
        const target = args.trim() || username;
        const targetAgent = combinedRoster.find(a => a.username.toLowerCase() === target.toLowerCase());
        addSystemMessage(`===============================================
[WHOIS DOSSIER FOR: ${target.toUpperCase()}]
• Operative Handle: ${target}
• Presence Status: ${targetAgent?.status || 'UNKNOWN'}
• Specialty Sector: ${targetAgent?.specialty || 'ANALYST'}
• Active Channel: #${activeChannel}
• Uplink Security: 256-Bit Encrypted (Frequency-99)
• Ping Latency: ${targetAgent?.ping || '14ms'}
===============================================`);
        return;
      }

      if (cmd === 'roll') {
        const result = Math.floor(Math.random() * 100) + 1;
        CommsOps.sendMessage(`🎲 [DICE ROLL] ${username} rolled a ${result}/100 on Tactical Recon Check!`, 'SYSTEM', activeChannel);
        return;
      }

      if (cmd === 'ping') {
        addSystemMessage(`[SYSTEM] PING reply from FREQUENCY_99 Gateway: time=14ms bytes=64 TTL=128`);
        return;
      }

      if (cmd === 'ai') {
        if (!args) {
          addSystemMessage(`[SYSTEM] Usage: /ai <prompt for Anomaly AI Bot>`);
          return;
        }
        await triggerAiBotResponse(args);
        return;
      }

      if (cmd === 'help') {
        addSystemMessage(`===============================================
[FREQUENCY 99 // SLASH COMMAND DIRECTORY]
• /nick <callsign>  : Change callsign on the fly
• /msg <user> <txt> : Send private direct message
• /status <state>   : Set status (ONLINE, AWAY, IN_FIELD, DECODING)
• /cipher           : Toggle rolling hex cipher stream
• /me <action>      : Broadcast IRC action emote
• /ai <prompt>      : Consult ANOMALY WATCH AI Bot
• /whois <handle>   : View operative dossier
• /roll             : Roll tactical d100 dice
• /clear            : Clear console buffer
• /help             : Show command directory
===============================================`);
        return;
      }

      addSystemMessage(`[SYSTEM ERROR] Unknown command: /${cmd}. Type /help for directory.`);
      return;
    }

    // 2. Trigger AI Bot if mentioned
    if (text.includes('@ANOMALY_AI') || text.includes('@AI')) {
      CommsOps.sendMessage(text, 'MESSAGE', activeChannel, username);
      playSound('send');
      const queryPrompt = text.replace(/@ANOMALY_AI|@AI/g, '').trim();
      await triggerAiBotResponse(queryPrompt || "Analyze recent anomalous channel telemetry.");
      return;
    }

    // 3. Standard Message Transmission
    CommsOps.sendMessage(text, 'MESSAGE', activeChannel, username);
    playSound('send');
  };

  // Add system message
  const addSystemMessage = (text: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `sys_${Date.now()}_${Math.random()}`,
        sender: 'SYSTEM_BOT',
        text,
        type: 'SYSTEM',
        channel: activeChannel,
        timestamp: { toMillis: () => Date.now() }
      }
    ]);
  };

  // AI response trigger
  const triggerAiBotResponse = async (prompt: string) => {
    setAiThinking(true);
    CommsOps.sendMessage(`🤖 [AI_PROMPT] ${prompt}`, 'MESSAGE', activeChannel, username);

    try {
      const response = await generateTacticalChatResponse(prompt, `#${activeChannel}: ${channelObj.topic}`);
      setAiThinking(false);
      CommsOps.sendMessage(response, 'AI', activeChannel, 'ANOMALY_AI');
      playSound('receive');
    } catch (err) {
      setAiThinking(false);
      CommsOps.sendMessage(`⚠️ [AI_CORE_ERROR] Signal degradation detected. Unable to synthesize telemetry.`, 'SYSTEM', activeChannel, 'ANOMALY_AI');
    }
  };

  // Theme styling mapping
  const themeStyles = {
    green: {
      border: 'border-ufo-green/30',
      text: 'text-ufo-green',
      bg: 'bg-ufo-green/10',
      glow: 'shadow-[0_0_15px_rgba(0,255,157,0.2)]',
    },
    amber: {
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    },
    cyan: {
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    }
  }[themeColor];

  // Combined Roster (Real online agents + simulated)
  const combinedRoster = [
    {
      uid: 'me',
      username,
      specialty,
      status: userStatus,
      ping: '4ms',
      badge: 'YOU'
    },
    ...onlineAgents
      .filter(a => a.username !== username)
      .map(a => ({
        uid: a.uid,
        username: a.username,
        specialty: a.specialty || 'ANALYST',
        status: (a.status || 'ONLINE') as OperativeStatus,
        ping: '14ms',
        badge: 'OPERATIVE'
      })),
    ...simulatedAgents.filter(s => s.username !== username && !onlineAgents.some(o => o.username === s.username))
  ];

  const hasAnyUnreadDm = dmList.some(d => d.unread);

  return (
    <motion.div 
      animate={shakeEffect ? {
        x: [-12, 12, -10, 10, -6, 6, -2, 2, 0],
        y: [-6, 6, -4, 4, -2, 2, 0]
      } : {}}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className={`w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 flex flex-col min-h-[550px] h-[calc(100dvh-8rem)] md:h-[calc(100vh-6rem)] relative overflow-hidden font-mono select-text ${crtMode ? 'relative' : ''}`}
    >
      
      {/* CRT Scanline Overlay */}
      {crtMode && (
        <div className="absolute inset-0 pointer-events-none z-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-60"></div>
      )}

      {/* TOP HUD BAR */}
      <div className={`shrink-0 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-black/90 border ${themeStyles.border} rounded-t-2xl z-20 backdrop-blur-xl relative shadow-2xl`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${themeStyles.bg} border ${themeStyles.border}`}>
            <Terminal className={`w-5 h-5 ${themeStyles.text} animate-pulse`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm md:text-base font-black tracking-widest text-white uppercase flex items-center gap-2">
                FREQUENCY-99 <span className={`text-xs px-2 py-0.5 rounded border ${themeStyles.border} ${themeStyles.text}`}>IRC NETWORK</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-emerald-400 font-bold" title="Live Tactical Universal Time Coordinated (UTC)">
                <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>{utcClock || 'SYNCHRONIZING UTC...'}</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-md">
              <span className={themeStyles.text}>{channelObj.isDm ? channelObj.name : `#${channelObj.name}`}</span> — {channelObj.topic}
            </p>
          </div>
        </div>

        {/* TOP CONTROLS & ENCRYPTED TRANSMISSION TOGGLE */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* EXPORT TO SECURE INTEL PDF BUTTON */}
          <button
            onClick={exportChatToPdf}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,157,0.15)]"
            title="Export current conversation log with UTC timestamps and user handles to PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">EXPORT SECURE INTEL PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>

          {/* USER PRESENCE STATUS SWITCHER */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border flex items-center gap-2 transition-all ${STATUS_CONFIG[userStatus].bg} ${STATUS_CONFIG[userStatus].border} ${STATUS_CONFIG[userStatus].color}`}
            >
              <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[userStatus].badge} animate-pulse`} />
              <span>STATUS: {userStatus}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-black/95 border border-white/20 rounded-2xl p-1.5 shadow-2xl z-40 space-y-1 backdrop-blur-xl">
                {(['ONLINE', 'AWAY', 'IN_FIELD', 'DECODING'] as OperativeStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      setUserStatus(st);
                      setShowStatusMenu(false);
                      playSound('command');
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-between transition-all ${
                      userStatus === st ? `${STATUS_CONFIG[st].bg} ${STATUS_CONFIG[st].color}` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[st].badge}`} />
                      <span>{STATUS_CONFIG[st].label}</span>
                    </div>
                    {userStatus === st && <UserCheck className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ENCRYPTED TRANSMISSION CIPHER TOGGLE */}
          <button
            onClick={() => {
              setCipherActive(!cipherActive);
              playSound('cipher');
            }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              cipherActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(0,255,157,0.3)] animate-pulse'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Toggle rolling hexadecimal transmission cipher"
          >
            {cipherActive ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
            <span>CIPHER {cipherActive ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {/* Theme Color Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xl">
            {(['green', 'amber', 'cyan'] as const).map(color => (
              <button
                key={color}
                onClick={() => setThemeColor(color)}
                className={`w-3.5 h-3.5 rounded-full transition-transform ${
                  color === 'green' ? 'bg-ufo-green' : color === 'amber' ? 'bg-amber-400' : 'bg-cyan-400'
                } ${themeColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-50 hover:opacity-100'}`}
                title={`Set Theme: ${color.toUpperCase()}`}
              />
            ))}
          </div>

          {/* CRT Scanline Toggle */}
          <button
            onClick={() => setCrtMode(!crtMode)}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
              crtMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5 text-slate-500 border-white/10'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CRT</span>
          </button>

          {/* Audio FX Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
              soundEnabled ? `${themeStyles.bg} ${themeStyles.text} ${themeStyles.border}` : 'bg-white/5 text-slate-500 border-white/10'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">AUDIO</span>
          </button>

          {/* Roster Toggle */}
          <button
            onClick={() => setShowRoster(!showRoster)}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
              showRoster ? `${themeStyles.bg} ${themeStyles.text} ${themeStyles.border}` : 'bg-white/5 text-slate-500 border-white/10'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{combinedRoster.length} ONLINE</span>
          </button>
        </div>
      </div>

      {/* MAIN CHATROOM LAYOUT */}
      <div className={`flex-1 grid grid-cols-1 md:grid-cols-12 bg-black/95 border-x border-b ${themeStyles.border} rounded-b-2xl overflow-hidden relative shadow-2xl`}>
        
        {/* LEFT CHANNEL SIDEBAR */}
        <div className="hidden md:flex md:col-span-3 border-r border-white/10 bg-black/80 flex-col p-3 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* Public Channels */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${themeStyles.text}`} />
                IRC CHANNELS
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-bold">
                {DEFAULT_CHANNELS.length}
              </span>
            </div>

            <div className="space-y-1">
              {DEFAULT_CHANNELS.map(ch => {
                const isActive = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannel(ch.id);
                      playSound('key');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between group ${
                      isActive 
                        ? `${themeStyles.bg} border ${themeStyles.border} ${themeStyles.text} font-bold` 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? themeStyles.text : 'text-slate-600 group-hover:text-slate-400'}`} />
                      <span className="text-xs truncate">{ch.name}</span>
                    </div>
                    {isActive && <div className={`w-1.5 h-1.5 rounded-full ${themeStyles.text} bg-current animate-ping shrink-0`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Private Direct Message Links */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className={`flex items-center justify-between pb-1 border-b transition-all ${
              hasAnyUnreadDm ? 'border-red-500/80 bg-red-500/10 p-1.5 rounded-lg animate-pulse' : 'border-white/10'
            }`}>
              <span className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 ${
                hasAnyUnreadDm ? 'text-red-400 font-black' : 'text-cyan-400'
              }`}>
                <Lock className={`w-3.5 h-3.5 ${hasAnyUnreadDm ? 'text-red-400 animate-bounce' : 'text-cyan-400'}`} />
                <span>SECURE DM LINKS</span>
                {hasAnyUnreadDm && (
                  <span className="px-1.5 py-0.2 text-[8px] rounded bg-red-500 text-white font-black animate-pulse">
                    NEW MSG
                  </span>
                )}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                hasAnyUnreadDm ? 'bg-red-500 text-white' : 'bg-cyan-500/10 text-cyan-400'
              }`}>
                {dmList.length}
              </span>
            </div>

            {dmList.length === 0 ? (
              <div className="p-2 text-[10px] text-slate-600 italic">
                No active DM links. Click an operative in the roster or type <code className="text-cyan-400">/msg &lt;user&gt;</code> to initiate direct comms.
              </div>
            ) : (
              <div className="space-y-1">
                {dmList.map(dm => {
                  const isActive = activeChannel === dm.channelId;
                  const isUnread = !!dm.unread;
                  return (
                    <div key={dm.channelId} className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setActiveChannel(dm.channelId);
                          setDmList(prev => prev.map(d => d.channelId === dm.channelId ? { ...d, unread: false } : d));
                          if (latestDmAlert?.channelId === dm.channelId) setLatestDmAlert(null);
                          playSound('key');
                        }}
                        className={`flex-1 text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between ${
                          isActive 
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' 
                            : isUnread
                            ? 'bg-red-500/20 border-2 border-red-500 text-red-300 font-bold animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MessageCircle className={`w-3.5 h-3.5 shrink-0 ${isUnread ? 'text-red-400 animate-bounce' : 'text-cyan-400'}`} />
                          <span className="text-xs truncate">@{dm.partner}</span>
                        </div>
                        {isUnread ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                        ) : isActive ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                        ) : null}
                      </button>
                      <button
                        onClick={() => {
                          setDmList(prev => prev.filter(d => d.channelId !== dm.channelId));
                          if (activeChannel === dm.channelId) setActiveChannel('general');
                        }}
                        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-white/5"
                        title="Close DM channel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Command Guide */}
          <div className="mt-auto pt-3 border-t border-white/10 space-y-2 text-[10px] text-slate-400">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">COMMAND DIRECTORY</div>
            <div className="bg-white/5 p-2 rounded-xl space-y-1 text-[9px]">
              <div><code className={themeStyles.text}>/msg &lt;user&gt; &lt;text&gt;</code> - Direct Message</div>
              <div><code className={themeStyles.text}>/status &lt;state&gt;</code> - Change status</div>
              <div><code className={themeStyles.text}>/cipher</code> - Toggle hex mode</div>
              <div><code className={themeStyles.text}>/nick &lt;callsign&gt;</code> - Change nick</div>
              <div><code className={themeStyles.text}>/me &lt;action&gt;</code> - Emote</div>
              <div><code className={themeStyles.text}>/ai &lt;prompt&gt;</code> - Ask Anomaly AI</div>
            </div>
          </div>
        </div>

        {/* CENTER CONSOLE STREAM */}
        <div className={`${showRoster ? 'md:col-span-6 lg:col-span-7' : 'md:col-span-9'} flex flex-col h-full bg-black/90 relative overflow-hidden`}>
          
          {/* INCOMING PRIVATE TRANSMISSION NOTIFICATION ALERT BANNER */}
          <AnimatePresence>
            {latestDmAlert && (
              <motion.div
                initial={{ opacity: 0, y: -15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                className="shrink-0 mx-2 my-2 p-3 bg-red-950/90 border-2 border-red-500 rounded-xl flex items-center justify-between text-xs font-mono text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.5)] z-40 animate-pulse"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
                  <div className="min-w-0">
                    <div className="font-black text-red-400 tracking-wider text-[11px] uppercase flex items-center gap-2 flex-wrap">
                      <span>⚠️ SECURE PRIVATE TRANSMISSION RECEIVED</span>
                      <span className="px-1.5 py-0.2 rounded bg-red-500/30 text-white text-[9px] font-bold">
                        FROM @{latestDmAlert.partner}
                      </span>
                    </div>
                    <p className="text-[10px] text-red-300/90 truncate font-mono mt-0.5">
                      "{latestDmAlert.text}"
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      setActiveChannel(latestDmAlert.channelId);
                      setDmList(prev => prev.map(d => d.channelId === latestDmAlert.channelId ? { ...d, unread: false } : d));
                      setLatestDmAlert(null);
                      playSound('command');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] transition-all shadow-lg flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>OPEN DM</span>
                  </button>
                  <button
                    onClick={() => setLatestDmAlert(null)}
                    className="p-1 text-red-400 hover:text-white rounded"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Channel Switcher */}
          <div className="md:hidden flex items-center gap-1 p-2 bg-black/80 border-b border-white/10 overflow-x-auto custom-scrollbar">
            {DEFAULT_CHANNELS.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${
                  activeChannel === ch.id 
                    ? `${themeStyles.bg} ${themeStyles.text} ${themeStyles.border}` 
                    : 'text-slate-500 border-white/5'
                }`}
              >
                #{ch.name}
              </button>
            ))}
            {dmList.map(dm => {
              const isUnread = !!dm.unread;
              return (
                <button
                  key={dm.channelId}
                  onClick={() => {
                    setActiveChannel(dm.channelId);
                    setDmList(prev => prev.map(d => d.channelId === dm.channelId ? { ...d, unread: false } : d));
                    if (latestDmAlert?.channelId === dm.channelId) setLatestDmAlert(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all flex items-center gap-1 ${
                    activeChannel === dm.channelId
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : isUnread
                      ? 'bg-red-500/20 text-red-300 border-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : 'text-cyan-500 border-cyan-500/10'
                  }`}
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>@{dm.partner}</span>
                  {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                </button>
              );
            })}
          </div>

          {/* Channel Banner / MOTD */}
          <div className="p-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2 truncate">
              <span className={`font-bold ${themeStyles.text}`}>*** MOTD:</span>
              <span className="truncate">{channelObj.topic}</span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-500 shrink-0 font-mono">
              {channelObj.isDm ? `SECURE_DM [${channelObj.dmPartner}]` : `CHANNEL #${activeChannel.toUpperCase()}`}
            </span>
          </div>

          {/* Message Stream Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 font-mono text-xs text-slate-300">
            {currentChannelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600 space-y-2">
                <Radio className={`w-8 h-8 ${themeStyles.text} animate-pulse`} />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {channelObj.isDm ? `SECURE DIRECT UPLINK INITIALIZED WITH @${channelObj.dmPartner}` : `CHANNEL UPLINK OPEN (#${activeChannel})`}
                </p>
                <p className="text-[10px] max-w-sm">
                  {channelObj.isDm
                    ? `Encrypted 1-on-1 comms channel ready. Transmit private intel to @${channelObj.dmPartner}.`
                    : `No recent messages logged in #${activeChannel}. Be the first operative to transmit or type /help for commands.`}
                </p>
              </div>
            ) : (
              currentChannelMessages.map((msg, index) => {
                const isMe = msg.sender === username;
                const isAi = msg.sender === 'ANOMALY_AI' || msg.type === 'AI';
                const isSystem = msg.type === 'SYSTEM' || msg.sender === 'SYSTEM_BOT';
                const isAction = msg.type === 'ACTION';

                const utc = formatUtcTimestamp(msg.timestamp);

                if (isSystem) {
                  return (
                    <div key={msg.id || index} className="text-[11px] text-yellow-400/90 py-1 px-2.5 bg-yellow-500/10 border-l-2 border-yellow-500 rounded-r whitespace-pre-wrap leading-relaxed flex items-baseline gap-2 font-mono">
                      <span className="text-yellow-600/90 text-[9px] font-bold shrink-0 select-none">[{utc.fullUtc}]</span>
                      <span>{msg.text}</span>
                    </div>
                  );
                }

                if (isAction) {
                  return (
                    <div key={msg.id || index} className="text-[11px] text-purple-300 italic py-0.5 px-2 font-mono flex items-center gap-2">
                      <span className="text-slate-500 text-[10px] shrink-0 font-normal">[{utc.fullUtc}]</span>
                      <span>{msg.text}</span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={msg.id || index} 
                    className={`flex flex-col p-2.5 rounded-xl border transition-all ${
                      isAi
                        ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                        : isMe
                        ? 'bg-white/[0.04] border-white/10 text-white ml-4'
                        : 'bg-black/60 border-white/5 text-slate-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-white/5 mb-1.5 text-[10px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="text-slate-400 font-mono text-[9px] tracking-wider font-semibold px-1 py-0.5 rounded bg-white/5 border border-white/5" 
                          title={`Precise UTC Transmission Timestamp: ${utc.isoUtc}`}
                        >
                          [{utc.fullUtc}]
                        </span>
                        <button
                          onClick={() => openDirectMessage(msg.sender)}
                          className={`font-bold tracking-wider hover:underline text-left ${
                            isAi ? 'text-cyan-400 flex items-center gap-1 font-black' : isMe ? themeStyles.text : 'text-slate-300'
                          }`}
                          title={`Click to send Direct Message to @${msg.sender}`}
                        >
                          {isAi && <Bot className="w-3 h-3 text-cyan-400 animate-pulse" />}
                          &lt;{msg.sender}&gt;
                        </button>
                        {msg.specialty && (
                          <span className="px-1.5 py-0.2 rounded bg-white/5 text-[9px] text-slate-400 uppercase">
                            {msg.specialty}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-600 uppercase tracking-wider">
                        {channelObj.isDm ? 'SECURE_DM' : `#${activeChannel}`}
                      </span>
                    </div>

                    {/* Message Body with Cipher Option */}
                    <CipherMessage text={msg.text} isCipherActive={cipherActive} themeColor={themeColor} />
                  </div>
                );
              })
            )}

            {aiThinking && (
              <div className="flex items-center gap-2 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 text-xs animate-pulse">
                <Bot className="w-4 h-4 animate-spin" />
                <span>ANOMALY_AI is synthesizing telemetry response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT FORM CONTAINER */}
          <div className="p-3 bg-black/90 border-t border-white/10 relative z-20">
            
            {/* Emoticon Bar */}
            {showEmojiPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-3 right-3 mb-2 p-2.5 bg-anomaly-black/95 border border-white/20 rounded-2xl backdrop-blur-xl shadow-2xl grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs z-30"
              >
                {RETRO_EMOTICONS.map((e, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputVal(prev => prev + ' ' + e.text);
                      setShowEmojiPicker(false);
                      playSound('key');
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-ufo-green/20 hover:text-ufo-green border border-white/5 text-slate-300 text-[11px] truncate text-center transition-all"
                  >
                    {e.text}
                  </button>
                ))}
              </motion.div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              
              {/* Emoticon Picker Toggle */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2.5 rounded-xl border transition-all ${
                  showEmojiPicker ? `${themeStyles.bg} ${themeStyles.text} ${themeStyles.border}` : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Insert Retro Emoticon / Tactical Badge"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Mention AI Bot Quick Trigger */}
              <button
                type="button"
                onClick={() => {
                  setInputVal(prev => prev.startsWith('@ANOMALY_AI ') ? prev : `@ANOMALY_AI ${prev}`);
                  playSound('key');
                }}
                className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/20 transition-all"
                title="Ask Anomaly AI Bot in chat"
              >
                <Sparkles className="w-3 h-3" />
                <span>@AI</span>
              </button>

              {/* Input Text Field */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    playSound('key');
                  }}
                  placeholder={`[${username}@FREQ99 ${channelObj.isDm ? channelObj.name : '#' + activeChannel}]> Type message or /help...`}
                  className={`w-full bg-black/80 border ${themeStyles.border} text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-ufo-green/50 placeholder-slate-600 font-mono`}
                />
              </div>

              {/* Send Button */}
              <AwButton
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputVal.trim()}
                className="py-2.5 px-4"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">SEND</span>
              </AwButton>
            </form>
          </div>
        </div>

        {/* RIGHT ONLINE ROSTER SIDEBAR WITH PRESENCE INDICATORS */}
        {showRoster && (
          <div className="hidden md:flex md:col-span-3 lg:col-span-2 border-l border-white/10 bg-black/80 flex-col p-3 space-y-3 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1">
                <Users className={`w-3.5 h-3.5 ${themeStyles.text}`} />
                ROSTER
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${themeStyles.bg} ${themeStyles.text}`}>
                {combinedRoster.length}
              </span>
            </div>

            <div className="space-y-2">
              {combinedRoster.map((agent, i) => {
                const st = (STATUS_CONFIG[agent.status as OperativeStatus] ? agent.status : 'ONLINE') as OperativeStatus;
                const statusInfo = STATUS_CONFIG[st];

                return (
                  <div
                    key={agent.uid || i}
                    className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-ufo-green/40 transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* PRESENCE DOT INDICATOR */}
                        <div className={`w-2 h-2 rounded-full ${statusInfo.badge} shrink-0 animate-pulse`} />
                        <span className="text-xs text-white font-bold truncate group-hover:text-ufo-green transition-colors">
                          {agent.username}
                        </span>
                      </div>
                      <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 shrink-0 uppercase font-mono">
                        {agent.badge || 'AGENT'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 pl-3">
                      <span className="truncate">{agent.specialty}</span>
                      <span className={`font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>

                    {/* Direct Message Quick Action */}
                    {agent.username !== username && (
                      <button
                        onClick={() => openDirectMessage(agent.username)}
                        className="w-full mt-1 py-1 px-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-2.5 h-2.5" />
                        <span>DIRECT MESSAGE</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OldschoolChatroom;
