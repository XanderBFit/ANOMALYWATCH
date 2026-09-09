
import React, { useState, useEffect } from 'react';

interface ApiKeyPromptProps {
  onApiKeySelected: () => void;
  forceReauth?: boolean;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onApiKeySelected, forceReauth = false }) => {
  const [checkingKey, setCheckingKey] = useState(true);
  const [apiKeyAvailable, setApiKeyAvailable] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);

  useEffect(() => {
    const checkKeyStatus = async () => {
      // If forceReauth is triggered (e.g. from a 401), we skip the check and show the UI
      if (forceReauth) {
        setCheckingKey(false);
        setApiKeyAvailable(false);
        return;
      }

      try {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setApiKeyAvailable(hasKey);
          if (hasKey) {
            onApiKeySelected();
          }
        } else {
          // Fallback if not in AI Studio environment
          onApiKeySelected();
        }
      } catch (error) {
        console.error("Error checking API key status:", error);
        setApiKeyAvailable(false);
      } finally {
        setCheckingKey(false);
      }
    };

    checkKeyStatus();
  }, [onApiKeySelected, forceReauth]);

  const handleSelectApiKey = async () => {
    setLoadingSelection(true);
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        // Race condition mitigation: assume success as per rules
        onApiKeySelected();
      } else {
        alert("API key selection tool is not available.");
      }
    } catch (error) {
      console.error("Error opening API key selection:", error);
      alert("Failed to open key selector. Please try again.");
    } finally {
      setLoadingSelection(false);
    }
  };

  if (checkingKey) {
    return (
      <div className="fixed inset-0 z-[200] bg-black text-ufo-green font-mono flex items-center justify-center p-4">
        <div className="flex items-center space-x-3 text-lg animate-pulse">
          <div className="w-6 h-6 border-4 border-ufo-green border-t-transparent rounded-full animate-spin"></div>
          <span>ESTABLISHING SECURE TUNNEL...</span>
        </div>
      </div>
    );
  }

  // Only hide if we aren't forcing a re-auth and a key is already available
  if (apiKeyAvailable && !forceReauth) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl text-white font-mono flex flex-col items-center justify-center p-8">
      <div className="max-w-xl text-center border border-warning-amber/50 bg-warning-amber/10 p-10 rounded-lg shadow-[0_0_70px_rgba(255,170,0,0.15)] space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-warning-amber/50 animate-pulse"></div>
        
        <div className="text-warning-amber text-7xl mb-4 flex justify-center">
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-display font-bold text-white tracking-[0.2em] uppercase">
            {forceReauth ? "AUTHENTICATION RECOVERY" : "API UPLINK REQUIRED"}
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
            {forceReauth 
              ? "The previous API Key failed (401/404). Accessing ground truth intel requires an active API Key from a paid Google Cloud Project."
              : "Advanced anomaly tracking requires Search Grounding and high-tier reasoning models."}
          </p>
          <div className="bg-black/40 border border-warning-amber/20 p-4 rounded text-xs text-warning-amber/80 font-mono text-left leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-warning-amber">{" >> "}</span>
              <span>Select a key from a project with **Billing Enabled**.</span>
            </div>
            <div className="flex items-start gap-2 mt-2">
              <span className="shrink-0 text-warning-amber">{" >> "}</span>
              <span>Search/Maps Grounding is restricted to paid tiers.</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSelectApiKey}
          disabled={loadingSelection}
          className="w-full py-5 bg-warning-amber text-black font-display font-bold text-xl uppercase tracking-[0.2em] hover:bg-white hover:shadow-[0_0_40px_rgba(255,170,0,0.6)] transition-all disabled:opacity-50 disabled:cursor-wait rounded flex items-center justify-center gap-3 shadow-lg"
        >
          {loadingSelection ? (
            <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : null}
          {loadingSelection ? 'SYNCHRONIZING...' : 'SELECT PAID API KEY'}
        </button>

        <div className="pt-4">
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-500 hover:text-warning-amber transition-colors underline uppercase tracking-widest"
          >
            Review Billing Documentation
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyPrompt;
