/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
/* eslint-disable unused-imports/no-unused-vars */
import React from 'react'
import { Navigate } from 'react-router-dom'

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { hasError: boolean; redirect: boolean }> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false, redirect: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if error and errorInfo are defined before using them
    if (error) {
      console.error('Error caught by ErrorBoundary:', error, errorInfo ?? 'No additional error info')
    } else {
      console.error('Error caught by ErrorBoundary, but error object is undefined')
    }
  }

  componentDidUpdate(prevProps: Readonly<React.PropsWithChildren<{}>>, prevState: Readonly<{ hasError: boolean; redirect: boolean }>) {
    if (this.state.hasError && !prevState?.hasError) {
      setTimeout(() => {
        this.setState({ redirect: true })
      }, 1000)
    }
  }

  render() {
    if (this.state.redirect) {
      return <Navigate to='/not-found' replace />
    }

    if (this.state.hasError) {
      return <div>Something went wrong. Redirecting to error page...</div>
    }

    return this.props.children
  }
}

export default ErrorBoundary
