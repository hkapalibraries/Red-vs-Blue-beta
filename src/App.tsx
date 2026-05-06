/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { signInAnonymousUser, auth } from './lib/firebase';
import AdminScreen from './components/AdminScreen';
import TVDisplay from './components/TVDisplay';
import PlayerScreen from './components/PlayerScreen';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<'player' | 'tv' | 'admin'>('player');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'tv') setMode('tv');
    else if (modeParam === 'admin') setMode('admin');

    const initAuth = async () => {
      auth.onAuthStateChanged(user => {
        if (user) {
          setAuthReady(true);
        } else {
          signInAnonymousUser().catch(e => {
            console.error(e);
            setAuthError(`Authentication failed: ${e.message}`);
          });
        }
      });
    };
    initAuth();
  }, []);

  if (authError) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-900 text-white p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-500">無法連線 / Connection Failed</h1>
        <p className="max-w-md text-gray-300">{authError}</p>
        <div className="text-left bg-gray-800 p-4 rounded text-sm max-w-md border border-gray-700 space-y-2">
          <p className="font-bold text-yellow-400">Action Required:</p>
          <p>Please enable <strong>Anonymous Authentication</strong> in your Firebase Console.</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to <a href="https://console.firebase.google.com/project/_/authentication/providers" target="_blank" className="text-blue-400 underline">Firebase Auth Providers</a></li>
            <li>Select your project</li>
            <li>Add <strong>Anonymous</strong> and toggle Enable</li>
          </ol>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <p className="animate-pulse text-xl">連線中... / Connecting...</p>
      </div>
    );
  }

  if (mode === 'admin') return <AdminScreen />;
  if (mode === 'tv') return <TVDisplay />;
  return <PlayerScreen />;
}

