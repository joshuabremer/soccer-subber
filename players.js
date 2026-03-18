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
// ──────────────────────────────────────────────────────────────────────────────

const PLAYERS_DEFAULT = [
  { name: "James", preferredPositions: ["DEF", "FWD"], canPlayCMF: false },
  { name: "Lyle", preferredPositions: ["DEF", "MID"], canPlayCMF: false },
  { name: "Andrik", preferredPositions: ["MID", "FWD"], canPlayCMF: true },
  { name: "Owen", preferredPositions: ["DEF", "MID", "FWD"], canPlayCMF: true },
  { name: "Emma", preferredPositions: ["MID", "FWD"], canPlayCMF: true },
  { name: "Nora", preferredPositions: ["DEF", "FWD"], canPlayCMF: false },
  { name: "Benecio", preferredPositions: ["MID", "FWD"], canPlayCMF: false },
  { name: "Noah", preferredPositions: ["DEF", "FWD"], canPlayCMF: false },
  {
    name: "Addy",
    preferredPositions: ["DEF", "MID", "FWD"],
    canPlayCMF: false,
  },
  {
    name: "Journe",
    preferredPositions: ["DEF", "FWD"],
    canPlayCMF: false,
  },
  {
    name: "Mayson",
    preferredPositions: ["DEF", "MID", "FWD"],
    canPlayCMF: true,
  },
];
