import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChecklistPage } from './pages/ChecklistPage';
import { HomePage } from './pages/HomePage';
import { RecipePage } from './pages/RecipePage';
import { SavedPage } from './pages/SavedPage';
import { SettingsPage } from './pages/SettingsPage';
import { SousChefPage } from './pages/SousChefPage';
import { releaseWakeLock, requestWakeLock } from './lib/wakelock';
import { useApp, VALID_ROUTES, type Route } from './store/useAppStore';
import { useTimerEngine } from './store/useTimers';

/** Tela acesa no modo sous-chef e durante gerações de IA. */
function useWakeLock(): void {
  const active = useApp((s) => s.route === 'souschef' || s.busy != null);
  useEffect(() => {
    if (active) requestWakeLock();
    else releaseWakeLock();
    return releaseWakeLock;
  }, [active]);
}

/** Botão voltar (navegador/Android) navega entre as telas em vez de fechar o app. */
function useHistoryRouting(): void {
  useEffect(() => {
    const stateRoute = (st: unknown): Route | null => {
      const r = (st as { lrRoute?: string } | null)?.lrRoute as Route | undefined;
      return r && VALID_ROUTES.includes(r) ? r : null;
    };

    if (!stateRoute(history.state)) {
      history.replaceState({ lrRoute: useApp.getState().route }, '');
    }

    let applyingPop = false;
    const onPop = (ev: PopStateEvent) => {
      applyingPop = true;
      useApp.getState().go(stateRoute(ev.state) ?? 'home');
      applyingPop = false;
    };
    window.addEventListener('popstate', onPop);

    const unsub = useApp.subscribe((s, prev) => {
      if (s.route !== prev.route && !applyingPop) {
        history.pushState({ lrRoute: s.route }, '');
      }
    });
    return () => {
      window.removeEventListener('popstate', onPop);
      unsub();
    };
  }, []);
}

function CurrentPage() {
  const route = useApp((s) => s.route);
  switch (route) {
    case 'checklist':
      return <ChecklistPage />;
    case 'recipe':
      return <RecipePage />;
    case 'souschef':
      return <SousChefPage />;
    case 'saved':
      return <SavedPage />;
    case 'settings':
      return <SettingsPage />;
    case 'home':
    default:
      return <HomePage />;
  }
}

export default function App() {
  useTimerEngine(); // motor único de cronômetros, vive acima das páginas
  useHistoryRouting(); // voltar do Android/navegador troca de tela, não fecha o app
  useWakeLock(); // tela acesa cozinhando/gerando
  return (
    <ErrorBoundary>
      <CurrentPage />
    </ErrorBoundary>
  );
}
