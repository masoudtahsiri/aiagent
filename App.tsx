import React from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';
import { ConnectionState } from './types';

const App: React.FC = () => {
  const { connectionState, connect, disconnect, volume, error } = useLiveSession();

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-dental-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-dental-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
            Bright Smile
          </h1>
          <p className="text-dental-50 text-sm mt-1 opacity-90">Dental Clinic AI Receptionist</p>
        </div>

        {/* Status & Visualizer */}
        <div className="p-6">
          <div className="mb-6">
            <Visualizer volume={volume} state={connectionState} />
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
               <p className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-1">Status</p>
               <p className={`text-lg font-semibold ${
                 connectionState === ConnectionState.CONNECTED ? 'text-green-600' : 
                 connectionState === ConnectionState.ERROR ? 'text-red-600' :
                 connectionState === ConnectionState.CONNECTING ? 'text-dental-600' :
                 'text-slate-700'
               }`}>
                 {connectionState === ConnectionState.CONNECTED && "Connected to Sarah"}
                 {connectionState === ConnectionState.CONNECTING && "Calling..."}
                 {connectionState === ConnectionState.DISCONNECTED && "Offline"}
                 {connectionState === ConnectionState.ERROR && "Error"}
               </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
                {error}
              </div>
            )}
            
            {/* Controls */}
            <button
              onClick={handleToggleConnection}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200'
                  : 'bg-dental-600 hover:bg-dental-500 text-white shadow-dental-200'
              }`}
            >
              {connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING ? (
                 <>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-10.5 6L3 18.75m0 0l2.25 2.25M3 18.75l2.25-2.25M3 18.75l-2.25 2.25m6-10.5l10.5 10.5" />
                   </svg>
                   End Call
                 </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  Talk to Receptionist
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Powered by Gemini 2.5 Live API
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Allow microphone access to start the conversation.
          </p>
        </div>
      </div>

    </div>
  );
};

export default App;