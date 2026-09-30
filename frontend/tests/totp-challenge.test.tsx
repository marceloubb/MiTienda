import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTOTPCode, getProfile, getTOTPCode, setTOTPCode } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth-context';

/**
 * Global TOTP challenge, driven end to end through `fetch`.
 *
 * The network is stubbed at the `fetch` boundary, not at `api.ts`, so everything
 * between the wire and the dialog is the shipped code: the 401 body, `APIError`,
 * `isTOTPCodeRequired`, the handler dispatch inside `fetchAPI`, the replay
 * closure, and the dialog's own submit path. Only `fetch` is faked.
 *
 * **The load-bearing scenario is #2: a valid code must resume the ORIGINAL
 * caller, not merely fire a retry.** It is a live assertion. It was carried as
 * `it.fails` — with the body unmodified, so only the pass criterion was inverted
 * — while the defect below was open; W5d fixed the cause and flipped the marker
 * back. The inversion was never the requirement.
 *
 * The defect W5d fixed: `frontend/lib/api.ts` handed the replay to a handler
 * typed `(retry) => void` and then returned `new Promise<never>(() => {})`. An
 * executor that never calls `resolve` cannot be resumed by anything, and the
 * replay's result reached only the dialog's own `await retry()`, which discarded
 * it — so **the parked caller's promise never settled at all**, not on success,
 * not on failure. `spec.md` requires that submitting a valid code "retries the
 * rejected request and restores the session"; the retry happened, the restore
 * did not. In production the visible symptom was `AuthProvider.loadProfile()`
 * hanging in its `await getProfile()` forever, so `setIsLoading(false)` in its
 * `finally` never ran and the app sat in its loading state permanently.
 *
 * Why the obvious fix is wrong, established by probe rather than guessed.
 * Letting the handler simply `return retry()` fails twice over: it fires the
 * replay at dispatch time, before any code exists, and it rejects the parked
 * caller when a code is wrong — exactly what scenario 3 requires not to happen.
 * The contract that works defers. `api.ts` parks the caller behind a
 * **resolve-only deferred** and hands the dialog the one-shot replay together
 * with that resolver; the dialog resolves the parked caller with the replay's
 * result, and on a wrong code resolves nothing at all — the prompt stays open
 * and the caller stays parked.
 *
 * Scenario 2 therefore asserts the whole chain, not just its endpoint: the
 * caller resumes (`status === 'resolved'`), it resumes **with the profile it
 * originally asked for** (`value` deep-equals the response), the replay carried
 * the code, and the code survives for the session. A "a second request happened"
 * assertion would pass against the exact defect above, which is why it is not
 * written that way.
 *
 * A gated request parks (or hangs) with no synchronous way to ask, so "the caller
 * has not settled" is asserted by draining the microtask queue and observing the
 * flag is still unset.
 *
 * Two properties of the dialog are asserted here rather than left to reading:
 * `clearTOTPCode()` runs ONLY in the catch, because on success the code belongs
 * to the live session, and there is no cancel path — a gated session's way out
 * is `logout()`, which the backend exempts from the TOTP gate. No test assumes
 * a dismiss button exists.
 *
 * Verification limit: jsdom applies no compiled stylesheet, so nothing here is
 * evidence about paint. `autoFocus` is not asserted either, because jsdom does
 * not implement the focus behaviour the dialog relies on.
 */

const VALID_CODE = '123456';
const WRONG_CODE = '000000';
const PROFILE = { id: 7, username: 'admin', email: 'admin@example.com', role: 'admin' };
const CART = { items: [], total: '0.00', total_items: 0 };
const DIALOG_NAME = 'Verificación en dos pasos';
const CODE_LABEL = 'Código de verificación';
const INVALID_CODE_ERROR = /El código no es válido/;

// --- Fake backend ------------------------------------------------------------

type Recorded = { endpoint: string; totp: string | undefined };

/** `performFetch` reads only `ok`, `status` and `json()` off a response. */
function respond(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as unknown as Response;
}

/** The gate's exact wire shape, from `ExpiringTokenAuthentication`. */
const gated = () => respond({ detail: 'Código TOTP requerido', code: 'totp_required' }, 401);

/**
 * Stand-in for the backend, wired the way the gate is: a request carrying a
 * valid `X-TOTP` passes, anything else 401s with `totp_required`.
 *
 * `gate: false` models a user with no confirmed device (or enforcement off),
 * where the gate never answers at all.
 *
 * The FIRST profile request always succeeds even with the gate on. That is the
 * provider's mount-time session restore — a session whose code is still valid —
 * and keeping it out of the gate is what makes each gated request attributable
 * to the caller under test rather than to the provider's own bootstrap.
 */
function installBackend({ gate = true }: { gate?: boolean } = {}) {
  const recorded: Recorded[] = [];
  let restored = false;

  const backend = vi.fn(async (url: string, init?: RequestInit) => {
    const headers = init?.headers as Record<string, string> | undefined;
    recorded.push({ endpoint: url, totp: headers?.['X-TOTP'] });

    if (url.endsWith('/users/profile/')) {
      if (headers?.['X-TOTP'] === VALID_CODE) return respond(PROFILE);
      if (!gate || !restored) {
        restored = true;
        return respond(PROFILE);
      }
      return gated();
    }
    if (url.endsWith('/users/cart/')) return respond(CART);
    return respond({});
  });

  vi.stubGlobal('fetch', backend);
  return {
    /** Every `/users/profile/` request, in order, with the code it carried. */
    profileCalls: () => recorded.filter((call) => call.endpoint.endsWith('/users/profile/')),
  };
}

// --- Promise observation -----------------------------------------------------

type Settlement<T> = { status: 'pending' | 'resolved' | 'rejected'; value?: T };

/** Observe a promise without consuming it; the caller under test keeps its own reference. */
function track<T>(promise: Promise<T>): Settlement<T> {
  const settlement: Settlement<T> = { status: 'pending' };
  promise.then(
    (value) => {
      settlement.status = 'resolved';
      settlement.value = value;
    },
    () => {
      settlement.status = 'rejected';
    },
  );
  return settlement;
}

/** Drain microtasks and one macrotask turn inside `act`, so a promise that could have settled by now would have. */
async function drain() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

// --- Surface under test ------------------------------------------------------

let caller: Settlement<unknown> | null = null;

function theCaller(): Settlement<unknown> {
  if (caller === null) throw new Error('the surface never issued an authenticated request');
  return caller;
}

/**
 * A page that issues one authenticated request once its session is restored —
 * the "client-side navigation triggers an authenticated request" of the spec
 * scenario. `caller` holds that request's promise, which is the promise the spec
 * says must resume.
 */
function GatedSurface() {
  const { isLoading, user } = useAuth();
  useEffect(() => {
    if (isLoading) return;
    caller = track(getProfile());
  }, [isLoading]);

  return (
    <section>
      <h1>Pedidos</h1>
      <p>Sesión: {user ? user.username : 'anónimo'}</p>
    </section>
  );
}

function renderApp() {
  return render(
    <AuthProvider>
      <GatedSurface />
    </AuthProvider>,
  );
}

async function submitCode(code: string) {
  fireEvent.change(screen.getByLabelText(CODE_LABEL), { target: { value: code } });
  const submit = screen.getByRole('button', { name: /Verificar/ });
  expect((submit as HTMLButtonElement).disabled, 'six digits enable the submit').toBe(false);
  // `fireEvent.submit` on the form rather than a click on the button: jsdom does
  // not run the form-submission algorithm that turns a submit-button click into
  // a `submit` event, and the button's own enabled state — the only thing the
  // click would have added — is asserted above.
  const form = screen.getByRole('dialog').querySelector('form');
  expect(form, 'the challenge is a form').not.toBeNull();
  await act(async () => {
    fireEvent.submit(form as HTMLFormElement);
  });
}

beforeEach(() => {
  caller = null;
  clearTOTPCode();
});

afterEach(() => {
  clearTOTPCode();
  vi.unstubAllGlobals();
});

describe('Global TOTP Challenge Resolution (spec: two-factor-auth)', () => {
  // Scenario 1 — a prompt renders on the current surface, no navigation.
  it('a 401 carrying totp_required opens the challenge on the current surface', async () => {
    const backend = installBackend();
    renderApp();

    expect(await screen.findByRole('dialog', { name: DIALOG_NAME })).toBeTruthy();

    // The resolver is mounted by AuthProvider, not by the page, so the prompt is
    // NOT inside the page's own subtree while the page is still rendered. That
    // is what "no navigation to the login route" means structurally: the
    // challenge arrives on the surface the user is already on.
    expect(screen.getByRole('dialog').closest('section')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeTruthy();

    // It was the gate that opened it: the triggering request carried no code.
    const profiles = backend.profileCalls();
    expect(profiles.length).toBeGreaterThanOrEqual(2);
    expect(profiles.at(-1)?.totp).toBeUndefined();
  });

  // Scenario 2 — LOAD-BEARING. Carried as `it.fails` while the parked caller
  // could not resume, and flipped back to a real assertion once W5d fixed the
  // cause. The body was never modified; see the file header for the contract it
  // now pins and for why `return retry()` is not the shape.
  it('a valid code retries the rejected request and resolves the original caller', async () => {
    const backend = installBackend();
    renderApp();
    await screen.findByRole('dialog', { name: DIALOG_NAME });
    // `theCaller()` throws if the surface never issued its request, so reaching
    // this line proves the gated request is the caller's and not the provider's.
    expect(theCaller()).toBeTruthy();

    // Parked: the caller has NOT settled, because no code has been accepted yet.
    await drain();
    expect(theCaller().status).toBe('pending');

    await submitCode(VALID_CODE);

    await waitFor(() => expect(theCaller().status).toBe('resolved'));
    // The half a "the retry fired" assertion cannot see: the caller itself
    // resumes, holding the data it originally asked for.
    expect(theCaller().value).toEqual(PROFILE);

    // The replay carried the code, and on success the code is KEPT — it now
    // belongs to the live session, so clearTOTPCode() must not have run.
    expect(backend.profileCalls().at(-1)?.totp).toBe(VALID_CODE);
    expect(getTOTPCode()).toBe(VALID_CODE);
  });

  // Scenario 3 — a wrong code leaves the challenge open and the session unset.
  it('an incorrect code keeps the challenge open, shows an error, and establishes no session', async () => {
    installBackend();
    renderApp();
    await screen.findByRole('dialog', { name: DIALOG_NAME });
    await drain();

    await submitCode(WRONG_CODE);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(INVALID_CODE_ERROR);
    expect(screen.getByRole('dialog', { name: DIALOG_NAME }), 'the prompt stays open').toBeTruthy();

    // No session established: the caller is still parked and the rejected code
    // was dropped, so it can never be attached to a later request.
    await drain();
    expect(theCaller().status).toBe('pending');
    expect(getTOTPCode()).toBeNull();
  });

  // Scenario 4 — both GIVEN clauses: no device / enforcement off, and an
  // enrolled session that still carries its code.
  it('an unaffected user sees no prompt on any surface', async () => {
    installBackend({ gate: false });
    renderApp();

    await waitFor(() => expect(theCaller().status).toBe('resolved'));
    await drain();
    expect(theCaller().value).toEqual(PROFILE);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup();

    // Second clause: enforcement is on, but the session carries its code, so
    // every request passes on its own and no prompt is ever warranted.
    caller = null;
    setTOTPCode(VALID_CODE);
    installBackend();
    renderApp();

    await waitFor(() => expect(theCaller().status).toBe('resolved'));
    await drain();
    expect(theCaller().value).toEqual(PROFILE);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
