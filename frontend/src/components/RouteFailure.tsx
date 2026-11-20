import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Heading, Notice } from './ui'

export class RouteFailure extends Component<{ route: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidUpdate(previous: Readonly<{ route: string }>) {
    if (this.state.failed && previous.route !== this.props.route) this.setState({ failed: false })
  }
  render() {
    if (!this.state.failed) return this.props.children
    return <main id="main" className="container subpage"><Heading eyebrow="VERIMARK" title="This page could not be displayed" detail="Try opening the page again or return to the homepage." /><Notice error>No new result or verification outcome is shown on this page.</Notice><div className="actions"><button className="btn" onClick={() => window.location.reload()}>Reload page</button><Link className="btn secondary" to="/">Return home</Link></div></main>
  }
}
