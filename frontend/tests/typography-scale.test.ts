import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseStylesheet } from './support/css-tokens';

/**
 * Typography-scale guard (tasks 4.1 and 4.2).
 *
 * Task 4.1's two acceptance criteria are both *absence* claims, and neither is
 * visible at runtime: a base `--text-{step}` token whose `--line-height`
 * sub-token is missing still builds, still lints, and emits a utility whose
 * line-height silently inherits. A step name that collides with a colour token
 * does the same — it repaints a utility the app already uses. Both are exactly
 * the silent-omission class W2's registration guard was written for, so this
 * suite follows its discipline: parse the stylesheet that ships, read the
 * values out of the design source rather than transcribing them, and prove
 * sensitivity with an in-memory mutation that is never written to disk.
 *
 * The design source is parsed here rather than a value table being hardcoded,
 * so correcting `docs/designs/DESIGN.md` moves the numbers under test instead
 * of leaving the suite asserting a stale copy.
 *
 * Verification limit: jsdom does not apply Tailwind's compiled output and
 * `@theme` is build-time only. Nothing here is browser verification — the
 * `npm run dev` harness that would show Inter rendering on a button is open.
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

/** The 12 `docs/designs/DESIGN.md` type steps, in the order the design lists them. */
const STEPS = [
  'display-hero',
  'headline-lg',
  'headline-md',
  'headline-sm',
  'price-hero',
  'price-card',
  'body-lg',
  'body-md',
  'body-sm',
  'label-lg',
  'label-md',
  'label-badge',
] as const;

/**
 * The colour tokens whose utilities share the `text-` prefix, so a scale step
 * reusing one of these names would repoint a utility the app already renders.
 * `--text-primary` and friends are the `:root` declarations; the utilities they
 * emit come from the `--color-text-*` registrations in the same block.
 */
const RESERVED_COLOUR_NAMES = ['primary', 'secondary', 'muted'] as const;

/** The named UI primitives that must render through `--font-label` (Inter). */
const LABEL_PRIMITIVES = {
  'components/ui/button.tsx': 'text-label-lg',
  'components/ui/badge.tsx': 'text-label-badge',
} as const;

/** The whitespace-split base class list of a primitive's `cva(...)` call. */
function baseClassList(file: string): string[] {
  const base = /cva\(\s*\n\s*"([^"]+)"/.exec(read(file));
  if (!base) throw new Error(`could not read the base class list of ${file}`);
  return base[1].split(/\s+/);
}

/**
 * The font-size utilities among a class list's `text-*` tokens.
 *
 * Classified by the *absence* of a registered colour, never by the presence of
 * a registered size. This stylesheet does not re-declare Tailwind's built-in
 * `--text-sm` / `--text-xs` / `--text-lg` (they arrive from the default theme),
 * so a size test keyed on `registrations.has('--text-…')` would report every
 * stock step as "not a size" and this guard would pass vacuously — the exact
 * failure mode the suite exists to prevent. The `--color-` registrations *are*
 * local (`--color-primary-foreground` at `globals.css:188`,
 * `--color-muted-foreground` at `:184`), so a genuine colour token reads as
 * colour and only a competing size is reported.
 */
function fontSizeUtilities(classList: readonly string[]): string[] {
  return classList.filter(
    (token) =>
      token.startsWith('text-') && !registrations.has(`--color-${token.slice('text-'.length)}`),
  );
}

interface DesignStep {
  fontSize: string;
  lineHeight: string;
}

/**
 * The `typography:` block of the design source, as `{ step → { fontSize, lineHeight } }`.
 *
 * Read from the file rather than transcribed, per W1's deviation 3: with a
 * hardcoded table, correcting the design document would leave the suite
 * green and asserting a value the product no longer ships.
 */
function readDesignScale(): Map<string, DesignStep> {
  const design = readFileSync(resolve(process.cwd(), '../docs/designs/DESIGN.md'), 'utf8');
  const lines = design.split(/\r?\n/);
  const start = lines.findIndex((line) => line === 'typography:');
  if (start === -1) throw new Error('`typography:` is not present in docs/designs/DESIGN.md');
  const scale = new Map<string, DesignStep>();
  let step: DesignStep | undefined;
  for (const line of lines.slice(start + 1)) {
    // A non-indented key ends the block (`rounded:` is the next one).
    if (/^\S/.test(line)) break;
    const named = /^ {2}([a-z0-9-]+):$/.exec(line);
    if (named) {
      step = { fontSize: '', lineHeight: '' };
      scale.set(named[1], step);
      continue;
    }
    if (!step) continue;
    const size = /^ {4}fontSize: (.+)$/.exec(line);
    if (size) step.fontSize = size[1].trim();
    const height = /^ {4}lineHeight: (.+)$/.exec(line);
    if (height) step.lineHeight = height[1].trim();
  }
  return scale;
}

const DESIGN = readDesignScale();
const { registrations, tokens } = parseStylesheet(GLOBALS_CSS);

/** Every `--text-*` registration, split into base steps and sub-tokens. */
const textRegistrations = [...registrations.keys()].filter((name) => name.startsWith('--text-'));
const baseSteps = textRegistrations.filter((name) => !name.endsWith('--line-height'));
const subTokens = textRegistrations.filter((name) => name.endsWith('--line-height'));

describe('the 12 scale steps are registered (task 4.1)', () => {
  it('the design source names exactly those 12 steps, each with a size and a line height', () => {
    expect([...DESIGN.keys()]).toEqual([...STEPS]);
    for (const [step, { fontSize, lineHeight }] of DESIGN) {
      expect(fontSize, `${step} has no fontSize in the design source`).not.toBe('');
      expect(lineHeight, `${step} has no lineHeight in the design source`).not.toBe('');
    }
  });

  it('every step is registered as a base --text-{step} token, in design order', () => {
    expect(baseSteps).toEqual(STEPS.map((step) => `--text-${step}`));
  });
});

describe('every scale step declares a paired line height', () => {
  it.each(STEPS)('--text-%s has a --line-height sub-token', (step) => {
    expect(
      registrations.get(`--text-${step}--line-height`),
      `--text-${step}--line-height is not registered, so its utility inherits a line-height`,
    ).toBe(DESIGN.get(step)?.lineHeight);
  });

  it('no line-height sub-token is left without its base token', () => {
    const orphans = subTokens.filter((name) => !registrations.has(name.replace('--line-height', '')));
    expect(orphans, 'a --text-*--line-height with no base emits no utility').toEqual([]);
  });
});

describe('values are verbatim from the design source', () => {
  it.each(STEPS)('--text-%s carries the size the design source states', (step) => {
    expect(registrations.get(`--text-${step}`)).toBe(DESIGN.get(step)?.fontSize);
  });

  it('every registered value is a literal, so no step re-points at a colour token', () => {
    const aliased = textRegistrations.filter((name) => registrations.get(name)?.includes('var('));
    expect(aliased, 'a size token must not alias a colour token').toEqual([]);
  });
});

describe('no step name collides with the existing text colour tokens', () => {
  it.each(RESERVED_COLOUR_NAMES)('--text-%s is a colour token, not a scale step', (name) => {
    expect(tokens.has(`--text-${name}`), `--text-${name} must stay a :root colour token`).toBe(true);
    expect(
      registrations.has(`--color-text-${name}`),
      `--color-text-${name} must stay the registration emitting text-${name}`,
    ).toBe(true);
  });

  it('the 12 step names are disjoint from the reserved colour names', () => {
    const reserved = new Set<string>(RESERVED_COLOUR_NAMES);
    const collisions = baseSteps
      .map((name) => name.slice('--text-'.length))
      .filter((step) => reserved.has(step));
    expect(collisions, 'a scale step shares a name with a text colour token').toEqual([]);
  });
});

describe('the font primitives survive (task 4.1)', () => {
  it('the two Jakarta Sans primitives and the Inter label primitive are registered', () => {
    expect(registrations.get('--font-sans')).toBe('var(--font-jakarta)');
    expect(registrations.get('--font-heading')).toBe('var(--font-jakarta)');
    expect(registrations.get('--font-label')).toBe('var(--font-inter)');
  });
});

describe('the label primitives are wired (task 4.2)', () => {
  it.each(Object.entries(LABEL_PRIMITIVES))('%s renders through font-label and its scale step', (file, step) => {
    const source = read(file);
    const base = /cva\(\s*\n\s*"([^"]+)"/.exec(source);
    expect(base, `could not read the base class list of ${file}`).not.toBeNull();
    expect(base?.[1], `${file} must carry font-label`).toContain('font-label');
    expect(base?.[1], `${file} must carry ${step}`).toContain(step);
  });

  it('no other file consumes the label scale', () => {
    for (const [file, step] of Object.entries(LABEL_PRIMITIVES)) {
      const holders = TREE.filter((candidate) => read(candidate).includes(step));
      expect(holders, `${step} must have exactly one consumer`).toEqual([file]);
    }
  });

  it('font-label reaches exactly the two primitives', () => {
    const holders = TREE.filter((file) => read(file).includes('font-label'));
    expect(holders.sort()).toEqual(Object.keys(LABEL_PRIMITIVES).sort());
  });
});

/**
 * Task 4.2 correction: the base class lists used to stack the scale step on a
 * stock step (`text-sm` on the button, `text-xs` on the badge).
 *
 * In Tailwind v4 every font-size utility carries the same specificity and the
 * whole namespace is emitted in one `@layer utilities` block sorted
 * alphabetically by class name, so the *name* decides the winner and markup
 * order is irrelevant. Measured on the production stylesheet:
 *
 *   .text-3xl 29916 · .text-base 30011 · .text-label-badge 30109
 *     · .text-label-lg 30177 · .text-lg 30242 · .text-sm 30334 · .text-xs 30518
 *     · .text-[0.8rem] 30610 · .text-[10px] 30644 · .text-[11px] 30674
 *
 * `text-sm` and `text-xs` therefore beat both label steps: the badge rendered
 * 12px/16px where the design source says 11px/14px, and the button kept a 20px
 * line height where `label-lg` says 18px. The build and the rest of this suite
 * were green throughout, because nothing in jsdom applies the compiled
 * cascade. Arbitrary-value steps sort *after* every named one, which is why
 * the `size="sm"` variant (`text-[0.8rem]`, 30610) and the `size="xs"` variant
 * (`text-xs`, 30518) still override the base — they out-sort `text-label-lg`
 * at 30177 and need no change.
 */
describe('the primitive size is not out-cascaded (task 4.2 correction)', () => {
  it.each(Object.entries(LABEL_PRIMITIVES))(
    '%s carries exactly one font-size utility, and it is its own scale step',
    (file, step) => {
      const sizes = fontSizeUtilities(baseClassList(file));
      expect(
        sizes,
        `${file} stacks a competing font-size utility; Tailwind v4 resolves the tie ` +
          `alphabetically, so the later name wins regardless of markup order`,
      ).toEqual([step]);
    },
  );

  it('the button size variants still override the base rather than duplicating it', () => {
    const source = read('components/ui/button.tsx');
    // The variants are vendored shadcn geometry, not this change's design
    // system, so this pins the property the correction depends on: they carry
    // their own size utility and do not restate the base step. A name that
    // out-sorts `text-label-lg` keeps the variant working.
    for (const variant of ['text-xs', 'text-[0.8rem]']) {
      expect(source, `the size variants must keep ${variant}`).toContain(variant);
    }
    expect(source).not.toMatch(/size=\s*\{\s*variant\s*=\s*"sm"[\s\S]*?text-label-lg/);
  });
});

describe('the guard is not vacuous', () => {
  const withoutSubToken = GLOBALS_CSS.replace('  --text-label-badge--line-height: 14px;\n', '');
  const withCollidingStep = GLOBALS_CSS.replace('--text-body-md: 14px;', '--text-primary: 14px;');
  const withRescaledStep = GLOBALS_CSS.replace('--text-label-lg: 14px;', '--text-label-lg: 0.875rem;');

  it('each fixture really mutated the stylesheet it was derived from', () => {
    expect(withoutSubToken).not.toBe(GLOBALS_CSS);
    expect(withCollidingStep).not.toBe(GLOBALS_CSS);
    expect(withRescaledStep).not.toBe(GLOBALS_CSS);
  });

  it('a missing line-height sub-token is visible to the pairing check', () => {
    const mutated = parseStylesheet(withoutSubToken).registrations;
    const steps = [...mutated.keys()].filter((name) => name.startsWith('--text-') && !name.endsWith('--line-height'));
    const unpaired = steps.filter((step) => !mutated.has(`${step}--line-height`));
    expect(unpaired).toEqual(['--text-label-badge']);
    expect(steps.length, 'the mutation must not have removed the base tokens').toBe(STEPS.length);
  });

  it('a step named after a colour token is visible to the collision check', () => {
    const mutated = parseStylesheet(withCollidingStep);
    const collisions = [...mutated.registrations.keys()]
      .filter((name) => name.startsWith('--text-') && !name.endsWith('--line-height'))
      .map((name) => name.slice('--text-'.length))
      .filter((step) => (RESERVED_COLOUR_NAMES as readonly string[]).includes(step));
    expect(collisions).toEqual(['primary']);
  });

  it('a rescaled value is visible against the design source', () => {
    expect(parseStylesheet(withRescaledStep).registrations.get('--text-label-lg')).toBe('0.875rem');
    expect(DESIGN.get('label-lg')?.fontSize).toBe('14px');
  });

  it('a re-added stock step is visible to the single-font-size check', () => {
    const pristine = baseClassList('components/ui/button.tsx');
    // The list exactly as task 4.2 left it: `text-sm` sat between
    // `bg-clip-padding` and `font-medium`. Reconstructing that authentic
    // position matters — the guard must catch the regression that actually
    // shipped, not just a synthetic token appended at the end.
    const preCorrection = [
      ...pristine.slice(0, pristine.indexOf('font-medium')),
      'text-sm',
      ...pristine.slice(pristine.indexOf('font-medium')),
    ];
    expect(fontSizeUtilities(preCorrection)).toEqual(['text-sm', 'text-label-lg']);
    // Position in the class list is irrelevant to the outcome, because
    // Tailwind v4 breaks the tie alphabetically in the compiled stylesheet.
    // Both placements must therefore be reported as a competing size.
    expect(fontSizeUtilities([...pristine, 'text-sm'])).toEqual(['text-label-lg', 'text-sm']);
    expect(fontSizeUtilities(preCorrection)).toHaveLength(2);
    expect(fontSizeUtilities(pristine), 'the shipped list must carry exactly one').toHaveLength(1);
  });

  it('a colour token on a base list is not mistaken for a competing size', () => {
    const withColour = [...baseClassList('components/ui/badge.tsx'), 'text-primary-foreground'];
    expect(registrations.has('--color-primary-foreground'), 'the colour token must be locally registered').toBe(true);
    expect(fontSizeUtilities(withColour)).toEqual(['text-label-badge']);
  });
});
