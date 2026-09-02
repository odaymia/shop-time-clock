/* Keep the shop iPad awake while the clock is on screen. */
export function keepAwake() {
  if (!navigator.wakeLock) return;
  const request = () => navigator.wakeLock.request("screen").catch(() => {});
  request();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") request();
  });
}
