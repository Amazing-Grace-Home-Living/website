import React, { memo } from 'react';
import GamesList from './games/GamesList';

type StatChipProps = {
  label: string;
  value: number;
};

const StatChip = memo(function StatChip({ label, value }: StatChipProps) {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        background: '#111827',
        border: '1px solid #1f2937',
      }}
      aria-label={`${label}: ${value}`}
    >
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f9fafb' }}>{value}</div>
    </div>
  );
});

function ArcadeApp() {
  const statEntries: Array<{ label: string; value: number }> = [
    { label: 'Karma', value: 0 },
    { label: 'Wisdom', value: 0 },
    { label: 'Integrity', value: 0 },
    { label: 'Community', value: 0 },
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#030712', color: '#f9fafb', padding: '2rem' }}>
      <section style={{ maxWidth: '1024px', margin: '0 auto' }} aria-labelledby="nexus-arcade-title">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 id="nexus-arcade-title" style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
              NEXUS ARCADE
            </h1>
            <p style={{ color: '#9ca3af', margin: '0.25rem 0 0' }}>Family Synergy System</p>
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
          aria-label="Family synergy metrics"
        >
          {statEntries.map((entry) => (
            <StatChip key={entry.label} label={entry.label} value={entry.value} />
          ))}
        </section>

        {/* Game selection */}
        <section style={{ marginBottom: '2rem' }}>
          <GamesList />
        </section>

        <nav aria-label="Arcade navigation">
          <a href="/" style={{ color: '#60a5fa', textDecoration: 'none' }} aria-label="Back to Sanctuary home">
            Back to Sanctuary
          </a>
        </nav>
      </section>
    </main>
  );
}

export default ArcadeApp;
