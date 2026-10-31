# Testing policy comparison — 2026-10-31

The local T3 Code, Grunge and Job Harvester policies were read for this review;
their repositories were not modified or tested. Their shared principle applies
to Campus: prove the changed behavior at the lowest sufficient layer, then
broaden only for a stated integration risk. A command catalogue is not a
checklist for every edit.

| Source                                                   | Relevant rule                                                                                                                                                           | Campus application                                                                                                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T3 Code, `AGENTS.md`, “Verifying”                        | Meaningful observable behavior; focused regression first; no implementation mirrors, callback-wiring or static-markup tests. Full suites belong to CI unless requested. | Keep pure schedule, expiry, URL and layout invariants in the existing Node tests. Use Go handler/storage tests for HTTP and persistence boundaries.                                                   |
| Grunge, `AGENTS.md`, “Testing”; `docs/agent-guide.md`    | Extend existing cases; use a real database/service only where its semantics matter; visual proof is before/after; one relevant integrated UI pass.                      | Use isolated SQLite for persistence and receiver rollback; fake university transport for protocol tests. Use captures for color/spacing, focused browser checks for keyboard, state and navigation.   |
| Job Harvester, `AGENTS.md`, “Testing”; `docs/testing.md` | Narrow checks first; recorded parser fixtures; no live network required by tests; distinguish environmental failures, local fixtures and deployment evidence.           | Reduced PDF/DOCX/parser fixtures, unavailable-versus-empty regressions and fake HTTP belong in tests. Public health/assets/download verification is release evidence, not a source-network unit test. |

The T3-specific Effect clock, event-worker, disposable-render, provider replay
and monorepo command rules do not transfer literally to Go, React and Node's
test runner. Their intent does: deterministic time where timing is the contract,
real core logic, substitutes at external boundaries, explicit cleanup and no
sleeps or retries used to hide a failing regression. Realistic imported records
must be reduced and redacted; never run development checks against writable
production data.

For ordinary Campus edits, the useful sequence is an affected test/file, scoped
format/lint and relevant type checking; one integrated interaction pass when
needed. Pure color, copy or spacing changes do not justify permanent tests or
repeated whole-project builds. Preserve meaningful tests for collision safety,
canonical shared-event counts, typed identities, unknown data, history and
focus; these are behavioral contracts even when expressed through geometry.

For the 0.2.0 release, broad validation is justified by the combined HTTP API,
document import, persistence-adjacent code, PWA and calendar changes. The existing
security and receiver gates in `docs/security.md` and `docs/deployment.md` remain
release requirements. Reuse successful evidence for unchanged code; run exact
artifact and activation checks at their own boundaries. Do not copy another
repository's blocked-run restrictions or treat an unexecuted check as passed.

This is an applicability assessment. It introduces no new test framework,
dependencies or CI automation and does not modify the other projects' policies.
