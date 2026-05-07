export type LockerSize = 'S' | 'M' | 'L' | 'XL';
export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type SessionStatus = 'ACTIVE' | 'COMPLETED';

export type User = {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  balance: string | number;
  createdAt: string;
  updatedAt: string;
};

export type Locker = {
  id: string;
  code: string;
  size: LockerSize;
  status: LockerStatus;
  row: number;
  column: number;
  createdAt: string;
  updatedAt: string;
};

export type StorageSession = {
  id: string;
  userId: string;
  lockerId: string;
  requestedSize: LockerSize;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  locker: Locker;
};

export type Dashboard = {
  lockers: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
  };
  sessions: {
    active: number;
    completed: number;
  };
  users: {
    total: number;
  };
};

export type SessionFilter = 'active' | 'history' | 'all';
