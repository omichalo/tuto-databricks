# Développement local

## Prérequis

- Node.js 22 (`.nvmrc`), npm.
- Firebase CLI (CI : `firebase-tools@15.34.0`).
- Java 21 pour l'Emulator Suite. Sans Java système, un JDK peut être décompressé dans `.tools/` (ignoré par Git) :
  ```bash
  export JAVA_HOME="$PWD/.tools/jdk-21.0.12.1+1/Contents/Home"; export PATH="$JAVA_HOME/bin:$PATH"
  ```
- Navigateur Playwright : `npx playwright install chromium` (ou `PLAYWRIGHT_BROWSERS_PATH=$PWD/.tools/ms-playwright`).

## Démarrer

```bash
npm ci
cp .env.example .env.local        # valeurs de démonstration uniquement
npm run emulators                 # terminal 1 : Auth 9099, Firestore 8080, UI 4000
npm run dev                       # terminal 2 : http://localhost:3000
```

Si le port 3000 est occupé : `APP_ORIGIN=http://localhost:3100 npx next dev -p 3100` (l'origine doit correspondre au port, sinon les écritures API sont refusées en 403).

## Contrôles

```bash
npm run check                     # format, lint, types, unitaires, TP, contenu, invariants, base de sécurité
npm run build && npm run security:bundle
npm run test:emulators:run        # règles et API sur émulateurs
npm run test:e2e                  # émulateurs démarrés ; lance `next start -p 3100`
GITHUB_TOKEN=$(gh auth token) npm run security:advisories
```

## Seuils de visibilité

`.env.local` : `CONTENT_MIN_STATUS=draft`, `LAB_MIN_STATUS=draft` (tout est visible). Pour vérifier le comportement de production :

```bash
CONTENT_MIN_STATUS=published LAB_MIN_STATUS=validated npm run build && CONTENT_MIN_STATUS=published npm run visibility:check
```
