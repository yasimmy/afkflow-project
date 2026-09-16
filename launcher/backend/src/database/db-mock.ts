/**
 * Mock database for development when better-sqlite3 can't compile
 * This uses an in-memory data structure that persists across the app lifetime
 */

interface DatabaseStatement {
  run: (...params: any[]) => { changes: number; lastID: number };
  get: (...params: any[]) => any;
  all: (...params: any[]) => any[];
}

interface Database {
  exec: (sql: string) => void;
  prepare: (sql: string) => DatabaseStatement;
  transaction: (fn: () => void) => () => void;
  close: () => void;
}

const mockData: Record<string, Record<string, any>[]> = {
  users: [],
  plans: [],
  subscriptions: [],
  bots: [],
  bot_entitlements: [],
  bot_configs: [],
  launches: [],
  sessions: [],
};

let idCounter = 0;

function generateId(): string {
  return `id_${++idCounter}`;
}

export function getMockDb(): Database {
  return {
    exec: (sql: string) => {
      // Parse and execute SQL - simplified version
      if (sql.includes('CREATE TABLE')) {
        // Already created, do nothing
      }
      if (sql.includes('PRAGMA')) {
        // Ignore pragma statements
      }
    },
    
    prepare: (sql: string): DatabaseStatement => {
      return {
        run: (...params: any[]) => {
          // Handle INSERT, UPDATE, DELETE
          if (sql.includes('INSERT')) {
            const table = sql.match(/INTO\s+(\w+)/)?.[1] || '';
            if (table && mockData[table]) {
              const id = generateId();
              const row: any = { id };
              const matches = sql.match(/VALUES\s*\((.*?)\)/)?.[1] || '';
              const placeholders = (matches.match(/\?/g) || []).length;
              
              for (let i = 0; i < Math.min(placeholders, params.length); i++) {
                row[`col_${i}`] = params[i];
              }
              mockData[table].push(row);
              return { changes: 1, lastID: parseInt(id, 36) };
            }
          }
          return { changes: 0, lastID: 0 };
        },
        
        get: (...params: any[]) => {
          // Handle SELECT... LIMIT 1
          if (sql.includes('SELECT')) {
            const table = sql.match(/FROM\s+(\w+)/)?.[1] || '';
            if (table && mockData[table]) {
              return mockData[table][0] || null;
            }
          }
          return null;
        },
        
        all: (...params: any[]) => {
          // Handle SELECT
          if (sql.includes('SELECT')) {
            const table = sql.match(/FROM\s+(\w+)/)?.[1] || '';
            if (table && mockData[table]) {
              return mockData[table];
            }
          }
          return [];
        },
      };
    },
    
    transaction: (fn: () => void) => {
      return () => fn();
    },
    
    close: () => {
      // No-op for mock
    },
  };
}
