import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AcceptInvite from './components/AcceptInvite';

const rootElement = document.getElementById('root');
const panicScreen = document.getElementById('panic-screen');
const panicMessage = document.getElementById('panic-message');
const panicStack = document.getElementById('panic-stack');

const showPanic = (err: any) => {
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
    
    // Routing minimale basato sulla path
    const path = window.location.pathname;
    
    root.render(
        <React.StrictMode>
            {path === '/accept-invite' ? <AcceptInvite /> : <App />}
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