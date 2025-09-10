
import React, { useState } from "react";
import { api } from "../api";

export default function Login({ onLoggedIn }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const doLogin = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.login(pin);
      onLoggedIn();
    } catch (e) {
      setErr(e.error || "Greška pri prijavi");
    }
  };

  return (
    <div className="win7-window login-window">
      <div className="titlebar">Drive — Prijava</div>
      <div className="content">
        <form onSubmit={doLogin}>
          <label>PIN</label>
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Unesi PIN" autoFocus />
          <button type="submit">Prijavi se</button>
          {err && <div className="error">{err}</div>}
        </form>
      </div>
    </div>
  );
}
