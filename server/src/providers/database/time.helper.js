/**
 * TIMESTAMPTZ bridge for API millis ↔ DB Date.
 * After migration 043, Postgres time columns are timestamptz.
 */

function toDb(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number') {
        // Heuristic: values < 1e11 treated as seconds; else millis
        const ms = value < 1e11 ? value * 1000 : value;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === 'string') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function fromDb(value) {
    if (value == null) return null;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function nowDb() {
    return new Date();
}

function nowMs() {
    return Date.now();
}

module.exports = { toDb, fromDb, nowDb, nowMs };
