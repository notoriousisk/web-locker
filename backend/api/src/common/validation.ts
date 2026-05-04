import { BadRequestException } from '@nestjs/common';
import { LockerSize } from './enums';

const lockerSizes = new Set<string>(Object.values(LockerSize));

export function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${fieldName} is required`);
  }

  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Optional text fields must be strings');
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseLockerSize(value: unknown): LockerSize {
  if (typeof value !== 'string' || !lockerSizes.has(value)) {
    throw new BadRequestException('requestedSize must be one of S, M, L, XL');
  }

  return value as LockerSize;
}
