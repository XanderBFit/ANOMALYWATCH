import React, { useState } from 'react';
import { triggerTacticalVibration } from '../services/geminiService';
import { CaseOps } from '../services/caseOps';
import { Mic, MicOff, Radio, Edit3, X, Send } from 'lucide-react';
import { AwButton } from './AwButton';

const QuickCaptureButton: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [showTextFallbackModal, setShowTextFallbackModal] = useState(false);
    const [textNote, setTextNote] = useState('');
    const [isSavingText, setIsSavingText] = useState(false);

    const handleTextSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!textNote.trim()) return;
        setIsSavingText(true);
        try {
            await CaseOps.createCase(
                `Intel Note: ${new Date().toLocaleTimeString()}`,
                textNote,
                'Quick_Capture',
                { id: Date.now().toString(), type: 'Tactical Note', content: textNote, timestamp: Date.now() }
            );
            setStatusMsg("NOTE COMMITTED!");
            setTextNote('');
            setShowTextFallbackModal(false);
            setTimeout(() => setStatusMsg(null), 3000);
        } catch (err) {
            console.error("Text note save failed:", err);
            setStatusMsg("SAVE FAILED");
        } finally {
            setIsSavingText(false);
        }
    };
    
    const handleCapture = async () => {
        if (isRecording) return;
        
        setIsRecording(true);
        setStatusMsg("LISTENING...");
        triggerTacticalVibration(50);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setStatusMsg("MIC UNSUPPORTED - OPENING TEXT FALLBACK");
                setShowTextFallbackModal(true);
                setTimeout(() => setStatusMsg(null), 3000);
                setIsRecording(false);
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            
            recognition.onresult = async (event: any) => {
                const transcript = event.results[0][0].transcript;
                setStatusMsg("CASE LOGGED!");
                
                await CaseOps.createCase(
                    `Voice Capture: ${new Date().toLocaleTimeString()}`,
                    transcript,
                    'Quick_Capture',
                    { id: Date.now().toString(), type: 'Voice Capture', content: transcript, timestamp: Date.now() }
                );

                setTimeout(() => setStatusMsg(null), 4000);
            };

            recognition.onerror = () => {
                setStatusMsg("MIC ERROR - FALLING BACK TO TEXT");
                setShowTextFallbackModal(true);
                setTimeout(() => setStatusMsg(null), 3000);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };
            
            recognition.start();

            setTimeout(() => {
                try {
                    recognition.stop();
                } catch {}
                stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
            }, 6000);
        } catch (error) {
            console.error("Audio capture failed:", error);
            setStatusMsg("MIC DENIED - FALLING BACK TO TEXT");
            setShowTextFallbackModal(true);
            setTimeout(() => setStatusMsg(null), 3000);
            setIsRecording(false);
        }
    };

    return (
        <div className="fixed bottom-36 right-4 sm:right-6 md:bottom-20 md:right-10 z-[80] flex flex-col items-end gap-2 group">
            {/* Status Toast Notification */}
            {statusMsg && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 px-4 py-2 rounded-2xl bg-black/90 border border-ufo-green/40 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-2.5 text-xs font-mono text-ufo-green">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-ufo-green" />
                    <span className="font-bold tracking-wider uppercase">{statusMsg}</span>
                </div>
            )}

            <div className="flex items-center gap-2">
                {/* Manual Text Note Fallback Trigger */}
                <button
                    onClick={() => setShowTextFallbackModal(true)}
                    className="p-3 rounded-2xl bg-black/80 border border-white/10 hover:border-ufo-green/50 text-slate-300 hover:text-ufo-green backdrop-blur-md transition-all shadow-lg flex items-center gap-2 font-mono text-xs"
                    title="Open Quick Text Intel Note"
                >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden md:inline font-bold">QUICK LOG</span>
                </button>

                {/* Tactical Floating Mic AW Button */}
                <AwButton
                   variant={isRecording ? 'danger' : 'primary'}
                   size="lg"
                   onClick={handleCapture}
                   disabled={isRecording}
                   title="Tactical Voice Capture - Click to Record Anomaly Note"
                   badgeText="AW MIC"
                >
                    {isRecording ? (
                        <>
                            <MicOff className="w-5 h-5 text-red-400 animate-bounce" />
                            <span className="text-[10px] font-mono font-black tracking-widest text-red-400 uppercase hidden md:inline">
                                RECORDING...
                            </span>
                        </>
                    ) : (
                        <>
                            <Mic className="w-4 h-4" />
                            <span className="text-[10px] font-mono font-black tracking-widest uppercase hidden md:inline">
                                VOICE LOG
                            </span>
                        </>
                    )}
                </AwButton>
            </div>

            {/* Quick Text Capture Modal */}
            {showTextFallbackModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#0a0a0f] border border-ufo-green/30 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2 font-mono text-xs font-bold text-ufo-green uppercase">
                                <Edit3 className="w-4 h-4" />
                                <span>Quick Intel Log Entry</span>
                            </div>
                            <button onClick={() => setShowTextFallbackModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <textarea
                            value={textNote}
                            onChange={e => setTextNote(e.target.value)}
                            placeholder="Enter tactical observation, coordinates, or anomaly note..."
                            className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-ufo-green/50 resize-none"
                            autoFocus
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowTextFallbackModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => handleTextSubmit()}
                                disabled={isSavingText || !textNote.trim()}
                                className="px-5 py-2 rounded-xl bg-ufo-green text-black font-mono text-xs font-bold flex items-center gap-2 hover:bg-white transition-all disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {isSavingText ? 'SAVING...' : 'COMMIT NOTE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickCaptureButton;
