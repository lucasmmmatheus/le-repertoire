/* Service worker mínimo: habilita "instalar no celular" (PWA) sem cachear nada.
   Network-only de propósito — nunca serve conteúdo velho. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // sem respondWith → o navegador faz a requisição normal (rede)
});

// Tocar na notificação de cronômetro traz o app de volta.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients[0];
      if (open) return open.focus();
      // scope cobre deploys fora da raiz (ex.: GitHub Pages em /le-repertoire/)
      return self.clients.openWindow(self.registration.scope);
    }),
  );
});
