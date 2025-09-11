
import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function TextPreview({ rel, name }) {
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, totalLines: 0, chunk: "" });
  const pageSize = 300;

  const load = async (p=page) => {
    const r = await api.text(rel, p, pageSize);
    setMeta(r);
    setPage(r.page);
  };

  useEffect(() => { setPage(1); load(1); /* eslint-disable-next-line */ }, [rel]);

  return (
    <div className="preview text-preview">
      <h3>{name}</h3>
      <div className="textpane" style={{whiteSpace:"pre-wrap", fontFamily:"Consolas, monospace", border:"1px solid #ddd", padding:8, maxHeight:"60vh", overflow:"auto"}}>
        {meta.chunk}
      </div>
      <div className="pager" style={{marginTop:8, display:"flex", gap:8, alignItems:"center"}}>
        <button onClick={()=>load(1)} disabled={page<=1}>⏮</button>
        <button onClick={()=>load(page-1)} disabled={page<=1}>◀</button>
        <span>Strana {page} / {meta.totalPages}</span>
        <button onClick={()=>load(page+1)} disabled={page>=meta.totalPages}>▶</button>
        <button onClick={()=>load(meta.totalPages)} disabled={page>=meta.totalPages}>⏭</button>
        <span style={{marginLeft:"auto"}}>Linije: {meta.totalLines}</span>
      </div>
    </div>
  );
}
