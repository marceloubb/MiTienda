/**
 * Parser for `app/globals.css` and the theme-registration guard.
 *
 * `@theme inline` is the only place a `:root` custom property becomes a
 * Tailwind utility. A `:root` token that no registration targets generates
 * nothing, and that omission is invisible at runtime: the stylesheet stays
 * valid, the build stays green, and the token is simply dead. Making it loud
 * is the whole reason this module exists.
 *
 * Two properties keep the guard honest, and both are asserted in
 * `theme-registration.test.ts`:
 *
 * 1. `checkTokenRegistration` is pure over a stylesheet *string*, so it runs
 *    against the file that ships and against an in-memory mutation of it.
 *    Guard sensitivity cannot be proven by only editing the real file, and a
 *    guard that has never been seen failing is not evidence.
 * 2. Parsing is scoped to the top-level `:root` and `@theme inline` blocks. A
 *    whole-file scan would also pick up the `.dark` overrides, which are a
 *    different set of custom properties and are deliberately unregistered.
 */

export interface ParsedStylesheet {
  /** Custom properties declared in the top-level `:root` block, by name. */
  tokens: Map<string, string>;
  /** Custom properties registered in `@theme inline`, by theme-variable name. */
  registrations: Map<string, string>;
}

export interface RegistrationCheck {
  /** `:root` tokens with neither a registration targeting them nor an allowlist entry. */
  unregistered: string[];
  /** `var()` targets a registration resolves through that name nothing. */
  dangling: string[];
}

/**
 * Declared by `next/font` in `app/layout.tsx`, not in `:root`, so the reverse
 * direction has to allow them by name instead of waving them through.
 */
export const FONT_VARIABLES: readonly string[] = ['--font-jakarta', '--font-inter'];

/**
 * A `:root` token may be allowlisted only if it has no design-system utility
 * surface: registering it would either generate a utility no component
 * consumes, or would change a ramp the spec freezes. Every entry carries a
 * reason, and the test asserts both that the reason is non-empty and that the
 * token is genuinely unreferenced, so an entry cannot mask an accidental
 * omission. Adding an entry is a reviewable diff, not a silent pass.
 */
export const REGISTRATION_ALLOWLIST: Readonly<Record<string, string>> = {
  '--radius':
    '@theme inline registers a literal --radius-sm…--radius-4xl ramp that does not ' +
    'alias var(--radius). Registering --radius would repoint that whole global ' +
    'radius ramp, which the spec forbids.',
};

const COMMENT = /\/\*[\s\S]*?\*\//g;
const DECLARATION = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
const VAR_REFERENCE = /var\(\s*(--[a-z0-9-]+)/g;

/** Body of the block opened by `header`, matched by brace depth. */
function blockBody(css: string, header: string): string {
  const start = css.indexOf(header);
  if (start === -1) {
    throw new Error(`\`${header} { … }\` is not present in the stylesheet`);
  }
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') {
      depth += 1;
    } else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return css.slice(open + 1, index);
      }
    }
  }
  throw new Error(`\`${header}\` block is never closed`);
}

function declarations(block: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of block.matchAll(DECLARATION)) {
    found.set(name, value.trim());
  }
  return found;
}

/** The top-level `:root` and `@theme inline` blocks, keyed by custom property. */
export function parseStylesheet(source: string): ParsedStylesheet {
  // Comments are stripped first so a brace inside one cannot close a block early.
  const css = source.replace(COMMENT, '');
  return {
    tokens: declarations(blockBody(css, ':root')),
    registrations: declarations(blockBody(css, '@theme inline')),
  };
}

/** Raw `:root` custom property value as written in the stylesheet. */
export function readRootToken(source: string, name: string): string {
  const value = parseStylesheet(source).tokens.get(name);
  if (value === undefined) {
    throw new Error(`Token ${name} is not declared in the :root block of the stylesheet`);
  }
  return value;
}

/** Every `var()` target the given registrations resolve through. */
function targetsOf(registrations: Map<string, string>): Set<string> {
  const targets = new Set<string>();
  for (const value of registrations.values()) {
    for (const [, target] of value.matchAll(VAR_REFERENCE)) {
      targets.add(target);
    }
  }
  return targets;
}

/** Every `var()` target the `@theme inline` registrations resolve through. */
export function registrationTargets(source: string): string[] {
  return [...targetsOf(parseStylesheet(source).registrations)];
}

/**
 * The two-directional guard. Forward: every `:root` token is targeted by a
 * registration or allowlisted. Reverse: every target a registration resolves
 * through actually exists, so a renamed or deleted `:root` token is caught
 * rather than emitting a utility that silently computes to nothing.
 *
 * Offenders are returned instead of thrown so one run reports all of them and
 * the caller decides how to phrase the failure.
 */
export function checkTokenRegistration(source: string): RegistrationCheck {
  const { tokens, registrations } = parseStylesheet(source);
  const targets = targetsOf(registrations);
  const unregistered = [...tokens.keys()].filter(
    (name) => !targets.has(name) && !(name in REGISTRATION_ALLOWLIST),
  );
  const dangling = [...targets].filter(
    (name) => !tokens.has(name) && !FONT_VARIABLES.includes(name),
  );
  return { unregistered, dangling };
}
