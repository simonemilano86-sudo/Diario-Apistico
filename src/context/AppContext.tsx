import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppState, Plan, Role, Status, User } from '../types';

interface AppContextType extends AppState {
  setCurrentUserEmail: (email: string) => void;
  simulateDoubleLogin: () => void;
  resolveDoubleLogin: () => void;
  changePlan: (newPlan: Plan) => void;
  updateTeamMemberRole: (id: string, role: Role) => void;
  toggleTeamMemberStatus: (id: string) => void;
  addTeamMember: (member: Omit<User, 'id' | 'status'>) => void;
}

const defaultState: AppState = {
  currentUserEmail: 'simonemilano86@gmail.com', // Default to Simone
  currentSessionId: 'session-123',
  dbSessionId: 'session-123',
  plan: 'BASE',
  team: [
    { id: '1', name: 'Simone Milano', email: 'simonemilano86@gmail.com', role: 'OWNER', status: 'ATTIVO' },
    { id: '2', name: 'Mario Rossi', email: 'mario@example.com', role: 'OPERATORE', status: 'ATTIVO' },
  ],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  const setCurrentUserEmail = (email: string) => {
    setState((prev) => ({ ...prev, currentUserEmail: email }));
  };

  const simulateDoubleLogin = () => {
    // Changes the session ID in the "database" to simulate someone else logging in
    setState((prev) => ({ ...prev, dbSessionId: 'session-456-wife' }));
  };

  const resolveDoubleLogin = () => {
    // Overwrites the DB session with the current local session (kicks out the other person)
    setState((prev) => ({ ...prev, dbSessionId: prev.currentSessionId }));
  };

  const changePlan = (newPlan: Plan) => {
    setState((prev) => {
      let updatedTeam = [...prev.team];
      
      // Downgrade logic: if downgrading to BASE, suspend all non-owners
      if (newPlan === 'BASE') {
        updatedTeam = updatedTeam.map(member => 
          member.role !== 'OWNER' ? { ...member, status: 'SOSPESO' } : member
        );
      }
      // If upgrading from BASE to TEAM_PICCOLO, reactivate up to 3 members
      else if (newPlan === 'TEAM_PICCOLO' && prev.plan === 'BASE') {
        let reactivatedCount = 0;
        updatedTeam = updatedTeam.map(member => {
          if (member.role !== 'OWNER' && reactivatedCount < 3) {
            reactivatedCount++;
            return { ...member, status: 'ATTIVO' };
          }
          return member;
        });
      }
      // If AZIENDA, reactivate everyone
      else if (newPlan === 'AZIENDA') {
        updatedTeam = updatedTeam.map(member => ({ ...member, status: 'ATTIVO' }));
      }

      return { ...prev, plan: newPlan, team: updatedTeam };
    });
  };

  const updateTeamMemberRole = (id: string, role: Role) => {
    setState((prev) => ({
      ...prev,
      team: prev.team.map((m) => (m.id === id ? { ...m, role } : m)),
    }));
  };

  const toggleTeamMemberStatus = (id: string) => {
    setState((prev) => ({
      ...prev,
      team: prev.team.map((m) => 
        m.id === id ? { ...m, status: m.status === 'ATTIVO' ? 'SOSPESO' : 'ATTIVO' } : m
      ),
    }));
  };

  const addTeamMember = (member: Omit<User, 'id' | 'status'>) => {
    const newMember: User = {
      ...member,
      id: Math.random().toString(36).substr(2, 9),
      status: 'ATTIVO',
    };
    setState((prev) => ({ ...prev, team: [...prev.team, newMember] }));
  };

  return (
    <AppContext.Provider value={{
      ...state,
      setCurrentUserEmail,
      simulateDoubleLogin,
      resolveDoubleLogin,
      changePlan,
      updateTeamMemberRole,
      toggleTeamMemberStatus,
      addTeamMember,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
