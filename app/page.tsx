import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

const INDICES = [
  { code: 'PCI', label: 'Policy Coherence', sample: 67 },
  { code: 'IRI', label: 'Institutional Resilience', sample: 52 },
  { code: 'GCI', label: 'Governance Clarity', sample: 28 },
  { code: 'SLI', label: 'Structural Lag', sample: 50, inverse: true },
];

const PILLARS = [
  {
    name: 'Policy',
    description:
      'Whether the rules an organization writes down actually match the decisions it makes day to day.',
  },
  {
    name: 'Institutions',
    description:
      'Whether the structures meant to carry out those rules — teams, roles, systems — are built to hold the weight.',
  },
  {
    name: 'Governance',
    description:
      'Whether anyone can see clearly who decided what, and whether that decision will hold under pressure.',
  },
];

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'per month',
    blurb: 'Run a first diagnostic and see where your organization stands.',
    cta: 'Get started',
    features: ['1 organization', '1 completed assessment', 'Cluster-level scoring (v1)', 'Dashboard access'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 'Coming soon',
    cadence: '',
    blurb: 'For teams running regular diagnostics and tracking drift over time.',
    cta: 'Get started',
    features: ['Unlimited assessments', 'Monitoring & drift tracking', 'AI Coach', 'Document generator'],
    highlighted: true,
  },
  {
    name: 'Business',
    price: 'Coming soon',
    cadence: '',
    blurb: 'For organizations coordinating diagnostics across departments.',
    cta: 'Get started',
    features: ['Team workspace', 'Role-based access', 'Scenario planning', 'Priority support'],
    highlighted: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: 'platform fee',
    blurb: 'For institutions running PIG³ across many entities at once.',
    cta: 'Book a demo',
    features: ['Volume pricing', 'Dedicated support', 'Custom protocols', 'Onboarding services'],
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">
            PIG<span className="text-signal-teal">³</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-ink-muted hover:text-ink transition-colors">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors text-sm font-medium"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-wide uppercase text-signal-teal mb-4">
            Organizational diagnostic instrument
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Find what's breaking before it breaks everything.
          </h1>
          <p className="mt-5 text-lg text-ink-muted leading-relaxed">
            PIG³ reads an organization the way an instrument panel reads an engine — across
            Policy, Institutions, and Governance — and tells you exactly where the structure
            is under strain.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/sign-up"
              className="px-6 py-3 bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors text-sm font-medium"
            >
              Run your first diagnostic
            </Link>
            <Link href="/sign-in" className="px-6 py-3 border border-border-light rounded-lg hover:bg-surface text-sm font-medium text-ink-muted transition-colors">
              Sign in
            </Link>
          </div>
        </div>

        {/* Signature element: instrument strip */}
        <div className="mt-16 card p-6 max-w-3xl">
          <p className="text-xs font-medium text-ink-faint uppercase tracking-wide mb-4">
            Sample readout
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {INDICES.map((idx) => {
              const pct = idx.inverse ? 100 - idx.sample : idx.sample;
              const healthy = pct >= 65;
              const moderate = pct >= 45 && pct < 65;
              const color = healthy ? 'bg-signal-sage' : moderate ? 'bg-signal-amber' : 'bg-signal-rose';
              const textColor = healthy ? 'text-signal-sage' : moderate ? 'text-signal-amber' : 'text-signal-rose';
              return (
                <div key={idx.code}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs font-medium text-ink-muted">{idx.code}</span>
                    <span className={`text-lg font-semibold font-mono ${textColor}`}>{idx.sample}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-ink-faint mt-1.5">{idx.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Framework overview */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
        <h2 className="text-2xl font-semibold tracking-tight max-w-xl">
          Three pillars. One structural picture.
        </h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <div key={p.name} className="card p-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-signal-teal mb-3">{p.name}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
        <div className="max-w-xl mb-12">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p className="mt-3 text-sm text-ink-muted">
            Placeholder pricing — figures shown below are not final.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-6 flex flex-col ${
                tier.highlighted
                  ? 'bg-surface-raised border border-signal-teal/40'
                  : 'bg-surface border border-border'
              }`}
            >
              <h3 className="text-base font-semibold text-ink">{tier.name}</h3>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed min-h-[40px]">{tier.blurb}</p>

              <div className="mt-5 flex items-baseline gap-2">
                <span className={`font-semibold font-mono text-ink ${tier.price === 'Coming soon' || tier.price === 'Custom' ? 'text-lg' : 'text-3xl'}`}>
                  {tier.price}
                </span>
                {tier.cadence && <span className="text-xs text-ink-faint">{tier.cadence}</span>}
              </div>

              <Link
                href="/sign-up"
                className={`mt-5 px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                  tier.highlighted
                    ? 'bg-signal-teal text-canvas hover:bg-signal-teal/90'
                    : 'border border-border-light text-ink hover:bg-surface-raised'
                }`}
              >
                {tier.cta}
              </Link>

              <ul className="mt-6 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                    <CheckCircle2 className="w-4 h-4 text-signal-teal/70 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-sm font-medium text-ink-muted">
            PIG<span className="text-signal-teal">³</span>
          </span>
          <div className="flex items-center gap-6 text-xs text-ink-faint">
            <Link href="/sign-in" className="hover:text-ink-muted transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-ink-muted transition-colors">Get started</Link>
            <span>Polingov Institute</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
