# Anleitung für Jo: Supabase-Projekt „lemuri“ einrichten

Stand: 05.10.2026, Auftrag LB-002. Alles hier passiert im Browser unter https://supabase.com/dashboard. Werte, die dabei entstehen (Datenbank-Passwort, Geheimnisse, Schlüssel), bleiben bei Jo. Sie kommen nie in den Chat und nie ins Repository.

## 1. Projekt anlegen (nur nötig, falls Lemuri App es nicht anlegen konnte)

1. Oben links die Organisation **aequareholding-stack's Org** wählen.
2. Grünen Knopf **New project** drücken.
3. Felder ausfüllen:
   - **Name:** `lemuri`
   - **Database Password:** Knopf **Generate a password** drücken und den Wert im Passwort-Manager ablegen. Er wird später nur gebraucht, wenn man sich direkt mit der Datenbank verbindet.
   - **Region:** **Central EU (Frankfurt)**, das ist `eu-central-1`.
   - **Compute Size:** **Micro** stehen lassen (etwa zehn US-Dollar im Monat, rund 9 Euro im Monat).
4. Knopf **Create new project** drücken.
5. Erfolg: Die Projektseite öffnet sich, oben steht „Setting up project“. Nach ein bis drei Minuten wechselt die Anzeige auf einen grünen Punkt mit **Active**. Danach Lemuri App Bescheid geben, dann werden Migrationen, Startdaten und Edge Functions eingespielt.

## 2. Geheimnis für die Kind-Anmeldung hinterlegen

Die Edge Functions leiten daraus die Server-Passwörter der Kind-Benutzer ab. Ohne dieses Geheimnis kann sich kein Kind anmelden.

1. Im Projekt **lemuri** links in der Leiste **Edge Functions** anklicken.
2. Oben den Reiter **Secrets** wählen.
3. Knopf **Add new secret** (oder **Add another**) drücken.
4. Im Feld **Key** genau diesen Namen eintragen, Groß- und Kleinschreibung beachten:
   `LEMURI_KIND_GEHEIMNIS`
5. Im Feld **Value** einen langen Zufallswert eintragen, mindestens 32 Zeichen. Den Wert erzeugt der Passwort-Manager (Funktion „Passwort generieren“, Länge 48, Buchstaben und Ziffern) oder im Terminal auf dem Mac der Befehl `openssl rand -base64 48`. Den Wert zusätzlich im Passwort-Manager ablegen.
6. Knopf **Save** drücken.
7. Erfolg: In der Liste der Secrets erscheint die Zeile `LEMURI_KIND_GEHEIMNIS` mit einem Datum in der Spalte „Updated at“. Der Wert selbst wird nicht mehr angezeigt, das ist richtig so.
8. Falls die Edge Functions schon ausgerollt waren, bevor das Geheimnis gesetzt wurde: Sie nehmen den neuen Wert beim nächsten Aufruf automatisch. Nichts weiter zu tun.

## 3. Anmeldung einstellen (Authentication)

1. Links in der Leiste **Authentication** anklicken.
2. Unterpunkt **Sign In / Providers** wählen.
3. Im Abschnitt **Email** auf den Eintrag klicken, damit er sich aufklappt. Prüfen:
   - **Enable Email provider:** eingeschaltet.
   - **Confirm email:** eingeschaltet. So müssen Eltern den Bestätigungslink anklicken, bevor sie sich zum ersten Mal anmelden können.
   - **Secure email change:** eingeschaltet.
4. Knopf **Save** drücken.
5. Weiter unten auf derselben Seite (oder unter **Authentication → Policies / Attack Protection**, je nach Dashboard-Version) den Abschnitt **Password** suchen:
   - **Minimum password length:** `8`
   - **Password Requirements:** „Letters and digits“ darf, muss aber nicht eingeschaltet sein. Die App verlangt nur die Länge.
6. Knopf **Save** drücken.
7. Erfolg: Nach dem Speichern erscheint oben rechts kurz „Successfully updated settings“. Beim erneuten Öffnen stehen die Werte so da.

## 4. Zwei-Faktor-Anmeldung für Jos Dashboard-Zugang

1. Oben rechts auf das eigene Profilbild klicken, dann **Account preferences**.
2. Links **Security** wählen.
3. Bei **Multi-factor authentication** den Knopf **Add new app** drücken und den QR-Code mit einer Authenticator-App scannen, Code eintragen, bestätigen.
4. Erfolg: Unter Multi-factor authentication steht der Eintrag mit grünem Haken „Enabled“. Beim nächsten Anmelden fragt das Dashboard nach dem Code.

## 5. Was Lemuri App danach selbst erledigt

- Migrationen aus `supabase/migrations/` einspielen.
- Startdaten (Themenkatalog) aus `supabase/seed.sql` einspielen.
- Erweiterung `pg_cron` einschalten und den täglichen Löschlauf anlegen.
- Die drei Edge Functions `kind-anmelden`, `kind-profil-anlegen`, `kind-pin-setzen` ausrollen.
- Die Schutz-Tests im echten Projekt laufen lassen.

## 6. Was Jo für die App noch braucht (später)

Für `.env` der App: links **Project Settings → API Keys**. Dort stehen die **Project URL** und der **Publishable key** (beginnt mit `sb_publishable_`). Den **Secret key** nie in die App und nie weitergeben.
