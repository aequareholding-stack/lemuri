# Lemuri – Datenmodell (Plan)

Stand: 04.10.2026, Auftrag LB-002. Umgesetzt als Migrationen in `supabase/migrations/`, geprüft durch `npm run test:db`. Abschnitt 9 beschreibt die Umsetzung. Das Supabase-Projekt wird in einem späteren Auftrag angelegt (Region Frankfurt, `eu-central-1`).

## 1. Grundsätze

1. **Gespräche gehören dem Kind.** Gesprächsinhalte (Aufgabentext, Nachrichten, Hinweise, Prüfantworten) darf nur das Kind lesen. Eltern haben darauf keinen Zugriff, auch nicht über Umwege.
2. **Eltern sehen nur Zusammenfassungen.** Lernzeit pro Tag, Themen mit Stand („verstanden“ / „übt noch“), die eigenen Einstellungen und das Abo. Keine einzelnen Gespräche, keine Aufgabentexte.
3. **Vom Kind nur das Nötigste.** Gespeichert werden Vorname oder Spitzname und Klassenstufe. Kein Geburtsdatum, keine Schule, keine Adresse, keine E-Mail des Kindes.
4. **Fotos werden nie gespeichert.** Das Foto wird nur zum Auslesen des Aufgabentexts verwendet und danach sofort verworfen. In der Datenbank landet nur der Text.
5. **Jedes Feld mit Kinderdaten hat eine Löschregel** (Abschnitt 5).
6. **Zugriff wird in der Datenbank erzwungen** (Row Level Security), nicht nur in der App. Dafür hat das Kind eine eigene Anmelde-Identität (Entscheidung: Familiencode + PIN).
7. **Nichts wird automatisch gelöscht, nur weil ein Konto ruht.** Eltern können ihr Konto und alle Daten jederzeit selbst löschen. Zeitgesteuert gelöscht werden nur Gesprächsinhalte (90 Tage) und kurzlebige Rohdaten.
8. **Der KI-Anbieter bleibt austauschbar.** Claude läuft über einen Cloud-Anbieter mit EU-Standort; die App spricht nie direkt mit dem Anbieter, sondern mit einer eigenen Edge Function, hinter der der Anbieter gewechselt werden kann.

## 2. Wer ist wer (Rollen)

| Rolle | Anmeldung | Erkennbar an |
|---|---|---|
| Eltern | Supabase Auth, E-Mail + Passwort (oder Magic Link) | `auth.uid()` = `eltern_konto.id` |
| Kind | Supabase Auth, eigener Benutzer ohne E-Mail, angelegt von den Eltern. Anmeldung: Familiencode (steht im Eltern-Konto) + PIN des Kindes, geprüft von einer Edge Function, die dann die Sitzung des Kind-Benutzers ausstellt | `auth.uid()` = `kind_profil.auth_user_id` |
| Server (Lemuri-Dienst) | Edge Functions mit Service-Rolle | umgeht RLS; schreibt KI-Antworten, Themenstand, Abo-Status; einziger Zugang zu PIN-Daten |
| Betreiber-Oberfläche | Datenbankrolle `betreiber` | sieht nur Themenkatalog und Zähler (`betreiber_kennzahlen`), keine Inhalte und keine Profile |

Alle Tabellen haben RLS eingeschaltet. Ohne passende Regel ist nichts lesbar.

Zwei Hilfsfunktionen (SQL, `security definer`) machen die Regeln kurz:

```sql
-- Ist der angemeldete Benutzer das Kind mit dieser Profil-ID?
create function ist_kind(p_kind_id uuid) returns boolean ...
  -- exists(select 1 from kind_profil where id = p_kind_id and auth_user_id = auth.uid())

-- Ist der angemeldete Benutzer ein Elternteil dieses Kindes?
create function ist_eltern_von(p_kind_id uuid) returns boolean ...
  -- exists(select 1 from kind_profil where id = p_kind_id and eltern_id = auth.uid())
```

## 3. Tabellen

Konventionen: alle IDs sind `uuid`, Zeitstempel sind `timestamptz`, Tabellen- und Feldnamen auf Deutsch in Kleinschreibung.

### 3.1 `eltern_konto` – Eltern-Konto

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | gleich `auth.users.id` |
| anzeige_name | text, optional | wie die Eltern angesprochen werden möchten |
| familiencode | text, eindeutig | vom Server erzeugter Code (z. B. 8 Zeichen, ohne verwechselbare Zeichen), mit dem sich die Kinder anmelden; Eltern können ihn neu erzeugen lassen |
| erstellt_am | timestamptz | |
| geloescht_am | timestamptz, optional | gesetzt, wenn die Löschung angestoßen wurde |

E-Mail und Passwort liegen bei Supabase Auth, nicht in dieser Tabelle.

**RLS:** Eltern lesen und ändern nur die eigene Zeile (`id = auth.uid()`). Kinder: kein Zugriff.

### 3.2 `kind_profil` – Kind-Profil

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| eltern_id | uuid, FK → eltern_konto | |
| auth_user_id | uuid, FK → auth.users, eindeutig | eigener Anmelde-Benutzer des Kindes. Er hat eine künstliche Adresse `kind-<id>@kind.lemuri.app` (Domain gehört Jo, Entscheidung vom 05.10.2026), an die nie eine E-Mail geht, und ein Passwort, das nur der Server aus einem Geheimnis ableitet. Die PIN ist nie das Passwort |
| spitzname | text | Vorname oder Spitzname, höchstens 30 Zeichen |
| klassenstufe | smallint | 5 bis 10 |
| inaktiv_seit | timestamptz, optional | gesetzt, wenn das Abo weniger Profile erlaubt als vorhanden: Eltern wählen das aktive Profil, die anderen werden gesperrt, nicht gelöscht |
| erstellt_am | timestamptz | |

Bewusst **nicht** vorhanden: Geburtsdatum, Schule, Adresse, Geschlecht, Foto, E-Mail.

**RLS:** Eltern lesen und ändern Profile mit `eltern_id = auth.uid()`. Die Anzahl ist durch das Abo begrenzt (1 oder 3), geprüft in einer Datenbank-Funktion beim Anlegen. Anlegen geht nur über die Edge Function `kind-profil-anlegen`, weil zuerst der Anmelde-Benutzer entstehen muss. Das Kind liest nur die eigene Zeile (`auth_user_id = auth.uid()`), ändert nichts.

### 3.2a `kind_pin` – PIN-Daten (nur Server)

| Feld | Typ | Beschreibung |
|---|---|---|
| kind_id | uuid, PK, FK → kind_profil | |
| pin_hash | text | bcrypt-Hash der 4-stelligen PIN |
| fehlversuche | smallint | Zähler, bei richtiger PIN zurück auf 0 |
| gesperrt_am | timestamptz, optional | gesetzt beim fünften Fehlversuch; bleibt, bis die Eltern eine neue PIN setzen |
| aktualisiert_am | timestamptz | |

**RLS:** Keine einzige Regel und keine Rechte für `authenticated` oder `anon`. Nur der Server (Edge Functions `kind-anmelden`, `kind-pin-setzen`) liest und schreibt über die Funktionen `kind_anmeldung_pruefen` und `kind_pin_setzen`. Die App kann diese Funktionen nicht direkt aufrufen (Test „App kann PIN-Prüfung nicht direkt aufrufen“).

### 3.3 `thema` – Themenkatalog (keine Kinderdaten)

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| fach | text | zunächst nur `mathe`; später `deutsch`, `englisch` |
| name | text | z. B. „Gleichungen lösen“, „Bruchrechnen“ |
| klassenstufe_von | smallint | |
| klassenstufe_bis | smallint | |
| reihenfolge | integer | Sortierung in der Anzeige |

**RLS:** Alle angemeldeten Benutzer lesen. Schreiben nur der Server.

### 3.4 `aufgabe` – Aufgabe

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| kind_id | uuid, FK → kind_profil | |
| fach | text | |
| thema_id | uuid, FK → thema, optional | vom Server zugeordnet |
| aufgabentext | text | der ausgelesene oder getippte Text; **Kinderdaten** |
| eingabeart | text | `text` oder `foto` (nur die Art, nie das Bild). Beim Foto liest das KI-Modell den Text direkt aus dem Bild; das Bild geht nur an die Edge Function und von dort an den KI-Anbieter, wird nirgends abgelegt |
| anliegen | text, optional | `anfang`, `mittendrin`, `pruefen` – was das Kind braucht |
| erstellt_am | timestamptz | |
| erledigt_am | timestamptz, optional | |

**RLS:** Kind liest, legt an und ändert nur eigene Aufgaben (`ist_kind(kind_id)`). Eltern: **kein Zugriff** (der Aufgabentext gehört zum Gespräch).

### 3.5 `gespraech` – Gesprächsverlauf (Kopf)

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| aufgabe_id | uuid, FK → aufgabe | |
| kind_id | uuid, FK → kind_profil | doppelt gehalten, damit die RLS-Regel einfach bleibt |
| status | text | `laeuft`, `abgeschlossen`, `abgebrochen` |
| hinweise_genutzt | smallint | 0 bis 3 |
| gestartet_am | timestamptz | |
| beendet_am | timestamptz, optional | |

**RLS:** Kind liest und legt eigene Gespräche an. Eltern: **kein Zugriff**. Status und Zähler setzt der Server.

### 3.6 `gespraech_nachricht` – einzelne Nachrichten

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| gespraech_id | uuid, FK → gespraech | |
| kind_id | uuid, FK → kind_profil | |
| rolle | text | `kind` oder `lemuri` |
| inhalt | text | Nachrichtentext; **Kinderdaten** |
| erstellt_am | timestamptz | |

**RLS:** Kind liest alle Nachrichten eigener Gespräche und legt Nachrichten mit `rolle = 'kind'` an. Lemuri-Antworten schreibt der Server. Eltern: **kein Zugriff**. Nichts wird nachträglich geändert.

### 3.7 `hinweis` – Hinweisstufe

Jeder gegebene Hinweis ist eine Zeile. So lässt sich zählen, wie viele Hinweise ein Kind pro Thema braucht, ohne Nachrichteninhalte zu lesen.

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| gespraech_id | uuid, FK → gespraech | |
| kind_id | uuid, FK → kind_profil | |
| stufe | smallint | 1 = sanfter Anstoß, 2 = konkreter Schritt, 3 = fast die Lösung |
| nachricht_id | uuid, FK → gespraech_nachricht | die Nachricht, die den Hinweis enthält |
| erstellt_am | timestamptz | |

**RLS:** Kind liest eigene Hinweise. Schreiben nur der Server. Eltern: kein direkter Zugriff; nur die Zahl „Hinweise im Schnitt“ darf in Zusammenfassungen auftauchen (siehe 4).

### 3.8 `pruefergebnis` – Prüfergebnis

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| gespraech_id | uuid, FK → gespraech | |
| kind_id | uuid, FK → kind_profil | |
| thema_id | uuid, FK → thema | |
| pruefaufgabe_text | text | die ähnliche Aufgabe; **Kinderdaten** (Inhalt des Gesprächs) |
| antwort_kind | text | **Kinderdaten** |
| richtig | boolean | |
| sicherheit | text, optional | `unsicher`, `geht_so`, `sicher` – Selbsteinschätzung |
| erstellt_am | timestamptz | |

**RLS:** Kind liest eigene Ergebnisse und legt die Antwort an. `richtig` setzt der Server. Eltern: **kein Zugriff** auf die Zeilen; sie sehen nur den daraus abgeleiteten Themenstand (3.9).

### 3.9 `kind_thema_stand` – Thema mit Stand

| Feld | Typ | Beschreibung |
|---|---|---|
| kind_id | uuid, FK → kind_profil | zusammen mit thema_id PK |
| thema_id | uuid, FK → thema | |
| stand | text | `uebt_noch` oder `verstanden` |
| anzahl_aufgaben | integer | wie oft das Thema geübt wurde |
| anzahl_pruefungen_richtig | integer | |
| aktualisiert_am | timestamptz | |

Regel (vorläufig): `verstanden`, sobald eine Prüfaufgabe zum Thema richtig gelöst wurde; fällt auf `uebt_noch` zurück, wenn danach zwei Prüfungen in Folge falsch sind.

**RLS:** Kind liest eigene Zeilen. Eltern lesen Zeilen ihrer Kinder (`ist_eltern_von(kind_id)`). Schreiben nur der Server.

### 3.10 `lernsitzung` und `lernzeit_tag` – Lernzeit

`lernsitzung` (Rohdaten, kurzlebig):

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| kind_id | uuid, FK → kind_profil | |
| gestartet_am | timestamptz | |
| beendet_am | timestamptz, optional | wird beim Schließen der App oder nach 5 Minuten ohne Eingabe gesetzt |

`lernzeit_tag` (Zusammenfassung, vom Server gepflegt):

| Feld | Typ | Beschreibung |
|---|---|---|
| kind_id | uuid, FK → kind_profil | zusammen mit datum PK |
| datum | date | Kalendertag in der Zeitzone der Eltern-Einstellungen |
| minuten | integer | Summe des Tages |

**RLS:** `lernsitzung`: Kind legt an und beendet eigene Sitzungen, liest eigene Sitzungen des heutigen Tages (für das Tageslimit). Eltern: kein Zugriff auf Sitzungen. `lernzeit_tag`: Kind liest eigene Zeilen, Eltern lesen Zeilen ihrer Kinder. Schreiben nur der Server.

### 3.11 `elterneinstellungen` – Elterneinstellungen

| Feld | Typ | Beschreibung |
|---|---|---|
| kind_id | uuid, PK, FK → kind_profil | eine Zeile je Kind |
| tageslimit_minuten | integer | Standard 60 |
| lernpause_ab | time | z. B. 20:30 |
| lernpause_bis | time | z. B. 06:00 |
| zeitzone | text | z. B. `Europe/Berlin` |
| aktualisiert_am | timestamptz | |

**RLS:** Eltern lesen und ändern Zeilen ihrer Kinder. Kind liest die eigene Zeile (die App muss Limit und Pause kennen), ändert nichts.

### 3.12 `abo` – Abo

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid, PK | |
| eltern_id | uuid, FK → eltern_konto | |
| plan | text | `einzel` (ein Kind, 9,99 Euro im Monat) oder `familie` (bis zu drei Kinder, 14,99 Euro im Monat) |
| preis_cent | integer | 999 oder 1499, zum Zeitpunkt des Abschlusses |
| status | text | `testphase` (30 Tage kostenlos ab Konto-Anlage, ohne Zahlungsmittel, eine Testphase je Eltern-E-Mail), `aktiv`, `gekuendigt` (läuft bis gueltig_bis), `abgelaufen` |
| anbieter | text, optional | `apple` oder `google`; leer in der Testphase. Zahlung im Browser kommt in einem späteren Auftrag dazu |
| anbieter_referenz | text, optional | Transaktions- bzw. Kunden-ID beim Anbieter |
| testphase_bis | timestamptz | Konto-Anlage plus 30 Tage |
| gueltig_bis | timestamptz | in der Testphase gleich testphase_bis |
| gekuendigt_am | timestamptz, optional | |
| erstellt_am | timestamptz | |

Zahlungsdaten (Karte, Konto) liegen nie bei Lemuri, nur beim Anbieter. Jedes Eltern-Konto hat genau eine Abo-Zeile; sie entsteht mit dem Konto im Status `testphase`. Damit es nur eine Testphase je Eltern-E-Mail gibt, merkt sich die Tabelle `testphase_verbraucht` einen SHA-256-Hash der E-Mail (keine Klartext-Adresse). Ein zweites Konto mit derselben E-Mail startet im Status `abgelaufen`. In der Testphase gilt die Grenze des Familien-Plans (bis zu drei Kinder). Erlaubt das gebuchte Abo weniger Profile als vorhanden, wählen die Eltern das aktive Profil; die anderen bekommen `gesperrt_am` und bleiben mit allen Daten erhalten. Nach Ablauf ohne Abschluss: Status `abgelaufen`, das Kind kann keine neue Aufgabe beginnen, Eltern sehen weiter ihre Übersicht, nichts wird gelöscht.

**RLS:** Eltern lesen das eigene Abo. Schreiben nur der Server (über Webhooks der Anbieter). Kinder: kein Zugriff.

## 4. Was Eltern sehen – als Sichten

Damit die Eltern-App nur Zusammenfassungen erhält, bekommt sie zwei Sichten (`views`), die genau die erlaubten Felder enthalten:

- `eltern_lernzeit_woche`: `kind_id`, `datum`, `minuten` – aus `lernzeit_tag`.
- `eltern_themen`: `kind_id`, `thema_name`, `stand`, `aktualisiert_am` – aus `kind_thema_stand` und `thema`.

Beide Sichten laufen mit den RLS-Regeln des aufrufenden Benutzers (`security invoker`). Es gibt bewusst keine Sicht auf Aufgaben, Nachrichten, Hinweise oder Prüfantworten.

## 5. Löschregeln für Kinderdaten

| Feld / Tabelle | Wann gelöscht |
|---|---|
| Foto der Aufgabe | wird nie gespeichert; die Edge Function reicht es an das KI-Modell weiter und verwirft es sofort nach der Antwort, keine Kopie in Supabase Storage, kein Ablegen beim Anbieter |
| `kind_profil.spitzname`, `klassenstufe` und `kind_pin` | sofort, wenn Eltern das Profil löschen (Edge Function `kind-profil-loeschen`) oder das Konto löschen (Edge Function `konto-loeschen`). Keine automatische Löschung bei ruhenden Konten (Entscheidung des Operators); Eltern können jederzeit selbst löschen |
| Anmelde-Benutzer des Kindes (`auth.users`) | zusammen mit dem Profil |
| `aufgabe.aufgabentext`, `anliegen` | 90 Tage nach `erledigt_am` (bzw. nach `erstellt_am`, wenn nie erledigt); sofort mit dem Profil |
| `gespraech`, `gespraech_nachricht.inhalt`, `hinweis` | 90 Tage nach `beendet_am` (bzw. `gestartet_am`); sofort mit dem Profil. Nach dem Löschen bleiben nur die Zähler in `kind_thema_stand` |
| `pruefergebnis.pruefaufgabe_text`, `antwort_kind` | 90 Tage nach `erstellt_am`; die Zeile wird komplett gelöscht, der Stand bleibt in `kind_thema_stand` |
| `lernsitzung` | 7 Tage nach `beendet_am`, sobald der Tag in `lernzeit_tag` aufsummiert ist; sofort mit dem Profil |
| `lernzeit_tag` | 12 Monate nach `datum`; sofort mit dem Profil |
| `kind_thema_stand` | sofort mit dem Profil |
| `elterneinstellungen` | sofort mit dem Profil |
| `testphase_verbraucht.email_hash` | bleibt nach der Kontolöschung, damit dieselbe E-Mail keine zweite Testphase bekommt (SHA-256, kein Klartext). Der Löschlauf entfernt den Eintrag 24 Monate nach dem Anlegen |
| `eltern_konto` (mit `familiencode`), `abo` | sofort bei Kontolöschung; Abrechnungsbelege beim Zahlungsanbieter bleiben so lange, wie es das Steuerrecht verlangt (keine Kinderdaten darin) |
| Daten beim KI-Anbieter | Gesprächstexte und Fotos gehen an Claude über einen Cloud-Anbieter mit EU-Standort; dort keine Speicherung über die Anfrage hinaus und keine Verwendung zum Training (Vertragsbedingung, im Auftrag „Datenschutz“ zu prüfen) |
| Server-Protokolle (Logs) | enthalten keine Gesprächsinhalte und keine Spitznamen, nur IDs; 30 Tage |

Die „sofort“-Löschungen laufen über `on delete cascade` an den Fremdschlüsseln. Die zeitgesteuerten Löschungen laufen täglich als Datenbank-Job (`pg_cron`).

## 6. Sicherheitsregeln im Überblick

| Tabelle | Kind | Eltern | Server |
|---|---|---|---|
| eltern_konto | – | eigene Zeile: lesen, ändern | alles |
| kind_profil | eigene Zeile: lesen | eigene Kinder: lesen, ändern (anlegen und löschen über den Server) | alles |
| kind_pin | – | – | alles |
| thema | lesen | lesen | alles |
| aufgabe | eigene: lesen, anlegen, ändern | – | alles |
| gespraech | eigene: lesen, anlegen | – | alles |
| gespraech_nachricht | eigene: lesen, anlegen (rolle = kind) | – | alles |
| hinweis | eigene: lesen | – | alles |
| pruefergebnis | eigene: lesen, anlegen | – | alles |
| kind_thema_stand | eigene: lesen | eigene Kinder: lesen | alles |
| lernsitzung | eigene: anlegen, beenden, heute lesen | – | alles |
| lernzeit_tag | eigene: lesen | eigene Kinder: lesen | alles |
| elterneinstellungen | eigene Zeile: lesen | eigene Kinder: lesen, ändern | alles |
| abo | – | eigenes: lesen | alles |
| testphase_verbraucht | – | – | alles |

Die Betreiber-Rolle hat auf keine dieser Tabellen Rechte, nur auf `thema` und die Sicht `betreiber_kennzahlen`. Nicht angemeldete Benutzer (`anon`) haben gar keine Rechte.

Beispiel einer Regel in SQL:

```sql
alter table gespraech_nachricht enable row level security;

create policy "kind liest eigene nachrichten"
  on gespraech_nachricht for select
  using (ist_kind(kind_id));

create policy "kind schreibt eigene nachrichten"
  on gespraech_nachricht for insert
  with check (ist_kind(kind_id) and rolle = 'kind');

-- Keine Regel für Eltern: damit ist die Tabelle für sie unsichtbar.
```

## 7. Entschieden am 04.10.2026

| Thema | Entscheidung | Wo im Modell |
|---|---|---|
| Anmeldung Kind | eigener Benutzer, Familiencode + 4-stellige PIN, Sperre nach fünf Fehlversuchen | 2, 3.1, 3.2 |
| Aufbewahrung Gespräche | 90 Tage nach Gesprächsende | 5 |
| Foto auslesen | direkt mit Claude, eigener Dienst später möglich | 3.4, 5 |
| KI-Modell | Claude über Amazon Bedrock Frankfurt, sonst Google Vertex AI in der EU; Anbieter austauschbar | 1.8, 5, 8 |
| Abo | erst Apple und Google, Browser später | 3.12 |
| Inaktive Konten | keine automatische Löschung, Eltern löschen selbst | 1.7, 5 |
| Testphase | 30 Tage ab Konto-Anlage, ohne Zahlungsmittel, eine je Eltern-E-Mail; die E-Mail-Prüfsumme wird nach 24 Monaten gelöscht | 3.12, 5 |
| Eltern-Anmeldung | E-Mail-Bestätigung per Link vor der ersten Anmeldung, Passwort mindestens 8 Zeichen | 2, 9 |
| Supabase-Dashboard | nur Jo mit Zwei-Faktor-Anmeldung; Lemuri App arbeitet nur über den technischen Zugang | 9 |
| Mehr Kinder als gebucht | Eltern wählen das aktive Profil, die anderen werden gesperrt, nicht gelöscht | 3.2, 3.12 |

## 8. Anbindung des KI-Modells (austauschbar)

Die App ruft nie den KI-Anbieter direkt auf, sondern immer eine Edge Function in Supabase (`gespraech-antwort`, `aufgabe-auslesen`). Darin steckt eine kleine Schnittstelle mit zwei Funktionen: `antwortErzeugen(nachrichten)` und `textAusBild(bild)`. Dahinter liegt je Anbieter eine Umsetzung. Zuerst: Claude Sonnet über Amazon Bedrock in der Region Frankfurt. Vor dem KI-Auftrag wird geprüft, ob die gewünschte Sonnet-Version dort freigeschaltet ist; sonst Google Vertex AI in einer EU-Region. Welche Umsetzung läuft, entscheidet eine Umgebungsvariable. So lässt sich der Anbieter wechseln, ohne App oder Datenmodell anzufassen. Der Anbieter wird in keiner Tabelle gespeichert.

## 9. Umsetzung (LB-002)

| Datei | Inhalt |
|---|---|
| `supabase/migrations/20261004150000_grundgeruest.sql` | Erweiterung pgcrypto, alle Tabellen und Indizes, Hilfsfunktionen `ist_kind`, `ist_eltern_von`, Sicht `betreiber_kennzahlen` |
| `supabase/migrations/20261004150100_zugriffsregeln.sql` | Rechte je Rolle, RLS auf jeder Tabelle, alle Regeln, Eltern-Sichten `eltern_lernzeit_woche` und `eltern_themen`, Rolle `betreiber` |
| `supabase/migrations/20261004150200_anmeldung.sql` | Familiencode, Trigger für neue Auth-Benutzer (Konto + Abo in Testphase), Profilgrenze, `kind_profil_anlegen`, `familie_profile`, `kind_anmeldung_pruefen` (Sperre nach fünf Fehlversuchen), `kind_pin_setzen`; Löschen nur über den Server |
| `supabase/migrations/20261004150300_loeschlauf.sql` | Funktion `loeschlauf` (90 Tage Gespräche und Aufgaben, 7 Tage Sitzungen, 12 Monate Tagessummen), täglicher Lauf über pg_cron, falls eingeschaltet |
| `supabase/seed.sql` | Themenkatalog Mathe Klasse 5 bis 10 |
| `supabase/functions/kind-anmelden` | Profile zum Familiencode liefern, PIN prüfen, Sitzung des Kind-Benutzers ausstellen |
| `supabase/functions/kind-profil-anlegen` | Eltern legen ein Kind-Profil an (Auth-Benutzer + Profil + PIN) |
| `supabase/functions/kind-pin-setzen` | Eltern setzen eine neue PIN, Sperre wird aufgehoben |
| `supabase/functions/kind-profil-loeschen` | Eltern löschen ein Kind-Profil (Anmelde-Benutzer weg, Fremdschlüssel räumen den Rest) |
| `supabase/functions/konto-loeschen` | Eltern löschen ihr Konto mit allen Daten (erst Kind-Benutzer, dann Eltern-Benutzer) |
| `supabase/migrations/20261005120000_rechte_haerten.sql` | entzieht die Standardrechte, die Supabase neuen Tabellen für anon und authenticated gibt; PIN-Daten und Prüfsummen nur für den Server; Hilfsfunktionen als security invoker |
| `supabase/tests/` | Nachbildung der Supabase-Umgebung für ein normales PostgreSQL und die Schutz-Tests |

Stand im Projekt „lemuri“ (Frankfurt, 06.10.2026): Migrationen Grundgerüst, Zugriffsregeln, Anmeldung Teil 1 (Familiencode, Trigger, Profil anlegen, PIN prüfen und setzen), Rechte härten, Hilfsfunktionen invoker, Startdaten und pg_cron sind eingespielt; die drei Edge Functions sind ausgerollt. Löschen von Profil und Konto läuft über die Edge Functions `kind-profil-loeschen` und `konto-loeschen`. Noch nicht eingespielt, weil das Werkzeug SQL mit Löschbefehlen anhält: der Löschlauf samt pg_cron-Eintrag (Jo spielt ihn über den SQL-Editor ein, Anleitung im Bericht).

Geheimnisse: Die Edge Functions brauchen neben den von Supabase gesetzten Schlüsseln die Umgebungsvariable `LEMURI_KIND_GEHEIMNIS` (Zufallswert, mindestens 32 Zeichen). Jo hinterlegt sie im Supabase-Dashboard unter Edge Functions → Secrets; sie steht nie im Repository und nie im Chat.

Einstellungen im Supabase-Dashboard (Authentication), die nicht in Migrationen liegen:
- „Confirm email“ eingeschaltet: Eltern bestätigen ihre E-Mail per Link vor der ersten Anmeldung.
- Mindestlänge des Passworts: 8 Zeichen (die App prüft das ebenfalls).
- Zugang zum Dashboard nur für Jo, mit Zwei-Faktor-Anmeldung.
