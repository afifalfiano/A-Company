# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2026-05-03

### Added
- **PRD/TRD Download** — Download buttons in project detail modal for Product Requirements Document and Technical Requirements Document as `.md` files
- **Start Execution Button** — Manual trigger to start execution phase after planning approval
- **localStorage Persistence** — Projects survive page refresh via `useWebSocket` hook

### Fixed
- **TRD test case formatting** — Test cases no longer render as single-character lines
- **Modal overflow** — Project detail modal no longer overflows viewport frame

### Changed
- Readme migrated to English (previously Indonesian)
- All project documentation now in English

## [1.0.0] - 2026-05-03

### Added
- Initial release with real-time agent activity panel and project board
- WebSocket connection to backend for live agent event feed
- Project detail modal showing all agent outputs
- Planning and execution approval gates