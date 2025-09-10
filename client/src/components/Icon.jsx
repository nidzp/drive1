import React from "react";

const extToIcon = (ext, isDir) => {
  if (isDir) return "📁";
  if (!ext) return "📄";
  if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📕";
  if (["doc","docx"].includes(ext)) return "📃";
  if (["xls","xlsx","csv"].includes(ext)) return "📊";
  if (["ppt","pptx"].includes(ext)) return "📽️";
  if (["zip","rar","7z"].includes(ext)) return "🗜️";
  if (["txt","md","json","xml","yml","yaml","js","ts","py","java","c","cpp","cs","html","css"].includes(ext)) return "📄";
  return "📦";
};

export default function Icon({ ext, isDir }) {
  return <span className="icon" title={ext || (isDir ? "folder" : "file")}>{extToIcon(ext, isDir)}</span>;
}
