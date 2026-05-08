import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { getPublicLockers, getPublicStats } from './api';
import { Locker, LockerStatus, PublicStats } from './types';

const pollingIntervalMs = 5000;

export function App() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicData() {
      try {
        const [nextLockers, nextStats] = await Promise.all([
          getPublicLockers(),
          getPublicStats()
        ]);

        if (!isMounted) {
          return;
        }

        setLockers(nextLockers);
        setStats(nextStats);
        setLastUpdatedAt(new Date());
        setErrorMessage(null);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPublicData();
    const intervalId = window.setInterval(() => void loadPublicData(), pollingIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const sortedLockers = useMemo(
    () =>
      [...lockers].sort(
        (first, second) =>
          first.row - second.row ||
          first.column - second.column ||
          first.code.localeCompare(second.code)
      ),
    [lockers]
  );

  const gridColumns = useMemo(
    () => Math.max(1, ...sortedLockers.map((locker) => locker.column)),
    [sortedLockers]
  );

  return (
    <main className="display-shell">
      <header className="display-header">
        <div>
          <p className="eyebrow">Locker MVP</p>
          <h1>Locker Display</h1>
        </div>
        <div className="refresh-panel">
          <span>{isLoading ? 'Loading' : 'Live'}</span>
          <strong>{lastUpdatedAt ? formatTime(lastUpdatedAt) : '--:--'}</strong>
        </div>
      </header>

      {errorMessage ? <div className="alert">{errorMessage}</div> : null}

      <StatsBar stats={stats} />

      <section className="legend" aria-label="Locker status legend">
        <LegendItem status="AVAILABLE" label="Available" />
        <LegendItem status="OCCUPIED" label="Occupied" />
        <LegendItem status="MAINTENANCE" label="Maintenance" />
      </section>

      <section
        className="locker-grid"
        style={{ '--display-grid-columns': gridColumns } as CSSProperties}
        aria-label="Locker grid"
      >
        {sortedLockers.map((locker) => (
          <LockerTile key={locker.id} locker={locker} />
        ))}
      </section>

      {!isLoading && sortedLockers.length === 0 ? (
        <div className="empty-state">No lockers are available to display.</div>
      ) : null}
    </main>
  );
}

function StatsBar({ stats }: { stats: PublicStats | null }) {
  return (
    <section className="stats-grid" aria-label="Public locker stats">
      <Metric label="Total" value={stats?.lockers.total ?? 0} />
      <Metric label="Available" value={stats?.lockers.available ?? 0} />
      <Metric label="Occupied" value={stats?.lockers.occupied ?? 0} />
      <Metric label="Maintenance" value={stats?.lockers.maintenance ?? 0} />
      <Metric label="Active Sessions" value={stats?.sessions.active ?? 0} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LegendItem({ status, label }: { status: LockerStatus; label: string }) {
  return (
    <div className="legend-item">
      <span className={`legend-dot ${status.toLowerCase()}`} />
      {label}
    </div>
  );
}

function LockerTile({ locker }: { locker: Locker }) {
  return (
    <article className={`locker-tile ${locker.status.toLowerCase()}`}>
      <div className="locker-code">{locker.code}</div>
      <div className="locker-details">
        <span>{locker.size}</span>
        <strong>{formatStatus(locker.status)}</strong>
      </div>
    </article>
  );
}

function formatStatus(status: LockerStatus) {
  const labels: Record<LockerStatus, string> = {
    AVAILABLE: 'Available',
    OCCUPIED: 'Occupied',
    MAINTENANCE: 'Maintenance'
  };

  return labels[status];
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}
