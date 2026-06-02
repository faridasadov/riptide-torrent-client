(function bootstrapDesktopBridge() {
  const subscribers = new Set();

  function dispatch(payload) {
    subscribers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error("Riptide desktop bridge handler failed", error);
      }
    });
  }

  window.addEventListener("riptide-desktop-command", (event) => {
    dispatch(event.detail || {});
  });

  const existing = window.riptideDesktop || {};
  window.riptideDesktop = {
    ...existing,
    onNavigate(handler) {
      if (typeof handler !== "function") return () => {};
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    },
    dispatch,
  };
})();
