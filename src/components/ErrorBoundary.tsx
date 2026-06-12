import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Captura erros de render para evitar tela branca; oferece recarregar. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Erro de render capturado:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <main className="screen" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <h2 className="section-title">Algo quebrou aqui.</h2>
            <p className="prose">{this.state.error.message}</p>
            <button
              className="btn btn--primary btn--block btn--lg"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}
