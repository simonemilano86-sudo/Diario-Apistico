import React, { useState } from 'react';
import { User, Apiary } from '../types';
import { 
  BackArrowIcon, 
  TrashIcon, 
  ShieldCheckIcon, 
  SparklesIcon, 
  CloudIcon, 
  EyeIcon, 
  EyeOffIcon,
  WarningIcon,
  CheckCircleIcon
} from './Icons';
import Modal from './Modal';
import { deleteFullAccount, changeUserPassword } from '../services/accountService';

interface ProfileViewProps {
  user: User | null;
  apiaries: Apiary[];
  onBack: () => void;
  onLogout: () => void;
  onOpenMultiAccess: () => void;
  onPlanChanged?: (newPlan: 'free' | 'premium' | 'team' | 'enterprise') => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  apiaries,
  onBack,
  onLogout,
  onOpenMultiAccess,
  onPlanChanged,
}) => {
  // --- PASSWORD CHANGE STATE ---
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // --- SUBSCRIPTION STATE ---
  const currentPlan = (user?.plan || 'free') as 'free' | 'premium' | 'team' | 'enterprise';
  const isPaidPlan = currentPlan !== 'free';
  const [isAutoRenewActive, setIsAutoRenewActive] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`beewise:autorenew:${user?.email}`);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);

  // --- DELETE ACCOUNT MODAL STATE ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteStepStatus, setDeleteStepStatus] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Calcolo statistiche veloci per mostrare all'utente l'importanza dei suoi dati
  const totalHives = apiaries.reduce((acc, a) => acc + (a.hives?.length || 0), 0);
  const totalInspections = apiaries.reduce(
    (acc, a) => acc + (a.hives?.reduce((hAcc, h) => hAcc + (h.inspections?.length || 0), 0) || 0),
    0
  );

  // Helper piano formattato
  const getPlanInfo = () => {
    switch (currentPlan) {
      case 'team':
        return {
          title: 'Piccolo Team',
          price: '4.99€ / mese',
          badgeClass: 'bg-amber-500 text-white',
          description: 'Fino a 3 accessi contemporanei, backup cloud e collaborazione istantanea.',
          maxUsers: '3 dispositivi / membri',
        };
      case 'enterprise':
        return {
          title: 'Azienda Agricola',
          price: '9.99€ / mese',
          badgeClass: 'bg-slate-900 text-amber-400 dark:bg-amber-400 dark:text-slate-950 font-bold',
          description: 'Accessi simultanei illimitati, gestione avanzata permessi e audit log completo.',
          maxUsers: 'Accessi illimitati',
        };
      case 'premium':
        return {
          title: 'Apicoltore Singolo (Premium)',
          price: '2.99€ / mese',
          badgeClass: 'bg-emerald-600 text-white',
          description: 'Salvataggio cloud sicuro su tutti i tuoi dispositivi personali.',
          maxUsers: 'Dispositivi personali',
        };
      default:
        return {
          title: 'Piano Base (Locale)',
          price: 'Gratuito',
          badgeClass: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
          description: 'Archiviazione dati limitata solo su questo dispositivo, senza backup cloud.',
          maxUsers: 'Solo locale',
        };
    }
  };

  const planInfo = getPlanInfo();

  // Gestione cambio password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword.length < 6) {
      setPwdError('La nuova password deve contenere almeno 6 caratteri.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Le due password non corrispondono.');
      return;
    }

    setPwdLoading(true);
    const res = await changeUserPassword(newPassword);
    setPwdLoading(false);

    if (res.success) {
      setPwdSuccess('Password aggiornata con successo!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPwdSuccess(null);
      }, 2500);
    } else {
      setPwdError(res.error || 'Impossibile aggiornare la password.');
    }
  };

  // Gestione sospensione abbonamento
  const handleToggleAutoRenew = () => {
    const nextState = !isAutoRenewActive;
    setIsAutoRenewActive(nextState);
    if (user?.email) {
      try {
        localStorage.setItem(`beewise:autorenew:${user.email}`, String(nextState));
      } catch (e) {
        console.warn(e);
      }
    }
    setIsSuspendModalOpen(false);
  };

  // Gestione eliminazione account
  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    if (!deletePassword) {
      setDeleteError('Inserisci la tua password attuale per confermare.');
      return;
    }
    if (!confirmCheckbox) {
      setDeleteError('Devi spuntare la casella di conferma per proseguire.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteStepStatus('Verifica della password in corso...');

    try {
      setDeleteStepStatus('Invio email di conferma via Resend e cancellazione in corso...');
      const res = await deleteFullAccount(user.email, deletePassword, user.name || '');

      if (!res.success) {
        setDeleteLoading(false);
        setDeleteError(res.error || 'Errore durante la cancellazione dell\'account.');
        return;
      }

      setDeleteSuccess(true);
      setDeleteStepStatus('Account eliminato con successo. Arrivederci!');

      setTimeout(() => {
        setIsDeleteModalOpen(false);
        onLogout();
      }, 3000);
    } catch (err: any) {
      setDeleteLoading(false);
      setDeleteError(err.message || 'Si è verificato un errore inaspettato.');
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 pb-24 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Top Bar con tasto Indietro */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
          title="Torna indietro"
        >
          <BackArrowIcon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Profilo & Abbonamento
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestisci le tue credenziali, i piani attivi e la sicurezza del tuo account
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SEZIONE 1: Dati Personali & Credenziali */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar Grande */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white font-black text-3xl shadow-md border-2 border-white dark:border-slate-700 shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Informazioni testuali */}
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {user?.name || 'Apicoltore'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {user?.role === 'admin' ? 'Amministratore' : user?.role || 'Proprietario'}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                {user?.email}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 pt-1">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Account verificato con credenziali Supabase</span>
              </div>
            </div>

            {/* Azione rapida Modifica Password */}
            <div className="shrink-0">
              <button
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
              >
                {isChangingPassword ? 'Annulla' : 'Cambia Password'}
              </button>
            </div>
          </div>

          {/* Form espandibile Cambio Password */}
          {isChangingPassword && (
            <form onSubmit={handlePasswordChange} className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700 space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Aggiorna la tua Password</h3>

              {pwdError && (
                <div className="p-3 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                  {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4" />
                  {pwdSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Nuova Password (min 6 caratteri)
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-7 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Conferma Nuova Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Chiudi
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm disabled:opacity-50"
                >
                  {pwdLoading ? 'Salvataggio...' : 'Conferma Nuova Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* SEZIONE 2: Gestione Abbonamenti & Piani */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Gestione Sottoscrizione
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Il tuo Piano Attuale
              </h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${planInfo.badgeClass}`}>
              {planInfo.title}
            </span>
          </div>

          {/* Dettagli della Sottoscrizione */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tariffa</p>
              <p className="text-base font-bold text-slate-800 dark:text-white mt-0.5">{planInfo.price}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Accessi contemporanei</p>
              <p className="text-base font-bold text-slate-800 dark:text-white mt-0.5">{planInfo.maxUsers}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rinnovo Automatico</p>
              <p className="text-base font-bold mt-0.5 flex items-center gap-1.5">
                {isPaidPlan ? (
                  isAutoRenewActive ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Attivo
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">
                      Sospeso (fino a scadenza)
                    </span>
                  )
                ) : (
                  <span className="text-slate-400 text-sm">Nessuno (Gratuito)</span>
                )}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {planInfo.description}
          </p>

          {/* Pulsanti Azione Abbonamento */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => window.open('https://diarioapistico.com', '_blank', 'noopener,noreferrer')}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Visita diarioapistico.com
            </button>

            {isPaidPlan && (
              <button
                onClick={() => setIsSuspendModalOpen(true)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition ${
                  isAutoRenewActive
                    ? 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {isAutoRenewActive ? 'Sospendi Rinnovo Automatico' : 'Riattiva Rinnovo Automatico'}
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            I piani avanzati e la gestione degli abbonamenti sono disponibili sul nostro sito web ufficiale.
          </p>

          {/* Dettagli Metodo di Pagamento & Fatture */}
          {isPaidPlan && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span>💳 Pagamento gestito in sicurezza.</span>
                <span>•</span>
                <span>Fatturazione attiva per apicoltura.</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Ricevute inviate all'indirizzo info@diarioapistico.com
              </span>
            </div>
          )}
        </div>

        {/* SEZIONE 3: Statistiche Cloud & Dati */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <CloudIcon className="w-4 h-4 text-amber-500" />
              Stato Dati & Apiari nel Cloud
            </h3>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Sincronizzato
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">{apiaries.length}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Apiari</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">{totalHives}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Arnie</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">{totalInspections}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Controlli</span>
            </div>
          </div>
        </div>

        {/* SEZIONE 4: ZONA DI PERICOLO (Danger Zone) */}
        <div className="rounded-2xl p-6 border-2 border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 space-y-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <WarningIcon className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-base">Zona di Sicurezza & Eliminazione Account</h3>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Se decidi di eliminare il tuo account, tutti i tuoi dati associati (apiari, arnie, controlli sanitari, fioriture e registri) verranno <strong>cancellati definitivamente</strong> dai nostri server Supabase in modo irreversibile. Eventuali abbonamenti attivi verranno terminati.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Azione irreversibile. Ti verrà richiesta la password per procedere.
            </div>
            <button
              onClick={() => {
                setDeleteError(null);
                setDeletePassword('');
                setConfirmCheckbox(false);
                setIsDeleteModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white transition shadow-sm flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              Elimina Definitivamente Account
            </button>
          </div>
        </div>
      </div>

      {/* MODALE DI SOSPENSIONE / RIATTIVAZIONE RINNOVO */}
      <Modal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        title={isAutoRenewActive ? 'Sospendi Rinnovo Automatico' : 'Riattiva Rinnovo Automatico'}
      >
        <div className="p-4 space-y-4">
          {isAutoRenewActive ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Se sospendi il rinnovo automatico, continuerai ad usufruire di tutti i vantaggi del piano <strong>{planInfo.title}</strong> fino al termine del periodo pagato corrente.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Non riceverai ulteriori addebiti a meno che tu non decida di riattivare il piano in qualsiasi momento.
              </p>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  onClick={() => setIsSuspendModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleToggleAutoRenew}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition"
                >
                  Conferma Sospensione
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Vuoi riattivare il rinnovo automatico per mantenere sincronizzati i tuoi apiari e l'accesso su più dispositivi senza interruzioni?
              </p>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  onClick={() => setIsSuspendModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleToggleAutoRenew}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  Riattiva Rinnovo
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* POP-UP DI SICUREZZA ELIMINAZIONE ACCOUNT */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setIsDeleteModalOpen(false);
          }
        }}
        title="Conferma Eliminazione Account"
      >
        <div className="p-4 space-y-4">
          {deleteSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Account Eliminato</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Abbiamo inviato un'email di conferma all'indirizzo <strong>{user?.email}</strong> con Resend. Disconnessione in corso...
              </p>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs">
                  <WarningIcon className="w-4 h-4 shrink-0" />
                  <span>Attenzione: azione irreversibile</span>
                </div>
                <p className="text-xs text-red-600/90 dark:text-red-300 leading-relaxed">
                  Stai per eliminare definitivamente l'account <strong>{user?.email}</strong>. 
                  Tutti i dati, le arnie ({totalHives}) e i registri verranno cancellati dal database.
                  {isPaidPlan && ' L\'eventuale abbonamento attivo verrà terminato.'}
                </p>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 text-xs rounded-xl border border-red-300 dark:border-red-800">
                  {deleteError}
                </div>
              )}

              {/* Campo Password di Sicurezza */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Inserisci la tua Password per confermare:
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="La tua password di registrazione"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none pr-10"
                    disabled={deleteLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showDeletePassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox di conferma consapevolezza */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  disabled={deleteLoading}
                  className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 dark:border-slate-600"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 leading-tight select-none">
                  Confermo di voler eliminare per sempre il mio account e sono consapevole che i dati non potranno essere recuperati.
                </span>
              </label>

              {deleteStepStatus && (
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 text-center animate-pulse">
                  {deleteStepStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || !confirmCheckbox || !deletePassword}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Eliminazione...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-3.5 h-3.5" />
                      <span>Elimina il mio Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProfileView;
