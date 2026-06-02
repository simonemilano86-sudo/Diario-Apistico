export type Role = 'OWNER' | 'VISORE' | 'OPERATORE' | 'OPERATORE_PRO';
export type Plan = 'BASE' | 'TEAM_PICCOLO' | 'AZIENDA';
export type Status = 'ATTIVO' | 'SOSPESO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
}

export interface AppState {
  currentUserEmail: string;
  currentSessionId: string;
  dbSessionId: string;
  plan: Plan;
  team: User[];
}
