import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { iSpyItems } from './iSpySeed';

const tableName = 'i_spy';

SQLite.enablePromise(true);

export const getDBConnection = async (): Promise<SQLiteDatabase> => {
  return SQLite.openDatabase({ name: 'i-spy.db', location: 'default' });
};

export const createTable = async (db: SQLiteDatabase) => {
  const query = `CREATE TABLE IF NOT EXISTS ${tableName} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL UNIQUE
  );`;
  await db.executeSql(query);
};

export const seedISpyTable = async (db: SQLiteDatabase, items: string[] = iSpyItems) => {
  for (const v of items) {
    const [res] = await db.executeSql(
      `INSERT OR IGNORE INTO ${tableName} (value) VALUES (?)`,
      [v]
    );
  }
};

export const getRandomISpyItem = async (db: SQLiteDatabase): Promise<string | null> => {
  try {
    const [res] = await db.executeSql(`SELECT value FROM ${tableName} ORDER BY RANDOM() LIMIT 1`);
    if (res.rows.length === 0) return null;
    return (res.rows.item(0) as any).value as string;
  } catch (error) {
    console.error('Failed to get random iSpy item', error);
    throw Error('Failed to get I Spy item');
  }
};

export const getAllISpyItems = async (db: SQLiteDatabase): Promise<string[]> => {
  const [res] = await db.executeSql(`SELECT value FROM ${tableName}`);
  const out: string[] = [];
  for (let i = 0; i < res.rows.length; i++) {
    out.push((res.rows.item(i) as any).value as string);
  }
  return out;
};

export const deleteTable = async (db: SQLiteDatabase) => {
  await db.executeSql(`DROP TABLE IF EXISTS ${tableName}`);
};

export const ensureISpySeeded = async () => {
  const db = await getDBConnection();
  await createTable(db);
  await seedISpyTable(db);
  return db;
};