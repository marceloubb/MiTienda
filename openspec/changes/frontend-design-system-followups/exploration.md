# Exploration: frontend-design-system-followups

**Phase**: explore (no code changes, no proposal)
**Date**: 2026-09-25
**Branch examined**: `feat/vibrant-redesign-slice5-2fa` @ `366a181` (clean tree)
**Inputs**: `frontend-vibrant-redesign/verify-report.md` (335 lines), `apply-progress.md` "Post-verify outcome" table, its five delta specs, `design.md`, `docs/designs/DESIGN.md`
**Artifact store**: hybrid (`exploration.md` + Engram `sdd/frontend-design-system-followups/explore`)

## Evidence legend

Every claim below is tagged:

- **[V]** — **verified by me** in this session: I read the file/ran the command and quote the line.
- **[R]** — **taken from the parent verify report, NOT independently re-verified.**
- **[D]** — **computed by me** (contrast ratios, token set arithmetic, usage counts).

Three parent claims turned out to be **wrong or incomplete**. They are corrected in place and marked **[V] refutes [R]**. Do not propagate the parent's wording for those.

---

## 0. Executive summary

Nine deferred items, all independently re-examined:

| # | Item | Verdict | Nature | Size |
|---|---|---|---|---|
| 1 | Typography MUSTs unimplemented | **CONFIRMED** | Missing implementation | ~50 lines |
| 2 | Elevation clause unimplemented | **CONFIRMED** | Missing implementation | ~30 lines |
| 3 | `--text-muted` 4.26:1 | **CONFIRMED**, parent's fix **does not work** | Requirement violation | ~2 lines |
| 4 | Backend gate red (WhiteNoise manifest) | **CONFIRMED**, parent's framing corrected | Environment | ~8 lines |
| 5 | 5 (actually **6**) unregistered `@theme` tokens | **CONFIRMED + 1 extra found** | Latent defect class | 6 lines |
| 6 | `rounded-lg` on 2 Navbar buttons | **CONFIRMED** | Task-1.4 completeness | 2 lines |
| 7 | 2FA enrollment lockout | **MECHANISM CONFIRMED**; parent's "unrecoverable" claim **refuted** | Spec gap | 5–120 lines |
| 8 | `--outline-variant` 1.71:1 | **Ruling: it IS a requirement violation** | Interpretation + visual cost | 1 line |
| 9 | 23/44 scenarios unverified | **CONFIRMED**; no runner exists | Verification debt | see §9 |

**The systemic answer** (§8): the `:root` → `@theme inline` diff is **6 tokens, none load-bearing**; the defect fails silently because nothing in the project can observe a missing utility. The recommended guard is **not** a frontend test runner — it is a ~75-line `node:test` text assertion over the stylesheet, using the Node 24 runtime that Next already requires. **Zero new dependencies.**

**Four product decisions** need the maintainer (§10). Everything else is settled and needs no input.

---

## 1. Typography MUSTs unimplemented — CONFIRMED

**Evidence [V]**:

- `frontend/app/globals.css:123` — `--font-label: var(--font-inter);` inside `@theme inline`.
  (Note: the brief says line 121. **[V] It is line 123.** The two-line error-container fix inserted at 117–118 shifted the font block from 119–121 to 121–123. Any task description quoting 121 is stale.)
- `frontend/app/layout.tsx:13-16` — `Inter({ variable: "--font-inter", ... })`; `:31` applies `${inter.variable}` to `<html>`, so the `@font-face` is emitted.
- `frontend/app/globals.css:237` — `html { @apply font-sans }`, and `:121` resolves `--font-sans` to `--font-jakarta`.
- **[V] Grep across `frontend/app`, `components`, `lib` for `font-label`: zero hits.** The only theme-font class used anywhere is `font-heading` (`components/ui/card.tsx:40`, `components/admin/DiscrepancyPanel.tsx:278`).
- **[V] Inter is therefore loaded and never rendered.** I did not rebuild, so the `<link rel="preload" as="font">` that `next/font` emits by default is *reasoned from next/font's documented default*, not observed. The unobservable part is only the network request; the "never rendered" part is proven from source.

**Evidence [D] — the type scale is not tokenized, and the mapping is 236 sites wide**:

`grep '\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b'` over all `.tsx` in `app/` + `components/`:

| Tailwind class | px | Count | DESIGN.md counterpart |
|---|---|---|---|
| `text-sm` | 14 | **122** | `body-md` (PJS 14/400) *or* `label-lg` (Inter 14/600) |
| `text-xs` | 12 | **54** | `body-sm` (PJS 12/400) |
| `text-2xl` | 24 | 21 | `price-hero` (PJS 24/800) |
| `text-lg` | 18 | 15 | `headline-sm` (PJS 18/600) |
| `text-xl` | 20 | 8 | **none — between `headline-sm` 18 and `headline-md` 22** |
| `text-3xl` | 30 | 8 | **none — between `headline-lg` 28 and `display-hero` 36** |
| `text-base` | 16 | 7 | `body-lg` (PJS 16/400) |
| `text-4xl` | 36 | 1 | `display-hero` (PJS 36/800) |

**236 occurrences across 30 files.** **[D] 16 of them (`text-xl`×8, `text-3xl`×8) have no exact step in the DESIGN.md scale** and would have to snap to a neighbouring step — a visible change.

**[V] The primitives are also off-spec on weight and family, not just size:**
- `components/ui/button.tsx:6` — base is `text-sm font-medium`. DESIGN.md:207 says button text is `label-lg` = **Inter 14px/600**. Size matches; family and weight do not.
- `components/ui/badge.tsx:7` — `text-xs font-medium` = 12px/500. DESIGN.md:212 says badges use `label-badge` = **Inter 11px/700**. Size, family and weight all differ.

**DESIGN.md carries the whole scale verbatim** (`docs/designs/DESIGN.md:51-118`) — 12 steps, 9 in Plus Jakarta Sans, 3 in Inter (`label-lg` 14/600, `label-md` 12/600, `label-badge` 11/700), each with explicit `lineHeight` and `letterSpacing`. Tailwind 4's `--text-*` namespace supports the `--text-<name>--line-height` / `--text-<name>--letter-spacing` modifier convention, so the scale maps 1:1 with no new machinery.

**Spec violated [V]**: `visual-design-system/spec.md:44` — "The DESIGN.md type scale (display-hero 36px/800 … label-badge 11px/700) MUST be wired into the theme; headings MUST use Plus Jakarta Sans and labels/badges/buttons MUST use Inter." Both MUSTs unmet.

**Classification**: missing implementation of an existing requirement. **Not** a product question *about whether* to do it — only *how far* to roll it out (Decision 1).

**Naming trap, confirmed [V]**: `--text-primary` (`:13`), `--text-secondary` (`:14`), `--text-muted` (`:15`) are **colors**, reached via `--color-text-primary` / `--color-text-secondary` / `--color-text-muted` (`:89-91`). They collide by name with Tailwind's `--text-*` size namespace. Any future size token must not be called `--text-*` for a color, and the font-size tokens must not collide with these three.

---

## 2. Elevation clause unimplemented — CONFIRMED

**Evidence [V]**: no `--shadow-*` key exists anywhere in `globals.css` (read in full, 245 lines). Complete inventory of shadow usage across `app/` + `components/`:

| Class | Count | Sites |
|---|---|---|
| `shadow-sm` | **12** | `components/admin/StatusFilterChips.tsx:83,86`; `app/products/page.tsx:258,259,276,277`; `app/page.tsx:179,180`; `components/admin/StaffKpiRow.tsx:73`; `app/orders/page.tsx:121`; `app/orders/[id]/page.tsx:251,278` |
| `shadow-lg` | 1 | `components/Navbar.tsx:115` |
| `shadow-2xl` | 1 | `components/admin/DiscrepancyPanel.tsx:267` |

14 usages across 8 files. **[V] `components/ui/card.tsx:14` has `ring-1 ring-foreground/10` and no shadow.**

**DESIGN.md settles the values exactly** (`docs/designs/DESIGN.md:190-194`) — no product decision on the tokens:

| Level | Name | Value | DESIGN.md surfaces |
|---|---|---|---|
| 0 | Flat | none, 1px `#E2E8F0` border only | background plane |
| 1 | Card Rest | `0px 2px 8px -2px rgba(15, 23, 42, 0.06)` + 1px `#F1F5F9` stroke | "Product grids and category squares" |
| 2 | Floating / Modals | `0px 8px 24px -4px rgba(15, 23, 42, 0.12)` | "Bottom sheets, sticky add-to-cart bars, active filter drawers" |
| 3 | Toasts & Overlays | `0px 16px 36px -6px rgba(15, 23, 42, 0.18)` | "Quick notifications, undo pills, active cart drawers" |

**[V] `Card`'s `ring-1 ring-foreground/10` already *is* the Level-1 stroke** (a 10%-alpha `#131b2e` ring ≈ DESIGN.md's `#F1F5F9` on white). Only the shadow half of Level 1 is missing. So `Card → shadow-level-1` is directly supported.

**Proposed mechanical mapping** (DESIGN.md names each surface class; no judgment call required):

| Site | Level | Basis |
|---|---|---|
| `ui/card.tsx:14` (Card base) | 1 | DESIGN.md:192 + the ring already present |
| `StaffKpiRow.tsx:73` (KPI tile) | 1 | it is a card |
| `orders/[id]/page.tsx:251` (timeline panel) | 1 | it is a card |
| `orders/[id]/page.tsx:278` (step dot) | 0 | flat inline marker; drop the shadow, the filled circle already reads |
| `StatusFilterChips.tsx:83,86` (selected chip) | 1 | closest to "category squares" |
| `products/page.tsx:258,259,276,277` (category button) | 1 | DESIGN.md:192 "category squares" |
| `page.tsx:179,180` (category button) | 1 | same |
| `orders/page.tsx:121` (active history tab) | 0 | inline control, not a grid tile — DESIGN.md:191 flat + border |
| `DiscrepancyPanel.tsx:267` (modal) | 2 | DESIGN.md:193 "active filter drawers" / modals |
| `Navbar.tsx:115` | **leave `shadow-lg`** | **[V] out of scope** — the header is `bg-[#1a1a1a] text-white`, a hardcoded legacy palette outside the token system entirely |

**Classification**: unimplemented design-system clause. **Size**: ~10 lines of tokens + ~14 one-token edits ≈ **30 lines**.

---

## 3. `--text-muted` contrast — CONFIRMED, and the parent's proposed fix does NOT work

**[V] + [D] the violation is real.**

- `globals.css:15` — `--text-muted: #757684;`. Measured on `#faf8ff` = **4.26:1** (I recomputed; matches [R]).
- **[D] Reached by 118 `text-muted-foreground` occurrences** plus 54 `text-xs`/`text-sm` label sites; `globals.css:35` aliases `--muted-foreground: var(--text-muted)` and `:141` exposes it as `--color-muted-foreground`.
- **[D] It is also used on the scrollbar** (`:176` thumb, `:244` `scrollbar-color`).
- **[R] confirmed**: the pre-swap value `#999999` measured **2.70:1** (I recomputed: 2.70). Not a regression.
- **[R] confirmed**: on-surface/background **16.29:1** and white/primary-container **8.72:1** — both spec-named pairs pass. I recomputed both exactly.

### The parent's fix is insufficient — [V] refutes [R]

The verify report and the brief both propose `#6b6c79` ("≈4.9:1"). That number is measured **only against `#faf8ff`**. `text-muted-foreground` also lands on the surface ramp. **[D] Full sweep of every surface it can plausibly sit on:**

| Candidate | `#fff` | `#faf8ff` | `#f2f3ff` | `#eaedff` | `#e2e7ff` | `#dae2fd` | min | verdict |
|---|---|---|---|---|---|---|---|---|
| `#757684` (current) | 4.49 | 4.26 | 4.07 | 3.86 | 3.65 | 3.48 | 3.48 | **FAIL** |
| `#6b6c79` (parent's fix) | 5.19 | 4.93 | 4.71 | **4.46** | **4.23** | **4.02** | 4.02 | **FAIL** |
| `#67687a` | 5.47 | 5.19 | 4.96 | 4.70 | **4.46** | **4.24** | 4.24 | **FAIL** |
| `#64657a` | 5.70 | 5.41 | 5.17 | 4.90 | 4.64 | **4.42** | 4.42 | **FAIL** |
| **`#62637a`** | 5.86 | 5.56 | 5.31 | 5.04 | 4.77 | **4.54** | 4.54 | **PASS** |
| **`#5f6078`** | 6.12 | 5.81 | 5.55 | 5.26 | 4.99 | **4.74** | 4.74 | **PASS** |

**[V] `--6b6c79` still fails AA on three of the six surfaces.** And the constraint is real, not theoretical — **[V] four elements put `text-muted-foreground` directly on a `bg-surface-container*` background**: `app/checkout/page.tsx:645`, `app/products/page.tsx:215`, `app/profile/page.tsx:235`, `app/profile/page.tsx:249`. Plus `ui/card.tsx:86` puts `bg-muted/50` (= `--surface-2` = `#eaedff`) on every `CardFooter`, and `bg-surface-container-high`/`-highest` is used as a background in 7 places.

**Recommendation: `#5f6078`.** It clears 4.5:1 on every surface in the ramp with headroom (worst case 4.74 on `#dae2fd`). `#62637a` is the absolute floor at 4.54 — no margin for a future surface being added to the ramp. **[D] This is a one-line change at `globals.css:15`**; everything else (`--muted-foreground`, `--color-text-muted`, `--color-muted-foreground`, both scrollbar rules) propagates through the existing `var()` chain.

### Do NOT also darken `--outline` — [V] refutes [R]

The verify report suggests darkening "the identical `--outline` at line 65" alongside. **Don't.** **[D] `--outline` (`#757684`) measures 4.49:1 on white** — it is a *border/outline* token, and WCAG 1.4.11's threshold for a UI-component boundary is **3:1**, which it already clears by a wide margin. Darkening it would restyle every `border-outline` and `ring-outline` in the app for **zero accessibility gain**, and would break fidelity to `DESIGN.md:16` (`outline: '#757684'`) — a value the design source states explicitly. The parent conflated a text token with a border token that happen to share a hex.

**Classification**: requirement violation of `visual-design-system/spec.md:75` ("Text … color pairs MUST meet WCAG 2.1 AA contrast"). **Settled by the spec — no product decision.** **Size: 1 value line + comment.**

**Settled, do not touch**: `--on-secondary-container #00714d` on `--secondary-container #6cf8bb` = **4.55:1** — passes AA by 0.05. Fragile, but passing. Not a violation; noting it only because a future change to either token could break it silently.

---

## 4. Backend test gate red (WhiteNoise manifest) — CONFIRMED, framing corrected

**Evidence [V]**:

- `backend/mitienda/settings.py:176` — `STATIC_ROOT = BASE_DIR / 'staticfiles'`
- `backend/mitienda/settings.py:183` — `'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'`
- **[V] `backend/staticfiles/` does not exist** (`Test-Path` → `False`)
- **[V] `git check-ignore -v backend/staticfiles` → exit 1, no output. NOT gitignored.** The parent's critical detail is correct.
- **[V] `.gitignore` (21 lines) contains no `staticfiles` entry.** It covers `.atl/`, `.codegraph/`, `.venv/`, `__pycache__/`, `db.sqlite3`, `.env*`, and OS/editor files — nothing for `staticfiles/`.
- **[V] No `conftest.py`, `pytest.ini`, `tox.ini`, or test-settings module exists anywhere under `backend/`.** `manage.py test` therefore uses `mitienda.settings` directly, with the production storage backend.
- **[V] `backend/mitienda/tests.py:120-150` — `AdminAccessControlTests` does `self.client.get('/admin/login/')`, which renders the admin template containing `{% static 'admin/css/base.css' %}`.** That is the exact trigger.
- **[V] The mechanism**: `django/contrib/staticfiles/storage.py:593-601` — `stored_name()` raises `ValueError("Missing staticfiles manifest entry for '%s'")` when `manifest_strict` is on and the hash is absent. Called during **template rendering**, from the **storage backend**.
- **[V] Not a regression** — `[R]`'s claim holds: the change chain made no backend commits after the planning commit, and the working tree is clean at `366a181`.

### Why the manifest backend cannot simply be weakened — [V] new evidence

**[V] `backend/Dockerfile` CMD runs `collectstatic --noinput` at container start and creates `/app/staticfiles`; `backend/.dockerignore:7` already excludes `staticfiles` from the build context.** `docs/DEPLOYMENT.md:101` documents this. So the manifest backend is **deliberate and required by the Docker deployment** — hashed filenames are what WhiteNoise serves in production. Weakening it globally is wrong.

### Assessment of the candidate options

| Option | Fixes the 4 tests? | Verdict |
|---|---|---|
| `.gitignore` entry for `backend/staticfiles/` | **No** | **Not a fix.** It only makes a local `collectstatic` safe. The tests still fail on a clean clone because there is no manifest. Hygiene, not a remedy. |
| Run `collectstatic` before the suite | Yes, until someone cleans | **Reject.** A documented prerequisite with **no CI to enforce it** is precisely the "fix that depends on human memory" failure mode. The current red gate is the proof that it does not hold. |
| `WHITENOISE_USE_FINDERS` | **No** | **Wrong tool.** **[V]** It is read in `whitenoise/middleware.py:88` — the *middleware's* runtime file-serving strategy. It never touches `STORAGES['staticfiles']['BACKEND']`, and `whitenoise/storage.py` does not reference it. The `ValueError` is raised by Django's storage layer during template rendering, before any middleware is involved. |
| `WHITENOISE_MANIFEST_STRICT = False` | **No** | **Wrong tool.** **[V]** It is read in `whitenoise/storage.py:73-75`, but only on `CompressedManifestStaticFilesStorage` (line 63), which subclasses Django's `ManifestStaticFilesStorage` and re-implements the missing-manifest branch. The failure is Django's own `manifest_strict` (`staticfiles/storage.py:601`) in the `super()` class, before WhiteNoise's override. |
| New `mitienda/test_settings.py` + `--settings=` on the gate | Yes | Works, but adds a module **and** a parallel settings representation **and** a new flag every developer must remember. Over-engineering by the over-engineering test. |
| **Artifact-aware backend selection in `settings.py`** | **Yes** | **Recommended.** |

### Recommendation

```python
# settings.py, replacing the current STORAGES block
_STATIC_MANIFEST = BASE_DIR / 'staticfiles' / 'staticfiles.json'
STATICFILES_BACKEND = (
    'whitenoise.storage.CompressedManifestStaticFilesStorage'
    if _STATIC_MANIFEST.exists()
    else 'whitenoise.storage.CompressedStaticFilesStorage'
)
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': STATICFILES_BACKEND},
}
```

**[V] `whitenoise.storage.CompressedStaticFilesStorage` exists in the installed 6.9.0** (`storage.py:23`), so nothing needs installing.

Why this is the right shape for *this* project: it adds **no flag, no new state, no new module, and no new command**. It reads the artifact that already answers the question ("has the static pipeline run?"), so it cannot drift from reality and cannot be forgotten. `manage.py test` goes green from a clean clone with zero prerequisites; production keeps hashed filenames because the Docker container always has a manifest.

**Honest tradeoff**: a production deploy that forgot `collectstatic` would silently serve unhashed filenames instead of erroring loudly. Today such a deploy 500s on every admin page, which is arguably a better signal — but `backend/Dockerfile` runs `collectstatic` at container start, so the realistic production path always has the manifest, and the current failure mode is worse. If the maintainer prefers production to stay loud, the alternative is an explicit `sys.argv`-based test-mode check (~4 lines, same effect, but runner-shape-dependent and therefore more fragile). **This is a technical call I am making, not a product decision** — flagged here only so the choice is visible.

**Also add, as one line of hygiene (not the fix):** `backend/staticfiles/` to `.gitignore`. Cheap, prevents hundreds of untracked files from any local `collectstatic`, and mirrors what `backend/.dockerignore:7` already does for the container.

**Classification**: environment/config defect. **Size: ~7 lines settings + 1 line gitignore.**

---

## 5. Unregistered `@theme` tokens — CONFIRMED, and there are **6**, not 5

**[D] Complete accounting, computed by parsing both blocks of `globals.css`:**

- Custom properties declared in `:root` (lines 7–82): **69**
- Keys registered in `@theme inline` (lines 84–157): **72** (69 color mappings + 3 font keys)
- `@theme` entries pointing at a `var()` that is **not** declared in `:root`: **0** dangling. Exactly 2 external references — `--font-jakarta` and `--font-inter` — both supplied by `app/layout.tsx:9,14`. The reverse invariant is clean.

**`:root` tokens with no registration — 7 found, of which 6 are genuine defects:**

| Token | Line | In parent's SUGGESTION-1? |
|---|---|---|
| `--tertiary` | 49 | yes |
| `--tertiary-container` | 50 | yes |
| `--on-tertiary` | 51 | yes |
| `--on-tertiary-container` | 52 | yes |
| `--on-background` | 67 | yes |
| **`--surface-dim`** | **57** | **NO — missed by the parent** |
| `--radius` | 73 | n/a — **not a defect** |

**`--radius` is not a missing registration.** It is the scale *seed*; Tailwind's `--radius-*` namespace is populated by literal values at `globals.css:150-156`. There is no `--color-radius` to add.

**`--surface-dim: #d2d9f4` is a genuine 6th miss.** It appears in `DESIGN.md:5` (`surface-dim: '#d2d9f4'`) and in the `:root` ramp, and it was never exposed as `--color-surface-dim`. Same trap, one more instance.

**Is any of the 6 load-bearing today? [V] No.** Grep for `tertiary|on-background|surface-dim` across every `.tsx` in `app/` + `components/` returns **no files found**. All six are latent — harmless today, one forgotten `@theme` line away from a repeat of CRITICAL-2's 25 dead call sites.

**Classification**: latent instance of the defect class in §8. Registering them is 6 lines. **But see §8: the registration is not the point — the guard is.**

---

## 6. `rounded-lg` on 2 Navbar buttons — CONFIRMED

**[V] `components/Navbar.tsx:219`** (logout `<button>`, `size-10`) and **`:238`** (mobile-menu `<button>`, `size-10`) both carry `rounded-lg`. Spec `visual-design-system/spec.md:54` requires buttons `rounded-xl` "across `components/ui/*` and page surfaces".

**[D] Full `rounded-(sm|md|lg)` inventory — 11 sites in 5 files**, so the reviewer sees the whole surface:

| File:line | Element | Ruling |
|---|---|---|
| `Navbar.tsx:219` | logout `<button>` | **in scope** → `rounded-xl` |
| `Navbar.tsx:238` | mobile-menu `<button>` | **in scope** → `rounded-xl` |
| `Navbar.tsx:121` | logo badge `<span>` | out of scope — a span, not a card/button/input/badge |
| `Navbar.tsx:185` | cart `<Link>` with `bg-white/10` pill | out of scope — a nav link, not enumerated by the spec's mapping |
| `Navbar.tsx:198` | orders `<Link>` | out of scope — same |
| `Navbar.tsx:206` | profile `<Link>` | out of scope — same |
| `orders/page.tsx:328` | `<summary>` disclosure trigger | **in scope** — see below |
| `register/page.tsx:89` | error alert `<p>` | out of scope — an alert, not enumerated |
| `DiscrepancyPanel.tsx:343` | error alert `<p>` | out of scope — same |
| `StaffUserForm.tsx:169` | error alert `<p>` | out of scope — same |
| `ui/skeleton.tsx:7` | skeleton placeholder | out of scope — parent already ruled this a defensible exclusion; confirmed |

`orders/page.tsx:328` — **[V]** the `<summary>` has `cursor-pointer` and `focus-visible:ring-2`; it is button-like, and the spec's mapping says buttons are `rounded-xl`. The parent's SUGGESTION-6 is correct. Carry it: 1 line.

**Classification**: task-1.4 completeness, plus one consistency item. **Size: 3 lines.**

### Radius-ramp trap — do NOT "fix" the ramp

**[D] The registered radius ramp does not match DESIGN.md's named steps**, and the spec's prose is literally untrue while its scenario is true:

| Step | `globals.css:150-156` | `DESIGN.md:119-125` |
|---|---|---|
| `sm` | 0.25rem | 0.25rem ✓ |
| `md` | **0.375rem** | **0.75rem** |
| `lg` | **0.5rem** | **1rem** |
| `xl` | **0.75rem** | **1.5rem** |
| `2xl` | 1rem | (unnamed) |
| `3xl` | 1.5rem | (unnamed) |
| `4xl` | 2rem | (unnamed) |

**[V] The spec scenario still passes**: `card = rounded-2xl` → 1rem (DESIGN: cards 1rem–1.25rem ✓), `button = rounded-xl` → 0.75rem (DESIGN: buttons 0.75rem ✓), `badge = rounded-full` ✓. The parent's verify ruled this implemented and I agree.

**If someone "corrects" the ramp to match DESIGN.md literally, all 11 `rounded-lg`/`rounded-md` sites above change size and all 48 `Button` usages jump from 0.75rem to 1.5rem.** That is a large, unreviewed visual change disguised as a spec-compliance fix. **Flag it in the proposal; do not do it.** Settled — no decision needed.

---

## 7. 2FA enrollment lockout — mechanism CONFIRMED; the parent's "unrecoverable" claim is REFUTED

### Mechanism: confirmed by reading the code [V]

- **[V] `backend/users/authentication.py:53-71`** — `_validate_expiry_and_2fa` is a blanket per-request check. Line 58 gates on `DJANGO_2FA_ENFORCED`; line 63 is `if TOTPDevice.objects.filter(user=user, confirmed=True).exists():`; lines 64–70 raise `AuthenticationFailed({'detail': 'Código TOTP requerido', 'code': 'totp_required'})`. **There is no path check, no view allowlist, no endpoint exemption.** The function span is 53–71 (the brief and `apply-progress.md:188` both say 58–70 — close, but cite 53–71).
- **[V] `backend/users/views.py:178-200`** — `TwoFAConfirmView.post`. The confirm request itself is authorized *before* the flip (device still unconfirmed at auth time, so the gate passes), then line 198–199 executes `device.confirmed = True; device.save(update_fields=['confirmed'])`. **That is the commit point.**
- **[V] `frontend/components/admin/TOTPConfirmForm.tsx:29-48`** — `handleSubmit` calls `await confirm2FA(deviceId, code)` (35), then only `setCode("")` (37) and `onConfirmed()` (38). **It never calls `setTOTPCode`.**
- **[V] Blast radius from the index**: `setTOTPCode` has exactly **2 callers, both in `app/login/page.tsx`**. `TOTPConfirmForm` is not among them. The module-level `totpCode` (`api.ts:105`) stays `null`.
- **[V] `api.ts:236-266`** — `fetchAPI` intercepts `totp_required` at line 244 **before** the refresh policy, so a gated 401 never triggers `refreshToken()` or `setActiveToken()`. **The session is not torn down; the request just fails.**
- **[V] Spec scope** — `two-factor-auth/spec.md:51` opens "**After a successful password login**, when any authenticated request returns 401…"; its scenario is "GIVEN a user with a confirmed device **logging in**…". A mid-session enrollment 401 is outside that scope, and no requirement mentions session continuity. **Gap, not contradiction — the parent's verify ruling is correct.**

So far, everything the parent wrote holds.

### What the parent got wrong — [V] refutes [R]

`apply-progress.md:189` claims: *"the code lives ~30s (one TOTP step), so even 'log out and back in' is unreliable — the admin has to clear cookies by hand."*

**Re-login is a working, self-service escape hatch.** Evidence:

- **[V] `app/login/page.tsx:136-178` — `LoginPage` has no redirect-if-authenticated guard.** It renders the password form unconditionally, whatever `useAuth().user` holds.
- **[V] `app/login/page.tsx:151-165`** — the full recovery path is present: `apiLogin` (password login, **not** token-authenticated, so not TOTP-gated) → `getProfile()` probe → on `totp_required`, `setNeedsTOTP(true)` → `TOTPChallengeStep` renders a **fresh** code field.
- **[V] The 30-second window is irrelevant** to that path: the admin reads whatever code their authenticator currently shows. Nothing needs to be reused from the expired code.
- **[V] A full page reload also self-heals the client state**: `auth-context.tsx:56-58` runs `loadProfile()` on mount, which calls `getProfile()`; a 401 hits the `catch` at `:45` (`status === 401`) → `setUser(null)`. The app correctly shows the user as anonymous.

**The real user-visible symptom** (narrower than "locked out"): on a **client-side navigation** (no reload) the in-memory `user` stays set, so the navbar still shows "logged in" while every request 401s. `auth-context.tsx:83-90` — `logout()` fires `void apiLogout().catch(() => {})` then clears state unconditionally, so the **UI** reports success while the server token survives (the request 401s before deleting it). Clicking logout then navigating to `/login` recovers completely.

**Corrected classification**: a **missing requirement** (no requirement makes a challenge reachable outside `/login`, and none requires session continuity), with a **confusing-but-recoverable** current symptom and an **unrecoverable variant only if a user clears the cookie and has no way back** — which does not occur, because `/login` is reachable and the password path is ungated.

**Unreachable in the shipped configuration [V]**: `settings.py:55` — `DJANGO_2FA_ENFORCED = _env_bool('DJANGO_2FA_ENFORCED', 'False')`. Off by default; `docs/DEPLOYMENT.md:17` documents the production value as `True` "only after every admin has enrolled a device".

**Why this is more than theoretical [V]**: `docs/DEPLOYMENT.md:36` — the documented enablement order step 5 instructs every admin to enroll, **then** set `DJANGO_2FA_ENFORCED=True`. The lockout fires on *every admin's own machine during step 5*, on the documented production path. **[V] `docs/DEPLOYMENT.md:44` is also stale**: "The SPA frontend has **no 2FA UI yet** (documented limitation)" — slice 5 added the login challenge. That line should be corrected in the same change.

**What a new requirement must say** — the gap is not "add a TOTP box", it is *"no authenticated surface may be the only place a `totp_required` 401 can be resolved"*. Any of these closes it:

1. **Session continuity** — after `confirm2FA` resolves, `TOTPConfirmForm` MUST call `setTOTPCode(code)`. Narrows the window to the code's ~30s lifetime; a later navigation still 401s. **Not sufficient alone.** Cheapest possible partial mitigation (~5 lines).
2. **Global challenge handler** — any surface that receives a `totp_required` 401 MUST render a code prompt, and `logout` MUST be exempt from the backend gate so a user can always reset. Closes it properly. ~60–100 lines frontend + a backend exemption + tests.
3. **Backend endpoint exemption** — `_validate_expiry_and_2fa` exempts `/users/2fa/confirm/` (and ideally `/users/logout/`). Small, but it fixes the *cause* only for enrollment; every other mid-session auth-state change re-enters the trap. **Alone it is a band-aid.**

**Classification**: spec gap → needs a new requirement. **Size: 5 lines (option 1), ~20 + tests (option 3), ~60–120 (option 2).** This is **Decision 4**.

---

## 8. The systemic question: making the defect class impossible

### The full accounting [D]

- **69** tokens declared in `:root`; **72** keys in `@theme inline`.
- **6** genuine missing registrations: `--tertiary` (49), `--tertiary-container` (50), `--on-tertiary` (51), `--on-tertiary-container` (52), `--surface-dim` (57), `--on-background` (67).
- **0** load-bearing today. All six are latent.
- **0** dangling `var()` references in the other direction (only the 2 legitimate `next/font` variables).

### Why it is undetectable today [V]

The error-container pair was fixed by adding two lines. **That shrinks nothing.** The same mistake is one forgotten `@theme inline` entry away, and nothing in the project can observe it:

- **`npm run build` cannot see it.** Tailwind 4 emits no error for an unknown theme key; the class simply produces no rule. **[R]** confirms the parent built green *with 25 dead call sites*. **[V]** `package.json:6-9` — scripts are `dev`/`build`/`start`/`lint` only.
- **`npm run lint` cannot see it.** **[V]** `lint` is plain `eslint` with `eslint-config-next`; ESLint has no model of Tailwind theme namespaces and never parses `globals.css`.
- **No test runner. [V]** `package.json` has no `jest`, `vitest`, `@playwright/test`, `cypress`, or `@testing-library/*` in dependencies or devDependencies.
- **No CI. [V]** no `.github/` or `.gitlab/` directory anywhere in the repo.
- **No review checklist. [V]** the only `AGENTS.md`/`CLAUDE.md` are Next.js-generated inside `frontend/`; there is no `CONTRIBUTING`.

**The "documented rule" option is already empirically disproven in this repository.** `apply-progress.md:178` records the rule explicitly — *"New code in this slice deliberately uses only registered tokens"* — and the very next slice shipped 25 usages of an unregistered pair. A convention that has already failed once, with no mechanism behind it, will fail again.

### Candidate guards, assessed against this project's real constraints

| Guard | Catches it? | Cost | Verdict |
|---|---|---|---|
| Documented rule + review checklist | No | ~5 lines of prose | **Rejected — already disproven here.** |
| Custom ESLint rule | Yes, in principle | Needs a CSS parser + a rule; ESLint's AST has no CSS nodes | **Rejected — over-engineered.** |
| Post-build grep of the emitted CSS | Partially — only classes that are *used*; never catches declared-but-unused tokens; and only after a full build | ~15 lines + a build dependency | **Rejected as primary.** Useful as a *second* net, not the first. |
| **A `node:test` assertion over `globals.css`** | **Yes, both directions** | **~75 lines, zero dependencies** | **Recommended.** |
| A real DOM-capable frontend runner (vitest / Playwright) | Yes | 5–15 new devDependencies, config, CI-shaped work | **Not justified for this class.** See below. |

### The recommendation, and the honest answer about cost

**The check is a text assertion, not a rendering test.** Assert two set invariants over the stylesheet source:

1. `set(:root) − set(registered targets)` ⊆ an explicit allowlist containing only `--radius` (the scale seed) and `--font-jakarta` / `--font-inter` (supplied by `layout.tsx`).
2. `set(registered var() targets) − set(:root)` is exactly `{-–font-jakarta, -–font-inter}` — catches typos like `--color-foo: var(--fooo)`.

Both directions are what make the guard *impossible-to-defeat* rather than merely a reminder: (1) is the CRITICAL-2 failure, (2) is its mirror.

**The cost is far lower than "add a frontend test runner", and that is the honest finding:**

- **[V] Node v24.21.0 is installed**, and **[V] `node:test` resolves and exports `test`** — the built-in runner is stable and available. Next 16 already mandates Node ≥20.9, so this is not a new runtime requirement.
- **Zero new packages.** No `vitest`, no config file, no transform pipeline, no `jsdom`, no lockfile churn.
- Wire it through npm's `prebuild` lifecycle hook, so `npm run build` — the project's declared gate — runs it automatically. **`openspec/config.yaml`'s `verify.build_command` stays `npm run build`. Nothing about the gate command changes.**

**What this guard explicitly does NOT give you** — and this boundary must not be blurred: it does **not** cover components, DOM, rendering, the 23 unverified scenarios, or `qrcode.react` behavior. It is a *stylesheet* test wearing the runner's clothes. Its value is that it is the cheapest possible thing that closes the one class of defect that has now bitten this codebase twice (`--color-on-primary` family in slice 3, `--color-error-container` in slices 3–4).

**Honest answer to "is a frontend test runner the honest answer?"**: for **this defect class**, no — and the reason is that the class is detectable without a DOM. For the **23-scenario evidence gap** (§9), a runner is the only real answer, and that is a different, much larger, separately-decided question.

**Ordering rule that makes the guard trustworthy** (from the triage discipline): a gate that ships without the change that satisfies it blocks the population it is meant to protect. So **the 6 registrations and the guard must land in the same work unit** — never the guard alone, and never the registrations alone.

---

## 9. Deferred item 9 — 23/44 scenarios unverified: what verification is even possible

**[V] confirmed**: no frontend test runner exists; `npm run build` and `npm run lint` are the only frontend gates, and `design.md:73` lists "build+lint per slice (no test runner)" plus a manual smoke checklist.

**What is honestly verifiable in this change, without a browser:**

| Class of change | Gate that actually covers it |
|---|---|
| Token registration (§5) | `build` + the **new** `node --test` guard — this is the one class that becomes *machine*-verified |
| Radius class swaps (§6) | `build` only. Correctness is a one-token diff; **visual result is not proven.** |
| Shadow token definitions (§2) | `build` for syntax; **the mapping to DESIGN.md is a human read of the diff** |
| Contrast values (§3) | `[D]` computed offline, exactly as I did it here. **This class is fully verifiable without a browser** — it is arithmetic on hex values. |
| Type-scale token definitions (§1) | `build` for syntax; **the 118-site visual effect is not proven** |
| Backend staticfiles (§4) | `manage.py test` — **fully runtime-proven, 185 tests, no browser needed** |
| 2FA lockout (§7) | Needs a browser **and** `DJANGO_2FA_ENFORCED=True`. The backend suite proves the gate; only a browser proves the recovery path. |

**Ruling: adding a DOM-capable frontend runner is NOT in scope for this change.** The evidence gap it would close is real but it is a *different, larger* piece of work (see Decision 3), and pretending a 75-line stylesheet test closes it would be the dishonest-reporting failure the parent verify was right to avoid. The one thing that *is* in scope and *is* worth doing: the contrast values get **documented arithmetic** in the proposal, so that class stops depending on eyeballing.

---

## 10. Open product decisions — the complete list

Four. Everything else is settled and I am not asking about it.

---

### Decision 1 — How far does the type-scale rollout go?

The spec (`visual-design-system/spec.md:44`) says the scale MUST be "**wired into the theme**". That is a statement about token *availability*. It does not say "replace every existing font size on every page", and 16 of the 236 sites have no exact scale step.

- **(a) Primitives + scale tokens only** — *recommended.* Define all 12 DESIGN.md steps as `--text-*` tokens with their line-height/letter-spacing modifiers; apply `font-label` plus the correct `label-*` size/weight to `button.tsx`, `badge.tsx`, `card.tsx` and the shared input/label class constants (`login/page.tsx`, `TOTPConfirmForm`, `StaffUserForm`, `profile`, `register`). Leaves all 236 ad-hoc sizes alone.
  **~50 lines. Zero page churn. Satisfies both MUSTs literally.**
- **(b) Full replacement** — (a) plus rewriting 236 usages across 30 files to scale tokens.
  **~300 lines, touches every page, and forces 16 sites (`text-xl`×8, `text-3xl`×8) to snap to a neighbouring step — a visible change at 16 sites.**

**Tradeoff**: (a) satisfies the requirement but leaves the codebase visually inconsistent (primitives on the scale, pages on stock Tailwind sizes). (b) makes the scale real but is a large, purely-visual PR that will dominate the review and mixes a tokenization refactor with 16 individual design changes.

**My recommendation: (a).** Ship the scale as *available* tokens, apply them where the spec names the surfaces (labels, badges, buttons), and treat the page-wide sweep as its own change with its own visual review.

---

### Decision 2 — Is `--outline-variant` at 1.71:1 a violation, and if so, what do we do?

**My ruling on the ruling question: it IS a violation of the requirement's letter, and I will not pretend otherwise.**

`visual-design-system/spec.md:75` reads: "Text **and UI-component** color pairs MUST meet WCAG 2.1 AA contrast". That names two categories. For a UI-component boundary, the AA criterion is 1.4.11, which requires **3:1**. **[D] `--outline-variant` (`#c4c5d5`, `globals.css:66`) measures 1.71:1 on white.** It is used as an input border in 62 places across 20 files, including the 2FA confirm input at `TOTPConfirmForm.tsx:10`.

The parent ruled this "interpretation-dependent" because the requirement's *examples* and its only *scenario* ("body text and primary CTA pairs") are text-scoped. That is a fair reading of the scenario — but a scenario is an example; the **requirement** is the normative text, and it says "UI-component".

**If it is a violation, the remedy is a genuine product decision** because it is cheap to apply and expensive to get wrong:

- **(a) Darken `--outline-variant` to ≥3:1 — 1 line, no file churn.** **[D] The value must be `#8f90a6` or darker** (`#9494a8` gives 2.97, just short). Cost: **all 62 usages in 20 files shift colour at once** — every input border, every card ring, every divider becomes mid-grey, and `--outline-variant` (`#8f90a6`) collapses toward `--outline` (`#757684`), destroying the deliberate two-step border hierarchy the design system has. High visual blast radius from a 1-line diff.
- **(b) Introduce a separate control-border token** for interactive control boundaries only, leaving `--outline-variant` for dividers and decorative rules. Standards-correct: 1.4.11 governs boundaries needed to identify *controls*, not every divider. Cost: a new token — normally a smell under the over-engineering test, but here it *removes* a duplicated responsibility rather than adding one. ~3 lines + repointing the ~20 control borders.
- **(c) Rule it out of scope**, on the grounds that the spec's scenario tests text pairs only, and record the interpretation in the delta spec so the next reader is not left guessing.

**Tradeoff**: (a) is one line but restyles the whole app's borders. (b) is the smallest *correct* change but adds a token. (c) is free but leaves a known AA gap that a future audit will rediscover.

**My lean: (b)**, with (a) as the fallback if the maintainer would rather not add a token. I do not recommend (c) — the requirement's letter is clear enough that leaving it unaddressed is a decision someone will have to defend.

---

### Decision 3 — Frontend verification: stylesheet guard only, or a real runner?

- **(a) `node --test` stylesheet guard, zero dependencies** — *recommended.* ~75 lines + 1 `prebuild` script. Closes the defect class of §8 permanently. **Does nothing** for components, DOM, or the 23 scenarios.
- **(b) Add a DOM-capable runner** (Vitest + Testing Library, or Playwright). Genuinely closes the 23-scenario evidence gap. Cost: 5–15 new devDependencies, config, transform pipeline, and — for Playwright — a browser download. On a project with no CI, the tests would still only run when a human remembers, so the honest benefit is smaller than it looks.
- **(c) Neither** — keep build+lint only. The defect class stays open and will recur; the triage evidence says it has already recurred twice.

**Tradeoff**: (b) is the only option that addresses item 9, and it is 1–2 orders of magnitude more expensive than (a) while still not being CI-enforced. (a) closes the class that has actually caused damage, at near-zero cost.

**My recommendation: (a) now, (b) as a separate change with its own decision.** If the maintainer wants the 23 scenarios covered, that deserves its own proposal, its own budget, and a CI conversation — not to be smuggled in as a line item here.

---

### Decision 4 — 2FA enrollment lockout: what shape does the new requirement take?

All three options below require a **new requirement** — nothing in the existing spec can be edited into covering this.

- **(a) Session continuity** — `TOTPConfirmForm.handleSubmit` calls `setTOTPCode(code)` after `confirm2FA` resolves. **~5 lines.** Narrows the window to the code's ~30s lifetime; a later navigation still 401s, and the recovery is still "go to /login". Cheapest, incomplete.
- **(b) Global `totp_required` handler + a `/users/logout/` backend exemption** — any authenticated surface that receives the 401 renders a code prompt, and logout is always exempt so a user can always reset. **~60–120 lines** + backend change + tests. Closes the class, not just this instance.
- **(c) Backend exemption for `/users/2fa/confirm/` only** — fixes the cause for enrollment. **~20 lines + tests.** Leaves every *other* mid-session auth-state change re-entering the same trap, which is the same root cause one layer down.
- **(d) Document and defer** — record it in `DEPLOYMENT.md`'s enablement-order step 5 ("after enrolling you will be signed out; sign in again") and fix the stale "no 2FA UI yet" line at `DEPLOYMENT.md:44`. **~3 lines.** Honest, but leaves the trap in place on the documented production path.

**Tradeoff**: (a) is 5 lines and materially reduces confusion but does not close it. (b) is the only real fix and costs a unit of work plus a backend touch. (c) is a band-aid. (d) is free and truthful, and given the escape hatch genuinely works (§7), it is a defensible interim.

**My lean: (b)**, because the root cause is the blanket per-request gate, and (a)/(c) both leave that gate one edit away from re-entering the trap. If the maintainer wants this change kept frontend-only and small, **(a) + (d)** together is an honest, coherent interim.

---

## 11. Recommended scope split

Ordered by descending risk. Each unit is independently reviewable and under the 400-line budget.

| # | Unit | Files | ~Lines | Risk | Blocked on |
|---|---|---|---|---|---|
| **U1** | **Token registration + the guard.** Register the 6 missing tokens; add `frontend/tests/design-tokens.test.mjs` + `prebuild` script. *Must land before any other token work — it is the ratchet.* | `globals.css` (+6), `package.json` (+1), new test (~75) | **~85** | Low | — |
| **U2** | **Backend gate.** Artifact-aware `STORAGES` selection; `backend/staticfiles/` to `.gitignore`. *Unblocks the declared backend gate; fully runtime-proven.* | `settings.py` (+7), `.gitignore` (+1) | **~8** | Low | — |
| **U3** | **`--outline-variant`.** One token value. | `globals.css` (+1) | **~1** | **High (visual)** | **Decision 2** |
| **U4** | **2FA lockout.** Whatever shape is chosen. | frontend and/or backend | **5–120** | **High (auth)** | **Decision 4** |
| **U5** | **Typography.** Scale tokens + `font-label` on primitives and shared input constants. | `globals.css` (+40), `button/badge/card.tsx` (+3), 5 class constants (+5) | **~50** | Medium (app-wide font change) | **Decision 1** |
| **U6** | **Elevation.** 4 shadow tokens + the 14 mapped sites. | `globals.css` (+10), 8 files (14 one-token edits) | **~30** | Medium (visible depth) | — |
| **U7** | **Contrast + a11y correctness.** `--text-muted` → `#5f6078`; 11 footer `focus-visible` rings; dead conditional; `summary` radius. | `globals.css` (1), `layout.tsx` (+11), `orders/[id]/page.tsx` (−3), `orders/page.tsx` (1) | **~20** | Low–Med | — |
| **U8** | **Carry-forward cleanups.** `qrcode.react` `^4.2.0` → `4.2.0`; `--color-offer` note. | `package.json` (1) | **~2** | Low | — |

**Safe to do with no product decision: U1, U2, U6, U7, U8.** **Blocked: U3 (D2), U4 (D4), U5 (D1).**

**Delivery notes**:
- `auto-chain` maps cleanly: 8 units, each with a clear start/finish/rollback. U1–U2 first (they unblock the two failing gates), then the decision-blocked units, then the rest.
- **U1 and U2 are the two that make the project's own gates green.** If only two units ship, ship those: U1 closes a defect class that has recurred twice, U2 turns a red declared gate green with 8 lines.
- **Rollback boundaries** are clean everywhere: U1 reverts 3 files with no runtime effect; U2 reverts 2 config lines; U3–U8 are token-value and class-value edits with no API, schema, or dependency change.
- **Do not merge U5 option (b) or the radius-ramp "correction" into any unit** — both are large unreviewed visual changes (see §6, §10 D1).

## 12. Carry-forward rulings on the parent's lower-priority suggestions

| Suggestion | Ruling | Detail |
|---|---|---|
| **`--color-offer` registered, zero usages; discount badge uses `secondary-container`** | **Document, do not code.** | **[V]** Confirmed: `--offer` (`globals.css:21`) / `--color-offer` (`:97`) have no usages; `ProductCard.tsx:76` uses `bg-secondary-container text-on-secondary-container`. **[D]** That pair measures **4.55:1** — passes AA. The spec scenario only requires "a distinct discount badge" → **passes**. **[V]** But `[R]`'s implication stands: `DESIGN.md:212` specifies the discount badge as `#ECFDF5` on `#065F46`, and the app renders `#6cf8bb` on `#00714d` — **not DESIGN.md-faithful**, merely semantically equivalent. **Not a violation of any MUST the spec states.** Record it as a low-priority design-fidelity note; do not spend a PR on it. Registered-but-unused is **not** a defect — the defect is declared-but-unregistered. |
| **Dead conditional, two identical ternary branches** | **CARRY. Delete it.** | **[V]** `app/orders/[id]/page.tsx:352-353` — both branches are `"bg-error/10 ring-error/30"`. Collapse to the single literal. **−3 lines.** Textbook "the fix DELETES something". Zero risk. |
| **11 footer links lack `:focus-visible` rings** | **CARRY. It IS a requirement violation — inherited is not exempt.** | **[V]** `app/layout.tsx` has **11** `href="#"` links (4 products, 4 help, 3 social) and **zero** occurrences of `focus-visible` in the whole file. **[R] correction**: the parent said "11 footer links **plus** 3 social links"; there are 11 **total**, not 14. `spec.md:75` says "**Every** interactive element MUST show a visible `:focus-visible` ring" with no grandfathering, and the scenario is "GIVEN a restyled page with buttons, links, and inputs". Pre-existing ≠ compliant. **[V]** The fix is mechanical and matches the pattern already in `Navbar.tsx:219` (`focus-visible:ring-3 focus-visible:ring-white/50`); the footer is `bg-[#1a1a1a] text-white`, so a white ring is correct. **~11 lines**, and it is real accessibility value. |
| **`rounded-md` on the disclosure trigger** | **CARRY.** | **[V]** `app/orders/page.tsx:328` — `<summary>` with `cursor-pointer` and `focus-visible:ring-2`. Button-like; spec maps buttons to `rounded-xl`. 1 line. |
| **Pin `qrcode.react` exactly, not `^4.2.0`** | **CARRY.** | **[V]** `package.json:17` — `"qrcode.react": "^4.2.0"`. Honest scoping: the `next build` TypeScript pass **would** catch an API-shape break (a renamed `marginSize` is a type error), so the residual risk is a major that changes *rendering* while keeping the same types. Pinning costs 1 line and removes even that. First new runtime dependency, no CI, no DOM runner — the calculus is asymmetric in favour of pinning. **1 line.** |
| **`docs/DEPLOYMENT.md:44` "no 2FA UI yet"** | **CARRY (not in the parent's list).** | **[V]** Stale since slice 5 shipped the login challenge. Same file's step 5 (`DEPLOYMENT.md:36`) is the documented path that triggers the §7 lockout on every admin's machine. **~3 lines**, and it belongs with whichever U4 shape is chosen. |
| **No `docker-compose.yml` in the repo** | **Note only.** | **[V]** `docs/DEPLOYMENT.md:81-104` documents a Docker Compose stack; only `backend/Dockerfile` and `frontend/Dockerfile` exist, and no compose file is present at the repo root. Out of scope here; flagged so it is not mistaken for a finding about this change. |

## 13. Risks

- **The parent's `--text-muted` fix (`#6b6c79`) would have shipped a still-failing value.** Adopting it unchanged leaves 118 muted-text sites below AA on three of six surfaces, while the change *looks* like a compliance fix. This is the single highest-value correction in this exploration. **[V] refutes [R]**
- **The radius-ramp "correction" is a trap.** DESIGN.md's named steps do not match the registered ramp (§6). "Fixing" it restyles all 48 `Button` usages and 11 radius sites in a commit that reads as spec compliance. Flag it loudly in the proposal.
- **A guard that ships without its registrations blocks the very population it protects.** U1 must contain both halves, or the first person to add a token trips their own build with no documented reason.
- **U3 is one line with an app-wide visual effect.** It will pass review as trivial and land as a restyle. Do not let it ship without an explicit decision.
- **The 2FA lockout is on the documented production path** (`DEPLOYMENT.md` step 5), not a theoretical edge. Every admin hits it during rollout. It is unreachable only because `DJANGO_2FA_ENFORCED` defaults to `False` — which `DEPLOYMENT.md:17` says production sets to `True`.
- **Nothing in this change is browser-verified**, and after U1–U2 that remains true. Saying otherwise would repeat the parent verify's honest-reporting failure in the opposite direction.
- **Do not let the stylesheet guard be mistaken for frontend test coverage.** It is a text assertion. The 23-scenario evidence gap is untouched by it.

## Key Learnings

1. Tailwind 4 emits no CSS and no error for a `:root` custom property that lacks a `--color-*` entry in `@theme inline`, so the class of defect is invisible to `next build`, `eslint`, and any reviewer reading a diff of the source.
2. A contrast fix validated against only the page background can still fail on the surface ramp; the binding constraint for a muted-text token is `#dae2fd`, not `#faf8ff`.
3. The cheapest durable guard for a purely textual invariant is Node's built-in `node:test`, wired through an npm `prebuild` hook, which needs zero dependencies and no DOM.
4. A blanket per-request authentication check with no endpoint exemption turns any mid-session privilege change into a lockout, and the TOTP lifetime does not prevent recovery when the login route itself is ungated.
5. `git check-ignore` returning exit 1 for `backend/staticfiles/` means a documented `collectstatic` prerequisite has no enforcement mechanism, so the fix must remove the prerequisite rather than describe it.
