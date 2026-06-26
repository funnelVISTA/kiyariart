import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({
    meta: [
      { title: 'Unsubscribe — art by KIYARI' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: UnsubscribePage,
})

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; email: string }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function UnsubscribePage() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token')
    : null

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid' })
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) return setState({ kind: 'invalid' })
        if (j.alreadyUnsubscribed || j.used) return setState({ kind: 'already' })
        if (j.email) return setState({ kind: 'ready', email: j.email })
        setState({ kind: 'invalid' })
      })
      .catch(() => setState({ kind: 'invalid' }))
  }, [token])

  const confirm = async () => {
    if (!token) return
    setSubmitting(true)
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setState({ kind: 'error', message: j?.error || 'Could not unsubscribe.' })
      } else {
        setState({ kind: 'success' })
      }
    } catch (e) {
      setState({ kind: 'error', message: 'Network error.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-32 pb-24 container-page max-w-xl text-center">
      <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">art by KIYARI</div>
      <h1 className="font-display text-5xl">Unsubscribe</h1>

      {state.kind === 'loading' && <p className="mt-6 text-muted-foreground">Checking your link…</p>}

      {state.kind === 'invalid' && (
        <p className="mt-6 text-muted-foreground">
          This unsubscribe link is invalid or has expired.
        </p>
      )}

      {state.kind === 'already' && (
        <p className="mt-6 text-muted-foreground">
          You're already unsubscribed. You won't receive further emails from us.
        </p>
      )}

      {state.kind === 'ready' && (
        <>
          <p className="mt-6 text-muted-foreground">
            Confirm you'd like to stop receiving email at <span className="text-foreground">{state.email}</span>.
          </p>
          <button
            onClick={confirm}
            disabled={submitting}
            className="mt-8 inline-flex items-center gap-2 bg-gradient-gold px-8 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
          >
            {submitting ? 'Unsubscribing…' : 'Confirm unsubscribe'}
          </button>
        </>
      )}

      {state.kind === 'success' && (
        <p className="mt-6 text-muted-foreground">
          Done. You've been removed from our list.
        </p>
      )}

      {state.kind === 'error' && (
        <p className="mt-6 text-accent">{state.message}</p>
      )}
    </div>
  )
}
