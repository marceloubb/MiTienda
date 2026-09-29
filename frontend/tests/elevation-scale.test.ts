import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseStylesheet } from './support/css-tokens';

/**
 * Elevation-scale guard, registration and cascade (tasks 5.1 and 5.2).
 *
 * Task 5.2's acceptance criterion is a *negative* claim, and this is the case
 * the design system has no lever for. In Tailwind v4 every `shadow-*` utility
 * lands in the same `@layer utilities` with identical specificity, so the
 * compiled stylesheet decides the winner by sorting the namespace
 * alphabetically:
 *
 *   shadow-2xl < shadow-level-0..3 < shadow-lg < shadow-sm
 *
 * Every stock Tailwind shadow out-sorts the custom level tokens. A surviving
 * `shadow-sm` therefore does not merely "win sometimes" — it wins
 * unconditionally, and a `shadow-level-1` on the same element is dead. Markup
 * order cannot express a preference and no author-side reordering exists, the
 * same mechanism W6 found in the `text-` namespace. The only available fix is
 * the one W6 applied to the font primitives: **delete the competitor**. So the
 * invariant this suite enforces is the whole design:
 *
 *   Every `shadow-*` utility anywhere in `app/` and `components/` is a
 *   `shadow-level-*` token. Zero stock shadows.
 *
 * That claim is invisible at runtime — the build stays green, lint stays
 * clean, and the surface simply keeps its stock elevation. Hence a guard, and
 * hence the "Guard Sensitivity" block at the end, which observes the extractor
 * failing rather than asserting that it would.
 *
 * **Two walk properties this suite has to earn rather than assume.**
 *
 * 1. `app/orders/[id]/` and `app/products/[id]/` hold literal square brackets
 *    in their *directory names*. `readdirSync(…, { withFileTypes: true })` and
 *    recursion on `entry.name` treat them as bytes, so they are reached. A walk
 *    that builds a glob per directory — `app/orders/[id]/` followed by a
 *    recursive `*.tsx` pattern — lets the glob engine read `[id]` as a
 *    character class, matches nothing, and the guard passes *vacuously* over
 *    the one file holding two of the migrated sites. The walk is therefore
 *    `readdirSync`-based, and the first describe block asserts the bracket
 *    directories are in the discovered set rather than trusting that they are.
 * 2. The discovered file count and the discovered usage count are both
 *    asserted. A walk that silently finds fewer files is indistinguishable
 *    from a clean tree, and a guard that reports "no stock shadows" because it
 *    read nothing is worse than no guard.
 *
 * Sites are pinned as per-file counts, never as line numbers, for the reason
 * `control-border.test.ts` gives: W8 and W5 edit `Navbar.tsx` and
 * `app/orders/[id]/page.tsx`, and a line-pinned guard would fail on a later
 * unit's correct change.
 *
 * The extractor is deliberately not shared with `control-border.test.ts`, which
 * tokenises whole string literals: this suite needs each utility's byte offset
 * to name the line in the failure message. One local helper, not a second
 * taxonomy.
 *
 * Verification limit: jsdom does not apply Tailwind's compiled output and
 * `@theme` is build-time only. Nothing here is browser verification. The
 * cascade argument above is a *static* one over the emitted order, proved from
 * the compiled stylesheet after a build — not an observed render.
 */

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const GLOBALS_CSS = read('app/globals.css');

/**
 * Every `.tsx` under `app/` and `components/`, as package-relative paths.
 *
 * `readdirSync` with `withFileTypes: true`, recursing on `entry.name`. Each
 * segment goes to the filesystem as a literal string, so a directory named
 * `[id]` is descended into rather than globbed. See the docblock.
 */
function tsxFiles(dir: string): string[] {
  return readdirSync(resolve(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && path.endsWith('.tsx') ? [path] : [];
  });
}

const TREE = [...tsxFiles('app'), ...tsxFiles('components')];
const SOURCES = new Map(TREE.map((file) => [file, read(file)] as const));

/** The design's four levels, in the order the scale ascends. */
const LEVELS = [0, 1, 2, 3] as const;

/** The only four `shadow-*` utilities that are not stock Tailwind. */
const LEVEL_TOKENS: readonly string[] = LEVELS.map((level) => `shadow-level-${level}`);

/** Route directories whose names hold literal square brackets. */
const BRACKET_FILES = ['app/orders/[id]/page.tsx', 'app/products/[id]/page.tsx'] as const;

/** Total `shadow-*` class-token occurrences across the tree, asserted at 18. */
const TOTAL_USAGES = 18;

const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

/**
 * A `shadow-*` class token, variant prefixes and an arbitrary value included.
 *
 * The variant prefix is matched rather than stripped by a later split, so
 * `hover:shadow-sm` and `md:group-hover:shadow-lg` are found whole and the
 * failure names the utility the developer actually wrote. The bracket
 * alternative keeps an arbitrary value intact
 * (`shadow-[0_0_0_1px_red]`) instead of truncating it at the first `_`.
 */
const SHADOW_CLASS = /(?<![\w-])(?:[a-z0-9*!_./-]+:)*shadow-(?:\[[^\]\n]*\]|[\w./%-]+)/gi;

interface ShadowUsage {
  /** The token as written, variant prefixes included. */
  utility: string;
  /** The token with its variant prefixes removed — the name the cascade sorts. */
  base: string;
  /** 1-based line in the file, so a failure is actionable. */
  line: number;
}

interface SitedUsage extends ShadowUsage {
  file: string;
}

/** Offsets of every string literal in `source`, half-open. */
function literalSpans(source: string): [number, number][] {
  return [...source.matchAll(STRING_LITERAL)].map((match) => [
    match.index,
    match.index + match[0].length,
  ]);
}

/** 1-based line number containing `offset`. */
function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split('\n').length;
}

/**
 * Every `shadow-*` utility in a source file, in order, with its line.
 *
 * Scoped to string literals, so the token cannot be counted out of a comment
 * or an identifier — the reason `control-border.test.ts` refuses a whole-file
 * grep. The literal span, not the line, is the unit, so a class string spread
 * across a multi-line template literal is still read whole.
 */
function shadowUsages(source: string): ShadowUsage[] {
  const spans = literalSpans(source);
  const inLiteral = (offset: number) => spans.some(([start, end]) => offset >= start && offset < end);
  return [...source.matchAll(SHADOW_CLASS)]
    .filter((match) => inLiteral(match.index))
    .map((match) => {
      const at = match[0].lastIndexOf(':');
      return {
        utility: match[0],
        base: at === -1 ? match[0] : match[0].slice(at + 1),
        line: lineOf(source, match.index),
      };
    });
}

/** Usages in one file, from the file that ships. */
function usagesIn(file: string): ShadowUsage[] {
  return shadowUsages(read(file));
}

/** Usages across a source map, each carrying its file, in file/line order. */
function allUsages(sources: ReadonlyMap<string, string> = SOURCES): SitedUsage[] {
  return [...sources]
    .flatMap(([file, source]) =>
      shadowUsages(source).map((usage) => ({ file, ...usage })),
    )
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/** Every usage the cascade would let a stock shadow override. */
function stockUsages(sources: ReadonlyMap<string, string> = SOURCES): SitedUsage[] {
  return allUsages(sources).filter((usage) => !LEVEL_TOKENS.includes(usage.base));
}

const { registrations, tokens } = parseStylesheet(GLOBALS_CSS);

/**
 * The `Ambient Shadow Hierarchy` of the design source, as `{ level → value }`.
 *
 * Read from the file rather than transcribed, for W6's reason: with a
 * hardcoded table, correcting `docs/designs/DESIGN.md` would leave this suite
 * green and asserting a value the product no longer ships.
 *
 * Level 0 states "No shadow" in prose rather than as a literal, so that bullet
 * is matched on its wording and resolves to `none`. A level carrying neither a
 * shadow literal nor the prose throws rather than defaulting — a missing value
 * must never read as a passing `none`.
 */
function readDesignScale(): Map<number, string> {
  const design = readFileSync(resolve(process.cwd(), '../docs/designs/DESIGN.md'), 'utf8');
  const lines = design.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '### Ambient Shadow Hierarchy');
  if (start === -1) {
    throw new Error('`Ambient Shadow Hierarchy` is not present in docs/designs/DESIGN.md');
  }
  const scale = new Map<number, string>();
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    const bullet = /^- \*\*Level (\d)\b/.exec(line);
    if (!bullet) continue;
    const level = Number(bullet[1]);
    const literal = [...line.matchAll(/`([^`]+)`/g)]
      .map(([, value]) => value)
      .find((value) => /^\d+px\s/.test(value));
    if (literal) {
      scale.set(level, literal);
      continue;
    }
    if (!/no shadow/i.test(line)) {
      throw new Error(`Level ${level} of the design source states no shadow value`);
    }
    scale.set(level, 'none');
  }
  return scale;
}

const DESIGN = readDesignScale();

/**
 * The 18 level-token usages task 5.2 leaves behind, one entry per element.
 *
 * 14 pre-existing stock usages converted 1:1 — `app/page.tsx` 2,
 * `app/products/page.tsx` 4, `app/orders/page.tsx` 1,
 * `app/orders/[id]/page.tsx` 2, `StaffKpiRow` 1, `StatusFilterChips` 2,
 * `DiscrepancyPanel` 1, `Navbar` 1 — plus 4 surfaces that carried no shadow
 * and now take a level: `ProductCard`, `app/cart/page.tsx`,
 * `app/products/[id]/page.tsx` and the `ui/card.tsx` base.
 *
 * The per-file split is the assertion that catches a blanket revert, a
 * duplicated paste and a missed site alike; a tree-wide total alone would
 * catch none of the three individually.
 */
const LEVEL_SITES: Readonly<Record<string, number>> = {
  'app/cart/page.tsx': 1,
  'app/orders/[id]/page.tsx': 2,
  'app/orders/page.tsx': 1,
  'app/page.tsx': 2,
  'app/products/[id]/page.tsx': 1,
  'app/products/page.tsx': 4,
  'components/Navbar.tsx': 1,
  'components/ProductCard.tsx': 1,
  'components/admin/DiscrepancyPanel.tsx': 1,
  'components/admin/StaffKpiRow.tsx': 1,
  'components/admin/StatusFilterChips.tsx': 2,
  'components/ui/card.tsx': 1,
};

describe('the walk reaches every file, brackets included', () => {
  it('discovers 37 .tsx files across app/ and components/', () => {
    // Without this, a walk that reached zero files would satisfy every
    // "no stock shadow" assertion below.
    expect(TREE).toHaveLength(37);
  });

  it.each(BRACKET_FILES)('%s is in the discovered set', (file) => {
    expect(TREE, `${file} was skipped — a glob walk reads [id] as a character class`).toContain(file);
  });

  it('reads every discovered file into the sweep', () => {
    expect(SOURCES.size).toBe(TREE.length);
  });
});

describe('the four levels are registered with the design source values (task 5.1)', () => {
  it('the design source names exactly the 4 levels', () => {
    expect([...DESIGN.keys()]).toEqual([...LEVELS]);
  });

  it.each(LEVELS)('--shadow-level-%i carries the value the design source states', (level) => {
    expect(registrations.get(`--shadow-level-${level}`), `--shadow-level-${level} is not registered`).toBe(
      DESIGN.get(level),
    );
  });

  it('every level is a literal, so no level aliases another token', () => {
    const aliased = LEVEL_TOKENS.filter((token) => registrations.get(`--${token}`)?.includes('var('));
    expect(aliased, 'a shadow token must not alias a :root token').toEqual([]);
  });

  it('the levels are registered in @theme inline, not left as :root tokens', () => {
    // A `:root` custom property with no registration emits no utility, so the
    // surface would stay at Tailwind's flat default — W2's silent-omission class.
    for (const level of LEVELS) {
      const name = `--shadow-level-${level}`;
      expect(registrations.has(name), `${name} needs an @theme inline registration`).toBe(true);
      expect(tokens.has(name), `${name} must not live only in :root`).toBe(false);
    }
  });
});

describe('zero stock shadow utilities survive (task 5.2)', () => {
  it('the whole tree holds 18 shadow usages and every one is a level token', () => {
    const found = allUsages();
    expect(found, 'the discovered usage count moved; re-measure before trusting the levels').toHaveLength(
      TOTAL_USAGES,
    );
    expect(
      found.filter((usage) => !LEVEL_TOKENS.includes(usage.base)),
      'a stock shadow was reintroduced',
    ).toEqual([]);
  });

  it.each(Object.entries(LEVEL_SITES))('%s holds %i level shadows', (file, count) => {
    expect(
      usagesIn(file).filter((usage) => LEVEL_TOKENS.includes(usage.base)),
      `${file} does not hold the ${count} level shadow(s) task 5.2 mapped`,
    ).toHaveLength(count);
  });

  it('the per-file counts account for the whole tree, so no file outside the map holds one', () => {
    const mapped = Object.values(LEVEL_SITES).reduce((total, count) => total + count, 0);
    expect(mapped).toBe(TOTAL_USAGES);
    const unmapped = allUsages().filter(
      (usage) => LEVEL_TOKENS.includes(usage.base) && !(usage.file in LEVEL_SITES),
    );
    expect(unmapped.map((usage) => `${usage.file}:${usage.line} — ${usage.utility}`)).toEqual([]);
  });

  it('no stock Tailwind shadow utility is referenced by any source file', () => {
    const stock = stockUsages().map((usage) => `  ${usage.file}:${usage.line} — ${usage.utility}`);
    expect(
      stock,
      'stock shadows out-sort every shadow-level-* token in the compiled @layer ' +
        'utilities, so each utility below silently overrides its level:\n' + stock.join('\n'),
    ).toEqual([]);
  });

  it('Level 3 is registered and unconsumed, as the design source describes', () => {
    expect(registrations.get('--shadow-level-3')).toBe('0px 16px 36px -6px rgba(15, 23, 42, 0.18)');
    expect(
      allUsages().filter((usage) => usage.base === 'shadow-level-3'),
      'Level 3 covers toasts and drawers; the app has neither yet',
    ).toEqual([]);
  });
});

describe('the guard is not vacuous', () => {
  it('a stock shadow in a class string is found, with its line', () => {
    const source = ['const a = <div className="rounded-2xl shadow-sm" />;', 'const b = "shadow-sm";'].join('\n');
    expect(shadowUsages(source).map((usage) => [usage.utility, usage.base, usage.line])).toEqual([
      ['shadow-sm', 'shadow-sm', 1],
      ['shadow-sm', 'shadow-sm', 2],
    ]);
  });

  it('a level token is read but never reported as stock', () => {
    const source = 'const a = <div className="shadow-level-1" />;';
    expect(shadowUsages(source)).toHaveLength(1);
    expect(shadowUsages(source).filter((usage) => !LEVEL_TOKENS.includes(usage.base))).toEqual([]);
  });

  it('a variant of a stock shadow is found, and the prefix survives for the message', () => {
    const source = 'const a = "hover:shadow-sm md:shadow-lg";';
    expect(shadowUsages(source).map((usage) => [usage.utility, usage.base])).toEqual([
      ['hover:shadow-sm', 'shadow-sm'],
      ['md:shadow-lg', 'shadow-lg'],
    ]);
    expect(shadowUsages(source).filter((usage) => !LEVEL_TOKENS.includes(usage.base))).toHaveLength(2);
  });

  it('a variant of a level token is not reported either', () => {
    expect(
      shadowUsages('const a = "hover:shadow-level-1";').filter(
        (usage) => !LEVEL_TOKENS.includes(usage.base),
      ),
    ).toEqual([]);
  });

  it('an arbitrary shadow value is read whole, not truncated at the first underscore', () => {
    const source = 'const a = "shadow-[0_0_0_1px_rgb(0_0_0_/_0.1)]";';
    expect(shadowUsages(source).map((usage) => usage.utility)).toEqual([
      'shadow-[0_0_0_1px_rgb(0_0_0_/_0.1)]',
    ]);
  });

  it('a shadow token in a comment is not counted', () => {
    expect(shadowUsages('// was shadow-sm here once')).toEqual([]);
  });

  it('a stock shadow reintroduced at a real site is visible to the sweep', () => {
    // The list as task 5.2 left it, mutated in memory only.
    const reverted = new Map(SOURCES).set(
      'components/Navbar.tsx',
      read('components/Navbar.tsx').replace('shadow-level-2', 'shadow-lg'),
    );
    expect(usagesIn('components/Navbar.tsx').map((usage) => usage.base)).toEqual(['shadow-level-2']);
    expect(stockUsages(reverted)).toEqual([
      { file: 'components/Navbar.tsx', utility: 'shadow-lg', base: 'shadow-lg', line: 115 },
    ]);
  });
});
