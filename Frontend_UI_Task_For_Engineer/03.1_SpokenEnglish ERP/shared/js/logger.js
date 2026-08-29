/**
 * SCS Global Telemetry & Logging Component
 * ADR 064: Centralized Telemetry and Boundary Logging
 * 
 * Provides highly visible, color-coded console output to isolate
 * frontend vs backend failure domains before deep-dive debugging.
 */
class SCSTelemetry {
    constructor() {
        // Check for global debug mode from localStorage or window object
        this.isDebugMode = localStorage.getItem('global_debug_mode') === 'true' || window.global_debug_mode === true;
    }

    /**
     * Set debug mode dynamically
     */
    setDebugMode(enabled) {
        this.isDebugMode = enabled;
        localStorage.setItem('global_debug_mode', enabled ? 'true' : 'false');
        console.log(`[SCS TELEMETRY] Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Trace: Use at the very start of a boundary function (e.g., before fetch)
     * @param {string} action - Name of the action (e.g., 'AddGroup Initialization')
     * @param {object} payload - The data being processed or sent
     */
    trace(action, payload = {}) {
        if (!this.isDebugMode) return;
        console.log(
            `%c[SCS] 🔵 TRACE: ${action}`,
            'color: #0ea5e9; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;',
            payload
        );
    }

    /**
     * Success: Use when a boundary function completes successfully
     * @param {string} action - Name of the action
     * @param {object} response - The successful response or resulting state
     */
    success(action, response = {}) {
        if (!this.isDebugMode) return;
        console.log(
            `%c[SCS] 🟢 SUCCESS: ${action}`,
            'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 2px 6px; border-radius: 4px;',
            response
        );
    }

    /**
     * Error: Use when an exception is caught or response is not ok
     * @param {string} action - Name of the action
     * @param {string|Error} errorDetails - The explicit reason for failure
     */
    error(action, errorDetails) {
        // Errors should always log, even if debug mode is off, 
        // to ensure we don't swallow critical production failures silently.
        console.error(
            `%c[SCS] 🔴 ERROR: ${action}`,
            'color: #dc2626; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px;',
            errorDetails
        );
    }

    /**
     * Warn: Use for non-fatal issues (e.g., fallbacks, retries)
     * @param {string} action - Name of the action
     * @param {object|string} details - Contextual details
     */
    warn(action, details = {}) {
        if (!this.isDebugMode) return;
        console.warn(
            `%c[SCS] 🟠 WARN: ${action}`,
            'color: #d97706; font-weight: bold; background: #fef3c7; padding: 2px 6px; border-radius: 4px;',
            details
        );
    }
}

// Attach to global window object so it's accessible anywhere in vanilla JS without imports
window.Logger = new SCSTelemetry();
