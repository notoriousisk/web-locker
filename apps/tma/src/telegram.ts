import { TelegramUnsafeUser } from './types';

const fallbackUser = {
  telegramId: '1001',
  username: 'demo',
  firstName: 'Demo',
  lastName: 'User'
};

export function initializeTelegramApp() {
  const webApp = window.Telegram?.WebApp;

  webApp?.ready?.();
  webApp?.expand?.();
}

export function getInitialUser() {
  const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  if (!telegramUser?.id) {
    return fallbackUser;
  }

  return {
    telegramId: String(telegramUser.id),
    username: emptyToUndefined(telegramUser.username),
    firstName: emptyToUndefined(telegramUser.first_name),
    lastName: emptyToUndefined(telegramUser.last_name)
  };
}

export function getDisplayName(user: TelegramUnsafeUser | undefined) {
  if (!user) {
    return fallbackUser.firstName;
  }

  return user.first_name ?? user.username ?? fallbackUser.firstName;
}

function emptyToUndefined(value: string | undefined) {
  return value && value.trim().length > 0 ? value : undefined;
}
