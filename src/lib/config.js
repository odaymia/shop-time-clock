/* Shop settings and their defaults. Saved config is merged over these. */

export const DEFAULT_CFG = {
  shopName: "Genie Auto Center",
  kioskMode: "tiles", // "tiles" = tap your name then PIN; "pin" = PIN pad only, no names shown
  managerPin: "",
  weekStart: 1, // 0=Sun ... 6=Sat
  roundingMin: 0, // 0, 5, 6, 15
  openHour: 8,
  closeHour: 18,
  otRules: "ca", // "ca" = daily >8 / >12, weekly >40 ; "flsa" = weekly >40 only
  photos: true, // take a photo with each punch
  photoRequired: false, // block the punch if the camera isn't working
  cameraKeepOn: true, // hold the camera open between punches so iPadOS asks for permission once, not per punch
  photoRetentionDays: 45, // photos older than this are deleted automatically
  attestation: true, // sign off on hours at the end of the pay period
  breakRules: true, // California meal and rest period tracking
  breakReminderMin: 20, // warn this many minutes before the meal deadline
  mealPay: "discretionary", // "unpaid" | "discretionary" (manager marks it) | "always"
  minStaff: 2, // never leave fewer than this many people on the floor
  graceMin: 6, // minutes of slack before a late start or early out gets flagged
};
