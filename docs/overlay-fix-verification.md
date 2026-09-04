# Post-submission overlay fix

Branch: `staging/ui-overlay-fix`, based on submitted source `51c6c99`.

- Reward offer root z-index 11000 now exceeds result overlay 10010. Previously offers were at 1200 and hidden behind results.
- Combat and exploration history use a body-level dialog rather than expanding a HUD child inside clipping/stacking contexts.
- Exploration log opening no longer rebuilds the complete exploration screen. Dialogs are removed on close, transition and new battle.
- No changes to reward probabilities, boss strength or submitted App Store build.

Verified locally in browser with ephemeral data:
- Sora infinite floor 26 exploration log opens legibly and closes.
- Infinite battle log opens legibly above the battle scene.
- Zenakado rematch victory invoked from a defeated-enemy fixture displays the material offer above results. Mock-ad completion, Q dialogue and additional material receipt verified through UI.

Automated: 100 dialog open/close cycles and stacking regression; boss material, Q offer, AdMob reward, help and mobile regressions; JS syntax checks; cap sync with 8 runtime files and 10 audio assets matching.

Remaining: iOS device validation and long-session lag reproduction. Browser checks do not verify native ad delivery or prove all lag is fixed.
