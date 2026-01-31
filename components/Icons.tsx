
import React from 'react';

const iconClass = (className?: string) => `${className || ''} pointer-events-none`;

export const HomeIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
);

export const BeeIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 10c-4-4-9-2-9 1s4 6 7 2" className="text-sky-200 dark:text-sky-700 opacity-80" />
        <path d="M14 10c4-4 9-2 9 1s-4 6-7 2" className="text-sky-200 dark:text-sky-700 opacity-80" />
        <g>
             <path d="M12 22l-1-2.5h2z" className="text-slate-800 dark:text-slate-900" />
             <ellipse cx="12" cy="13" rx="4.5" ry="6" className="text-amber-400" />
             <path d="M8.5 11h7 M8 14h8 M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-800 dark:text-slate-900" />
             <circle cx="12" cy="6" r="3.5" className="text-amber-500" />
             <path d="M10 4c-1-2-3-2-3-2 M14 4c1-2 3-2 3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" className="text-slate-800 dark:text-slate-200" />
             <circle cx="11" cy="5.5" r="0.6" className="text-white" />
             <circle cx="13" cy="5.5" r="0.6" className="text-white" />
        </g>
    </svg>
);

export const BeehiveIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 22v-2 M18 22v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-400 dark:text-slate-500" />
        <rect x="4" y="19" width="16" height="2" rx="0.5" className="text-slate-400 dark:text-slate-500" />
        <rect x="5" y="13" width="14" height="6" rx="1" className="text-amber-400" />
        <rect x="9" y="18" width="6" height="1" rx="0.5" className="text-slate-800 dark:text-slate-900" />
        <rect x="5" y="8" width="14" height="4.5" rx="1" className="text-amber-200" />
        <path d="M3 8l9-5 9 5H3z" className="text-slate-500 dark:text-slate-400" />
        <path d="M5 13h14" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
        <g transform="translate(18, 5) rotate(15)">
             <ellipse cx="-1" cy="-2" rx="1.5" ry="0.8" className="text-sky-200 opacity-80" transform="rotate(-30 -1 -2)" />
             <ellipse cx="1" cy="-2" rx="1.5" ry="0.8" className="text-sky-200 opacity-80" transform="rotate(30 1 -2)" />
             <circle cx="0" cy="0" r="1.5" className="text-amber-400" />
             <path d="M-0.5 -1v2 M0.5 -1v2" stroke="currentColor" strokeWidth="0.5" className="text-slate-800" />
        </g>
    </svg>
);

export const PlusIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
);

export const EditIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
);

export const TrashIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
);

export const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
);

export const WarningIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
);

export const SparklesIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.69l.94 2.47 2.6.38-1.88 1.83.44 2.59L12 8.91l-2.1.95.44-2.59-1.88-1.83 2.6-.38L12 2.69zM20 12l-1.88-1.83.44-2.59L16.46 9.1l-2.1-.95.94 2.47 2.6.38-1.88 1.83.44 2.59L20 12zM4 12l1.88-1.83-.44-2.59L7.54 9.1l2.1-.95-.94 2.47-2.6.38 1.88 1.83-.44 2.59L4 12zM12 17l-1.06-.48.22-1.29-.94-.91 1.3-.19.58-1.18.58 1.18 1.3.19-.94.91.22 1.29L12 17z"/>
    </svg>
);

export const BackArrowIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
    </svg>
);

export const ChevronUpIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clipRule="evenodd" />
    </svg>
);

export const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
    </svg>
);

export const GoogleIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

export const MailIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
);

export const LogoutIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
);

export const KeyIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 11c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm14-1V8c0-1.1-.9-2-2-2h-4v2h4v2h-2v2h2v2h-2v2h2v2h-2v2h4c1.1 0 2-.9 2-2v-4h-4v2h-2v-2h2v-2h-2v-2h2zM7 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
        <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
);

export const SunIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.93l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0zM18.36 17.3l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0zM5.99 19.07c-.39-.39-1.02-.39-1.41 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41zM18.36 6.7c.39-.39 1.02-.39 1.41 0l1.41 1.41c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0L18.36 6.7c-.39-.39-.39-1.02 0-1.41z"/>
    </svg>
);

export const CloudIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>
);

export const RainIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 8c-.66 0-1.25.13-1.8.35-.22-.64-.54-1.23-.93-1.78.36-.26.75-.48 1.17-.63C16.8 5.71 16.2 5.5 15.57 5.34c-.2-.04-.41-.08-.62-.1C14.79 5.09 14.4 5 14 5c-3.13 0-5.83 1.87-7.14 4.6-.33-.06-.68-.1-1.03-.1C2.61 9.5 0 12.11 0 15.33 0 18.45 2.5 21 5.58 21h12.63c3.2 0 5.79-2.58 5.79-5.77C24 11.95 21.75 9.29 19 8zM7 23c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
);

export const WindIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.59 5.59L14 4.17 10.17.34 6.34 4.17l1.41 1.41 2.42-2.42v17.68h2V3.17zM20 12l-1.41-1.41L15 14.17V0h-2v14.17l-3.59-3.58L8 12l6 6 6-6zM4 12l1.41 1.41L9 9.83V24h2V9.83l3.59 3.58L16 12l-6-6-6 6z" style={{transform: 'rotate(90deg)', transformOrigin: 'center'}} />
        <path d="M0 0h24v24H0z" fill="none"/>
    </svg>
);

export const ThermometerIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-8c0-.55.45-1 1-1s1 .45 1 1v4h-2V5z"/>
    </svg>
);

export const MapPinIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
);

export const SearchIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
);

export const TransferIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
    </svg>
);

export const HistoryIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
    </svg>
);

export const JarIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 4v2H6V4c0-1.1.9 2 2-2h8c1.1 0 2 .9 2 2zm-1 3H7c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-3 8h-4v-2h4v2z"/>
    </svg>
);

export const FlowerIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/>
    </svg>
);

export const GridIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z"/>
    </svg>
);

export const MicrophoneIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
);

export const StopCircleIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14h4v-4h-4v4zm0-6h4V6h-4v4z"/>
        <circle cx="12" cy="12" r="10" stroke="none" fill="currentColor" fillOpacity="0.2"/>
        <rect x="9" y="9" width="6" height="6" fill="currentColor" />
    </svg>
);

export const CalendarIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/>
    </svg>
);

export const CameraIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
        <circle cx="12" cy="12" r="3.2" />
    </svg>
);

export const PhotoIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
    </svg>
);

export const XCircleIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
    </svg>
);

export const BookOpenIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 2l-5 5L9 2H7l5 5L7 12h2l5-5 5 5h2V2z" opacity="0"/>
        <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
        <path d="M17.5 10.5c.88 0 1.73.09 2.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99zM13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.3-4.5.83zM17.5 14.33c-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26v-1.52c-.79-.15-1.64-.24-2.5-.24z" />
    </svg>
);

export const LeafIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
    </svg>
);

export const ToolsIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
    </svg>
);

export const ClipboardIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
);

export const ConstructionIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L1 21h22L12 2zm0 3.3l7.53 13.7H4.47L12 5.3z"/>
        <path d="M12 16c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" fill="white"/>
    </svg>
);

export const PaletteIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>
);

export const TypographyIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 17v2h14v-2H5zm4.5-4.2h5l.9 2.2h2.1L12.75 4h-1.5L6.5 15h2.1l.9-2.2zM12 5.98L13.87 11h-3.74L12 5.98z"/>
    </svg>
);

export const UnderlineIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
    </svg>
);

export const BoldIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
    </svg>
);

export const EyeIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5-5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
);

export const EyeOffIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
    </svg>
);

export const BellIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
    </svg>
);

export const StylizedFlowerIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
         {/* Gambo (Marrone) */}
         <path d="M12 13V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-800 dark:text-amber-600" />
         
         {/* Foglie (Verdi - ereditano il colore del testo principale o forzato) */}
         <path d="M12 18 C 9 18 6 16 6 14 C 6 13 8 15 12 16" fill="currentColor" className="text-emerald-600 dark:text-emerald-500" />
         <path d="M12 18 C 15 18 18 16 18 14 C 18 13 16 15 12 16" fill="currentColor" className="text-emerald-600 dark:text-emerald-500" />

         {/* Testa del Fiore (Verde) */}
         <g className="text-emerald-600 dark:text-emerald-500">
            <path d="M12 3.5 
                     C 13.5 3.5 14.5 4.5 14.5 5.5 
                     C 16 5.5 17 6.5 17 8 
                     C 18 9.5 17 11 16 12 
                     C 17 13.5 16 15 14.5 15.5 
                     C 13 16.5 12 16 12 15 
                     C 12 16 11 16.5 9.5 15.5 
                     C 8 15 7 13.5 8 12 
                     C 7 11 6 9.5 7 8 
                     C 7 6.5 8 5.5 9.5 5.5 
                     C 9.5 4.5 10.5 3.5 12 3.5 Z" fill="currentColor" />
            
            {/* Foro Centrale (Bianco / Sfondo) */}
            <circle cx="12" cy="9.5" r="2.5" fill="white" className="dark:fill-slate-900" />
         </g>
    </svg>
);

export const ScaleIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
        {/* Central Stand - Gold */}
        <path d="M12 2 C 13.1 2 14 2.9 14 4 L 13.5 20 C 15 20.5 16 21.5 16 22 H 8 C 8 21.5 9 20.5 10.5 20 L 10 4 C 10 2.9 10.9 2 12 2 Z" fill="currentColor" className="text-amber-400" />
        
        {/* Crossbeam - Gold */}
        <path d="M12 5.5 Q 7 5.5 2 8 L 2 9 Q 7 7 12 7 Q 17 7 22 9 L 22 8 Q 17 5.5 12 5.5 Z" fill="currentColor" className="text-amber-400" />
        
        {/* Left Pan Chains - Gold/Darker */}
        <path d="M2 8 L 3.5 14" stroke="currentColor" strokeWidth="0.5" className="text-amber-500" />
        <path d="M2 8 L 8.5 14" stroke="currentColor" strokeWidth="0.5" className="text-amber-500" />
        
        {/* Right Pan Chains - Gold/Darker */}
        <path d="M22 8 L 15.5 14" stroke="currentColor" strokeWidth="0.5" className="text-amber-500" />
        <path d="M22 8 L 20.5 14" stroke="currentColor" strokeWidth="0.5" className="text-amber-500" />

        {/* Left Pan - Bowl */}
        <path d="M3.5 14 H 8.5 C 8.5 16.5 7.38 18 6 18 C 4.62 18 3.5 16.5 3.5 14 Z" fill="currentColor" className="text-amber-400" />

        {/* Right Pan - Bowl */}
        <path d="M15.5 14 H 20.5 C 20.5 16.5 19.38 18 18 18 C 16.62 18 15.5 16.5 15.5 14 Z" fill="currentColor" className="text-amber-400" />
    </svg>
);

export const NfcIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.5 9.5a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M7 11.5a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M9.5 13.5a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <circle cx="12" cy="16" r="1.5" />
    </svg>
);

export const MoreVerticalIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
);

export const DragHandleIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 9H4v2h16V9zM4 15h16v-2H4v2z" />
    </svg>
);

export const UsersIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
);

export const ShieldCheckIcon = ({ className }: { className?: string }) => (
    <svg className={iconClass(className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>
);
