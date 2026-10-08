# Axelrehab

En webbapp (PWA) som guidar dig genom en daglig rehab för nacke, axel och nervirritation – med röstguide, timer, symtomuppföljning och motivation. Byggd för iPhone och fungerar offline när den är installerad.

## Funktioner

- **Dagens pass** (~14 min, 11 övningar): axelrullningar, hakindragning, skulderbladskläm, bröstryggsextension, väggänglar, bröststretch, trapezius-, levator- och scalenusstretch, nervglidning (median-slider) och lugn andning.
- **Mikropaus** (~3 min) för skrivbordet.
- **Guidad spelare** med animerade illustrationer, timerring, svensk röstguide och ljudsignaler. Skärmen hålls tänd under passet.
- **Daglig incheckning** av domning i pekfingret och smärta i nacke–axel (0–10) med anteckningar.
- **Framsteg**: svit, veckomål, träningskalender, symtomdiagram med trend och utmärkelser.
- **Anpassning**: nivå Skonsam/Normal, stäng av övningar, varning om passen upplevs försämra.
- **Påminnelse** via återkommande kalenderhändelse.
- **Säkerhetskopia**: exportera/importera data som JSON.

All data sparas bara lokalt på telefonen (localStorage). Inget skickas någonstans.

## Installera på iPhone

1. Öppna appens adress (GitHub Pages) i **Safari**.
2. Tryck på **Dela** → **Lägg till på hemskärmen**.
3. Starta Axelrehab från hemskärmen.

## Publicera med GitHub Pages

Repot är en statisk sida utan byggsteg. Under **Settings → Pages**, välj *Deploy from a branch*, branch `main` och mapp `/ (root)`.

Vid ändringar i appens filer: höj `VERSION` i `sw.js` så att telefonen hämtar den nya versionen.

## Köra lokalt

```sh
python -m http.server 8000
```

Öppna sedan http://localhost:8000.

---

Appen är ett träningsstöd och ersätter inte bedömning av läkare eller fysioterapeut.
