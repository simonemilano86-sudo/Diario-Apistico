
import React, { useState } from 'react';
import { BackArrowIcon, UsersIcon, ShieldCheckIcon, MailIcon, PlusIcon, CheckCircleIcon, WarningIcon } from './Icons';
import { Role, TeamMember, User } from '../types';
import Modal from './Modal';
import { sendInvite } from '../services/inviteService';
import { supabase } from '../services/supabase';

interface TeamManagementProps {
    onBack: () => void;
    user: User | null;
    teamMembers: TeamMember[];
    onUpdateMembers: (members: TeamMember[]) => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ onBack, user, teamMembers, onUpdateMembers }) => {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('editor');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    
    // States for custom modals
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        setInviteError(null);

        try {
            // 1. Recupero sessione utente
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("Devi essere loggato per invitare qualcuno.");

            // 2. Recupero team_id e ruolo dalla tabella memberships (limit 1)
            const currentTeamId = localStorage.getItem('beewise-current-team-id');
            
            let query = supabase
                .from('memberships')
                .select('team_id, role')
                .eq('user_id', session.user.id);
            
            if (currentTeamId) {
                query = query.eq('team_id', currentTeamId);
            }

            const { data: memberships, error: memErr } = await query.limit(1);

            if (memErr) throw new Error("Errore nel recupero della membership.");
            const membership = memberships?.[0];

            if (!membership) {
                throw new Error("Nessuna membership trovata per l'utente corrente.");
            }

            // 3. Controllo ruolo JS (Solo ADMIN può procedere)
            if (membership.role !== 'ADMIN') {
                throw new Error("Solo gli amministratori (ADMIN) possono invitare nuovi membri.");
            }

            // 4. Mappatura esplicita dei ruoli per la Edge Function
            const roleMap: Record<string, 'ADMIN' | 'OPERATOR'> = {
                'admin': 'ADMIN',
                'editor': 'OPERATOR',
                'viewer': 'OPERATOR'
            };
            const finalRole = roleMap[inviteRole] || 'OPERATOR';

            // 5. LOG DEBUG richiesto
            console.log("DEBUG INVITO", { 
                user_id: session.user.id, 
                membership_team_id: membership.team_id, 
                role: membership.role, 
                team_id_inviato: membership.team_id 
            });

            // 6. Chiamata Edge Function con il VERO team_id della membership
            const result = await sendInvite({
                teamId: membership.team_id,
                email: inviteEmail,
                role: finalRole
            });

            // Successo: aggiornamento stato locale
            const newMember: TeamMember = {
                id: result.invitation_id || Date.now().toString(),
                email: inviteEmail,
                name: inviteEmail.split('@')[0], 
                role: inviteRole,
                status: 'pending'
            };

            onUpdateMembers([...teamMembers, newMember]);
            setIsInviteModalOpen(false);
            setInviteEmail('');
            setInviteRole('editor');
            setSuccessMessage(`Invito inviato correttamente a ${inviteEmail}.`);
            
        } catch (err: any) {
            console.error("Errore invito:", err);
            setInviteError(err.message || "Impossibile inviare l'invito. Controlla i permessi.");
        } finally {
            setIsInviting(false);
        }
    };

    const requestRemoveMember = (id: string) => {
        setMemberToRemove(id);
    };

    const confirmRemoveMember = () => {
        if (memberToRemove) {
            onUpdateMembers(teamMembers.filter(m => m.id !== memberToRemove));
            setMemberToRemove(null);
        }
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button 
                    onClick={onBack} 
                    className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                >
                    <BackArrowIcon className="w-5 h-5"/>
                </button>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestione Team</h2>
            </div>

            {/* Info Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                        <UsersIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Il tuo Team</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Condividi i dati del tuo apiario con collaboratori fidati. Puoi assegnare ruoli per controllare chi può modificare o solo visualizzare i dati.
                        </p>
                    </div>
                </div>
            </div>

            {/* Members List */}
            <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">Membri ({teamMembers.length})</h3>
                    {user?.role !== 'viewer' && user?.role !== 'editor' && (
                        <button 
                            onClick={() => setIsInviteModalOpen(true)}
                            className="text-sm font-semibold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1"
                        >
                            <PlusIcon className="w-4 h-4"/> Invita
                        </button>
                    )}
                </div>

                {teamMembers.map(member => (
                    <div key={member.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                member.role === 'admin' ? 'bg-amber-500' : 
                                member.role === 'editor' ? 'bg-blue-500' : 'bg-slate-400'
                            }`}>
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    {member.name}
                                    {member.role === 'admin' && <span title="Admin"><ShieldCheckIcon className="w-4 h-4 text-amber-500"/></span>}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                                    member.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    member.role === 'editor' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                    {member.role === 'editor' ? 'Operatore' : member.role === 'viewer' ? 'Sola Lettura' : 'Admin'}
                                </span>
                                {member.status === 'pending' && (
                                    <p className="text-[10px] text-amber-500 font-medium mt-0.5">In attesa...</p>
                                )}
                            </div>
                            
                            {user?.role === 'admin' && member.email !== user?.email && (
                                <button 
                                    onClick={() => requestRemoveMember(member.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                    title="Rimuovi"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Invite Modal */}
            <Modal isOpen={isInviteModalOpen} onClose={() => { if(!isInviting) setIsInviteModalOpen(false); }} title="Invita nel tuo Apiario">
                <form onSubmit={handleInvite} className="space-y-6">
                    {inviteError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <WarningIcon className="w-5 h-5 flex-shrink-0" />
                            {inviteError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Collaboratore</label>
                        <div className="relative">
                            <input 
                                type="email" 
                                required
                                disabled={isInviting}
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full pl-10 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50"
                                placeholder="collaboratore@email.com"
                            />
                            <MailIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 italic">L'utente riceverà un link per unirsi al team.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Seleziona Ruolo:</label>
                        <div className="grid grid-cols-1 gap-3">
                            <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${inviteRole === 'editor' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        value="editor" 
                                        disabled={isInviting}
                                        checked={inviteRole === 'editor'} 
                                        onChange={() => setInviteRole('editor')}
                                        className="h-5 w-5 text-blue-600"
                                    />
                                    <div>
                                        <span className="block font-bold text-slate-800 dark:text-white">Operatore</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Può aggiungere e modificare dati, ma NON può cancellare.</span>
                                    </div>
                                </div>
                            </label>

                            <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${inviteRole === 'viewer' ? 'border-slate-500 bg-slate-100 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        value="viewer" 
                                        disabled={isInviting}
                                        checked={inviteRole === 'viewer'} 
                                        onChange={() => setInviteRole('viewer')}
                                        className="h-5 w-5 text-slate-600"
                                    />
                                    <div>
                                        <span className="block font-bold text-slate-800 dark:text-white">Sola Lettura</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Può solo visualizzare i dati, nessuna modifica.</span>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            disabled={isInviting}
                            onClick={() => setIsInviteModalOpen(false)} 
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-300 disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button 
                            type="submit" 
                            disabled={isInviting || !inviteEmail}
                            className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                            {isInviting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Invio...
                                </>
                            ) : 'Invia Invito'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Success Modal */}
            <Modal isOpen={!!successMessage} onClose={() => setSuccessMessage(null)} title="Operazione Completata">
                <div className="flex flex-col items-center justify-center p-4 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
                    <p className="text-lg font-medium text-slate-800 dark:text-white mb-2">{successMessage}</p>
                    <button 
                        onClick={() => setSuccessMessage(null)} 
                        className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                    >
                        Chiudi
                    </button>
                </div>
            </Modal>

            {/* Confirm Delete Modal */}
            <Modal isOpen={!!memberToRemove} onClose={() => setMemberToRemove(null)} title="Rimuovi Membro">
                <div className="space-y-4">
                    <p className="text-slate-700 dark:text-slate-300">
                        Sei sicuro di voler rimuovere questo membro dal team? Non potrà più accedere ai dati.
                    </p>
                    <div className="flex justify-end gap-4 pt-4">
                        <button onClick={() => setMemberToRemove(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500">Annulla</button>
                        <button onClick={confirmRemoveMember} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Rimuovi</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TeamManagement;
