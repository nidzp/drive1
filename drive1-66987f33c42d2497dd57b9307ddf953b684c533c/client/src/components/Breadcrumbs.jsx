
import React from "react";

export default function Breadcrumbs({ path, onNavigate }) {
  const parts = (path || "").split("/").filter(Boolean);
  const crumbs = [{ name: "Storage", rel: "" }];
  let acc = "";
  for (const p of parts) {
    acc = acc ? acc + "/" + p : p;
    crumbs.push({ name: p, rel: acc });
  }
  return (
    <div className="breadcrumbs">
      {crumbs.map((c, i) => (
        <span key={i}>
          <a onClick={() => onNavigate(c.rel)}>{c.name}</a>
          {i < crumbs.length - 1 && " > "}
        </span>
      ))}
    </div>
  );
}
