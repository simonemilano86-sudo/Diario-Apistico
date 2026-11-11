
type LogLevel = 'info' | 'error' | 'warn' | 'warning';
interface LogEntry { timestamp: string; level: LogLevel; message: string; }

class InternalLogger {
    private logs: LogEntry[] = [];
    log(message: string, level: LogLevel = 'info') {
        const entry = { timestamp: new Date().toLocaleTimeString(), level, message };
        this.logs.unshift(entry);
        if (this.logs.length > 50) this.logs.pop();
        
        const consoleMethod = level === 'warning' ? 'warn' : level;
        if (typeof console[consoleMethod] === 'function') {
            console[consoleMethod](`[APP_LOG] ${message}`);
        } else {
            console.log(`[APP_LOG] [${level}] ${message}`);
        }
    }
    getLogs() { return this.logs; }
    clear() { this.logs = []; }
}
export const logger = new InternalLogger();
