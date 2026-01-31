
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

export interface User {
    name: string;
    email: string;
    picture: string;
}

export interface Inspection {
    id: string;
    date: string;
    time?: string;
    temperature?: number; // New field for temperature
    sawQueen: boolean;
    sawEggs: boolean;
    noBrood?: boolean;
    
    // New fields replacing miteCount
    occupiedFrames?: number; // 1-10, Optional
    broodFrames?: number; // 0-10, Optional
    diaphragms?: number; // 0-5, Optional
    
    disease?: string; // Selection
    feeding?: string; // Selection
    treatment?: string; // Selection

    honeyStores?: 'Scarse' | 'Medie' | 'Abbondanti'; // Optional
    temperament?: Temperament; // Optional
    actions: string;
    notes: string;
    audioNote?: string; // Base64 encoded audio string
}

export interface HiveMovement {
    id: string;
    date: string;
    time?: string;
    notes?: string;
    fromApiaryName: string;
    toApiaryName: string;
}

export interface ProductionRecord {
    id: string;
    date: string;
    honeyType?: HoneyType;
    melariQuantity?: number; // 0.5, 1, 1.5, 2, 2.5, 3
    melariNotes?: string; // Specific notes for honey supers
    pollenGrams?: number; // steps of 250g
    pollenNotes?: string;
    propolisNets?: number; // 1-100
    propolisNotes?: string;
    notes?: string;
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
}

export interface Apiary {
    id: string;
    name: string;
    location: string;
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
    startDate: string; // ISO date string YYYY-MM-DD
    startTime: string; // HH:MM
    scope: 'apiary' | 'hive';
    apiaryId: string;
    apiaryName: string;
    // Legacy single hive fields (optional for backward compatibility)
    hiveId?: string;
    hiveName?: string;
    // New multi-hive support
    hiveList?: { id: string, name: string }[];
}

export interface SeasonalNote {
    id: string;
    type: 'blooms' | 'works';
    year: number;
    apiaryIds: string[]; // Selected apiaries
    content: string;
    updatedAt: string;
    style?: {
        fontFamily: string;
        fontSize: string;
        color: string;
    };
}

export type View = 'dashboard' | 'apiaryDetails' | 'hiveDetails' | 'aiAssistant' | 'calendar' | 'tools';