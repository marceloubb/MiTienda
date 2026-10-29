import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './support/contrast';
import { parseStylesheet, readRootToken } from './support/css-tokens';

/**
 * Control-border guard, both directions.
 *
 * Task 3.3 is a *negative* constraint, and a negative constraint is the one
 * claim that cannot be checked by reading the diff. 15 boundaries move to
 * `border-control-border`; the dividers, table rules, content frames and status
 * chrome around them must not. A blanket repoint of all 29 sites would build
 * green, lint green and look deliberate, which is why the sweep is asserted
 * over the whole tree and not over the 15 sites.
 *
 * Sites are pinned as per-file class counts, never as line numbers: W6 edits
 * `components/ui/button.tsx:6`, six lines above the site task 3.2 cites, and
 * a line-pinned guard would fail on a later unit's correct change.
 *
 * W5b added a legitimate 16th boundary and had to be registered here.
 * `components/TotpChallengeDialog.tsx` reuses the same module-level `inputClass`
 * shape as `app/login/page.tsx`, so it is a real Bucket A site and not a
 * violation — but "real" is a judgement, and the guard cannot tell a new site
 * from a stray repoint. **A new boundary is therefore expected to fail this
 * guard until it is counted here. That failure is the guard working**: the
 * alternative is a guard that only ever recognises the boundaries it was written
 * against. The Bucket B sweep below is what actually catches an illegitimate
 * repoint, and it stays green either way.
 *
 * Verification limit: jsdom does not apply Tailwind's compiled output and
 * `@theme` is build-time only. Nothing here is browser verification.
 */

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const GLOBALS_CSS = read('app/globals.css');

/** Every `.tsx` under `app/`, `components/` and `lib/`, as package-relative paths. */
function tsxFiles(dir: string): string[] {
  return readdirSync(resolve(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && path.endsWith('.tsx') ? [path] : [];
  });
}

const TREE = [...tsxFiles('app'), ...tsxFiles('components'), ...tsxFiles('lib')];
const SOURCES = new Map(TREE.map((file) => [file, read(file)]));

/**
 * Class tokens in a source file, read from its string literals.
 *
 * A whole-file scan rather than a `className="…"` scan, and deliberately not a
 * grep: half the Bucket A boundaries are not in a `className` attribute at all
 * (`inputClass` in `app/login/page.tsx` is a module-level const that three
 * inputs spread), and a grep would also count the word in a comment or an
 * identifier. Interpolation braces are JSX syntax, so they become separators;
 * `:` and `/` are kept because variant prefixes and opacity modifiers belong
 * to the class.
 */
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
const SEPARATOR = /[^A-Za-z0-9:./%-]+/;
const CLASS_TOKEN = /^[a-z][a-z0-9:./%-]*$/i;

function classTokens(source: string): string[] {
  return (source.replace(/[{}]/g, ' ').match(STRING_LITERAL) ?? [])
    .flatMap((literal) => literal.split(SEPARATOR))
    .filter((token) => CLASS_TOKEN.test(token));
}

const CONTROL_BORDER = 'border-control-border';

function occurrences(source: string, className: string): number {
  return classTokens(source).filter((token) => token === className).length;
}

/** `file → count` for every file holding at least one occurrence of `className`. */
function siteCounts(sources: Map<string, string>, className: string): Record<string, number> {
  const counts = [...sources].map(([file, source]) => [file, occurrences(source, className)] as const);
  return Object.fromEntries(counts.filter(([, count]) => count > 0));
}

/** The 16 Bucket A control boundaries, one entry per element. Sum: 16. */
const CONTROL_BOUNDARIES = {
  'app/checkout/page.tsx': 2,
  'app/login/page.tsx': 1,
  'components/TotpChallengeDialog.tsx': 1,
  'app/page.tsx': 1,
  'app/products/page.tsx': 4,
  'app/profile/page.tsx': 3,
  'app/register/page.tsx': 1,
  'components/admin/StaffUserForm.tsx': 1,
  'components/admin/TOTPConfirmForm.tsx': 1,
  'components/ui/button.tsx': 1,
} as const;

/**
 * Bucket B boundaries that still carry the `#c4c5d5` value and must keep it.
 * `--border` and `--outline-variant` are the same hex, so `border-border` is
 * the utility that reaches it in `components/ui/badge.tsx`.
 */
const DIVIDERS: readonly (readonly [string, number, string])[] = [
  ['app/bodega/page.tsx', 1, 'border-outline-variant'],
  ['app/cart/page.tsx', 1, 'border-outline-variant'],
  ['app/orders/page.tsx', 1, 'border-outline-variant'],
  ['app/profile/page.tsx', 1, 'border-outline-variant'],
  ['components/admin/DispatchRoutesView.tsx', 1, 'border-outline-variant'],
  ['components/admin/InventoryView.tsx', 4, 'border-outline-variant'],
  ['components/admin/OrdersDashboard.tsx', 1, 'border-outline-variant'],
  ['components/admin/StaffUserList.tsx', 1, 'border-outline-variant'],
  ['components/admin/TOTPSecretCard.tsx', 2, 'border-outline-variant'],
  ['components/ui/badge.tsx', 1, 'border-border'],
];

describe('the control-border token (task 3.1)', () => {
  it('--control-border re-points at --outline and introduces no new hex', () => {
    expect(readRootToken(GLOBALS_CSS, '--control-border')).toBe('var(--outline)');
    expect(readRootToken(GLOBALS_CSS, '--outline')).toBe('#757684');
  });

  it('--color-control-border is the registration that emits the utility', () => {
    expect(parseStylesheet(GLOBALS_CSS).registrations.get('--color-control-border')).toBe(
      'var(--control-border)',
    );
  });

  it('the aliased value clears SC 1.4.11 on the binding surface', () => {
    const outline = readRootToken(GLOBALS_CSS, '--outline');
    expect(contrastRatio(outline, readRootToken(GLOBALS_CSS, '--surface-dim'))).toBeGreaterThanOrEqual(3);
  });
});

describe('Bucket A: exactly 16 control boundaries carry the token (task 3.2)', () => {
  it.each(Object.entries(CONTROL_BOUNDARIES))('%s holds %i control boundaries', (file, count) => {
    expect(occurrences(read(file), CONTROL_BORDER), file).toBe(count);
  });

  it('the whole tree holds 16 and no other file holds one', () => {
    expect(siteCounts(SOURCES, CONTROL_BORDER)).toEqual(CONTROL_BOUNDARIES);
  });
});

describe('Bucket B: dividers keep --outline-variant (task 3.3)', () => {
  it.each(DIVIDERS)('%s keeps its %i × %s boundaries', (file, count, className) => {
    expect(occurrences(read(file), className), `${file} must keep ${className}`).toBe(count);
  });

  it('no ring, background or text utility was swept along with the borders', () => {
    const swept = [...SOURCES].filter(([, source]) =>
      /(?<![a-z-])(ring|bg|text|outline|decoration|divide)-control-border/.test(source),
    );
    expect(swept.map(([file]) => file), 'a non-border utility was re-pointed').toEqual([]);
  });
});

describe('the guard is not vacuous', () => {
  it('a blanket repoint of one Bucket B divider is visible to the tree sweep', () => {
    const blanket = read('app/orders/page.tsx').replace('border-outline-variant', CONTROL_BORDER);
    expect(occurrences(blanket, 'border-outline-variant'), 'the repoint really happened').toBe(0);
    const sources = new Map(SOURCES).set('app/orders/page.tsx', blanket);
    expect(siteCounts(sources, CONTROL_BORDER)).not.toEqual(CONTROL_BOUNDARIES);
  });

  it('a Bucket A boundary reverted to --outline-variant is visible too', () => {
    const reverted = read('app/login/page.tsx').replace(CONTROL_BORDER, 'border-outline-variant');
    expect(occurrences(reverted, CONTROL_BORDER), 'the reversion really happened').toBe(0);
    const sources = new Map(SOURCES).set('app/login/page.tsx', reverted);
    expect(siteCounts(sources, CONTROL_BORDER)).not.toEqual(CONTROL_BOUNDARIES);
  });
});
