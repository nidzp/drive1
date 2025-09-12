Drive Full Patch

Sadrži:
- server/server.js: /api/preview-pdf, UTF-8 nazivi, enkoding autodetekcija
- server/package.json: dodate zavisnosti (pdfkit, libreoffice-convert, iconv-lite, chardet)
- client/src/App.jsx: Windows 11 selekcija + tastatura, Preview dugme, context menu
- client/src/components/ContextMenu.jsx: desni klik meni
- client/index.html: charset utf-8

Primena:
1) Otpakuj u koren projekta i overwrite.
2) cd server && npm i
3) cd ../client && npm i && npm run build
4) cd ../server && npm run start
