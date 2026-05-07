import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getDashboard,
  getLockers,
  getMe,
  getSessions,
  getUsers,
  login,
  updateLockerStatus
} from './api';
import {
  Dashboard,
  Locker,
  LockerStatus,
  SessionFilter,
  StorageSession,
  User
} from './types';

type View = 'dashboard' | 'lockers' | 'users' | 'sessions';

const tokenStorageKey = 'locker_mvp_admin_token';

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey));
  const [adminLogin, setAdminLogin] = useState<string | null>(null);
  const [loginValue, setLoginValue] = useState('admin');
  const [password, setPassword] = useState('change-me');
  const [view, setView] = useState<View>('dashboard');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<StorageSession[]>([]);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('active');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadInitialAdminData(token);
  }, [token]);

  async function loadInitialAdminData(nextToken: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [me, nextDashboard, nextLockers, nextUsers, nextSessions] =
        await Promise.all([
          getMe(nextToken),
          getDashboard(nextToken),
          getLockers(nextToken),
          getUsers(nextToken),
          getSessions(nextToken, sessionFilter)
        ]);

      setAdminLogin(me.login);
      setDashboard(nextDashboard);
      setLockers(nextLockers);
      setUsers(nextUsers);
      setSessions(nextSessions);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshCurrentView() {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (view === 'dashboard') {
        setDashboard(await getDashboard(token));
      }

      if (view === 'lockers') {
        setLockers(await getLockers(token));
      }

      if (view === 'users') {
        setUsers(await getUsers(token));
      }

      if (view === 'sessions') {
        setSessions(await getSessions(token, sessionFilter));
      }
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setErrorMessage(null);

    try {
      const response = await login(loginValue, password);
      localStorage.setItem(tokenStorageKey, response.accessToken);
      setToken(response.accessToken);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setAdminLogin(null);
    setDashboard(null);
    setLockers([]);
    setUsers([]);
    setSessions([]);
  }

  function handleAuthError(error: unknown) {
    const message = getErrorMessage(error);
    setErrorMessage(message);

    if (message.toLowerCase().includes('token')) {
      handleLogout();
    }
  }

  async function handleStatusChange(
    locker: Locker,
    status: Extract<LockerStatus, 'AVAILABLE' | 'MAINTENANCE'>
  ) {
    if (!token || locker.status === status) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await updateLockerStatus(token, locker.id, status);
      const [nextDashboard, nextLockers] = await Promise.all([
        getDashboard(token),
        getLockers(token)
      ]);
      setDashboard(nextDashboard);
      setLockers(nextLockers);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSessionFilterChange(filter: SessionFilter) {
    if (!token) {
      return;
    }

    setSessionFilter(filter);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setSessions(await getSessions(token, filter));
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  }

  const content = useMemo(() => {
    if (view === 'dashboard') {
      return <DashboardView dashboard={dashboard} />;
    }

    if (view === 'lockers') {
      return (
        <LockersView
          lockers={lockers}
          onStatusChange={(locker, status) =>
            void handleStatusChange(locker, status)
          }
        />
      );
    }

    if (view === 'users') {
      return <UsersView users={users} />;
    }

    return (
      <SessionsView
        sessions={sessions}
        filter={sessionFilter}
        onFilterChange={(filter) => void handleSessionFilterChange(filter)}
      />
    );
  }, [dashboard, lockers, sessionFilter, sessions, users, view]);

  if (!isAuthenticated) {
    return (
      <main className="login-shell">
        <form className="login-panel" onSubmit={(event) => void handleLogin(event)}>
          <p className="eyebrow">Locker MVP</p>
          <h1>Admin Login</h1>
          <label htmlFor="login">Login</label>
          <input
            id="login"
            value={loginValue}
            onChange={(event) => setLoginValue(event.target.value)}
            autoComplete="username"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            value={password}
            type="password"
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          {errorMessage ? <div className="alert">{errorMessage}</div> : null}
          <button type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Locker MVP</p>
          <h1>Admin</h1>
        </div>
        <nav>
          <NavButton label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavButton label="Lockers" active={view === 'lockers'} onClick={() => setView('lockers')} />
          <NavButton label="Users" active={view === 'users'} onClick={() => setView('users')} />
          <NavButton label="Sessions" active={view === 'sessions'} onClick={() => setView('sessions')} />
        </nav>
        <div className="sidebar-footer">
          <span>{adminLogin ?? 'admin'}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Management</p>
            <h2>{getViewTitle(view)}</h2>
          </div>
          <button type="button" onClick={() => void refreshCurrentView()} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>
        {errorMessage ? <div className="alert">{errorMessage}</div> : null}
        {content}
      </section>
    </main>
  );
}

function NavButton({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? 'nav-button active' : 'nav-button'}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function DashboardView({ dashboard }: { dashboard: Dashboard | null }) {
  if (!dashboard) {
    return <div className="empty-state">Dashboard data is not loaded.</div>;
  }

  return (
    <div className="metric-grid">
      <Metric label="Total Lockers" value={dashboard.lockers.total} />
      <Metric label="Available" value={dashboard.lockers.available} />
      <Metric label="Occupied" value={dashboard.lockers.occupied} />
      <Metric label="Maintenance" value={dashboard.lockers.maintenance} />
      <Metric label="Active Sessions" value={dashboard.sessions.active} />
      <Metric label="Completed Sessions" value={dashboard.sessions.completed} />
      <Metric label="Users" value={dashboard.users.total} />
    </div>
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

function LockersView({
  lockers,
  onStatusChange
}: {
  lockers: Locker[];
  onStatusChange: (
    locker: Locker,
    status: Extract<LockerStatus, 'AVAILABLE' | 'MAINTENANCE'>
  ) => void;
}) {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Size</th>
            <th>Status</th>
            <th>Grid</th>
            <th>Change Status</th>
          </tr>
        </thead>
        <tbody>
          {lockers.map((locker) => (
            <tr key={locker.id}>
              <td>{locker.code}</td>
              <td>{locker.size}</td>
              <td>
                <span className={`status ${locker.status.toLowerCase()}`}>
                  {locker.status}
                </span>
              </td>
              <td>
                {locker.row}:{locker.column}
              </td>
              <td>
                <select
                  value={locker.status}
                  disabled={locker.status === 'OCCUPIED'}
                  onChange={(event) =>
                    onStatusChange(
                      locker,
                      event.target.value as Extract<
                        LockerStatus,
                        'AVAILABLE' | 'MAINTENANCE'
                      >
                    )
                  }
                >
                  {locker.status === 'OCCUPIED' ? (
                    <option value="OCCUPIED">OCCUPIED</option>
                  ) : null}
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersView({ users }: { users: User[] }) {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Telegram ID</th>
            <th>Name</th>
            <th>Username</th>
            <th>Balance</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.telegramId}</td>
              <td>{formatUserName(user)}</td>
              <td>{user.username ?? '-'}</td>
              <td>{Number(user.balance).toFixed(2)}</td>
              <td>{formatDate(user.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionsView({
  sessions,
  filter,
  onFilterChange
}: {
  sessions: StorageSession[];
  filter: SessionFilter;
  onFilterChange: (filter: SessionFilter) => void;
}) {
  return (
    <div className="stack">
      <div className="segmented">
        <button
          type="button"
          className={filter === 'active' ? 'active' : ''}
          onClick={() => onFilterChange('active')}
        >
          Active
        </button>
        <button
          type="button"
          className={filter === 'history' ? 'active' : ''}
          onClick={() => onFilterChange('history')}
        >
          History
        </button>
        <button
          type="button"
          className={filter === 'all' ? 'active' : ''}
          onClick={() => onFilterChange('all')}
        >
          All
        </button>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Locker</th>
              <th>User</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Started</th>
              <th>Ended</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.locker.code}</td>
                <td>{formatUserName(session.user)}</td>
                <td>{session.requestedSize}</td>
                <td>
                  <span className={`status ${session.status.toLowerCase()}`}>
                    {session.status}
                  </span>
                </td>
                <td>{formatDate(session.startedAt)}</td>
                <td>{session.endedAt ? formatDate(session.endedAt) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getViewTitle(view: View) {
  const titles: Record<View, string> = {
    dashboard: 'Dashboard',
    lockers: 'Lockers',
    users: 'Users',
    sessions: 'Sessions'
  };

  return titles[view];
}

function formatUserName(user: User) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName || user.username || user.telegramId;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}
