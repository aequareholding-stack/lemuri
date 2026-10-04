// Test-Läufer: legt eine frische Datenbank an, spielt Nachbildung, Migrationen
// und Startdaten ein und führt die Schutz-Tests aus.
//
// Aufruf: npm run test:db
// Verbindung über LEMURI_TEST_PG (Standard: postgres auf 127.0.0.1:54329).

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { schutzTests } from './schutz.test.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const basis = process.env.LEMURI_TEST_PG ?? 'postgres://postgres@127.0.0.1:54329/postgres';
const dbName = 'lemuri_test';

async function frischeDatenbank() {
  const admin = new pg.Client({ connectionString: basis });
  await admin.connect();
  await admin.query(`drop database if exists ${dbName} with (force)`);
  await admin.query(`create database ${dbName}`);
  await admin.end();
}

async function einspielen(client) {
  await client.query(readFileSync(join(hier, 'lokal_supabase_schema.sql'), 'utf8'));
  const migrationen = readdirSync(join(hier, '..', 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const datei of migrationen) {
    process.stdout.write(`  Migration ${datei}\n`);
    await client.query(readFileSync(join(hier, '..', 'migrations', datei), 'utf8'));
  }
  await client.query(readFileSync(join(hier, '..', 'seed.sql'), 'utf8'));
}

async function main() {
  process.stdout.write('Datenbank anlegen\n');
  await frischeDatenbank();
  const url = basis.replace(/\/[^/]*$/, `/${dbName}`);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  let fehler = 0;
  try {
    await einspielen(client);
    process.stdout.write('Schutz-Tests\n');
    fehler = await schutzTests(client);
  } finally {
    await client.end();
  }
  if (fehler > 0) {
    process.stdout.write(`\n${fehler} Test(s) fehlgeschlagen\n`);
    process.exit(1);
  }
  process.stdout.write('\nAlle Tests bestanden\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
