import React, { useState } from 'react';
import Modal from './Modal';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

const AppFeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, user }) => {
    const [type, setType] = useState<'bug' | 'suggestion' | 'other'>('suggestion');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('feedback')
                .insert([
                    {
                        type,
                        message,
                        user_id: user?.uid || 'anonymous',
                        user_email: user?.email || 'anonymous',
                        user_name: user?.name || 'anonymous',
                        app_version: '1.0.0',
                        user_agent: navigator.userAgent
                    }
                ]);

            if (insertError) throw insertError;

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setMessage('');
                setType('suggestion');
            }, 2000);
        } catch (err: any) {
            console.error("Errore invio feedback:", err);
            setError("Si è verificato un errore durante l'invio. Riprova più tardi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invia Feedback">
            {success ? (
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        ✓
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Grazie!</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        Il tuo messaggio è stato inviato con successo. Apprezziamo molto il tuo contributo per migliorare l'app.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Hai trovato un problema o hai un'idea per migliorare l'app? Faccelo sapere!
                    </p>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo di messaggio</label>
                        <select 
                            value={type} 
                            onChange={(e) => setType(e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                            <option value="suggestion">💡 Suggerimento / Nuova Funzione</option>
                            <option value="bug">🐛 Segnala un Bug / Errore</option>
                            <option value="other">💬 Altro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Il tuo messaggio</label>
                        <textarea 
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Descrivi qui il problema o la tua idea..."
                            rows={5}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Annulla
                        </button>
                        <button 
                            type="submit"
                            disabled={!message.trim() || isSubmitting}
                            className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? 'Invio in corso...' : 'Invia Messaggio'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default AppFeedbackModal;
