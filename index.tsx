import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AcceptInvite from './components/AcceptInvite';

const rootElement = document.getElementById('root');
const panicScreen = document.getElementById('panic-screen');
const panicMessage = document.getElementById('panic-message');
const panicStack = document.getElementById('panic-stack');

const showPanic = (err: any) => {
    // Ignora errori WebSocket di Vite o errori benigni del framework
    const msg = err?.message || String(err);
    if (msg.includes('WebSocket') || msg.includes('vite') || msg.includes('HMR')) {
        console.warn("Ignoro errore benigno di sistema:", msg);
        return;
    }

    console.error("PANIC:", err);
    if (panicScreen && panicMessage && panicStack) {
        panicScreen.style.display = 'block';
        panicMessage.textContent = err?.message || 'Errore di caricamento moduli o rete.';
        panicStack.textContent = err?.stack || 'Controlla la connessione o la console remota.';
    }
    document.getElementById('loading-screen')?.remove();
};

window.addEventListener('error', (event) => {
    showPanic(event.error || { message: event.message });
});

window.addEventListener('unhandledrejection', (event) => {
    showPanic(event.reason);
});

try {
    if (!rootElement) throw new Error("Root element not found");

    const root = ReactDOM.createRoot(rootElement);
    
    // Routing: Check path, query param, and hash for robustness
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const pageParam = searchParams.get('page');
    const hash = window.location.hash;

    // Check for token in hash (#token=...)
    if (hash.startsWith('#token=')) {
        const token = hash.split('=')[1];
        localStorage.setItem('pending_invite_token', token);
        // Redirect to accept-invite page to handle the flow
        window.location.href = '/accept-invite';
    }

    const isInviteFlow = path === '/accept-invite' || pageParam === 'accept-invite' || hash.includes('accept-invite');
    
    root.render(
        <React.StrictMode>
            {isInviteFlow ? <AcceptInvite /> : <App />}
        </React.StrictMode>
    );
    
    // Rimuovi il caricamento quando il primo frame è renderizzato
    requestAnimationFrame(() => {
        setTimeout(() => {
            const loader = document.getElementById('loading-screen');
            if (loader) loader.style.opacity = '0';
            setTimeout(() => loader?.remove(), 300);
        }, 500);
    });

} catch (err) {
    showPanic(err);
}