import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkFile, createIndex, run } from './check-claims.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CHANGE = join(REPO, 'openspec', 'changes', 'frontend-design-system-followups');

/** Write `files` (repo-relative path -> contents) under `base`, creating directories. */
function tree(base, files) {
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(base, ...rel.split('/'));
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body, 'utf8');
  }
}

let root;
let changeDir;
let index;

before(() => {
  root = mkdtempSync(join(tmpdir(), 'check-claims-'));
  changeDir = join(root, 'openspec', 'changes', 'demo');
  tree(root, {
    // Marker files make these directories resolution roots of their own.
    'frontend/package.json': '{}\n',
    'frontend/app/cart/page.tsx': [
      'export default function CartPage() {',
      '  return <main>cart</main>;',
      '}',
      '',
    ].join('\n'),
    'backend/manage.py': 'import os\n',
    'openspec/changes/demo/tasks.md': 'placeholder\n',
  });
  index = createIndex(root);
});

after(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Check one artifact body against the fixture tree and return its suspects. */
function check(body, name = 'tasks.md') {
  const abs = join(changeDir, name);
  writeFileSync(abs, body, 'utf8');
  return checkFile(abs, { root, changeDir, index }).suspects;
}

const rules = (suspects) => suspects.map((s) => s.rule);

describe('R1 path resolution', () => {
  it('flags a line number past the end of a real file', () => {
    const s = check('Edit `frontend/app/cart/page.tsx:999` to add a heading.\n');
    assert.deepEqual(rules(s), ['R1-line-out-of-range']);
    assert.match(s[0].suspect, /has 3 lines/);
  });

  it('resolves a path written relative to a subproject root', () => {
    // `app/cart/page.tsx` is how artifacts cite it; the file lives under `frontend/`.
    assert.deepEqual(rules(check('Edit `app/cart/page.tsx:2` today.\n')), []);
  });

  it('flags a missing file that is anchored inside a project tree', () => {
    const s = check('Edit `app/cart/basket/page.tsx:12` today.\n');
    assert.deepEqual(rules(s), ['R1-missing-file']);
  });

  it('ignores a path that belongs to neither project root', () => {
    // A Django internal, cited by import path. Not ours, not a dead citation.
    assert.deepEqual(rules(check('Read `whitenoise/middleware.py:88` for details.\n')), []);
    assert.deepEqual(rules(check('Read `staticfiles/storage.py:601` for details.\n')), []);
  });

  it('ignores an ambiguous shorthand rather than calling it missing', () => {
    // Two real `orders/page.tsx` files exist; ambiguity is not absence.
    tree(root, {
      'frontend/app/orders/page.tsx': 'export default function P() { return null; }\n',
      'frontend/app/admin/orders/page.tsx': 'export default function P() { return null; }\n',
    });
    index = createIndex(root);
    assert.deepEqual(rules(check('Edit `orders/page.tsx:121` today.\n')), []);
  });
});

describe('R3 ranges', () => {
  it('flags a range that cannot fit the file it is attributed to', () => {
    const s = check('| `frontend/app/cart/page.tsx` | 1 | L2-900 |\n');
    assert.deepEqual(rules(s), ['R3-range-out-of-bounds']);
  });

  it('accepts hyphen, en dash and em dash ranges alike', () => {
    for (const dash of ['-', '–', '—']) {
      assert.deepEqual(rules(check(`| \`frontend/app/cart/page.tsx\` | 1 | L1${dash}2 |\n`)), []);
    }
  });

  it('does not attribute a bare range to a file the line never links', () => {
    // The ranges describe the CSS being parsed, not the helper being created.
    assert.deepEqual(
      rules(check('Create `app/cart/page.tsx` to parse `:root` (L7-82) and `@theme` (L84-157).\n')),
      [],
    );
  });
});

describe('R2 symbol to line', () => {
  const SRC = 'backend/users.py';

  before(() => {
    tree(root, {
      [SRC]: [
        'def helper():', // 1
        '    pass', // 2
        '', // 3
        'def target_handler(self):', // 4
        '    return onTokenChange(self)', // 5
        '', // 6
        'WRAPPED = (', // 7
        '    "a",', // 8
        ')', // 9
      ].join('\n'),
    });
    index = createIndex(root);
  });

  it('flags a symbol cited at a line it is not defined on', () => {
    const s = check('Move `target_handler` (L2) into its own module.\n');
    assert.deepEqual(rules(s), ['R2-symbol-line-mismatch']);
    assert.match(s[0].suspect, /is L4/);
  });

  it('accepts a symbol cited at the line it is defined on', () => {
    assert.deepEqual(rules(check('Move `target_handler` (L4) into its own module.\n')), []);
  });

  it('accepts a range that contains the definition', () => {
    assert.deepEqual(rules(check('Read `target_handler` (L1-L9) for the call graph.\n')), []);
  });

  it('accepts a wrapped declaration cited on its continuation line', () => {
    // `WRAPPED = (` is line 7; the tuple closes on line 9. Citing L8 is inside it.
    assert.deepEqual(rules(check('Reorder the `WRAPPED` tuple at `users.py:8`.\n')), []);
  });

  it('accepts the construct that opens the symbol', () => {
    // L5 returns `onTokenChange`; naming L4, where the function starts, is fair.
    assert.deepEqual(rules(check('Rename `onTokenChange` at `users.py:4`.\n')), []);
  });

  it('does not report a symbol it cannot find at all', () => {
    assert.deepEqual(rules(check('Rename `never_defined_anywhere` at `users.py:2`.\n')), []);
  });

  it('lets a symbol own only the nearest number on the line', () => {
    // L8 is the `WRAPPED` tail; L2 belongs to the bare `city` word after the comma, and
    // neither number should drag the other into a finding.
    assert.deepEqual(rules(check('| `users.py` | 1 | L8 `WRAPPED`, L2 city |\n')), []);
  });
});

describe('R6 quoted and exempted material', () => {
  it('never flags numbers inside a failure transcript', () => {
    const s = check(
      [
        'Verification failed before the fix landed.',
        '',
        '```text',
        'FAIL src/tokens.test.ts > keeps every radius',
        'AssertionError: expected exactly 15 control boundaries, got 14',
        '  the whole tree holds 15',
        '```',
        '',
      ].join('\n'),
    );
    assert.deepEqual(s, []);
  });

  it('still checks the live claims around a transcript', () => {
    const s = check(
      [
        'A failure transcript, quoted verbatim:',
        '',
        '```text',
        'FAIL src/tokens.test.ts > radius',
        'AssertionError: expected exactly 15 control boundaries',
        '```',
        '',
        'The live claim is `app/cart/page.tsx:999` and it is wrong.',
        '',
      ].join('\n'),
    );
    assert.deepEqual(rules(s), ['R1-line-out-of-range']);
  });

  it('honours an explicit skip region', () => {
    const s = check(
      [
        '<!-- check-claims: skip -->',
        'Historic: `app/cart/page.tsx:999` and `never_defined_anywhere` (L2).',
        '<!-- check-claims: endskip -->',
        '',
        'Live: `app/cart/page.tsx:999` is still wrong.',
        '',
      ].join('\n'),
    );
    assert.deepEqual(rules(s), ['R1-line-out-of-range']);
  });

  it('honours a line that withdraws its own citation', () => {
    const s = check(
      '**Line numbers: `L900-910` at authoring time, now `L2-3` — cite by content, not by line.**\n',
    );
    assert.deepEqual(s, []);
  });

  it('treats a markdown bullet as a live claim, not a diff line', () => {
    // `- [x] task` used to match the diff-line pattern and silence the whole file.
    const s = check('- [x] Move `target_handler` (L2) into its own module.\n');
    assert.deepEqual(rules(s), ['R2-symbol-line-mismatch']);
  });

  it('does not read a quoted source line as the artifact own claim', () => {
    assert.deepEqual(rules(check('    never_defined_anywhere = 1  # (L900)\n')), []);
  });
});

describe('reporting contract', () => {
  it('exits 0 on suspects and 2 only under --strict', () => {
    const bad = join(root, 'openspec', 'changes', 'demo');
    writeFileSync(join(bad, 'tasks.md'), 'Edit `app/cart/page.tsx:999` now.\n', 'utf8');
    assert.equal(run(['--root', root, '--change', 'demo'], REPO).exitCode, 0);
    assert.equal(run(['--root', root, '--change', 'demo', '--strict'], REPO).exitCode, 2);
  });

  it('reports a clean artifact as having no suspects', () => {
    assert.deepEqual(rules(check('Nothing to check on this line.\n')), []);
  });
});

describe('the corpus this checker was built for', () => {
  const runOnCorpus = () =>
    run(['--root', REPO, '--change', 'frontend-design-system-followups'], REPO);
  const suspectsOnCorpus = () =>
    runOnCorpus().results.flatMap((f) =>
      f.suspects.map((s) => `${f.change}:${s.line} ${s.suspect}`),
    );

  // Regression guard, not a snapshot. This asserts the LIVE tree is clean, so it fails
  // when someone introduces NEW drift. Do not turn it into a count assertion: an earlier
  // version hardcoded `found.length === 5` and went stale the moment the five real
  // citations were corrected. A test that breaks when the repo is fixed teaches people
  // to ignore the suite.
  it('reports the live change as clean', () => {
    const found = suspectsOnCorpus();
    assert.deepEqual(found, [], `unexpected suspects:\n${found.join('\n')}`);
  });

  // Capability, pinned to a fixture so it cannot drift with the repo.
  it('still catches the five AdminAccessControlTests citations it was built for', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-fixture-'));
    mkdirSync(join(root, 'backend', 'mitienda'), { recursive: true });
    writeFileSync(
      join(root, 'backend', 'mitienda', 'tests.py'),
      ['class AdminAccessControlTests(TestCase):', ...Array(120).fill('    pass'), '    def test_default_admin_url(self):', ...Array(10).fill('    pass'), '    def tearDown(self):'].join('\n'),
      'utf8',
    );
    const bad = join(root, 'openspec', 'changes', 'demo');
    mkdirSync(bad, { recursive: true });
    writeFileSync(
      join(bad, 'tasks.md'),
      'Scoped to `test_default_admin_url` (L10) and class `tearDown` (L20).\n',
      'utf8',
    );
    const found = run(['--root', root, '--change', 'demo'], REPO).results
      .flatMap((f) => f.suspects.map((s) => `${f.line} ${s.suspect}`));
    assert.ok(found.some((f) => f.includes('`test_default_admin_url`') && f.includes('is L122')), `missed the method:\n${found.join('\n')}`);
    assert.ok(found.some((f) => f.includes('`tearDown`') && f.includes('is L133')), `missed tearDown:\n${found.join('\n')}`);
  });

  it('leaves the corrected sites and the failure transcript alone', () => {
    const result = runOnCorpus();
    const text = result.results.flatMap((f) => f.suspects.map((s) => JSON.stringify(s))).join('\n');
    // The corrected citations (L676, L34, L63, L16) and the transcript's "15"s must not
    // appear. Match with a boundary so `L16` does not fire on the genuine `L166` finding.
    for (const stable of ['L676', 'L34', 'L63', 'L16']) {
      const pattern = new RegExp(`${stable}(?!\\d)`);
      assert.ok(!pattern.test(text), `${stable} should not be a suspect:\n${text}`);
    }
    assert.ok(!text.includes('15 control boundaries'), 'transcript 15 leaked into a suspect');
  });

  it('exits 0 on the corpus', () => {
    assert.equal(runOnCorpus().exitCode, 0);
  });
});
