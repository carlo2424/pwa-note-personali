import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Cattura errori nei componenti figli e mostra un messaggio invece
 * di far crashare tutta l'app. Da usare attorno a form/modal complessi.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  override render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            <p className="font-semibold">Errore nel componente</p>
            <p className="mt-1 font-mono text-xs">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-3 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium"
            >
              Riprova
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
