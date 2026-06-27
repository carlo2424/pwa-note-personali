# Guida: pubblicare l'app su GitHub e usarla sul telefono

Segui i passi **in ordine**. Non serve essere programmatori.

---

## Parte A — Creare il repository su GitHub (sul sito web)

1. Vai su [https://github.com](https://github.com) e accedi al tuo account.
2. Clicca il pulsante verde **"+"** in alto a destra → **"New repository"**.
3. Compila così:
   - **Repository name:** `pwa-note-personali` *(usa esattamente questo nome)*
   - **Description:** opzionale, es. "Note personali offline"
   - Scegli **Public** (gratis per GitHub Pages)
   - **NON** spuntare "Add a README" (il progetto esiste già sul PC)
4. Clicca **"Create repository"**.
5. Resta sulla pagina: ti mostrerà dei comandi — **ignorali per ora**, useremo Cursor/terminale dopo.

---

## Parte B — Caricare il progetto dal PC (prima volta)

Apri **PowerShell** o il terminale in Cursor (`Terminal` → `New Terminal`) e incolla **un comando alla volta**:

```powershell
cd "C:\Users\logic2020\Desktop\pwa note personali"
```

```powershell
git init
```

```powershell
git add .
```

```powershell
git commit -m "Prima versione: app note personali PWA"
```

```powershell
git branch -M main
```

Sostituisci `TUO-USERNAME` con il tuo nome utente GitHub (quello che vedi nell'URL del profilo):

```powershell
git remote add origin https://github.com/TUO-USERNAME/pwa-note-personali.git
```

```powershell
git push -u origin main
```

> Se chiede login: usa le credenziali GitHub. Se non funziona la password, crea un **Personal Access Token** su GitHub → Settings → Developer settings → Tokens.

---

## Parte C — Attivare GitHub Pages

1. Sul repo GitHub, vai in **Settings** (scheda in alto).
2. Menu a sinistra: **Pages**.
3. In **Build and deployment** → **Source** scegli **"GitHub Actions"** (non "Deploy from a branch").
4. Torna alla scheda **Code** del repo.
5. Clicca **Actions** in alto.
6. Se vedi il workflow **"Deploy GitHub Pages"** già partito (per il push), attendi che finisca con ✅ verde.
   - Se non è partito: **Actions** → **Deploy GitHub Pages** → **Run workflow**.

Dopo 1–3 minuti l'app sarà online a:

**`https://TUO-USERNAME.github.io/pwa-note-personali/`**

(Sostituisci `TUO-USERNAME` con il tuo.)

---

## Parte D — Installare sul telefono

### Android (Chrome)
1. Apri Chrome e vai all'URL sopra.
2. Menu ⋮ → **"Installa app"** o **"Aggiungi a schermata Home"**.
3. Conferma.

### iPhone (Safari)
1. Apri **Safari** (importante: non Chrome).
2. Vai all'URL sopra.
3. Tasto **Condividi** (quadrato con freccia).
4. **"Aggiungi a Home"** → Conferma.

---

## Aggiornamenti futuri

Ogni volta che modifichi l'app sul PC:

```powershell
cd "C:\Users\logic2020\Desktop\pwa note personali"
git add .
git commit -m "Descrizione della modifica"
git push
```

GitHub ricostruisce e pubblica da solo in pochi minuti. Sul telefono, alla prossima apertura, l'app chiederà se aggiornare.

---

## Problemi comuni

| Problema | Soluzione |
|----------|-----------|
| Pagina bianca | Controlla che il repo si chiami **esattamente** `pwa-note-personali` |
| Push rifiutato | Verifica login GitHub / token |
| Workflow rosso in Actions | Clicca sul workflow fallito e leggi l'errore; spesso manca `npm ci` per lockfile |
| iPhone non installa | Usa **Safari**, non Chrome |

---

## Nota sui dati

I tuoi dati (note, spese, impegni) restano **solo sul telefono** in cui installi l'app. Non passano da GitHub né da un server.
