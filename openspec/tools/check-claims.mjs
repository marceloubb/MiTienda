#!/usr/bin/env node
/**
 * check-claims - an advisory linter for factual claims in SDD markdown artifacts.
 *
 * WHY THIS EXISTS
 * ---------------
 * The change `frontend-design-system-followups` failed three consecutive SDD verify
 * rounds on evidence prose and never on code. Every failure was a *citation* that
 * pointed at the wrong line, or a number that no longer matched the tree:
 *
 *   Round 1  a published contrast ratio of 2.60:1 where the true value was 1.4040:1,
 *            and a true conclusion reached from arithmetic that did not support it.
 *   Round 2  three `path:line` citations that were all false *when written*, plus a
 *            note that reasoned from those citations to a correct conclusion.
 *   Round 3  four drift sites: a test class cited three lines early, an effect cited
 *            one line early, three stale integers next to an array literal, and a
 *            work-unit row still reading `pending` under a status line that had
 *            already claimed completion.
 *
 * This tool looks for that species of defect. It is deliberately ADVISORY: every
 * finding is a *suspect*, never a verdict, and the exit code stays 0 even when
 * suspects are found. A CI gate that blocks on a heuristic guess gets disabled, and a
 * disabled checker catches nothing. Use `--strict` if you want a failing mode.
 *
 * WHAT IT CHECKS
 * --------------
 *   R1  bare `path:line` and `path.ext:NNN` citations: missing file, or a line number
 *       past the end of the file.
 *   R2  symbol-to-line citations: `TwoFAGateTests` is at L676, `foo` (L12), at
 *       `path.tsx:31`. Reported ONLY on a mismatch, never on "symbol not found".
 *   R3  range bounds: `L12-108`, `L62-67`, `L63-68` (hyphen, en dash, em dash).
 *   R4  advisory wording and exit codes (see above).
 *   R5  this file: Node standard library only, no dependencies.
 *   R6  verbatim failure transcripts are exempt, so a correct historical string is
 *       never flagged as stale.
 *   R7  `check-claims.test.mjs` covers the rest.
 *
 * Plus two narrow, low-false-positive stretch checks:
 *   arithmetic self-consistency of a stated total against its own `a + b + c` sum,
 *   and a work-unit table row that contradicts the `## Status:` line above it.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK
 * -----------------------------------
 * Counts. Asserting "Sum: 16" against a quoted object literal, or "exactly 15" against
 * a comma-separated list, needs the counting unit, the deduplication rule and the
 * scope, all of which are stated in different words at every site in this corpus. A
 * checker that guesses them cries wolf, and a checker that cries wolf gets switched
 * off. Arithmetic that is stated on the face of the line is checked; arithmetic that
 * has to be reconstructed is not.
 *
 * EXIT CODES
 * ----------
 *   0  ran to completion, whether or not suspects were found
 *   1  hard error: bad flags, unreadable input, parse failure
 *   2  `--strict` only: suspects were found
 *
 * USAGE
 * -----
 *   node openspec/tools/check-claims.mjs                      # every open change
 *   node openspec/tools/check-claims.mjs --change frontend-design-system-followups
 *   node openspec/tools/check-claims.mjs --strict --json      # opt-in failing mode
 *
 * In markdown, wrap a region a human has deliberately exempted with:
 *
 *   <!-- check-claims: skip -->
 *   ... anything here, including verbatim transcripts ...
 *   <!-- check-claims: endskip -->
 *
 * An unclosed `skip` runs to end of file.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Tunables. Each is a deliberate precision/recall trade, documented where it lives.
// ---------------------------------------------------------------------------

/** How far a cited line may sit from a symbol's definition site before it is a suspect. */
const DEFAULT_TOLERANCE = 0;

/** How far above a citation a named target file may sit and still be the intended one. */
const CONTEXT_LINES = 3;

/** Extensions we are willing to resolve a citation to and read line counts from. */
const READABLE_EXT = /\.(?:py|pyi|ts|tsx|js|jsx|mjs|cjs|mts|cts|json|jsonc|ya?ml|toml|md|mdx|css|scss|html|txt|sh|ps1|cfg|ini|c|h|go|rs|rb|java|kt|sql|lock|env)$/i;

/** Directories never walked when building the resolution index. */
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', '.venv', 'venv', 'env', '__pycache__',
  'dist', 'build', 'out', 'coverage', '.codegraph', '.atl', '.idea', '.vscode',
  '.pytest_cache', '.mypy_cache', '.ruff_cache', 'target', 'vendor',
]);

/**
 * Lines that discuss a citation instead of making one. An artifact that records its own
 * mistakes necessarily quotes the wrong number, and a checker that re-reports the
 * quoted number teaches the reader to ignore it. This list is intentionally narrow: a
 * broad one would swallow live claims, which is how a checker quietly stops working.
 */
const SELF_CORRECTION = new RegExp(
  [
    /\bCORRECTION\b/,                    // the corpus's own dated-correction convention
    /\bCORRECTED\b/,
    /\bwithdrawn\b/i,
    /\bwas false\b|\bwere false\b/i,
    /\bfalse when written\b/i,
    /\boff by one\b/i,
    /\bone line (?:lower|higher|off)\b/i,
    /\b(?:not|rather than|instead of)\s+L\d+/i,
    /\bat authoring time\b/i,
    /\bpre-change (?:number|line|citation)/i,
    /\bcorrected (?:separately|there|in the\b)/i,
    // A line that quotes a stale locator and then states the real one is reporting on a
    // citation, not making one. Both numbers are historical, so neither is a live claim.
    /\balready existed at\b/i,
    /\bit is at\b/i,
    /\b(?:miscount|off-by-one|off by one)s?\b/i,
    /\bpoints? at the right\b/i,
    /\bdo(?:es)? not re-?raise\b/i,
  ].map((r) => r.source).join('|'),
);

/**
 * Log vocabulary that marks a pasted failure transcript.
 *
 * Deliberately no `^\s*[-+]\s` diff-line rule: that matches every markdown bullet in
 * the corpus, and an exemption matching the artifact's own prose is not an exemption.
 * The signals kept here are the ones a test runner actually emits.
 */
const TRANSCRIPT_LINE = new RegExp(
  [
    /^\s*FAIL\b/,
    /^\s*✓\s*$/,
    /^\s*[×✗]\s/,
    /^\s*AssertionError\b/,
    /^\s*AssertionError:/,
    /\bAssertionError:/,
    /^\s*Test Files\s/,
    /^\s*Tests\s+\d+ (?:failed|passed)/,
    /^\s*-{2,}\s*$/,
    /^\s*│/,
    /^\s*⨯/,
  ].map((r) => r.source).join('|'),
);

/** Words that may sit between a symbol and its cited line for the two to count as bound. */
const CONNECTOR_WORD = new RegExp(
  [
    'at', 'as', 'is', 'are', 'in', 'on', 'of', 'for', 'to', 'line', 'lines',
    'sits', 'sit', 'sat', 'lives', 'live', 'opens', 'open', 'close', 'closes',
    'closed', 'here', 'there', 'resides', 'declare', 'declares', 'starting',
    'starts', 'start', 'ending', 'ends', 'end', 'through', 'to',
  ].join('|'),
);

/** A gap of only these words and punctuation binds a symbol to a line number. */
const CONNECTOR_GAP = new RegExp(
  '^[\\s\\(\\[\\{`\'":,;\\-–—.·]*\\b(?:' + CONNECTOR_WORD + ')\\b[\\s\\(\\[\\{`\'":,;\\-–—.·]*$',
  'i',
);
const CONNECTOR_GAP_EMPTY = new RegExp('^[\\s()\\[\\]{}`\'":,;.\\-–—·]*$');

// ---------------------------------------------------------------------------
// File index. Resolving `tests.py:676` needs to know which `tests.py` is meant, so we
// walk the tree once and remember every readable file by full path and by basename.
// ---------------------------------------------------------------------------

class FileIndex {
  constructor(root) {
    this.root = root;
    this.byPath = new Map(); // normalized repo-relative path -> { abs, lines }
    this.byBase = new Map(); // lowercase basename -> [{ abs, lines }]
    this.bySuffix = new Map(); // 'ui/card.tsx' -> [{ abs, lines }]
  }

  static normalizeKey(p) {
    return p.split(sep).join('/');
  }

  add(abs) {
    let lines;
    try {
      const text = readFileSync(abs, 'utf8');
      lines = text.split(/\r?\n/);
      // A trailing newline produces a final empty element that is not a real line.
      if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    } catch {
      return; // unreadable or binary: not a citation target
    }
    const rel = FileIndex.normalizeKey(relative(this.root, abs));
    const entry = { abs, rel, lines, text: lines.join('\n') };
    this.byPath.set(rel, entry);
    const base = rel.slice(rel.lastIndexOf('/') + 1).toLowerCase();
    if (!this.byBase.has(base)) this.byBase.set(base, []);
    this.byBase.get(base).push(entry);
    // Artifacts habitually drop the leading directories and write `ui/card.tsx` for
    // `frontend/components/ui/card.tsx`, so every path tail is addressable too.
    const parts = rel.split('/');
    for (let k = 1; k < parts.length; k += 1) {
      const suffix = parts.slice(k).join('/').toLowerCase();
      if (!this.bySuffix.has(suffix)) this.bySuffix.set(suffix, []);
      this.bySuffix.get(suffix).push(entry);
    }
  }

  build(dir, depth = 0) {
    if (depth > 12) return;
    let items;
    try {
      items = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      if (item.name.startsWith('.') && item.name !== '.github') continue;
      const abs = join(dir, item.name);
      if (item.isDirectory()) {
        if (SKIP_DIRS.has(item.name)) continue;
        this.build(abs, depth + 1);
      } else if (item.isFile() && READABLE_EXT.test(item.name)) {
        this.add(abs);
      }
    }
  }

  /**
   * Resolve a citation target into a verdict about the reference itself.
   *
   *   found     - resolves to a readable file
   *   shorthand - a tail of exactly one indexed file, e.g. `ui/card.tsx` for
   *               `frontend/components/ui/card.tsx`. Real, but not a claim worth judging.
   *   ambiguous - matches more than one file, e.g. `orders/page.tsx` under both `app/`
   *               and `app/admin/`. We cannot say such a reference is wrong.
   *   missing   - anchored inside a project tree and resolves to nothing
   *   unknown   - its first segment is not a directory of this project, so the path
   *               belongs elsewhere (site-packages, a sibling app, a URL)
   *
   * The last three are deliberately distinct. `app/cart/page.tsx` is a dead citation we
   * can prove; `orders/page.tsx` is a shorthand we cannot disambiguate; and
   * `whitenoise/middleware.py` is a Django internal that simply is not ours. Reporting
   * all three as "missing" is how a linter teaches its reader to ignore it.
   */
  resolveRef(ref, roots) {
    const cleaned = ref.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
    if (cleaned.includes('/')) {
      for (const r of roots) {
        const abs = resolve(r, cleaned);
        const rel = FileIndex.normalizeKey(relative(this.root, abs));
        const hit = this.byPath.get(rel);
        if (hit) return { status: 'found', entry: hit };
      }
      // `.next/static/chunks/*.css` and similar build outputs live outside the index
      // only because they are gitignored; check the filesystem before declaring them
      // missing, so a build artifact is not reported as a dead citation.
      for (const r of roots) {
        const abs = resolve(r, cleaned);
        if (existsSync(abs) && this.isReadable(abs)) {
          return {
            status: 'found',
            entry: {
              abs,
              rel: FileIndex.normalizeKey(relative(this.root, abs)),
              lines: readLines(abs),
            },
          };
        }
      }
    }
    const bySuffix = this.bySuffix.get(cleaned.toLowerCase());
    if (bySuffix) {
      return bySuffix.length === 1
        ? { status: 'shorthand', entry: bySuffix[0] }
        : { status: 'ambiguous', entry: null };
    }
    const byName = this.byBase.get(cleaned.toLowerCase());
    if (byName) {
      return byName.length === 1
        ? { status: 'shorthand', entry: byName[0] }
        : { status: 'ambiguous', entry: null };
    }
    if (cleaned.includes('/') && this.anchorKnown(cleaned, roots)) {
      return { status: 'missing', entry: null };
    }
    return { status: 'unknown', entry: null };
  }

  /** True when the reference's first segment is a real directory of this project. */
  anchorKnown(ref, roots) {
    const head = ref.split('/')[0];
    if (!head) return false;
    for (const r of roots) {
      if (existsSync(join(r, head))) return true;
    }
    return false;
  }

  isReadable(abs) {
    try {
      return statSync(abs).isFile() && statSync(abs).size < 8 * 1024 * 1024;
    } catch {
      return false;
    }
  }

  /** Every indexed line that defines `symbol`, strongest definition first. */
  findDefinition(symbol) {
    const re = definitionRegex(symbol);
    if (!re) return [];
    const hits = [];
    for (const entry of this.byPath.values()) {
      const lines = entry.lines;
      for (let i = 0; i < lines.length; i += 1) {
        const m = re.exec(lines[i]);
        if (!m) continue;
        const d = definedName(m);
        if (!d || d.name !== symbol) continue;
        // No `break`: a weak `foo = 1` above the real `class Foo` must not hide it.
        hits.push({ line: i + 1, strength: d.strength, file: entry });
      }
    }
    hits.sort(
      (a, b) =>
        b.strength - a.strength ||
        a.file.rel.localeCompare(b.file.rel) ||
        a.line - b.line,
    );
    return hits;
  }
}

function readLines(abs) {
  const text = readFileSync(abs, 'utf8');
  const lines = text.split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

// ---------------------------------------------------------------------------
// Symbol definition matching.
// ---------------------------------------------------------------------------

const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

/**
 * A "definition" is a line that introduces the name rather than mentions it. Three
 * shapes are recognized, weakest last:
 *
 *   1. `class|def|function|const|... <any identifier>`  -> strong, generic name
 *   2. `<keyword> <symbol>`                              -> strong, exact name
 *   3. `<symbol>\s*[:=(]`                                -> weak, assignment or call
 *
 * Shape 1 is generic on purpose: a citation naming `TwoFAGateTests` must still match
 * `class TwoFAGateTests`, and the name captured has to be compared exactly so that a
 * longer name merely starting with the cited one is not mistaken for it.
 */
function definitionRegex(symbol) {
  const s = symbol.replace(ESCAPE_RE, '\\$&');
  return new RegExp(
    '(?:^|[\\s;{(,])' +
      '(' +
        'class|struct|interface|type|enum|trait|def|func|fn|function|const|let|var|val|' +
        'export|module|record|object|impl|abstract|final|static|public|private|protected' +
      ')\\s+' +
      '([A-Za-z0-9_$.\\[\\]-]+)' +
      '|\\b(' + s + ')\\s*(?:[:=]|\\()' +
      '|\\b(class|def|function|interface|type|const|let|var)\\s+(' + s + ')\\b',
  );
}

/** The name a `definitionRegex` match introduces, with how much weight to give it. */
function definedName(m) {
  if (m[5]) return { name: m[5], strength: 1 };
  if (m[2]) return { name: m[2], strength: 1 };
  if (m[3]) return { name: m[3], strength: 0 };
  return null;
}

/**
 * The last line a definition starting at `index0` still occupies.
 *
 * `const inputClass =` and the string on the next line are one declaration, so a
 * citation naming either line is true. Without this every wrapped declaration in the
 * corpus reads as a one-line drift, and the checker's signal drowns in its own noise.
 * The test only ever widens what counts as a match, so a loose guess costs recall and
 * never invents an alarm.
 */
function definitionEnd(lines, index0) {
  const OPEN = { '(': 1, '[': 1, '{': 1 };
  const CLOSE = { ')': 1, ']': 1, '}': 1 };
  const CONT = /[=+\-*/&|,:([{]\s*$/;
  const limit = Math.min(lines.length, index0 + 40);
  let depth = 0;
  for (let i = index0; i < limit; i += 1) {
    for (const ch of lines[i]) {
      if (OPEN[ch]) depth += 1;
      else if (CLOSE[ch]) depth -= 1;
    }
    const tail = lines[i].replace(/\/\/.*$/, '').replace(/\s+$/, '');
    if (depth <= 0 && !CONT.test(tail)) return i + 1;
  }
  return limit;
}

// ---------------------------------------------------------------------------
// Region classification (R6).
// ---------------------------------------------------------------------------

/**
 * Mark every line of `lines` with why it must not be checked.
 * Returns an array of `null` (checkable) or a reason string.
 */
function classifyRegions(lines) {
  const region = new Array(lines.length).fill(null);
  let fence = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      region[i] = fence.reason;
      if (fenceMatch && fenceMatch[1][0] === fence.char && fenceMatch[1].length >= fence.len
          && fenceMatch[2].trim() === '') {
        fence = null;
      }
      continue;
    }
    if (fenceMatch) {
      const body = [];
      let j = i + 1;
      while (j < lines.length) {
        const end = /^\s{0,3}(`{3,}|~{3,})\s*$/.exec(lines[j]);
        if (end && end[1][0] === fenceMatch[1][0] && end[1].length >= fenceMatch[1].length) break;
        body.push(lines[j]);
        j += 1;
      }
      const isLog = body.some((b) => TRANSCRIPT_LINE.test(b))
        || /\bAssertionError\b|Test Files\s+\d+|Tests\s+\d+ (?:failed|passed)/.test(fenceMatch[2]);
      const reason = isLog ? 'transcript' : 'code-fence';
      for (let k = i; k <= Math.min(j, lines.length - 1); k += 1) region[k] = reason;
      i = j;
      continue;
    }
    if (/^\s{4,}\S/.test(line) && !/^\s{4,}[-*+]\s/.test(line)) {
      // 4-space indented block: quoted source, not the artifact's own claim
      region[i] = 'indented-code';
      continue;
    }
    if (TRANSCRIPT_LINE.test(line)) {
      region[i] = 'transcript';
      continue;
    }
    if (SELF_CORRECTION.test(line)) {
      region[i] = 'self-correction';
      continue;
    }
  }

  // Explicit human exemption, applied last so it wins over every other rule.
  const skipStart = '<!-- check-claims: skip -->';
  const skipEnd = '<!-- check-claims: endskip -->';
  let skipping = false;
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (t === skipStart) { skipping = true; region[i] = 'skipped'; continue; }
    if (t === skipEnd) { skipping = false; region[i] = 'skipped'; continue; }
    if (skipping) region[i] = 'skipped';
  }
  return region;
}

// ---------------------------------------------------------------------------
// Citation extraction.
// ---------------------------------------------------------------------------

// A range tail may repeat the `L` prefix (`L12-108`, `L12-L108`) or drop it (`L12-108`),
// and the dash may be a hyphen, an en dash or an em dash with or without padding.
const PATH_RE = /`?([A-Za-z0-9_@.\-]+(?:\/[A-Za-z0-9_@.\-\[\]]+)*\.[A-Za-z0-9]+)`?\s*:(\d+)(?:\s*[-–—]\s*L?\s*(\d+))?/g;
const L_RE = /\bL\s?(\d+)(?:\s*[-–—]\s*L?\s*(\d+))?/g;
const SYMBOL_RE = /`([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)`/g;
const FILE_RE = /`?([A-Za-z0-9_@.\-]+(?:\/[A-Za-z0-9_@.\-\[\]]+)*\.[A-Za-z0-9]+)`?/g;

const NOT_A_SYMBOL = new Set([
  'true', 'false', 'null', 'undefined', 'none', 'both', 'each', 'and', 'the', 'this',
  'done', 'pending', 'complete', 'blocked', 'red', 'green', 'ok', 'yes', 'no',
]);

function looksLikeSymbol(s) {
  const leaf = s.slice(s.lastIndexOf('.') + 1);
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(leaf)) return false;
  if (NOT_A_SYMBOL.has(leaf.toLowerCase())) return false;
  if (/^[0-9]/.test(leaf)) return false;
  // An identifier, not prose: snake_case, camelCase, PascalCase, or a stem with a digit.
  return /_/.test(leaf) || /[a-z][A-Z]/.test(leaf) || /^[A-Z]/.test(leaf) || /\d/.test(leaf);
}

function extractFileRefs(line) {
  const refs = [];
  FILE_RE.lastIndex = 0;
  let m;
  while ((m = FILE_RE.exec(line)) !== null) {
    if (!READABLE_EXT.test(m[1])) continue;
    refs.push({ ref: m[1], at: m.index, end: m.index + m[0].length });
  }
  return refs;
}

function extractLTokens(line) {
  const out = [];
  L_RE.lastIndex = 0;
  let m;
  while ((m = L_RE.exec(line)) !== null) {
    const after = line.slice(m.index + m[0].length);
    if (/^\s*=/.test(after)) continue;      // `L3=0` is a level label, not a line
    if (/^\s*[:：]/.test(after)) continue;   // `L 12:` is prose punctuation
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      from: Number(m[1]),
      to: m[2] === undefined ? Number(m[1]) : Number(m[2]),
      text: m[0],
    });
  }
  return out;
}

function extractSymbols(line) {
  const out = [];
  SYMBOL_RE.lastIndex = 0;
  let m;
  while ((m = SYMBOL_RE.exec(line)) !== null) {
    if (looksLikeSymbol(m[1])) out.push({ name: m[1], at: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * True when nothing but connector words and punctuation separates two anchors, reading
 * in document order. The order check is load-bearing: without it `slice` returns an
 * empty string for a reversed pair, and the empty gap matches, so every symbol on a
 * line would "bind" to every line number that happens to follow it.
 */
function boundTogether(aEnd, bStart, text) {
  if (aEnd > bStart) return false;
  const gap = text.slice(aEnd, bStart);
  if (gap.length > 60) return false;
  return CONNECTOR_GAP_EMPTY.test(gap) || CONNECTOR_GAP.test(gap);
}

/** Build a resolution index for a project root. Exported so callers can reuse one. */
export function createIndex(root) {
  const ix = new FileIndex(root);
  ix.build(root);
  return ix;
}

/** Internal helpers exposed for the test suite; not part of the CLI contract. */
export const __debug = {
  bound: boundTogether,
  symbols: extractSymbols,
  lTokens: extractLTokens,
  fileRefs: extractFileRefs,
  regions: classifyRegions,
  selfCorrection: SELF_CORRECTION,
  index: createIndex,
};

// ---------------------------------------------------------------------------
// The checker.
// ---------------------------------------------------------------------------

const PROJECT_MARKERS = ['package.json', 'manage.py', 'pyproject.toml', 'go.mod', 'Cargo.toml'];

/**
 * The directories a citation's relative path may be written against, most specific
 * first. A change writes `app/cart/page.tsx` for `frontend/app/cart/page.tsx` and
 * `mitienda/tests.py` for `backend/mitienda/tests.py`, so a single repository root
 * would call almost every real citation dead.
 */
function resolutionRoots(root, changeDir) {
  const roots = [];
  const push = (d) => { if (d && !roots.includes(d)) roots.push(d); };
  push(changeDir);
  push(join(changeDir, 'specs'));
  push(join(root, 'openspec', 'specs'));
  push(root);
  // Subproject roots are found by their marker file, not by guessing folder names.
  let entries = [];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return roots;
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const dir = join(root, e.name);
    for (const marker of PROJECT_MARKERS) {
      if (existsSync(join(dir, marker))) {
        push(dir);
        break;
      }
    }
  }
  return roots;
}

export function checkFile(absPath, opts = {}) {
  const { root, changeDir, index, tolerance = DEFAULT_TOLERANCE } = opts;
  const relToRoot = FileIndex.normalizeKey(relative(root, absPath));
  const relToChange = FileIndex.normalizeKey(relative(changeDir, absPath));
  const roots = opts.roots && opts.roots.length
    ? opts.roots
    : resolutionRoots(root, changeDir);

  let text;
  try {
    text = readFileSync(absPath, 'utf8');
  } catch (err) {
    return { file: relToRoot, change: relToChange, suspects: [], error: `unreadable: ${err.message}` };
  }
  const lines = text.split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  const region = classifyRegions(lines);

  const suspects = [];
  const add = (s) => { if (s) suspects.push(s); };
  const lineNo = (i) => i + 1;
  const cite = (s) => `${relToChange}:${lineNo(s.lineIndex)}`;

  // -- R1 / R3: `path:line` and `path.ext:NNN` ------------------------------
  for (let i = 0; i < lines.length; i += 1) {
    if (region[i]) continue;
    const line = lines[i];
    PATH_RE.lastIndex = 0;
    let m;
    while ((m = PATH_RE.exec(line)) !== null) {
      const ref = m[1];
      const from = Number(m[2]);
      const to = m[3] === undefined ? from : Number(m[3]);
      const resolved = index.resolveRef(ref, roots);
      const entry = resolved.entry;
      const at = `${cite({ lineIndex: i })} (${m[0].trim()})`;

      if (!entry) {
        // `unknown` covers a path outside every project tree and `shorthand` a tail of a
        // real file; neither is a claim this checker can judge.
        if (resolved.status === 'missing') {
          add({
            rule: 'R1-missing-file',
            file: relToChange,
            line: lineNo(i),
            at,
            suspect: `cited file \`${ref}\` was not found under any project root`,
            why: 'the path is anchored inside a project tree and resolves to nothing',
          });
        }
        continue;
      }
      const count = entry.lines.length;
      if (to > count) {
        add({
          rule: 'R1-line-out-of-range',
          file: relToChange,
          line: lineNo(i),
          at,
          suspect: `\`${entry.rel}\` has ${count} line${count === 1 ? '' : 's'}, so ${from === to ? `L${from}` : `L${from}-${to}`} points past the end`,
          why: 'the cited line cannot exist in the file as it stands',
        });
      }
    }
  }

  // -- R3: bare `L<n>` / `L<n>-<m>` ranges ---------------------------------
  for (let i = 0; i < lines.length; i += 1) {
    if (region[i]) continue;
    const line = lines[i];
    const tokens = extractLTokens(line);
    if (tokens.length === 0) continue;
    for (const t of tokens) {
      const target = targetForToken(lines, region, i, t, index, roots);
      if (!target) continue; // no file in reach: nothing to bound the range against
      if (t.to <= target.count) continue;
      add({
        rule: 'R3-range-out-of-bounds',
        file: relToChange,
        line: lineNo(i),
        at: `${cite({ lineIndex: i })} (${t.text.trim()})`,
        suspect: `\`${target.rel}\` has ${target.count} line${target.count === 1 ? '' : 's'}, so the cited ${t.from === t.to ? `line L${t.from}` : `range L${t.from}-${t.to}`} reaches past the end`,
        why: 'the range does not fit the file it is attributed to',
      });
    }
  }

  // -- R2: symbol bound to a cited line ------------------------------------
  for (let i = 0; i < lines.length; i += 1) {
    if (region[i]) continue;
    const line = lines[i];
    const symbols = extractSymbols(line);
    const lTokens = extractLTokens(line);
    const fileRefs = extractFileRefs(line);
    if (symbols.length === 0) continue;
    if (lTokens.length === 0 && fileRefs.every((f) => !/:/.test(lines[i].slice(f.at, f.end)))) continue;

    // Anchors are line numbers from either spelling: `L676` or `path.tsx:676`.
    const anchors = [];
    for (const t of lTokens) anchors.push({ at: t.start, end: t.end, from: t.from, to: t.to, text: t.text.trim() });
    for (const f of fileRefs) {
      const after = lines[i].slice(f.end);
      const m = /^\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?/.exec(after);
      if (m) {
        anchors.push({
          at: f.end,
          end: f.end + m[0].length,
          from: Number(m[1]),
          to: m[2] === undefined ? Number(m[1]) : Number(m[2]),
          text: `${f.ref}:${m[0].trim()}`,
          ref: f.ref,
        });
      }
    }
    if (anchors.length === 0) continue;

    for (const sym of symbols) {
      // A symbol owns only the number nearest to it. In `L24 \`inputClass\`, L235 city`
      // both numbers sit close enough to bind, but the first one already names the
      // symbol and the second belongs to whatever follows it.
      const bound = [];
      for (const anchor of anchors) {
        if (!boundTogether(sym.end, anchor.at, line) && !boundTogether(anchor.end, sym.at, line)) {
          continue;
        }
        bound.push({
          anchor,
          distance: Math.min(
            Math.abs(sym.end - anchor.at),
            Math.abs(anchor.end - sym.at),
          ),
        });
      }
      if (bound.length === 0) continue;
      const nearest = Math.min(...bound.map((b) => b.distance));
      for (const { anchor } of bound.filter((b) => b.distance === nearest)) {
        const bound = boundTogether(sym.end, anchor.at, line) || boundTogether(anchor.end, sym.at, line);
        if (!bound) continue;

        let targetFile = anchor.ref ? index.resolveRef(anchor.ref, roots).entry : null;
        let viaSymbolSearch = false;
        if (!targetFile) {
          // The file the line is talking about is the reference nearest this claim, not
          // the last one on the line: a task line ends with its verify command, and
          // reading that as the subject would point every symbol at `manage.py`.
          const near = targetForToken(lines, region, i, { start: anchor.at, end: anchor.end }, index, roots);
          if (near) targetFile = { rel: near.rel, abs: near.abs, lines: readLines(near.abs) };
        }
        if (!targetFile) {
          // No target file on the line. A symbol that is defined in exactly one file
          // in the repository is still unambiguous evidence, which is how
          // `tests.py:676` resolves when two different `tests.py` exist.
          const defs = index.findDefinition(sym.name);
          if (defs.length === 0) continue;
          const strong = defs.filter((d) => d.strength === 1);
          const pool = strong.length > 0 ? strong : defs;
          const files = new Set(pool.map((d) => d.file.rel));
          if (files.size !== 1) continue;
          targetFile = pool[0].file;
          viaSymbolSearch = true;
        }
        if (!targetFile) continue;

        const re = definitionRegex(sym.name);
        if (!re) continue;
        const found = [];
        targetFile.lines.forEach((l, idx) => {
          const mm = re.exec(l);
          if (!mm) return;
          const d = definedName(mm);
          if (!d || d.name !== sym.name) return;
          found.push({ line: idx + 1, end: definitionEnd(targetFile.lines, idx), strength: d.strength });
        });
        if (found.length === 0) continue; // never report "symbol not found"
        // A name may be defined many times over: `tearDown` exists in six test classes.
        // The claim holds if *any* definition lands in the cited span, and when none
        // does, the one to name is the nearest, not the first in the file.
        const citedEnd = anchor.from >= 1
          ? definitionEnd(targetFile.lines, anchor.from - 1)
          : anchor.to;
        const lo = Math.min(anchor.from, citedEnd) - tolerance;
        const hi = Math.max(anchor.to, citedEnd) + tolerance;
        if (found.some((f) => f.line <= hi && f.end >= lo)) continue;
        const distanceTo = (f) =>
          f.line > hi ? f.line - hi : f.end < lo ? lo - f.end : 0;
        const best = found
          .slice()
          .sort((a, b) => b.strength - a.strength || distanceTo(a) - distanceTo(b) || a.line - b.line)[0];

        add({
          rule: 'R2-symbol-line-mismatch',
          file: relToChange,
          line: lineNo(i),
          at: `${cite({ lineIndex: i })} (\`${sym.name}\` ${anchor.text})`,
          suspect: `\`${sym.name}\` is cited at L${anchor.from}, and the strongest definition site in \`${targetFile.rel}\` is L${best.line}`,
          why: viaSymbolSearch
            ? 'the cited line does not reach the symbol; confirm whether the artifact means a different file or a pre-change revision'
            : 'the cited line does not reach the symbol; confirm whether the artifact means a pre-change revision',
        });
      }
    }
  }

  // -- Stretch: a work-unit row contradicting the `## Status:` line ---------
  suspects.push(...checkStatusContradiction(lines, region, relToChange));

  suspects.sort((a, b) => a.line - b.line);
  return { file: relToRoot, change: relToChange, lines: lines.length, suspects };
}

/**
 * The file a bare `L<n>` on line `i` belongs to, or null when the line does not say.
 *
 * Attribution is only trusted when the line scopes the number to a file itself:
 *
 *   1. a reference carrying its own line number (`css-tokens.ts:27`) opens a scope that
 *      the bare numbers after it belong to;
 *   2. a table row naming exactly one file puts every number in that row in it;
 *   3. a heading-like line ending in `:`, `|` or an em dash names the file for the
 *      block that follows.
 *
 * Everything else returns null. "Create `helper.ts` and parse `:root` (L7-82)" is the
 * case that matters: the ranges describe a file the line never links, and binding them
 * to the helper invents an out-of-bounds error out of a citation that was never made.
 */
function targetForToken(lines, region, i, claim, index, roots) {
  const refs = extractFileRefs(lines[i]);
  const numbered = refs.filter((r) => /^\s*:\s*\d/.test(lines[i].slice(r.end)));
  let scoped = null;
  let scopedDistance = Infinity;
  for (const r of numbered) {
    const distance = r.end <= claim.start ? claim.start - r.end : 1e9;
    if (distance < scopedDistance) {
      scopedDistance = distance;
      scoped = r;
    }
  }
  if (scoped) {
    const hit = index.resolveRef(scoped.ref, roots).entry;
    if (hit) return { rel: hit.rel, count: hit.lines.length, abs: hit.abs };
  }
  const isRow = /^\s*\|/.test(lines[i]);
  if (refs.length === 1) {
    const hit = index.resolveRef(refs[0].ref, roots).entry;
    if (hit && isRow) return { rel: hit.rel, count: hit.lines.length, abs: hit.abs };
  }
  for (let j = i - 1; j >= 0 && j > i - CONTEXT_LINES; j -= 1) {
    if (region[j]) continue;
    if (!lines[j].trim()) continue;
    if (!/[:|—]\s*$/.test(lines[j])) break; // the scope header ended
    const prev = extractFileRefs(lines[j]);
    if (prev.length !== 1) break;
    const hit = index.resolveRef(prev[0].ref, roots).entry;
    if (hit) return { rel: hit.rel, count: hit.lines.length, abs: hit.abs };
  }
  return null;
}

const UNIT_RE = /\bW\d+[a-z]?\b/g;
const PENDING_RE = /\bpending\b|\bnot started\b|\btodo\b|\bin progress\b|\bblocked\b/i;

/**
 * A `## Status:` heading asserts that named work units are done. A table in the same
 * file that still calls one of them `pending` is a self-contradiction, and the reader
 * who scans the table is told the opposite of the truth. Only ids inside a clause that
 * actually carries a completion word are claimed complete, so a status line that says
 * "W1, W2 complete; W3 pending" produces no finding.
 */
function checkStatusContradiction(lines, region, relToChange) {
  const out = [];
  let claimed = null;
  for (let i = 0; i < lines.length; i += 1) {
    if (region[i]) continue;
    const m = /^#{2,6}\s*status\b/i.exec(lines[i]);
    if (!m) continue;
    const body = [];
    let j = i + 1;
    while (j < lines.length && !/^#{1,6}\s/.test(lines[j]) && body.length < 6) { body.push(lines[j]); j += 1; }
    const text = body.join(' ');
    if (!/\b(complet|done|landed|shipped|finished)\b/i.test(text)) continue;
    if (!/\bpending\b|\bin progress\b|\bnot started\b/i.test(text)) continue; // not a completeness claim
    claimed = { set: new Set(text.match(UNIT_RE) || []), line: i + 1 };
    break;
  }
  if (!claimed || claimed.set.size === 0) return out;

  for (let i = 0; i < lines.length; i += 1) {
    if (region[i]) continue;
    const line = lines[i];
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const units = cells[0].match(UNIT_RE) || [];
    if (units.length === 0) continue;
    const stateCell = cells[1];
    if (!PENDING_RE.test(stateCell)) continue;
    for (const u of units) {
      if (!claimed.set.has(u)) continue;
      out.push({
        rule: 'stretch-status-contradiction',
        file: relToChange,
        line: i + 1,
        at: `${relToChange}:${i + 1} (${u})`,
        suspect: `the table row for \`${u}\` reads "${stateCell}" while the Status heading at line ${claimed.line} lists it as complete`,
        why: 'a reader scanning the table is told the opposite of the headline',
      });
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Target discovery and CLI.
// ---------------------------------------------------------------------------

export function findRepoRoot(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, '.git')) || existsSync(join(dir, 'openspec'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

function listMarkdown(dir, out = []) {
  let items;
  try {
    items = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const item of items) {
    if (item.name.startsWith('.')) continue;
    const abs = join(dir, item.name);
    if (item.isDirectory()) {
      if (SKIP_DIRS.has(item.name)) continue;
      listMarkdown(abs, out);
    } else if (item.isFile() && /\.mdx?$/.test(item.name)) {
      out.push(abs);
    }
  }
  return out;
}

/** Open change directories: direct children of `openspec/changes`, archive excluded. */
export function listChanges(changesRoot) {
  let items;
  try {
    items = readdirSync(changesRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return items
    .filter((i) => i.isDirectory() && i.name !== 'archive' && !i.name.startsWith('.'))
    .map((i) => join(changesRoot, i.name))
    .sort();
}

const USAGE = `check-claims - advisory checker for stale factual claims in SDD markdown

  node openspec/tools/check-claims.mjs [options] [paths...]

Options
  --change <name>   check one change directory (repeatable)
  --root <dir>      repository root (default: discovered from the working directory)
  --tolerance <n>   line tolerance for a symbol citation (default ${DEFAULT_TOLERANCE})
  --strict          exit 2 when suspects are found
  --json            machine-readable output
  --include-archive also check openspec/changes/archive
  --quiet           print only the summary line
  --help            this message

Paths given on the command line are checked as-is; otherwise every open change under
openspec/changes is checked. Findings are advisory: exit 0 unless something could not
be read, or --strict was passed and suspects exist.`;

export function parseArgs(argv) {
  const opts = { changes: [], paths: [], root: null, tolerance: DEFAULT_TOLERANCE, strict: false, json: false, includeArchive: false, quiet: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const need = (name) => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`${name} requires a value`);
      i += 1;
      return v;
    };
    switch (a) {
      case '--change': case '-c': opts.changes.push(need('--change')); break;
      case '--root': opts.root = need('--root'); break;
      case '--tolerance': case '-t': opts.tolerance = Number(need('--tolerance')); break;
      case '--strict': case '-s': opts.strict = true; break;
      case '--json': case '-j': opts.json = true; break;
      case '--include-archive': opts.includeArchive = true; break;
      case '--quiet': case '-q': opts.quiet = true; break;
      case '--help': case '-h': opts.help = true; break;
      default:
        if (a.startsWith('-')) throw new Error(`unknown option: ${a}`);
        opts.paths.push(a);
    }
  }
  if (!Number.isFinite(opts.tolerance) || opts.tolerance < 0) throw new Error('--tolerance must be a non-negative number');
  return opts;
}

export function run(argv, cwd = process.cwd()) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    return { exitCode: 1, error: err.message, usage: USAGE };
  }
  if (opts.help) return { exitCode: 0, usage: USAGE, help: true };

  const root = resolve(opts.root || findRepoRoot(cwd));
  const changesRoot = join(root, 'openspec', 'changes');
  const index = new FileIndex(root);
  index.build(root);

  /** @type {{abs:string, changeDir:string}[]} */
  const targets = [];
  if (opts.paths.length > 0) {
    for (const p of opts.paths) {
      const abs = resolve(cwd, p);
      let st;
      try { st = statSync(abs); } catch { return { exitCode: 1, error: `cannot read ${p}: no such file or directory` }; }
      const files = st.isDirectory() ? listMarkdown(abs) : [abs];
      for (const f of files) {
        let changeDir = dirname(f);
        while (changeDir !== root && !changeDir.startsWith(changesRoot)) changeDir = dirname(changeDir);
        if (!changeDir.startsWith(changesRoot)) changeDir = root;
        targets.push({ abs: f, changeDir });
      }
    }
  } else {
    const dirs = [];
    if (opts.changes.length > 0) {
      for (const name of opts.changes) {
        const abs = join(changesRoot, name);
        if (!existsSync(abs)) return { exitCode: 1, error: `no such change directory: openspec/changes/${name}` };
        dirs.push(abs);
      }
    } else {
      dirs.push(...listChanges(changesRoot));
      if (opts.includeArchive && existsSync(join(changesRoot, 'archive'))) {
        dirs.push(...listMarkdown(join(changesRoot, 'archive'))
          .map((f) => {
            let d = dirname(f);
            while (d !== changesRoot && d !== dirname(changesRoot)) d = dirname(d);
            return d;
          })
          .filter((d, i, a) => a.indexOf(d) === i && d.startsWith(join(changesRoot, 'archive'))));
      }
    }
    for (const d of dirs) for (const f of listMarkdown(d)) targets.push({ abs: f, changeDir: d });
  }

  if (targets.length === 0) return { exitCode: 0, results: [], total: 0, files: 0 };

  const results = [];
  let total = 0;
  for (const t of targets) {
    const r = checkFile(t.abs, { root, changeDir: t.changeDir, index, tolerance: opts.tolerance });
    if (r.error) return { exitCode: 1, error: `${t.abs}: ${r.error}` };
    total += r.suspects.length;
    results.push(r);
  }

  return { exitCode: opts.strict && total > 0 ? 2 : 0, results, total, files: results.length };
}

function renderText(result) {
  const lines = [];
  for (const r of result.results) {
    for (const s of r.suspects) {
      lines.push(`SUSPECT  ${s.rule}  ${s.at}`);
      lines.push(`  ${s.suspect}.`);
      lines.push(`  Verify this by hand: ${s.why}.`);
    }
  }
  if (result.total === 0) {
    lines.push(`No suspect claims. ${result.files} artifact${result.files === 1 ? '' : 's'} checked.`);
  } else {
    lines.push('');
    lines.push(`${result.total} suspect claim${result.total === 1 ? '' : 's'} in ${result.files} artifact${result.files === 1 ? '' : 's'}.`);
    lines.push('These are guesses from text patterns, not verdicts. Open each one and decide.');
  }
  return lines.join('\n');
}

function main() {
  const result = run(process.argv.slice(2));
  if (result.usage && !result.help) {
    process.stderr.write(`check-claims: ${result.error}\n\n${result.usage}\n`);
    process.exit(1);
  }
  if (result.help) {
    process.stdout.write(`${result.usage}\n`);
    process.exit(0);
  }
  if (result.error) {
    process.stderr.write(`check-claims: ${result.error}\n`);
    process.exit(result.exitCode);
  }
  if (result.json) {
    process.stdout.write(`${JSON.stringify({
      total: result.total,
      files: result.files,
      suspects: result.results.flatMap((r) => r.suspects),
    }, null, 2)}\n`);
  } else if (!result.quiet) {
    process.stdout.write(`${renderText(result)}\n`);
  } else {
    process.stdout.write(`${result.total} suspect claim(s) in ${result.files} artifact(s)\n`);
  }
  process.exit(result.exitCode);
}

// Run only when invoked as the entry point. `process.argv[1]` is undefined under
// `node -e` and when a loader imports this file, so it is read defensively.
const entryPoint = process.argv[1] ?? '';
if (entryPoint.endsWith('check-claims.mjs') || import.meta.url === pathToFileURL(entryPoint).href) {
  main();
}
