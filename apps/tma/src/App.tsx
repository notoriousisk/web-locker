import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  finishSession,
  getActiveSessions,
  getHistorySessions,
  getUser,
  startSession,
  upsertUser
} from './api';
import { getInitialUser, initializeTelegramApp } from './telegram';
import { LockerSize, StorageSession, User } from './types';

type Tab = 'home' | 'active' | 'history';

const lockerSizes: LockerSize[] = ['S', 'M', 'L', 'XL'];

export function App() {
  const initialUser = useMemo(() => getInitialUser(), []);
  const [telegramId, setTelegramId] = useState(initialUser.telegramId);
  const [profile, setProfile] = useState<User | null>(null);
  const [activeSessions, setActiveSessions] = useState<StorageSession[]>([]);
  const [historySessions, setHistorySessions] = useState<StorageSession[]>([]);
  const [selectedSize, setSelectedSize] = useState<LockerSize>('M');
  const [lastAssignedSession, setLastAssignedSession] =
    useState<StorageSession | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [finishingSessionId, setFinishingSessionId] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    initializeTelegramApp();
  }, []);

  useEffect(() => {
    void loadUserData();
  }, []);

  async function loadUserData(nextTelegramId = telegramId) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const upsertedUser = await upsertUser({
        ...initialUser,
        telegramId: nextTelegramId
      });
      const [freshUser, active, history] = await Promise.all([
        getUser(upsertedUser.telegramId),
        getActiveSessions(upsertedUser.telegramId),
        getHistorySessions(upsertedUser.telegramId)
      ]);

      setProfile(freshUser);
      setActiveSessions(active);
      setHistorySessions(history);
      setTelegramId(freshUser.telegramId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLoadProfile() {
    await loadUserData(telegramId);
  }

  async function handleStartSession() {
    setIsStarting(true);
    setErrorMessage(null);

    try {
      const session = await startSession(telegramId, selectedSize);
      setLastAssignedSession(session);
      await loadUserData(telegramId);
      setActiveTab('active');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }

  async function handleFinishSession(sessionId: string) {
    setFinishingSessionId(sessionId);
    setErrorMessage(null);

    try {
      await finishSession(sessionId, telegramId);
      if (lastAssignedSession?.id === sessionId) {
        setLastAssignedSession(null);
      }
      await loadUserData(telegramId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setFinishingSessionId(null);
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Locker MVP</p>
          <h1>Storage</h1>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => void loadUserData()}
          disabled={isLoading}
          title="Refresh"
          aria-label="Refresh"
        >
          ↻
        </button>
      </section>

      <section className="profile-panel">
        <label htmlFor="telegramId">Telegram ID</label>
        <div className="identity-row">
          <input
            id="telegramId"
            value={telegramId}
            onChange={(event) => setTelegramId(event.target.value)}
            inputMode="numeric"
          />
          <button type="button" onClick={() => void handleLoadProfile()}>
            Load
          </button>
        </div>
        <div className="profile-grid">
          <Metric label="User" value={formatUserName(profile)} />
          <Metric label="Balance" value={formatBalance(profile?.balance)} />
        </div>
      </section>

      {errorMessage ? <div className="alert">{errorMessage}</div> : null}

      {lastAssignedSession ? (
        <section className="assigned-banner">
          <span>Assigned locker</span>
          <strong>{lastAssignedSession.locker.code}</strong>
          <small>
            Requested {lastAssignedSession.requestedSize}, assigned{' '}
            {lastAssignedSession.locker.size}
          </small>
        </section>
      ) : null}

      <nav className="tabs" aria-label="Storage sections">
        <TabButton
          label="Start"
          isActive={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
        />
        <TabButton
          label={`Active ${activeSessions.length}`}
          isActive={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
        />
        <TabButton
          label={`History ${historySessions.length}`}
          isActive={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        />
      </nav>

      {activeTab === 'home' ? (
        <section className="panel">
          <div className="section-heading">
            <h2>Start Storage</h2>
          </div>
          <div className="size-grid" role="radiogroup" aria-label="Luggage size">
            {lockerSizes.map((size) => (
              <button
                key={size}
                type="button"
                className={selectedSize === size ? 'size active' : 'size'}
                onClick={() => setSelectedSize(size)}
                role="radio"
                aria-checked={selectedSize === size}
              >
                {size}
              </button>
            ))}
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() => void handleStartSession()}
            disabled={isStarting || isLoading}
          >
            {isStarting ? 'Assigning...' : 'Start Storage'}
          </button>
        </section>
      ) : null}

      {activeTab === 'active' ? (
        <SessionList
          title="Active Sessions"
          sessions={activeSessions}
          emptyText="No active storage sessions."
          renderAction={(session) => (
            <button
              className="danger-action"
              type="button"
              onClick={() => void handleFinishSession(session.id)}
              disabled={finishingSessionId === session.id}
            >
              {finishingSessionId === session.id ? 'Finishing...' : 'Finish'}
            </button>
          )}
        />
      ) : null}

      {activeTab === 'history' ? (
        <SessionList
          title="History"
          sessions={historySessions}
          emptyText="Completed sessions will appear here."
        />
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={isActive ? 'tab active' : 'tab'}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SessionList({
  title,
  sessions,
  emptyText,
  renderAction
}: {
  title: string;
  sessions: StorageSession[];
  emptyText: string;
  renderAction?: (session: StorageSession) => ReactNode;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {sessions.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <div className="session-list">
          {sessions.map((session) => (
            <article className="session-card" key={session.id}>
              <div>
                <span className="locker-code">{session.locker.code}</span>
                <p>
                  Requested {session.requestedSize}, locker{' '}
                  {session.locker.size}
                </p>
              </div>
              <div className="session-meta">
                <time>{formatDate(session.startedAt)}</time>
                {session.endedAt ? <time>{formatDate(session.endedAt)}</time> : null}
              </div>
              {renderAction ? renderAction(session) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatUserName(user: User | null) {
  if (!user) {
    return 'Not loaded';
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName || user.username || user.telegramId;
}

function formatBalance(balance: User['balance'] | undefined) {
  if (balance === undefined) {
    return '0.00';
  }

  return Number(balance).toFixed(2);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}
