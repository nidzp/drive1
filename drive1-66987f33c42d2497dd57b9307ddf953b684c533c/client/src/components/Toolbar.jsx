
import React, { useRef } from "react";

export default function Toolbar({ onUpload, onMkdir, onDelete, onRename, onRefresh, onDownload, onZip }) {
  const fileRef = useRef(null);
  return (
    <div className="toolbar win7-toolbar">
      <button onClick={() => fileRef.current?.click()}>Upload</button>
      <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => { onUpload(Array.from(e.target.files || [])); e.target.value=null; }} />
      <button onClick={onMkdir}>Novi Folder</button>
      <button onClick={onRename}>Preimenuj</button>
      <button onClick={onDelete}>Obriši</button>
      <button onClick={onDownload}>Preuzmi</button>
      <button onClick={onZip}>ZIP</button>
      <button onClick={onRefresh}>Osveži</button>
    </div>
  );
}
