import React, { useEffect, useMemo, useState } from 'react';
import { BackArrowIcon, PlusIcon, CheckCircleIcon, TrashIcon, MoreVerticalIcon } from './Icons';
import { Role, TeamMember, User } from '../types';
import Modal from './Modal';
import { sendInvite } from '../services/inviteService';
import { supabase } from '../services/supabase';

interface TeamManagementProps {
  onBack: () => void;
  user: User | null;
  teamMembers: TeamMember[]; // non usato più come source-of-truth, ma lo teniamo per compatibilità props
  onUpdateMembers: (members: TeamMember[]) => void;
  onOpenPremium?: () => void;
  onOpenMultiAccess?: () => void;
  activeTeamId?: string | null;
  onSwitchScope?: (teamId: string | null) => void;
}

type DbRole = 'ADMIN' | 'OPERATOR' | 'OWNER';

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
function dbRoleToUiRole(r: string): Role {
  const upper = (r || '').toUpperCase();
  return (upper === 'ADMIN' || upper === 'OWNER') ? 'admin' : 'editor';
}

// UI -> DB (viewer lo trattiamo come OPERATOR; i permessi read-only li gestirai a UI)
function uiRoleToDbRole(r: Role): DbRole {
  return r === 'admin' ? 'ADMIN' : 'OPERATOR';
}

const TeamManagement: React.FC<TeamManagementProps> = ({
  onBack,
  user,
  onUpdateMembers,
  onOpenPremium,
  onOpenMultiAccess,
  activeTeamId: propActiveTeamId,
  onSwitchScope,
}) => {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(() => {
    if (propActiveTeamId !== undefined) return propActiveTeamId;
    const v = localStorage.getItem(LS_KEY);
    return (!v || v === 'personal') ? null : v;
  });

  useEffect(() => {
    if (propActiveTeamId !== undefined) {
      setActiveTeamId(propActiveTeamId);
    }
  }, [propActiveTeamId]);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [myPendingInvites, setMyPendingInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isTeamCreationInfoOpen, setIsTeamCreationInfoOpen] = useState(false);
  const [isTeaserModalOpen, setIsTeaserModalOpen] = useState(false);
  const [isTeaserChecked, setIsTeaserChecked] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteWarningLink, setInviteWarningLink] = useState<{ email: string; link: string } | null>(null);

  // ✅ Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<null | { type: 'invite' | 'member'; id: string; label: string }>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);

  const ownedAdminTeam = useMemo(
    () => teams.find(t => t.myRole === 'ADMIN' || t.myRole === 'OWNER') ?? null,
    [teams]
  );

  // Team di cui mostrare/gestire i membri (quello attivo oppure il primo disponibile se si sta guardando il profilo personale)
  const inspectedTeamId = useMemo(() => {
    if (activeTeamId && teams.some(t => t.id === activeTeamId)) return activeTeamId;
    return teams.length > 0 ? teams[0].id : null;
  }, [activeTeamId, teams]);

  const myRoleInActiveTeam: DbRole | null = useMemo(() => {
    if (!inspectedTeamId) return null;
    const t = teams.find(x => x.id === inspectedTeamId);
    return t?.myRole ?? null;
  }, [teams, inspectedTeamId]);

  const canInvite = true; // FORZATO: mostra sempre il tasto se c'è un team attivo
  const isAdmin = myRoleInActiveTeam === 'ADMIN' || myRoleInActiveTeam === 'OWNER';

  const handleInviteClick = () => {
    setInviteError(null);
    if (user?.plan === 'free' || user?.plan === 'premium') {
      setIsTeaserChecked(false);
      setIsTeaserModalOpen(true);
    } else if (!activeTeamId && !ownedAdminTeam) {
      setIsTeamCreationInfoOpen(true);
    } else {
      setIsInviteModalOpen(true);
    }
  };

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
          status,
          teams ( id, name )
        `)
        .eq('user_id', session.user.id);

      if (myMemErr) throw myMemErr;

      const myTeams: TeamRow[] = (myMemberships ?? [])
        .filter(m => m.team_id && m.status === 'active') // Filtra solo i team in cui l'utente è attivo
        .map((m: any) => ({
          id: m.team_id as string,
          name: (m.teams?.name as string) ?? 'Team',
          myRole: ((m.role as string)?.toUpperCase() as DbRole) ?? 'OPERATOR',
        }));

      setTeams(myTeams);

      // 1.5) Inviti pendenti per l'utente corrente
      if (session.user.email) {
        // Rimuoviamo teams(name) per evitare che RLS sulla tabella teams blocchi la query
        const { data: myInvitesRows, error: myInvitesErr } = await supabase
          .from('invitations')
          .select(`
            id,
            team_id,
            role,
            token
          `)
          .eq('email', session.user.email)
          .is('claimed_at', null);

        if (!myInvitesErr) {
          setMyPendingInvites(myInvitesRows || []);
        }
      }

      // 2) Determina quale team mostrare nella lista membri senza alterare il contesto dati dell'app
      const stored = localStorage.getItem(LS_KEY);
      const currentScopeId = propActiveTeamId !== undefined
        ? propActiveTeamId
        : ((!stored || stored === 'personal') ? null : stored);

      const resolvedMemberTeamId = (currentScopeId && myTeams.some(t => t.id === currentScopeId))
        ? currentScopeId
        : (myTeams.length > 0 ? myTeams[0].id : null);

      if (!resolvedMemberTeamId) {
        setMembers([]);
        onUpdateMembers([]);
        setIsLoading(false);
        return;
      }

      // 3) Membri del team (con email da public.users)
      const { data: activeRows, error: activeErr } = await supabase
        .from('memberships')
        .select(`
          id,
          role,
          user_id,
          status,
          users ( email, full_name )
        `)
        .eq('team_id', resolvedMemberTeamId);

      if (activeErr) throw activeErr;

      const activeMembers: TeamMember[] = (activeRows ?? []).map((m: any) => {
        const email = normalizeEmail(m.users?.email);
        const name = m.users?.full_name;
        const isMe = m.user_id === session.user.id;

        return {
          id: String(m.id), // membership id
          email: email || '',
          name: isMe
            ? 'Tu'
            : (name || email || 'Simone'),
          role: dbRoleToUiRole((m.role as string) ?? 'OPERATOR'),
          status: m.status === 'suspended' ? 'suspended' : 'active',
        };
      });

      // 4) Inviti pendenti del team
      const { data: pendingRows, error: pendingErr } = await supabase
        .from('invitations')
        .select('id, email, role')
        .eq('team_id', resolvedMemberTeamId)
        .is('claimed_at', null);

      if (pendingErr) throw pendingErr;

      const pendingInvitesRaw: TeamMember[] = (pendingRows ?? []).map((i: any) => {
        const email = normalizeEmail(i.email);
        const uiRole = dbRoleToUiRole((i.role as string) ?? 'OPERATOR');
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
    fetchTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId]);

  const switchTeam = (teamId: string | null, forceReload = false) => {
    if (!forceReload && onSwitchScope) {
      setActiveTeamId(teamId);
      onSwitchScope(teamId);
      return;
    }

    if (teamId) {
      localStorage.setItem(LS_KEY, teamId);
      setActiveTeamId(teamId);
    } else {
      localStorage.setItem(LS_KEY, 'personal');
      setActiveTeamId(null);
    }

    window.location.reload();
  };

  const handleAcceptMyInvite = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Devi essere loggato.');

      const { data, error } = await supabase.rpc('accept_invitation', {
        p_token: token,
        p_user_id: session.user.id
      });

      if (error) throw error;
      
      const isSuccess = typeof data === 'boolean' ? data : data?.success;
      if (!isSuccess) {
        throw new Error(data?.message || "L'invito non è più valido o è già stato utilizzato.");
      }

      await fetchTeamData();
    } catch (e: any) {
      setError(e?.message ?? "Errore durante l'accettazione dell'invito.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);
    setError(null);
    setInviteWarningLink(null);

    try {
      const email = normalizeEmail(inviteEmail);
      if (!email) throw new Error('Email non valida.');

      const dbRole = uiRoleToDbRole(inviteRole);
      const targetTeamId = activeTeamId || ownedAdminTeam?.id || 'personal';

      const response = await sendInvite({
        teamId: targetTeamId,
        email,
        name: inviteName,
        role: dbRole,
      });

      if (response?.email_sent === false && response?.invite_link) {
        setInviteWarningLink({ email, link: response.invite_link });
      }

      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('editor');

      if (response?.new_team_id) {
        if (onSwitchScope) {
          switchTeam(response.new_team_id, false);
          await fetchTeamData();
        } else if (response?.email_sent === false) {
          localStorage.setItem(LS_KEY, response.new_team_id);
          setActiveTeamId(response.new_team_id);
          await fetchTeamData();
        } else {
          switchTeam(response.new_team_id, true);
        }
      } else {
        await fetchTeamData();
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Impossibile inviare l’invito.';
      setInviteError(msg);
      setError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleReactivateMember = async (membershipId: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Devi essere loggato.');
      if (!inspectedTeamId) throw new Error('Nessun team attivo.');
      // if (!canInvite) throw new Error('Solo un ADMIN può riattivare.');

      const { error: updErr } = await supabase
        .from('memberships')
        .update({ status: 'active' })
        .eq('id', membershipId)
        .eq('team_id', inspectedTeamId);

      if (updErr) throw updErr;

      await fetchTeamData();
    } catch (e: any) {
      setError(e?.message ?? 'Operazione non riuscita.');
    } finally {
      setIsDeleting(false);
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

      if (!inspectedTeamId) throw new Error('Nessun team attivo.');
      // if (!canInvite) throw new Error('Solo un ADMIN può rimuovere/annullare.');

      if (deleteTarget.type === 'invite') {
        const { error: delErr } = await supabase
          .from('invitations')
          .delete()
          .eq('id', deleteTarget.id)
          .eq('team_id', inspectedTeamId);

        if (delErr) throw delErr;
      }

      if (deleteTarget.type === 'member') {
        const { error: delErr } = await supabase
          .from('memberships')
          .update({ status: 'suspended' })
          .eq('id', deleteTarget.id)
          .eq('team_id', inspectedTeamId);

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

        {canInvite && (
          <button
            onClick={handleInviteClick}
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

      {inviteWarningLink && (
        <div className="mb-4 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl p-3 space-y-2">
          <p className="font-bold">
            Invito registrato per {inviteWarningLink.email}, ma l'invio email automatico non è riuscito.
          </p>
          <p>Condividi manualmente questo link di invito:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteWarningLink.link}
              className="flex-1 text-[11px] bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-1.5"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(inviteWarningLink.link)}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition"
            >
              Copia
            </button>
          </div>
        </div>
      )}

      {/* Inviti Ricevuti */}
      {myPendingInvites.length > 0 && (
        <div className="mb-8 space-y-4 animate-fade-in">
          <p className="text-xs font-bold text-amber-600 uppercase px-1">Inviti Ricevuti</p>
          <div className="grid grid-cols-1 gap-2">
            {myPendingInvites.map(invite => (
              <div
                key={invite.id}
                className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="font-bold text-amber-900">
                    {invite.teams?.name || 'Team Sconosciuto'}
                  </p>
                  <p className="text-xs text-amber-700 uppercase tracking-tight">
                    Ruolo proposto: {invite.role === 'OPERATOR' ? 'Operatore' : invite.role}
                  </p>
                </div>
                <button
                  onClick={() => handleAcceptMyInvite(invite.token)}
                  className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-amber-600 transition"
                >
                  Accetta
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selettore contesto */}
      <div className="mb-8 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase px-1">Contesto Attivo</p>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => switchTeam(null)}
            className={`w-full p-4 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
              !activeTeamId
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
            }`}
          >
            <div>
              <p className={`font-bold ${!activeTeamId ? 'text-amber-900' : 'text-slate-900 dark:text-slate-100'}`}>Miei Dati Personali</p>
              <p className={`text-xs ${!activeTeamId ? 'text-amber-700' : 'text-slate-500'}`}>Solo tu puoi vedere questi dati</p>
            </div>
            {!activeTeamId && (
              <CheckCircleIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
            )}
          </button>

          {teams.map(team => (
            <button
              type="button"
              key={team.id}
              onClick={() => switchTeam(team.id)}
              className={`w-full p-4 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                activeTeamId === team.id
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
              }`}
            >
              <div className="min-w-0">
                <p className={`font-bold leading-tight truncate ${activeTeamId === team.id ? 'text-amber-900' : 'text-slate-900 dark:text-slate-100'}`}>{team.name}</p>
                <p className={`text-xs uppercase tracking-tight truncate ${activeTeamId === team.id ? 'text-amber-700' : 'text-slate-500'}`}>
                  Ruolo: {team.myRole === 'OPERATOR' ? 'Operatore' : team.myRole}
                </p>
              </div>
              {activeTeamId === team.id && (
                <CheckCircleIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Membri del team */}
      {inspectedTeamId && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-xs font-bold text-slate-500 uppercase px-1">
            Membri & Collaboratori
            {!activeTeamId && teams.find(t => t.id === inspectedTeamId) && (
              <span className="ml-1 font-normal normal-case text-slate-400">
                ({teams.find(t => t.id === inspectedTeamId)?.name})
              </span>
            )}
          </p>

          {isLoading ? (
            <div className="text-center py-10 text-slate-500">Aggiornamento lista...</div>
          ) : members.length > 0 ? (
            members.map(member => {
              const isSelf = member.name === 'Tu' || (!!user?.email && normalizeEmail(member.email) === normalizeEmail(user.email));
              const canManageMember = isAdmin && !isSelf;
              const isMenuOpen = openMemberMenuId === member.id;

              return (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm relative"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                      {(member.email || member.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white leading-tight truncate">
                        {member.email || member.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2 relative">
                    {/* Badge */}
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                        member.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : member.status === 'suspended'
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-amber-100 text-amber-700 animate-pulse'
                      }`}
                    >
                      {member.status === 'active'
                        ? (member.role === 'editor' || member.role === 'operator' ? 'Operatore' : member.role)
                        : member.status === 'suspended'
                        ? 'Sospeso'
                        : 'In attesa'}
                    </span>

                    {canManageMember && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMemberMenuId(isMenuOpen ? null : member.id);
                          }}
                          className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="Gestisci membro"
                        >
                          <MoreVerticalIcon className="w-5 h-5" />
                        </button>

                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setOpenMemberMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 py-1 z-30 animate-fade-in">
                              {member.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMemberMenuId(null);
                                    setDeleteTarget({
                                      type: 'member',
                                      id: member.id,
                                      label: `Vuoi sospendere l'accesso a "${member.email || member.name}"? Non potrà più accedere ai dati del team, ma la cronologia delle sue ispezioni rimarrà intatta e potrai riattivarlo in qualsiasi momento.`,
                                    });
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition"
                                >
                                  <span>❄️</span>
                                  <span>Sospendi accesso</span>
                                </button>
                              )}

                              {member.status === 'suspended' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMemberMenuId(null);
                                    handleReactivateMember(member.id);
                                  }}
                                  disabled={isDeleting}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2 transition disabled:opacity-50"
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                  <span>Riattiva accesso</span>
                                </button>
                              )}

                              {member.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMemberMenuId(null);
                                    setDeleteTarget({
                                      type: 'invite',
                                      id: member.id,
                                      label: `Vuoi annullare l'invito inviato a "${member.email || member.name}"?`,
                                    });
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  <span>Annulla invito</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <p className="text-slate-500 text-sm italic">Nessun altro membro in questo team.</p>
            </div>
          )}
        </div>
      )}

      {/* Pop-up informativo creazione team al primo invito da profilo personale */}
      <Modal
        isOpen={isTeamCreationInfoOpen}
        onClose={() => setIsTeamCreationInfoOpen(false)}
        title="🐝 Creazione del tuo Team"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Stai creando il tuo nuovo spazio <span className="font-bold text-amber-600 dark:text-amber-400">Team condiviso</span>.
          </p>

          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-amber-50/70 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>
                <strong className="text-slate-800 dark:text-white">Menu nella Dashboard:</strong> una volta inviato il primo invito, nella Dashboard apparirà un menu a tendina per passare rapidamente tra <strong>Profilo personale</strong> e <strong>Team</strong>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>
                <strong className="text-slate-800 dark:text-white">Copia iniziale:</strong> i tuoi apiari personali attuali verranno copiati una sola volta nel nuovo Team.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>
                <strong className="text-slate-800 dark:text-white">Spazi separati:</strong> da questo momento in poi <strong>Profilo personale</strong> e <strong>Team</strong> resteranno completamente indipendenti (le modifiche fatte in uno non cambieranno l'altro).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>
                <strong className="text-slate-800 dark:text-white">Personalizzazione:</strong> dopo l'invito potrai tenere o eliminare gli apiari che preferisci in ciascuno dei due profili.
              </span>
            </li>
          </ul>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsTeamCreationInfoOpen(false)}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTeamCreationInfoOpen(false);
                setInviteError(null);
                setIsInviteModalOpen(true);
              }}
              className="flex-[2] px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition text-sm"
            >
              Ho capito, invita collaboratore
            </button>
          </div>
        </div>
      </Modal>

      {/* Modale invito */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setInviteError(null);
        }}
        title="Invita Collaboratore"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {!activeTeamId && ownedAdminTeam && (
            <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
              L'invito verrà inviato per il tuo team esistente: <strong>{ownedAdminTeam.name}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
              Nome Destinatario
            </label>
            <input
              type="text"
              placeholder="Nome"
              className="w-full p-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-amber-500"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              required
            />
          </div>
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

          {inviteError && (
            <div className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 rounded-lg p-3 break-words">
              {inviteError}
            </div>
          )}

          <button
            type="submit"
            disabled={isInviting}
            className="w-full bg-amber-500 hover:bg-amber-600 py-3 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
          >
            {isInviting ? 'Invio in corso...' : 'Invia Invito'}
          </button>
        </form>
      </Modal>

      {/* ✅ Modale conferma sospensione / annullamento invito */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.type === 'member' ? 'Sospendi Membro' : 'Annulla Invito'}
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
              {isDeleting
                ? (deleteTarget?.type === 'member' ? 'Sospendo...' : 'Annullo...')
                : (deleteTarget?.type === 'member' ? 'Sospendi' : 'Conferma')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modale Teaser Premium/Team */}
      <Modal
        isOpen={isTeaserModalOpen}
        onClose={() => setIsTeaserModalOpen(false)}
        title="Lavora in Team"
      >
        <div className="space-y-4 p-1">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
            <h3 className="font-bold text-sm text-amber-800 dark:text-amber-400 mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Funzionalità Multi-Accesso
            </h3>
            <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-500 leading-relaxed">
              La gestione avanzata del team e l'invito di collaboratori sono funzionalità dedicate ai piani per squadre e aziende agricole.
            </p>
          </div>

          <div className="pt-1">
            <button
              onClick={() => {
                window.open('https://diarioapistico.com', '_blank', 'noopener,noreferrer');
                setIsTeaserModalOpen(false);
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Visita diarioapistico.com
            </button>
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
              I piani multi-accesso e la gestione dei collaboratori sono attivabili sul nostro sito web ufficiale.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamManagement;