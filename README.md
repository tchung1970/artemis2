# Artemis II Flight Simulation

An interactive 3D visualization of NASA's Artemis II mission — the first crewed flight to the Moon since Apollo 17 in 1972.

![Artemis II Flight Simulation](https://img.shields.io/badge/Three.js-r128-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Overview

This simulation tracks the 10-day Artemis II mission profile in real time, starting from the April 1, 2026 launch date. It features a 3D scene with Earth (NASA Blue Marble texture), the Moon (procedurally generated with maria, craters, and ray systems), the Orion spacecraft, and a solar system backdrop.

Daily mission activities are sourced from NASA's official Artemis II daily agenda.

## Mission Timeline

| Day | Phase | Highlights |
|-----|-------|------------|
| 1 | Launch | Liftoff on SLS, ICPS ops, Orion systems checkout |
| 2 | TLI | Trans-Lunar Injection burn, first video downlink |
| 3 | Outbound | Trajectory correction, CPR demo, medical kit checkout |
| 4 | Outbound | 2nd correction burn, celestial photography |
| 5 | Outbound | Enter lunar sphere of influence, spacesuit testing |
| 6 | Flyby | Closest lunar approach (4,000-6,000 mi), Moon photography |
| 7 | Return | Exit lunar sphere, 1st return correction burn |
| 8 | Return | Solar flare shelter demo, manual piloting assessment |
| 9 | Return | Re-entry procedure review, garment testing |
| 10 | Splashdown | Skip re-entry at Mach 32, parachute deploy, Pacific splashdown |

## Crew

- **Reid Wiseman** — Commander
- **Victor Glover** — Pilot
- **Christina Koch** — Mission Specialist 1
- **Jeremy Hansen** — Mission Specialist 2

## Features

- **3D Earth** with NASA Blue Marble texture, bump mapping, cloud layer, and multi-layer atmosphere glow
- **Procedural Moon** with maria (dark regions), 690+ craters, and ray systems (Tycho, Copernicus, Aristarchus)
- **Orion spacecraft** model with solar panels and tracking glow
- **Bezier-curve trajectory** showing planned path (dashed) and traveled path (solid cyan)
- **Solar system** with Mercury, Venus, Mars, Jupiter, and Saturn (with rings)
- **Day selector** to jump to any mission day with NASA-sourced daily descriptions
- **Camera presets** — Solar System, Earth, Moon, and Spacecraft views
- **Toggleable labels**
- **Real-time simulation** based on actual launch date

## Tech Stack

- **Three.js** (r128) — 3D rendering
- **Vanilla JavaScript** — no build tools or frameworks
- **HTML/CSS** — responsive dark-theme UI with glassmorphic sidebar

## Files

```
index.html   — Page structure, sidebar, controls
style.css    — Dark space theme, layout, animations
app.js       — 3D scene, trajectory, mission logic (~1050 lines)
```

## Usage

No build step required. Serve the files with any static HTTP server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# Or simply open index.html in a browser
```

## Controls

| Action | Input |
|--------|-------|
| Rotate | Click + drag |
| Zoom | Scroll wheel |
| Pan | Right-click + drag |
| Jump to day | Click Day 1-10 buttons |
| Camera preset | Click Solar System / Earth / Moon / Spacecraft |
| Toggle labels | Click "Labels" |

## References

- [NASA Artemis II Daily Agenda](https://www.nasa.gov/missions/artemis/nasas-artemis-ii-moon-mission-daily-agenda/)
- [NASA Artemis II Overview](https://www.nasa.gov/mission/artemis-ii/)

## Credits

Written with [Claude Opus 4.6](https://www.anthropic.com/news/claude-opus-4-6) by Anthropic.
