Drive v1 — Patch: Textual file preview (read-only, paginated)

Files in this patch (replace into your project root):
- server/server.js
- client/src/api.js
- client/src/components/TextPreview.jsx (new)
- client/src/App.jsx

Apply:
1) Unzip into your project root (C:\Users\Home\Desktop\drive), allow overwrite.
2) Rebuild client:
   cd client && npm run build
3) Restart server:
   cd ../server && npm run start

Usage:
- Open a text file (txt, md, csv, json, log, xml, yml, yaml, js, ts, py, java, c, cpp, cs, html, css)
- Preview shows as read-only with paging controls.
