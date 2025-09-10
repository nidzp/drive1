
const json = (method, url, body) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" })
    .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(e)); return r.json(); });

const get = (url) =>
  fetch(url, { credentials: "include" })
    .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(e)); return r.json(); });

export const api = {
  login: (pin) => json("POST", "/api/login", { pin }),
  logout: () => json("POST", "/api/logout"),
  me: () => get("/api/me"),
  list: (path="") => get(`/api/list?path=${encodeURIComponent(path)}`),
  mkdir: (path, name) => json("POST", "/api/mkdir", { path, name }),
  upload: async (path, files) => {
    const form = new FormData();
    form.append("path", path || "");
    for (const f of files) form.append("files", f);
    const r = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
    if (!r.ok) throw await r.json();
    return r.json();
  },
  rename: (rel, newName) => json("POST", "/api/rename", { path: rel, newName }),
  del: (paths) => json("POST", "/api/delete", { paths }),
  move: (paths, destination) => json("POST", "/api/move", { paths, destination }),
  download: (rel) => window.location.href = `/api/download?path=${encodeURIComponent(rel)}`,
  downloadZip: (paths) => fetch("/api/download-zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
    credentials: "include"
  }).then(async r => {
    if (!r.ok) throw await r.json();
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "download.zip";
    a.click();
    URL.revokeObjectURL(url);
  }),
  text: (rel, page=1, pageSize=300) =>
    fetch(`/api/text?path=${encodeURIComponent(rel)}&page=${page}&pageSize=${pageSize}`, { credentials: "include" })
      .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(e)); return r.json(); })
};
