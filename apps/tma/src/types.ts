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
  locker: Locker;
};

export type TelegramUnsafeUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUnsafeUser;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}
