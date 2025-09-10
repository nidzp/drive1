import React, { useEffect, useState } from "react";
import { api } from "./api";
import Login from "./components/Login.jsx";
import Icon from "./components/Icon.jsx";
import Toolbar from "./components/Toolbar.jsx";
import Breadcrumbs from "./components/Breadcrumbs.jsx";
import TextPreview from "./components/TextPreview.jsx";

function fmtSize(n) {
  if (n == null) return "";
  const units = ["B","KB","MB","GB","TB"];
  let i=0, v=n;
  while (v >= 1024 && i < units.length-1) { v/=1024; i++; }
  return v.toFixed(1) + " " + units[i];
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [path, setPath] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [quota, setQuota] = useState({ usedBytes: 0, quotaBytes: 0 });
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [sort, setSort] = useState({ by: "name", dir: 1 }); // 1 asc, -1 desc

  const sortItems = (arr) => {
    const { by, dir } = sort;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const cmp = (a,b) => {
      // Directories first
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      let res = 0;
      if (by === "name") res = collator.compare(a.name, b.name);
      else if (by === "size") res = (a.size||0) - (b.size||0);
      else if (by === "mtime") res = a.mtime - b.mtime;
      else if (by === "ext") res = (a.ext||"").localeCompare(b.ext||"");
      return res * dir;
    };
    return [...arr].sort(cmp);
  };

  const refresh = async (p = path) => {
    setErr("");
    try {
      const me = await api.me();
      setQuota({ usedBytes: me.usedBytes, quotaBytes: me.quotaBytes });
      const data = await api.list(p);
      setPath(data.path || "");
      setItems(sortItems(data.items || []));
      setSelected(new Set());
      setPreview(null);
    } catch (e) {
      if (e.error === "Not authenticated" || e.error === "Invalid token") setAuthed(false);
      else setErr(e.error || "Greška");
    }
  };

  useEffect(() => {
    api.me().then(() => { setAuthed(true); refresh(""); }).catch(()=>{});
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // re-sort when sort changes
    setItems(prev => sortItems(prev));
    // eslint-disable-next-line
  }, [sort]);

  if (!authed) return <Login onLoggedIn={() => { setAuthed(true); refresh(""); }} />;

  const onNavigate = (rel) => refresh(rel);

  const onOpen = (it) => {
    if (it.isDir) onNavigate((path ? path + "/" : "") + it.name);
    else setPreview({ ...it, rel: (path ? path + "/" : "") + it.name });
  };

  const toggleSel = (idx) => {
    const s = new Set(selected);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setSelected(s);
  };

  const selItems = Array.from(selected).map(i => items[i]);

  const onUpload = async (files) => {
    if (!files || files.length === 0) return;
    try { await api.upload(path, files); refresh(); } 
    catch (e) { alert(e.error || "Greška pri uploadu"); }
  };

  const onMkdir = async () => {
    const name = prompt("Ime novog foldera:");
    if (!name) return;
    try { await api.mkdir(path, name); refresh(); } catch (e) { alert(e.error); }
  };

  const onDelete = async () => {
    const rels = selItems.map(it => (path ? path + "/" : "") + it.name);
    if (rels.length === 0) return;
    if (!confirm(`Obrisati ${rels.length} stavki?`)) return;
    try { await api.del(rels); refresh(); } catch (e) { alert(e.error); }
  };

  const onRename = async () => {
    if (selItems.length !== 1) return alert("Izaberi jednu stavku za preimenovanje.");
    const it = selItems[0];
    const newName = prompt("Novo ime:", it.name);
    if (!newName || newName === it.name) return;
    const rel = (path ? path + "/" : "") + it.name;
    try { await api.rename(rel, newName); refresh(); } catch (e) { alert(e.error); }
  };

  const onDownload = () => {
    if (selItems.length !== 1) return alert("Izaberi jednu stavku za preuzimanje.");
    const it = selItems[0];
    if (it.isDir) return alert("Za folder koristi ZIP.");
    const rel = (path ? path + "/" : "") + it.name;
    api.download(rel);
  };

  const onZip = async () => {
    const rels = selItems.map(it => (path ? path + "/" : "") + it.name);
    if (rels.length === 0) return alert("Izaberi bar jednu stavku.");
    try { await api.downloadZip(rels); } catch (e) { alert(e.error); }
  };

  const TEXT_EXTS = ["txt","md","csv","json","log","xml","yml","yaml","js","ts","py","java","c","cpp","cs","html","css"];

  const setSortBy = (by) => {
    setSort(s => ({ by, dir: s.by === by ? -s.dir : 1 }));
  };

  const usedPct = quota.quotaBytes ? Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100)) : 0;

  return (
    <div className="win7-desktop">
      <div className="win7-window">
        <div className="titlebar">Drive — Explorer</div>
        <div className="content">
          <Breadcrumbs path={path} onNavigate={onNavigate} />
          <Toolbar
            onUpload={onUpload}
            onMkdir={onMkdir}
            onDelete={onDelete}
            onRename={onRename}
            onRefresh={() => refresh()}
            onDownload={onDownload}
            onZip={onZip}
          />
          <div className="split">
            <div
              className="pane left"
              onDragOver={(e)=>e.preventDefault()}
              onDrop={(e)=>{ e.preventDefault(); onUpload(e.dataTransfer.files); }}
              >
              <table className="filetable">
                <thead>
                  <tr>
                    <th></th>
                    <th className="sortable" onClick={()=>setSortBy("name")}>Naziv <span className="dir">{sort.by==="name"?(sort.dir>0?"▲":"▼"):""}</span></th>
                    <th className="sortable" onClick={()=>setSortBy("size")}>Veličina <span className="dir">{sort.by==="size"?(sort.dir>0?"▲":"▼"):""}</span></th>
                    <th className="sortable" onClick={()=>setSortBy("mtime")}>Izmenjeno <span className="dir">{sort.by==="mtime"?(sort.dir>0?"▲":"▼"):""}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className={selected.has(i) ? "sel" : ""}
                        onClick={() => toggleSel(i)} onDoubleClick={() => onOpen(it)}>
                      <td className="iconcell"><Icon ext={it.ext} isDir={it.isDir} /></td>
                      <td>{it.name}</td>
                      <td>{it.isDir ? "" : fmtSize(it.size)}</td>
                      <td>{new Date(it.mtime).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {err && <div className="error">{err}</div>}
              <div style={{marginTop:8, color:"#666"}}>
                Izabrano: <b>{selected.size}</b>
              </div>
            </div>
            <div className="pane right">
              <div className="quota">
                Korišćeno: <b>{fmtSize(quota.usedBytes)}</b> / {fmtSize(quota.quotaBytes)} ({usedPct}%)
                <div className="quota-bar"><div className="quota-fill" style={{width: usedPct + "%"}}/></div>
              </div>
              {!preview && <div className="placeholder">Odaberi fajl za pregled</div>}
              {preview && (
                <div className="preview">
                  <h3>{preview.name}</h3>
                  {["jpg","jpeg","png","gif","bmp","webp"].includes(preview.ext) && (
                    <img src={`/api/download?path=${encodeURIComponent(preview.rel)}`} alt="" />
                  )}
                  {preview.ext === "pdf" && (
                    <embed src={`/api/download?path=${encodeURIComponent(preview.rel)}`} type="application/pdf" style={{width:"100%",height:"70vh"}} />
                  )}
                  {TEXT_EXTS.includes(preview.ext) && (
                    <TextPreview rel={preview.rel} name={preview.name} />
                  )}
                  {!["jpg","jpeg","png","gif","bmp","webp","pdf", ...TEXT_EXTS].includes(preview.ext) && (
                    <div>Pregled nije dostupan. Preuzmi fajl.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
