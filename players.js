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
  {
    name: "James",
    preferredPositions: ["DEF", "FWD"],
    canPlayCMF: false,
    canPlaySTP: false,
  },
  {
    name: "Lyle",
    preferredPositions: ["DEF", "MID"],
    canPlayCMF: false,
    canPlaySTP: true,
  },
  {
    name: "Andrik",
    preferredPositions: ["MID", "FWD"],
    canPlayCMF: true,
    canPlaySTP: true,
  },
  {
    name: "Owen",
    preferredPositions: ["DEF", "MID", "FWD"],
    canPlayCMF: true,
    canPlaySTP: false,
  },
  {
    name: "Emma",
    preferredPositions: ["MID", "FWD"],
    canPlayCMF: true,
    canPlaySTP: false,
  },
  {
    name: "Nora",
    preferredPositions: ["DEF", "FWD"],
    canPlayCMF: false,
    canPlaySTP: false,
  },
  {
    name: "Benecio",
    preferredPositions: ["MID", "FWD"],
    canPlayCMF: false,
    canPlaySTP: false,
  },
  {
    name: "Noah",
    preferredPositions: ["DEF", "FWD"],
    canPlayCMF: false,
    canPlaySTP: false,
  },
  {
    name: "Addie",
    preferredPositions: ["DEF", "MID", "FWD"],
    canPlayCMF: false,
    canPlaySTP: true,
  },
  {
    name: "Journe",
    preferredPositions: ["DEF", "FWD"],
    canPlayCMF: false,
    canPlaySTP: false,
  },
  {
    name: "Mayson",
    preferredPositions: ["DEF", "MID", "FWD"],
    canPlayCMF: true,
    canPlaySTP: true,
  },
  {
    name: "Extra Player",
    preferredPositions: ["DEF", "MID", "FWD"],
    canPlayCMF: false,
    canPlaySTP: false,
  },
];
