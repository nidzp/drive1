Drive v1 — PATCH (200 GiB + UI polish)

Sadrži:
- server/.env.example  -> quota 200 GiB (214748364800)
- server/server.js     -> default quota 200 GiB
- client/src/components/Icon.jsx -> lepši ikoni (emoji)
- client/src/styles/win7.css     -> vizuelni polish + quota bar + sortable hint
- client/src/App.jsx             -> sortiranje kolona, quota bar, broj izabranih, sitni UX

Primena (Windows PowerShell):
1) Isključite server ako radi.
2) Otpakujte ZIP u koren projekta (C:\Users\Home\Desktop\drive) i dozvolite overwrite.
3) Build klijenta:
   cd client
   npm i
   npm run build
4) Start servera:
   cd ../server
   npm i
   npm run start

Napomena:
- Podrazumevana kvota je sada 200 GiB. Po želji možete eksplicitno staviti vrednost u server/.env.
