
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
}

export interface Inspection {
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

    honeyStores?: 'Scarse' | 'Medie' | 'Abbondanti'; 
    temperament?: Temperament; 
    actions: string;
    notes: string;
    audioNote?: string;
    createdBy?: string; // Audit log: Nome dell'utente che ha creato il record
}

export interface HiveMovement {
    id: string;
    date: string;
    time?: string;
    notes?: string;
    fromApiaryName: string;
    toApiaryName: string;
    createdBy?: string;
}

export interface ProductionRecord {
    id: string;
    date: string;
    honeyType?: HoneyType;
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

export interface Hive {
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

export interface Apiary {
    id: string;
    name: string;
    location: string;
    latitude?: number;
    longitude?: number;
    hives: Hive[];
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

export interface CalendarEvent {
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
    createdBy?: string;
}

export interface BloomRecord {
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

export interface SeasonalNote {
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

export type View = 'dashboard' | 'apiaryDetails' | 'hiveDetails' | 'aiAssistant' | 'calendar' | 'tools' | 'seasonalNotes' | 'production' | 'movements' | 'nfc' | 'teamManagement';
