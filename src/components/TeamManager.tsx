import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { MoreVertical, Shield, User as UserIcon, ShieldAlert, Eye, Ban, CheckCircle2 } from 'lucide-react';
import { Role } from '../types';
import MultiAccessModal from '../../components/MultiAccessModal';

export const TeamManager: React.FC = () => {
  const { team, updateTeamMemberRole, toggleTeamMemberStatus, plan } = useAppContext();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isTeaserModalOpen, setIsTeaserModalOpen] = useState(false);
  const [isTeaserChecked, setIsTeaserChecked] = useState(false);
  const [isMultiAccessModalOpen, setIsMultiAccessModalOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'OWNER': return <Shield className="w-4 h-4 text-amber-600" />;
      case 'OPERATORE_PRO': return <ShieldAlert className="w-4 h-4 text-blue-600" />;
      case 'OPERATORE': return <UserIcon className="w-4 h-4 text-green-600" />;
      case 'VISORE': return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'OWNER': return 'Proprietario';
      case 'OPERATORE_PRO': return 'Operatore Pro (Modifica/Cancella)';
      case 'OPERATORE': return 'Operatore (Solo Modifica)';
      case 'VISORE': return 'Visore (Sola Lettura)';
    }
  };

  const activeMembersCount = team.filter(m => m.role !== 'OWNER' && m.status === 'ATTIVO').length;
  const maxMembers = plan === 'BASE' ? 0 : plan === 'TEAM_PICCOLO' ? 3 : 'Illimitati';

  const handleInviteClick = () => {
    if (plan === 'BASE' || (plan === 'TEAM_PICCOLO' && activeMembersCount >= 3)) {
      setIsTeaserChecked(false);
      setIsTeaserModalOpen(true);
    } else {
      // Logic to actually invite (e.g., open invite modal)
      alert("Funzionalità di invito non ancora implementata in questa vista.");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Il mio Team</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestisci i permessi dei tuoi collaboratori. 
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {activeMembersCount} / {maxMembers} posti usati
            </span>
          </p>
        </div>
        <button 
          onClick={handleInviteClick}
          className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Invita Collaboratore
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {team.map((member) => (
          <div key={member.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${member.status === 'SOSPESO' ? 'opacity-60 bg-gray-50' : ''}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.status === 'SOSPESO' ? 'bg-gray-200 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                {member.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{member.name}</h3>
                  {member.status === 'SOSPESO' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      <Ban className="w-3 h-3" /> Sospeso
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-md">
                {getRoleIcon(member.role)}
                <span className="text-sm font-medium text-gray-700">{getRoleLabel(member.role)}</span>
              </div>

              {member.role !== 'OWNER' && (
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === member.id ? null : member.id);
                    }}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {openMenuId === member.id && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Cambia Ruolo
                      </div>
                      <button onClick={() => updateTeamMemberRole(member.id, 'OPERATORE_PRO')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-blue-600" /> Operatore Pro
                      </button>
                      <button onClick={() => updateTeamMemberRole(member.id, 'OPERATORE')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-green-600" /> Operatore
                      </button>
                      <button onClick={() => updateTeamMemberRole(member.id, 'VISORE')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-500" /> Visore
                      </button>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button 
                        onClick={() => toggleTeamMemberStatus(member.id)} 
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${member.status === 'ATTIVO' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        {member.status === 'ATTIVO' ? (
                          <><Ban className="w-4 h-4" /> Sospendi Utente</>
                        ) : (
                          <><CheckCircle2 className="w-4 h-4" /> Riattiva Utente</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isTeaserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Lavora in Team</h3>
              <button onClick={() => setIsTeaserModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <h4 className="font-bold text-amber-800 mb-2">Funzionalità Premium</h4>
                <p className="text-sm text-amber-700">
                  La gestione avanzata del team e l'invito di collaboratori sono disponibili solo con i piani <strong>Piccolo Team (4,99€)</strong> o <strong>Azienda Agricola (9,99€)</strong>.
                </p>
              </div>

              <div className="flex items-start space-x-3 mt-6 p-2 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="teaser-understand-checkbox-2"
                  checked={isTeaserChecked}
                  onChange={(e) => setIsTeaserChecked(e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                />
                <label htmlFor="teaser-understand-checkbox-2" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Ho compreso
                </label>
              </div>

              <button
                onClick={() => {
                  setIsTeaserModalOpen(false);
                  setIsMultiAccessModalOpen(true);
                }}
                disabled={!isTeaserChecked}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                  isTeaserChecked ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Vedi Piani
              </button>
            </div>
          </div>
        </div>
      )}

      <MultiAccessModal 
        isOpen={isMultiAccessModalOpen} 
        onClose={() => setIsMultiAccessModalOpen(false)} 
        currentPlan={plan === 'BASE' ? 'premium' : plan === 'TEAM_PICCOLO' ? 'team' : 'enterprise'}
        onUpgrade={(newPlan) => {
          console.log("Upgrade requested to:", newPlan);
          setIsMultiAccessModalOpen(false);
        }} 
      />
    </div>
  );
};
