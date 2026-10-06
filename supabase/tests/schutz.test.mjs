// Schutz-Tests für die Zugriffsregeln (LB-002, Punkt 5).
// Jeder Test läuft mit der Rolle "authenticated" und den JWT-Angaben des
// jeweiligen Benutzers, genau wie PostgREST es im echten Projekt tut.

const ergebnisse = [];

function pruefe(name, bedingung, details = '') {
  ergebnisse.push({ name, ok: !!bedingung });
  process.stdout.write(`  ${bedingung ? 'OK  ' : 'FEHL'} ${name}${bedingung ? '' : '  ' + details}\n`);
}

// Als angemeldeter Benutzer (Rolle authenticated) ausführen
async function als(client, userId, fn) {
  await client.query('begin');
  try {
    await client.query('set local role authenticated');
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    return await fn();
  } finally {
    await client.query('rollback');
  }
}

// Als Server (Rolle service_role, umgeht RLS) ausführen
async function alsServer(client, fn) {
  await client.query('begin');
  try {
    await client.query('set local role service_role');
    const r = await fn();
    await client.query('commit');
    return r;
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}

// Zeilen zählen, Fehler als -1 melden (z. B. "permission denied")
async function zaehle(client, sql, params = []) {
  await client.query('savepoint z');
  try {
    const r = await client.query(sql, params);
    await client.query('release savepoint z');
    return r.rowCount ?? r.rows.length;
  } catch (e) {
    await client.query('rollback to savepoint z');
    return -1;
  }
}

async function fehlerCode(client, sql, params = []) {
  try {
    await client.query('savepoint s');
    await client.query(sql, params);
    await client.query('release savepoint s');
    return null;
  } catch (e) {
    await client.query('rollback to savepoint s');
    return e.code;
  }
}

async function familieAnlegen(client, email, kinder) {
  // Eltern-Benutzer wie bei Supabase Auth (Trigger legt Konto, Familiencode, Abo an)
  const eltern = (await client.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, '{"anzeige_name":"Test"}') returning id`,
    [email],
  )).rows[0].id;
  const { familiencode } = (await client.query('select familiencode from eltern_konto where id = $1', [eltern])).rows[0];
  const kindIds = [];
  for (const k of kinder) {
    const authId = (await client.query(
      `insert into auth.users (email, raw_user_meta_data) values ($1, '{"rolle":"kind"}') returning id`,
      [`kind-${crypto.randomUUID()}@kind.lemuri.app`],
    )).rows[0].id;
    const kindId = (await client.query(
      'select kind_profil_anlegen($1, $2, $3, $4, $5) as id',
      [eltern, authId, k.spitzname, k.klassenstufe, k.pin],
    )).rows[0].id;
    kindIds.push({ kindId, authId, ...k });
  }
  return { eltern, familiencode, kinder: kindIds };
}

export async function schutzTests(client) {
  // ----- Testdaten: zwei Familien, Familie 1 mit zwei Kindern -----
  const f1 = await familieAnlegen(client, 'familie1@example.org', [
    { spitzname: 'Mia', klassenstufe: 7, pin: '1234' },
    { spitzname: 'Ben', klassenstufe: 5, pin: '5678' },
  ]);
  const f2 = await familieAnlegen(client, 'familie2@example.org', [
    { spitzname: 'Lea', klassenstufe: 9, pin: '4321' },
  ]);
  const mia = f1.kinder[0];
  const ben = f1.kinder[1];
  const lea = f2.kinder[0];

  // Mia legt als Kind eine Aufgabe, ein Gespräch und eine Nachricht an (über RLS)
  await client.query('begin');
  await client.query('set local role authenticated');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: mia.authId, role: 'authenticated' })]);
  const aufgabeId = (await client.query(
    `insert into aufgabe (kind_id, fach, aufgabentext, eingabeart) values ($1, 'mathe', '3x + 7 = 22', 'text') returning id`,
    [mia.kindId],
  )).rows[0].id;
  const gespraechId = (await client.query(
    `insert into gespraech (aufgabe_id, kind_id) values ($1, $2) returning id`,
    [aufgabeId, mia.kindId],
  )).rows[0].id;
  await client.query(
    `insert into gespraech_nachricht (gespraech_id, kind_id, rolle, inhalt) values ($1, $2, 'kind', 'Was ist x?')`,
    [gespraechId, mia.kindId],
  );
  await client.query('commit');

  // Server ergänzt Lemuri-Antwort, Hinweis, Themenstand und Lernzeit
  await alsServer(client, async () => {
    const thema = (await client.query(`select id from thema where name = 'Gleichungen lösen'`)).rows[0].id;
    const n = (await client.query(
      `insert into gespraech_nachricht (gespraech_id, kind_id, rolle, inhalt) values ($1, $2, 'lemuri', 'Stell dir eine Waage vor.') returning id`,
      [gespraechId, mia.kindId],
    )).rows[0].id;
    await client.query(`insert into hinweis (gespraech_id, kind_id, stufe, nachricht_id) values ($1, $2, 1, $3)`, [gespraechId, mia.kindId, n]);
    await client.query(`insert into kind_thema_stand (kind_id, thema_id, stand) values ($1, $2, 'verstanden')`, [mia.kindId, thema]);
    await client.query(`insert into lernzeit_tag (kind_id, datum, minuten) values ($1, current_date, 25)`, [mia.kindId]);
  });

  const inhaltTabellen = ['aufgabe', 'gespraech', 'gespraech_nachricht', 'hinweis', 'pruefergebnis'];

  // ----- Gegenprobe: Mia sieht ihre eigenen Inhalte -----
  await als(client, mia.authId, async () => {
    pruefe('Kind liest eigene Nachrichten (Gegenprobe)', (await zaehle(client, 'select * from gespraech_nachricht')) === 2);
    pruefe('Kind liest eigenen Themenstand (Gegenprobe)', (await zaehle(client, 'select * from kind_thema_stand')) === 1);
  });

  // ----- Test 1: Eltern können keine Gespräche ihres Kindes lesen -----
  await als(client, f1.eltern, async () => {
    for (const t of inhaltTabellen) {
      const n = await zaehle(client, `select * from ${t}`);
      pruefe(`Eltern sehen nichts in ${t}`, n === 0, `(${n} Zeilen)`);
    }
    pruefe('Eltern kommen nicht an PIN-Daten', (await zaehle(client, 'select * from kind_pin')) === -1);
    pruefe('Eltern sehen ihre Kinder', (await zaehle(client, 'select * from kind_profil')) === 2);
    pruefe('Eltern sehen Lernzeit in der Sicht', (await zaehle(client, 'select * from eltern_lernzeit_woche')) === 1);
    pruefe('Eltern sehen Themen mit Stand in der Sicht', (await zaehle(client, 'select * from eltern_themen')) === 1);
    pruefe('Eltern sehen ihr Abo', (await zaehle(client, 'select * from abo')) === 1);
    pruefe('Eltern sehen Einstellungen ihrer Kinder', (await zaehle(client, 'select * from elterneinstellungen')) === 2);
    pruefe('Eltern löschen Profile nicht direkt (nur über den Server)', (await zaehle(client, 'delete from kind_profil where id = $1', [ben.kindId])) === -1);
    const code = await fehlerCode(client, `insert into gespraech_nachricht (gespraech_id, kind_id, rolle, inhalt) values ($1, $2, 'kind', 'x')`, [gespraechId, mia.kindId]);
    pruefe('Eltern können keine Nachricht einschleusen', code === '42501', `(Fehlercode ${code})`);
  });

  // ----- Test 2: Ein Kind kann keine Daten eines anderen Kindes lesen -----
  await als(client, ben.authId, async () => {
    for (const t of inhaltTabellen) {
      const n = await zaehle(client, `select * from ${t}`);
      pruefe(`Geschwisterkind sieht nichts in ${t}`, n === 0, `(${n} Zeilen)`);
    }
    pruefe('Geschwisterkind sieht keinen fremden Themenstand', (await zaehle(client, 'select * from kind_thema_stand')) === 0);
    pruefe('Geschwisterkind sieht keine fremde Lernzeit', (await zaehle(client, 'select * from lernzeit_tag')) === 0);
    pruefe('Geschwisterkind sieht nur eigenes Profil', (await zaehle(client, 'select * from kind_profil')) === 1);
    pruefe('Geschwisterkind kann fremde Nachricht nicht ändern', (await zaehle(client, `update gespraech_nachricht set inhalt = 'x' where gespraech_id = $1`, [gespraechId])) <= 0);
    const code = await fehlerCode(client, `insert into gespraech_nachricht (gespraech_id, kind_id, rolle, inhalt) values ($1, $2, 'kind', 'x')`, [gespraechId, mia.kindId]);
    pruefe('Geschwisterkind kann nicht im Namen des anderen schreiben', code === '42501', `(Fehlercode ${code})`);
    pruefe('Kind kommt nicht an PIN-Daten', (await zaehle(client, 'select * from kind_pin')) === -1);
    pruefe('Kind sieht kein Abo', (await zaehle(client, 'select * from abo')) === 0);
  });

  // ----- Test 3: Eine Familie sieht nichts von einer anderen Familie -----
  await als(client, f2.eltern, async () => {
    pruefe('Fremde Eltern sehen keine fremden Kinder', (await zaehle(client, 'select * from kind_profil where eltern_id = $1', [f1.eltern])) === 0);
    pruefe('Fremde Eltern sehen nur eigenes Konto', (await zaehle(client, 'select * from eltern_konto')) === 1);
    pruefe('Fremde Eltern sehen keine fremde Lernzeit', (await zaehle(client, 'select * from eltern_lernzeit_woche')) === 0);
    pruefe('Fremde Eltern sehen keine fremden Themen', (await zaehle(client, 'select * from eltern_themen')) === 0);
    pruefe('Fremde Eltern sehen keine fremden Einstellungen', (await zaehle(client, 'select * from elterneinstellungen')) === 1);
    pruefe('Fremde Eltern sehen kein fremdes Abo', (await zaehle(client, 'select * from abo')) === 1);
    pruefe('Fremde Eltern können fremde Einstellungen nicht ändern', (await zaehle(client, 'update elterneinstellungen set tageslimit_minuten = 10 where kind_id = $1', [mia.kindId])) === 0);
  });
  await als(client, lea.authId, async () => {
    for (const t of inhaltTabellen) {
      const n = await zaehle(client, `select * from ${t}`);
      pruefe(`Fremdes Kind sieht nichts in ${t}`, n === 0, `(${n} Zeilen)`);
    }
    pruefe('Fremdes Kind sieht nur eigenes Profil', (await zaehle(client, 'select * from kind_profil')) === 1);
  });

  // Betreiber-Oberfläche: nur Zähler, keine Inhalte
  await client.query('begin');
  await client.query('set local role betreiber');
  pruefe('Betreiber sieht Kennzahlen', (await zaehle(client, 'select * from betreiber_kennzahlen')) === 1);
  pruefe('Betreiber sieht keine Nachrichten', (await zaehle(client, 'select * from gespraech_nachricht')) === -1);
  pruefe('Betreiber sieht keine Profile', (await zaehle(client, 'select * from kind_profil')) === -1);
  await client.query('rollback');

  // Nicht angemeldet: gar nichts
  await client.query('begin');
  await client.query('set local role anon');
  pruefe('Nicht angemeldet sieht keine Nachrichten', (await zaehle(client, 'select * from gespraech_nachricht')) === -1);
  pruefe('Nicht angemeldet sieht keine Themen', (await zaehle(client, 'select * from thema')) === -1);
  await client.query('rollback');

  // ----- Test 4: Nach fünf falschen PINs ist das Profil gesperrt -----
  const pruefen = (pin) => alsServer(client, async () =>
    (await client.query('select * from kind_anmeldung_pruefen($1, $2, $3)', [f1.familiencode, mia.kindId, pin])).rows[0]);

  pruefe('Richtige PIN wird angenommen', (await pruefen('1234')).ergebnis === 'ok');
  const antworten = [];
  for (let i = 0; i < 5; i++) antworten.push(await pruefen('0000'));
  pruefe('Vier Fehlversuche melden "falsch" mit Restzahl', antworten.slice(0, 4).every((a, i) => a.ergebnis === 'falsch' && a.verbleibende_versuche === 4 - i), JSON.stringify(antworten));
  pruefe('Fünfter Fehlversuch sperrt', antworten[4].ergebnis === 'gesperrt');
  pruefe('Nach der Sperre gilt auch die richtige PIN nicht', (await pruefen('1234')).ergebnis === 'gesperrt');
  const sperre = await alsServer(client, async () => (await client.query('select gesperrt_am, fehlversuche from kind_pin where kind_id = $1', [mia.kindId])).rows[0]);
  pruefe('Sperre ist in kind_pin vermerkt', sperre.gesperrt_am !== null && sperre.fehlversuche === 5);
  const profile = await alsServer(client, async () => (await client.query('select * from familie_profile($1)', [f1.familiencode])).rows);
  pruefe('Profilauswahl zeigt die Sperre', profile.find((p) => p.kind_id === mia.kindId)?.gesperrt === true);
  await alsServer(client, () => client.query('select kind_pin_setzen($1, $2, $3)', [f1.eltern, mia.kindId, '9999']));
  pruefe('Neue PIN der Eltern hebt die Sperre auf', (await pruefen('9999')).ergebnis === 'ok');
  pruefe('Alte PIN gilt danach nicht mehr', (await pruefen('1234')).ergebnis === 'falsch');
  const fremderCode = await alsServer(client, async () => (await client.query('select * from kind_anmeldung_pruefen($1, $2, $3)', ['AAAAAAAA', mia.kindId, '9999'])).rows[0]);
  pruefe('Falscher Familiencode wird abgelehnt', fremderCode.ergebnis === 'unbekannt');

  // Anmeldefunktionen sind für die App nicht direkt aufrufbar
  await als(client, f1.eltern, async () => {
    const code = await fehlerCode(client, 'select * from kind_anmeldung_pruefen($1, $2, $3)', [f1.familiencode, mia.kindId, '9999']);
    pruefe('App kann PIN-Prüfung nicht direkt aufrufen', code === '42501', `(Fehlercode ${code})`);
    const code2 = await fehlerCode(client, 'select * from familie_profile($1)', [f1.familiencode]);
    pruefe('App kann Profilliste nicht direkt abrufen', code2 === '42501', `(Fehlercode ${code2})`);
  });

  // ----- Weitere Regeln: Profilgrenze und Testphase -----
  await client.query('begin');
  // Das dritte Profil geht noch (Familie 1 hat zwei)
  const drittes = await fehlerCode(client, 'select kind_profil_anlegen($1, $2, $3, $4, $5)', [
    f1.eltern, (await client.query(`insert into auth.users (email, raw_user_meta_data) values ('kind-y@kind.lemuri.app', '{"rolle":"kind"}') returning id`)).rows[0].id, 'Tom', 6, '1111',
  ]);
  pruefe('Drittes Profil geht noch', drittes === null, `(Fehlercode ${drittes})`);
  const viertes = await fehlerCode(client, 'select kind_profil_anlegen($1, $2, $3, $4, $5)', [
    f1.eltern, (await client.query(`insert into auth.users (email, raw_user_meta_data) values ('kind-z@kind.lemuri.app', '{"rolle":"kind"}') returning id`)).rows[0].id, 'Max', 6, '1111',
  ]);
  pruefe('Viertes Profil wird abgelehnt', viertes === 'P0001', `(Fehlercode ${viertes})`);
  await client.query('commit');
  const abo = (await client.query('select status, plan, testphase_bis > now() + interval \'29 days\' as dreissig from abo where eltern_id = $1', [f1.eltern])).rows[0];
  pruefe('Neues Konto startet in der Testphase (30 Tage, Familie)', abo.status === 'testphase' && abo.plan === 'familie' && abo.dreissig);

  // Dieselbe E-Mail nach Kontolöschung bekommt keine zweite Testphase
  // Kontolöschung wie die Edge Function "konto-loeschen": erst Kind-Benutzer, dann Eltern
  await client.query('delete from auth.users where id = any($1)', [[lea.authId]]);
  await client.query('delete from auth.users where id = $1', [f2.eltern]);
  pruefe('Kontolöschung entfernt Kind-Benutzer mit', (await client.query('select * from auth.users where id = $1', [lea.authId])).rowCount === 0);
  pruefe('Kontolöschung entfernt Profil und Daten des Kindes', (await client.query('select * from kind_profil where id = $1', [lea.kindId])).rowCount === 0
    && (await client.query('select * from kind_pin where kind_id = $1', [lea.kindId])).rowCount === 0
    && (await client.query('select * from elterneinstellungen where kind_id = $1', [lea.kindId])).rowCount === 0);
  pruefe('Kontolöschung entfernt Eltern-Konto und Abo', (await client.query('select * from eltern_konto where id = $1', [f2.eltern])).rowCount === 0
    && (await client.query('select * from abo where eltern_id = $1', [f2.eltern])).rowCount === 0);
  const f2neu = (await client.query(`insert into auth.users (email) values ('familie2@example.org') returning id`)).rows[0].id;
  const abo2 = (await client.query('select status from abo where eltern_id = $1', [f2neu])).rows[0];
  pruefe('Zweites Konto mit derselben E-Mail bekommt keine Testphase', abo2.status === 'abgelaufen');

  // Löschlauf: altes Gespräch verschwindet, Themenstand bleibt
  await alsServer(client, () => client.query(`update gespraech set gestartet_am = now() - interval '91 days', beendet_am = now() - interval '91 days' where id = $1`, [gespraechId]));
  await alsServer(client, () => client.query('select * from loeschlauf()'));
  pruefe('Löschlauf entfernt Gespräche nach 90 Tagen', (await client.query('select count(*)::int as n from gespraech_nachricht')).rows[0].n === 0);
  pruefe('Themenstand bleibt nach dem Löschlauf', (await client.query('select count(*)::int as n from kind_thema_stand')).rows[0].n === 1);

  // E-Mail-Prüfsumme: nur Hash, kein Klartext; nach 24 Monaten gelöscht, vorher nicht
  const hashZeilen = (await client.query('select email_hash from testphase_verbraucht')).rows;
  pruefe('Prüfsumme enthält keine E-Mail im Klartext', hashZeilen.length >= 2 && hashZeilen.every((z) => /^[0-9a-f]{64}$/.test(z.email_hash)));
  await alsServer(client, () => client.query(`update testphase_verbraucht set erstellt_am = now() - interval '23 months' where email_hash = (select min(email_hash) from testphase_verbraucht)`));
  await alsServer(client, () => client.query('select * from loeschlauf()'));
  pruefe('Prüfsumme bleibt vor Ablauf von 24 Monaten', (await client.query('select count(*)::int as n from testphase_verbraucht')).rows[0].n === hashZeilen.length);
  await alsServer(client, () => client.query(`update testphase_verbraucht set erstellt_am = now() - interval '25 months' where email_hash = (select min(email_hash) from testphase_verbraucht)`));
  await alsServer(client, () => client.query('select * from loeschlauf()'));
  pruefe('Prüfsumme wird nach 24 Monaten gelöscht', (await client.query('select count(*)::int as n from testphase_verbraucht')).rows[0].n === hashZeilen.length - 1);

  // PIN muss genau vier Ziffern haben
  await client.query('begin');
  const pinCode = await fehlerCode(client, 'select kind_pin_setzen($1, $2, $3)', [f1.eltern, mia.kindId, '123']);
  pruefe('PIN mit drei Ziffern wird abgelehnt', pinCode === '22023', `(Fehlercode ${pinCode})`);
  const pinCode2 = await fehlerCode(client, 'select kind_pin_setzen($1, $2, $3)', [f1.eltern, mia.kindId, 'abcd']);
  pruefe('PIN mit Buchstaben wird abgelehnt', pinCode2 === '22023', `(Fehlercode ${pinCode2})`);
  await client.query('commit');

  return ergebnisse.filter((e) => !e.ok).length;
}
