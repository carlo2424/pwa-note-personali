import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RecoveryScreen } from './RecoveryScreen'

interface Props {
  children: ReactNode
  fallback?: ReactNode | ((error: Error) => ReactNode)
}

interface State {
  error: Error | null
}

/**
 * Cattura errori nei componenti figli e mostra un messaggio invece
 * di far crashare tutta l'app.
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
      const { fallback } = this.props
      if (typeof fallback === 'function') {
        return fallback(this.state.error)
      }
      return (
        fallback ?? (
          <RecoveryScreen
            title="Errore nel componente"
            detail={this.state.error.message}
          />
        )
      )
    }
    return this.props.children
  }
}
