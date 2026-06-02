

export enum HiveStatus {
    HEALTHY = 'In salute',
    NEEDS_ATTENTION = 'Richiede attenzioni',
    WEAK = 'Debole',
    QUEENLESS = 'Orfana',
    DRONE_LAYING = 'Fucaiola',
    VIRGIN_QUEEN = 'Regina vergine',
    HONEY_BOUND = 'Blocco di covata',
}

export enum Temperament {
    CALM = 'Docile',
    NERVOUS = 'Nervosa',
    AGGRESSIVE = 'Aggressiva',
}

export enum QueenRace {
    LIGUSTICA = 'Ligustica',
    BUCKFAST = 'Buckfast',
    CARNICA = 'Carnica',
    HYBRID = 'Ibrida',
    MELLIFERA = 'Nera Europea (Apis m. m.)',
    SICULA = 'Sicula',
    IBERICA = 'Iberica',
    MACEDONICA = 'Macedonica'
}

export enum HoneyType {
    MILLEFIORI = 'Millefiori',
    ACACIA = 'Acacia',
    CASTAGNO = 'Castagno',
    AILANTO = 'Ailanto',
    AGRUMI = 'Agrumi',
    EUCALIPTO = 'Eucalipto',
    TIGLIO = 'Tiglio',
    SULLA = 'Sulla',
    TARASSACO = 'Tarassaco',
    MELATA = 'Melata',
    EDERA = 'Edera',
    ALTRO = 'Altro'
}

export type Role = 'admin' | 'editor' | 'viewer';

export interface TeamMember {
    id: string;
    email: string;
    name: string;
    role: Role;
    status: 'pending' | 'active';
}

export interface User {
    name: string;
    email: string;
    picture: string;
    role?: Role; // Ruolo corrente dell'utente
    plan?: 'free' | 'premium'; // Piano di abbonamento dell'utente
}

// Added to fix import error in DashboardView.tsx and centralize types
export interface TeamOption {
    team_id: string;
    team_name: string;
    role?: string;
}

export interface SoftDeletable {
    _deleted?: boolean;
    _deletedAt?: number;
}

export interface Inspection extends SoftDeletable {
    id: string;
    date: string;
    time?: string;
    temperature?: number; 
    sawQueen: boolean;
    sawEggs: boolean;
    noBrood?: boolean;
    
    occupiedFrames?: number; 
    broodFrames?: number; 
    diaphragms?: number; 
    
    disease?: string; 
    feeding?: string; 
    treatment?: string; 
    treatmentQuantity?: string;
    treatmentWithdrawal?: string;
    treatmentOperator?: string;

    honeyStores?: 'Scarse' | 'Medie' | 'Abbondanti'; 
    temperament?: Temperament; 
    actions: string;
    notes: string;
    audioNote?: string;
    createdBy?: string; // Audit log: Nome dell'utente che ha creato il record
}

export interface HiveMovement extends SoftDeletable {
    id: string;
    date: string;
    time?: string;
    notes?: string;
    fromApiaryName: string;
    toApiaryName: string;
    createdBy?: string;
}

export interface ProductionRecord extends SoftDeletable {
    id: string;
    date: string;
    honeyType?: HoneyType | string;
    melariQuantity?: number; 
    melariNotes?: string; 
    pollenGrams?: number; 
    pollenType?: string; 
    pollenNotes?: string;
    propolisNets?: number; 
    propolisNotes?: string;
    notes?: string;
    createdBy?: string;
}

export interface Hive extends SoftDeletable {
    id: string;
    name: string;
    queenYear: number;
    status: HiveStatus;
    queenRace: QueenRace;
    inspections: Inspection[];
    movements?: HiveMovement[];
    productionRecords?: ProductionRecord[];
    nfcTagId?: string;
}

export interface Harvest extends SoftDeletable {
    id: string;
    date: string;
    product: string;
    batchNumber?: string;
    totalSupers?: number;
    totalKg: number;
    operator?: string;
    notes?: string;
}

export interface Apiary extends SoftDeletable {
    id: string;
    name: string;
    location: string;
    latitude?: number;
    longitude?: number;
    hives: Hive[];
    harvests?: Harvest[];
    pendingLocationSync?: boolean;
}

export interface LocationData {
    name: string;
    latitude: number;
    longitude: number;
}

export interface WeatherData {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    humidity?: number;
}

export interface CalendarEvent extends SoftDeletable {
    id: string;
    title: string;
    description: string;
    startDate: string; 
    startTime: string; 
    scope: 'apiary' | 'hive';
    apiaryId: string;
    apiaryName: string;
    hiveId?: string;
    hiveName?: string;
    hiveList?: { id: string, name: string }[];
    notificationId?: number; 
    emailReminder?: boolean; 
    reminderMinutes?: number;
    useGoogleCalendar?: boolean;
    createdBy?: string;
}

export interface BloomRecord extends SoftDeletable {
    id: string;
    plantName: string;
    startDate: string;
    endDate: string;
    notes: string;
    notificationEnabled: boolean;
    notificationDaysBefore?: number;
    notificationId?: number;
    emailReminder?: boolean;
    apiaryIds?: string[];
    createdBy?: string;
}

export interface SeasonalNote extends SoftDeletable {
    id: string;
    type: 'blooms' | 'works';
    year: number;
    apiaryIds: string[]; 
    content: string; 
    blooms?: BloomRecord[]; 
    updatedAt: string;
    style?: {
        fontFamily: string;
        fontSize: string;
        color: string;
    };
}

export interface ScaleDataPoint extends SoftDeletable {
    id: string;
    apiaryId: string;
    scaleId?: string; // ID fisico della bilancia (es: Simo1)
    hiveId?: string;
    weight: number;
    battery: number;
    timestamp: string;
}

export interface ScaleScheduleRule {
    months: number[]; // 1-12
    days: number[]; // 1-31
    times: string[]; // ["HH:mm"]
}

export interface ScaleSchedule {
    rules: ScaleScheduleRule[];
}

export interface Scale extends SoftDeletable {
    id: string;
    scaleId: string; // ID fisico (es: Simo1)
    userId: string;
    name: string; // Nome alias (es: Bilancia Poggio)
    apiaryId?: string;
    secretKey: string;
    createdAt: string;
    apn?: string; // Nuova proprietà per impostazioni SIM
    schedule?: ScaleSchedule;
}

export interface ScaleCommand extends SoftDeletable {
    id: string;
    apiaryId: string;
    scaleId?: string;
    hiveId?: string;
    command: 'get_weight' | 'reboot' | 'firmware_update' | 'RESET';
    status: 'pending' | 'received' | 'completed' | 'failed';
    createdAt: string;
}

export type View = 'dashboard' | 'apiaryDetails' | 'hiveDetails' | 'aiAssistant' | 'calendar' | 'tools' | 'seasonalNotes' | 'production' | 'movements' | 'nfc' | 'teamManagement' | 'construction' | 'apiaryLog' | 'treatmentsLog' | 'trash' | 'bilancia';

export interface Message {
    role: 'user' | 'model';
    parts: { text: string }[];
}
