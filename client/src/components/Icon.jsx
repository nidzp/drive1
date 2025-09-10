
import React from "react";

const extToIcon = (ext, isDir) => {
  if (isDir) return "📁";
  if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📕";
  if (["doc","docx"].includes(ext)) return "📄";
  if (["xls","xlsx","csv"].includes(ext)) return "📊";
  if (["ppt","pptx"].includes(ext)) return "📈";
  return "📦";
};

export default function Icon({ ext, isDir }) {
  return <span className="icon">{extToIcon(ext, isDir)}</span>;
}
