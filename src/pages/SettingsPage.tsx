import { useState } from 'react';
import { TopBar } from '../components/TopBar';
import { getAiMode, getApiKey, setAiMode, setApiKey, type AiMode } from '../lib/storage';
import { useApp } from '../store/useAppStore';

export function SettingsPage() {
  const go = useApp((s) => s.go);
  const [key, setKey] = useState(getApiKey());
  const [mode, setMode] = useState<AiMode>(getAiMode());
  const [reveal, setReveal] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  function save() {
    setApiKey(key);
    setAiMode(mode);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1800);
  }

  return (
    <div className="app-shell">
      <TopBar onBack={() => go('home')} title="Ajustes" />
      <main className="screen">
        <div className="sec">
          <div className="sec-title">Modo da IA</div>
          <div className="seg">
            <button
              className={`seg__btn ${mode === 'live' ? 'seg__btn--no-on' : ''}`}
              onClick={() => setMode('live')}
            >
              IA real
            </button>
            <button
              className={`seg__btn ${mode === 'mock' ? 'seg__btn--no-on' : ''}`}
              onClick={() => setMode('mock')}
            >
              Demonstração
            </button>
          </div>
          <p className="prose" style={{ fontSize: 13 }}>
            {mode === 'live'
              ? 'Usa a API da Anthropic com sua chave (custo por uso).'
              : 'Usa uma receita de exemplo, sem chave e sem custo — ótimo para testar a navegação.'}
          </p>
        </div>

        <div className="sec">
          <div className="sec-title">API key da Anthropic</div>
          <label className="field">
            <span className="field__hint">
              Fica salva só neste aparelho (localStorage). Pegue em console.anthropic.com.
            </span>
            <input
              className="input"
              type={reveal ? 'text' : 'password'}
              placeholder="sk-ant-…"
              value={key}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <button className="btn btn--quiet" onClick={() => setReveal((r) => !r)}>
            {reveal ? 'Ocultar' : 'Mostrar'} chave
          </button>
        </div>

        <div className="action-bar">
          <button className="btn btn--primary btn--block btn--lg" onClick={save}>
            {savedMsg ? '✓ Salvo' : 'Salvar ajustes'}
          </button>
        </div>
      </main>
    </div>
  );
}
