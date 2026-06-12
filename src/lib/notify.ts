/* Notificação opcional ao terminar um cronômetro (se o usuário permitir).
   Observação honesta: não roda com o app totalmente fechado — só enquanto
   a aba/app está viva. Timers OS-level reais exigiriam app nativo. */

export function requestNotifyPermission(): void {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

const ICON = `${import.meta.env.BASE_URL}icon.svg`;

function pageNotification(title: string, body: string): void {
  try {
    // No Android Chrome o construtor não existe em página — por isso o try.
    new Notification(title, { body, icon: ICON });
  } catch {
    /* ignore */
  }
}

export function notify(title: string, body: string): void {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    // Preferir o service worker: funciona também com o app em segundo plano.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) void reg.showNotification(title, { body, icon: ICON });
          else pageNotification(title, body);
        })
        .catch(() => pageNotification(title, body));
    } else {
      pageNotification(title, body);
    }
  } catch {
    /* ignore */
  }
}
