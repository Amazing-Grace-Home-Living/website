import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getRemoteConfig, fetchAndActivate, getValue, setValue } from "firebase/remote-config";

// Firebase config will be injected by the CLI at build time; keep empty for now.
initializeApp({});
const rc = getRemoteConfig();

export default function ApiKeyPanel() {
  const [geminiKey, setGeminiKey] = useState("");
  const [codexKey, setCodexKey] = useState("");
  const [status, setStatus] = useState("loading…");

  useEffect(() => {
    fetchAndActivate(rc).then(() => {
      setGeminiKey(getValue(rc, "GEMINI_API_KEY").asString() ?? "");
      setCodexKey(getValue(rc, "CODEX_API_KEY").asString() ?? "");
      setStatus("ready");
    });
  }, []);

  const save = async () => {
    await rc.setValue("GEMINI_API_KEY", { value: geminiKey });
    await rc.setValue("CODEX_API_KEY", { value: codexKey });
    await rc.publish();
    setStatus("saved");
  };

  return (
    <div style={{ padding: 12 }}>
      <h3>Nexus Assistant – API Keys</h3>
      <label>
        Gemini API Key:
        <input
          type="password"
          value={geminiKey}
          onChange={e => setGeminiKey(e.target.value)}
        />
      </label>
      <br />
      <label>
        Codex API Key:
        <input
          type="password"
          value={codexKey}
          onChange={e => setCodexKey(e.target.value)}
        />
      </label>
      <br />
      <button onClick={save} disabled={status === "loading…"}>
        Save to Remote Config
      </button>
      <p>{status}</p>
    </div>
  );
}