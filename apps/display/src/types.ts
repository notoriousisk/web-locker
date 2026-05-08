export type LockerSize = 'S' | 'M' | 'L' | 'XL';
export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

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

export type PublicStats = {
  lockers: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
  };
  sessions: {
    active: number;
  };
};
