# ARSÈNE RPG update governance

## Protected release branches

- `main` is the browser release branch.
- `feature/ios-capacitor` is the iOS application branch.
- Only the Codex task titled `ブラウザ・iOSアップデート統合担当` may merge or push to either protected release branch.
- Every other task must not push, merge, rebase, reset, or force-update either protected release branch.

## Work produced by other tasks

- Create a dedicated staging branch named `staging/<short-task-name>` from the newest appropriate release branch.
- Commit completed work to that staging branch and push only that staging branch.
- Report the staging branch name, commit ID, changed files, tests run, and any known risks to the integration task.
- Do not leave the only copy of completed work as uncommitted changes in the shared iCloud worktree. If that worktree has Git/index errors, use a fresh temporary clone and selectively port the current changes there.
- Never copy an entire older file over a newer release file. Port only the intended hunks and preserve unrelated current definitions.

## Integration task responsibilities

- Fetch remote state immediately before integration and inspect active related tasks.
- Treat `main` as the current browser baseline and preserve its browser-only changes.
- Preserve iOS-only Capacitor, native advertising, safe-area, viewport, and bundle configuration on `feature/ios-capacitor`.
- Compare staging work against both release branches, remove obsolete duplicate definitions, and keep save migrations or legacy IDs until compatibility is proven unnecessary.
- Treat help as part of every gameplay and UI change. Before promotion, compare the implemented behavior with `js/help_data.js` and every contextual/tutorial help entry, update wording and controls, verify the help appears only after its feature unlocks, and ensure locked content is not spoiled from a fresh save.
- Run the help regression test for every release integration, even when the staging task did not modify a help file. A behavior change with stale or prematurely visible help is not complete.
- Run relevant regression tests, JavaScript syntax checks, the web build, and mobile/iOS regression checks before promotion.
- Push without force. If either protected branch advanced during verification, stop, refetch, and repeat integration.

## Current Infinite Score invariants

Do not regress these values while resolving older local work:

- `enemyScalePerFloor: .16`
- `returnMinFloor: 20`
- `shopRate: .02`
- Floor-tiered enemy pools: D1 through 10F, D2 through 15F, D3 from 16F
- Intermediate recovery items from 30F and high-grade recovery items from 60F
- Guaranteed first RETURN at the 20F victory milestone
