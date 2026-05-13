export function initializeTelegramApp() {
  const webApp = window.Telegram?.WebApp;

  webApp?.ready?.();
  webApp?.expand?.();
}

export function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData ?? '';
}
