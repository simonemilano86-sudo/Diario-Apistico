import React, { useEffect, useMemo, useState } from 'react';
import { BackArrowIcon, PlusIcon, CheckCircleIcon, TrashIcon } from './Icons';
import { Role, TeamMember, User } from '../types';
import Modal from './Modal';
import { sendInvite } from '../services/inviteService';
import { supabase } from '../services/supabase';

interface TeamManagementProps {
  onBack: () => void;
  user: User | null;
  teamMembers: TeamMember[]; // non usato più come source-of-truth, ma lo teniamo per compatibilità props
  onUpdateMembers: (members: TeamMember[]) => void;
}

type DbRole = 'ADMIN' | 'OPERATOR';

type TeamRow = {
  id: string;
  name: string;
  myRole: DbRole;
};

const LS_KEY = 'beewise-current-team-id';

function normalizeEmail(e?: string | null) {
  return (e ?? '').trim().toLowerCase();
}

// DB -> UI
function dbRoleToUiRole(r: DbRole): Role {
  return r === 'ADMIN' ? 'admin' : 'editor';
}

// UI -> DB (viewer lo trattiamo come OPERATOR; i permessi read-only li gestirai a UI)
function uiRoleToDbRole(r: Role): DbRole {
  return r === 'admin' ? 'ADMIN' : 'OPERATOR';
}

const TeamManagement: React.FC<TeamManagementProps> = ({ onBack, user, onUpdateMembers }) => {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(() => {
    const v = localStorage.getItem(LS_KEY);
    return v ? v : null;
  });

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<null | { type: 'invite' | 'member'; id: string; label: string }>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const myRoleInActiveTeam: DbRole | null = useMemo(() => {
    if (!activeTeamId) return null;
    const t = teams.find(x => x.id === activeTeamId);
    return t?.myRole ?? null;
  }, [teams, activeTeamId]);

  const canInvite = myRoleInActiveTeam === 'ADMIN';

  const fetchTeamData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setTeams([]);
        setMembers([]);
        onUpdateMembers([]);
        return;
      }

      // 1) Team dell’utente corrente
      const { data: myMemberships, error: myMemErr } = await supabase
        .from('memberships')
        .select(`
          role,
          user_id,
          team_id,
          teams ( id, name )
        `)
        .eq('user_id', session.user.id);

      if (myMemErr) throw myMemErr;

      const myTeams: TeamRow[] = (myMemberships ?? [])
        .filter(m => (m as any).teams?.id)
        .map((m: any) => ({
          id: m.teams.id as string,
          name: (m.teams.name as string) ?? 'Team',
          myRole: (m.role as DbRole) ?? 'OPERATOR',
        }));

      setTeams(myTeams);

      // 2) Determina team attivo (fallback: primo team)
      const stored = localStorage.getItem(LS_KEY);
      const storedValid = stored && myTeams.some(t => t.id === stored) ? stored : null;
      const resolvedActive = storedValid ?? (myTeams.length > 0 ? myTeams[0].id : null);

      if (!resolvedActive) {
        setMembers([]);
        onUpdateMembers([]);
        setIsLoading(false);
        return;
      }

      // riallineo LS
      if (resolvedActive !== stored) {
        localStorage.setItem(LS_KEY, resolvedActive);
        setActiveTeamId(resolvedActive);
      }

      // 3) Membri del team (con email da public.users)
      const { data: activeRows, error: activeErr } = await supabase
        .from('memberships')
        .select(`
          id,
          role,
          user_id,
          users ( email )
        `)
        .eq('team_id', resolvedActive);

      if (activeErr) throw activeErr;

      const activeMembers: TeamMember[] = (activeRows ?? []).map((m: any) => {
        const email = normalizeEmail(m.users?.email);
        const isMe = m.user_id === session.user.id;

        return {
          id: String(m.id), // membership id
          email: email || '',
          name: isMe
            ? 'Tu'
            : (email ? email.split('@')[0] : `Membro ${String(m.user_id).slice(0, 6)}`),
          role: dbRoleToUiRole((m.role as DbRole) ?? 'OPERATOR'),
          status: 'active',
        };
      });

      // 4) Inviti pendenti del team
      const { data: pendingRows, error: pendingErr } = await supabase
        .from('invitations')
        .select('id, email, role')
        .eq('team_id', resolvedActive)
        .is('claimed_at', null);

      if (pendingErr) throw pendingErr;

      const pendingInvitesRaw: TeamMember[] = (pendingRows ?? []).map((i: any) => {
        const email = normalizeEmail(i.email);
        const uiRole = dbRoleToUiRole((i.role as DbRole) ?? 'OPERATOR');
        return {
          id: String(i.id), // invitation id
          email,
          name: email ? email.split('@')[0] : 'Invitato',
          role: uiRole,
          status: 'pending',
        };
      });

      // 5) DEDUP: se email già active, non mostrare pending
      const activeEmailSet = new Set(
        activeMembers.map(m => normalizeEmail(m.email)).filter(Boolean)
      );

      const pendingInvites = pendingInvitesRaw.filter(p => {
        const pe = normalizeEmail(p.email);
        return pe && !activeEmailSet.has(pe);
      });

      const finalMembers = [...activeMembers, ...pendingInvites];

      setMembers(finalMembers);
      onUpdateMembers(finalMembers);
    } catch (e: any) {
      console.error('Errore fetch team:', e);
      setError(e?.message ?? 'Errore nel caricamento dei team.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeTeamId) {
      setMembers([]);
      onUpdateMembers([]);
      return;
    }
    fetchTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId]);

  const switchTeam = (teamId: string | null) => {
    if (teamId) {
      localStorage.setItem(LS_KEY, teamId);
      setActiveTeamId(teamId);
    } else {
      localStorage.removeItem(LS_KEY);
      setActiveTeamId(null);
    }

    // IMPORTANTISSIMO: services/db.ts cambia sorgente dati in base a localStorage.
    // Senza toccare App.tsx, l’unico modo affidabile è ricaricare l’app.
    window.location.reload();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Devi essere loggato per invitare qualcuno.');
      if (!activeTeamId) throw new Error('Seleziona un team prima di invitare.');

      if (!canInvite) {
        throw new Error('Solo un ADMIN può invitare nuovi membri.');
      }

      const email = normalizeEmail(inviteEmail);
      if (!email) throw new Error('Email non valida.');

      const dbRole = uiRoleToDbRole(inviteRole);

      await sendInvite({
        teamId: activeTeamId,
        email,
        role: dbRole,
      });

      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('editor');

      await fetchTeamData();
    } catch (err: any) {
      setError(err?.message ?? 'Impossibile inviare l’invito.');
    } finally {
      setIsInviting(false);
    }
  };

  // ✅ Conferma elimina (invito o membro)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Devi essere loggato.');

      if (!activeTeamId) throw new Error('Nessun team attivo.');
      if (!canInvite) throw new Error('Solo un ADMIN può rimuovere/annullare.');

      if (deleteTarget.type === 'invite') {
        const { error: delErr } = await supabase
          .from('invitations')
          .delete()
          .eq('id', deleteTarget.id)
          .eq('team_id', activeTeamId);

        if (delErr) throw delErr;
      }

      if (deleteTarget.type === 'member') {
        const { error: delErr } = await supabase
          .from('memberships')
          .delete()
          .eq('id', deleteTarget.id)
          .eq('team_id', activeTeamId);

        if (delErr) throw delErr;
      }

      setDeleteTarget(null);
      await fetchTeamData();
    } catch (e: any) {
      setError(e?.message ?? 'Operazione non riuscita.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600"
          >
            <BackArrowIcon className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">I Tuoi Team</h2>
        </div>

        {activeTeamId && canInvite && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm hover:bg-amber-600 transition"
          >
            <PlusIcon className="w-4 h-4" /> Invita
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Selettore contesto */}
      <div className="mb-8 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase px-1">Contesto Attivo</p>

        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => switchTeam(null)}
            className={`p-4 rounded-xl border text-left transition-all ${
              !activeTeamId
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <p className="font-bold text-slate-900 dark:text-slate-100">Miei Dati Personali</p>
            <p className="text-xs text-slate-500">Solo tu puoi vedere questi dati</p>
          </button>

          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => switchTeam(team.id)}
              className={`p-4 rounded-xl border text-left transition-all flex justify-between items-center ${
                activeTeamId === team.id
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">{team.name}</p>
                <p className="text-xs text-slate-500 uppercase tracking-tight">
                  Ruolo: {team.myRole}
                </p>
              </div>
              {activeTeamId === team.id && (
                <CheckCircleIcon className="w-5 h-5 text-amber-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Membri del team */}
      {activeTeamId && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-xs font-bold text-slate-500 uppercase px-1">Membri & Collaboratori</p>

          {isLoading ? (
            <div className="text-center py-10 text-slate-500">Aggiornamento lista...</div>
          ) : members.length > 0 ? (
            members.map(member => (
              <div
                key={member.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                    {(member.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white leading-tight">
                      {member.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member.email || (member.status === 'active' ? 'Attivo' : '')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Badge */}
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                      member.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700 animate-pulse'
                    }`}
                  >
                    {member.status === 'active' ? member.role : 'In attesa'}
                  </span>

                  {/* Azioni ADMIN */}
                  {canInvite && member.status === 'pending' && (
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: 'invite',
                          id: member.id,
                          label: `Annullare invito a ${member.email}`,
                        })
                      }
                      className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                      title="Annulla invito"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}

                  {canInvite && member.status === 'active' && member.name !== 'Tu' && (
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: 'member',
                          id: member.id,
                          label: `Rimuovere ${member.email || member.name}`,
                        })
                      }
                      className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                      title="Rimuovi membro"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <p className="text-slate-500 text-sm italic">Nessun altro membro in questo team.</p>
            </div>
          )}
        </div>
      )}

      {/* Modale invito */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invita Collaboratore"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
              Email Destinatario
            </label>
            <input
              type="email"
              placeholder="email@esempio.com"
              className="w-full p-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-amber-500"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
              Ruolo nel Team
            </label>
            <select
              className="w-full p-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-amber-500"
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
            >
              <option value="editor">Operatore (Può modificare)</option>
              <option value="viewer">Visore (Sola lettura)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Nota: a livello DB “viewer” viene trattato come OPERATOR; i permessi read-only sono gestiti lato UI.
            </p>
          </div>

          <button
            type="submit"
            disabled={isInviting}
            className="w-full bg-amber-500 hover:bg-amber-600 py-3 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
          >
            {isInviting ? 'Invio in corso...' : 'Invia Invito'}
          </button>
        </form>
      </Modal>

      {/* ✅ Modale conferma delete */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Conferma"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {deleteTarget?.label}
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md"
            >
              Annulla
            </button>

            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
            >
              {isDeleting ? 'Elimino...' : 'Conferma'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamManagement;