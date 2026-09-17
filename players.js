// ──────────────────────────────────────────────────────────────────────────────
// Team Roster — edit this file to update players and their preferences.
//
// preferredPositions: any combination of "DEF", "MID", "FWD"
//   The app will try to assign players to one of their preferred positions.
//   If that's not possible (e.g. too many defending-only players), it falls
//   back gracefully.
//
// canPlayCMF: set to true to allow this player to play center midfield
//   (the highest-running position). This can also be toggled live in the app.
//
// canPlaySTP: set to true to prefer this player at stopper in a 3-3-1.
//   This is a preference, not a requirement. The app still falls back to any
//   suitable defender if needed.
// ──────────────────────────────────────────────────────────────────────────────

const PLAYERS_DEFAULT = [
  "Elijah",
  "James",
  "Addie",
  "Emma",
  "Noah",
  "Walter",
  "Joe",
  "Sagan",
  "Lyle",
  "Owen",
  "Frank",
  "Andrik",
].map((name) => ({
  name,
  preferredPositions: [],
  canPlayCMF: false,
  canPlaySTP: false,
}));
