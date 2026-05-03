# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2026-05-03

### Added
- **PRD/TRD Download** — Download buttons in project detail modal for Product Requirements Document and Technical Requirements Document as `.md` files
- **Execution Gate** — Manual start execution button to trigger engineer → designer → QA execution phase
- **Agent Fallback Guards** — All 8 agents (CEO, CTO, Product Owner, Product Manager, Business Marketing, Engineer, Designer, QA) now have fallback defaults when LLM returns empty or malformed responses
- **localStorage Persistence** — Projects persist across page refreshes via `useWebSocket` hook

### Fixed
- **Execution checkpoint blocking** — Fixed conditional edges so engineer/designer/QA run on first execution pass, not skipped when `execution_approved: false`
- **TRD test case formatting** — Fixed test cases rendering as single-character lines in generated TRD markdown
- **Modal overflow** — Project detail modal no longer overflows viewport frame
- **Execution approval state** — `execution_approved` now preserved on replays instead of being reset on every `start_planning`

### Changed
- Readme migrated to English (previously Indonesian)
- All project documentation now in English

## [1.0.0] - 2026-05-03

### Added
- Initial release with LangGraph state machine pipeline: intake → planning → execution → quality → review → delivered
- 7 AI agents with WebSocket real-time event feed
- Human-in-the-loop gates at planning and execution approval points
- Frontend React app with project board and real-time agent activity panel