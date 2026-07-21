# Local SubstrateInput Value Patch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a local compatibility patch so controlled
`<substrate-input>` elements update their inner native input's live value.

**Architecture:** Keep `@substrate-system/input` as the installed dependency,
but expose it through one local adapter at `src/substrate-input.ts`. The
adapter will add the missing `value` property contract to the upstream class
prototype before any application input instances are created. All PetPulse
imports will use the adapter, while the adapter remains safe with the simple
custom-element mocks used by the Node and Worker tests.

**Tech Stack:** TypeScript, Custom Elements, Preact 10, HTM,
`@preact/signals`, Vitest 4.

---

## Background and boundaries

The account route already runs this successful-state update:

```ts
inviteEmail.value = ''
```

That signal update is correct. The problem is the current
`@substrate-system/input@0.0.22` class:

1. It does not expose a `value` property on the custom-element host.
2. Preact therefore writes `value` as an attribute on the host.
3. The component forwards that attribute with
   `input.setAttribute('value', newValue)`.
4. Once a user has typed, the native input's live value is dirty. Updating
   its attribute changes `defaultValue`, but does not replace the visible
   `input.value`.

The patch must correct the reusable custom-element contract. Do not add a
route-specific `querySelector`, force a keyed remount, call `form.reset()`,
or move local form state into global application state.

The local adapter should continue exporting the exact upstream class. It
must not register a second custom-element tag or subclass the upstream class,
because the dependency registers `substrate-input` as a side effect of being
imported.

No LLP corpus exists in this repository, so there are no additional LLP
constraints to apply. The relevant repository rules are in `AGENTS.md`,
especially the component-test mock requirements and the full-suite warning
for widely shared custom-element imports.

### Expected behavior

- Setting the host's `value` property updates the inner input's live
  `.value` immediately.
- Reading the host's `value` returns the inner input's live value.
- Setting `value` before `connectedCallback()` preserves the initial value
  so the upstream renderer can create the inner input correctly.
- Updating the host's `value` attribute also updates the live inner value.
- Non-value input attributes continue through the upstream forwarding
  implementation unchanged.
- Existing `{ TAG, define }` test mocks remain valid.
- The account invitation field clears after a successful send and retains
  its value after an unsuccessful send.

## Task 1: Add a failing unit test for the value contract

**Files:**

- Create: `test/unit/substrate-input-value.spec.ts`
- Test target: `src/substrate-input.ts`

### Step 1: Write the upstream-shaped test double

Create a plain Node test. Mock `@substrate-system/input` before importing the
local adapter so the test does not require `document` or `customElements`.
The test double must retain the upstream bug: its attribute forwarder should
write attributes, not the native input's live value.

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@substrate-system/input', () => {
    class FakeSubstrateInput {
        static TAG = 'substrate-input'
        static define = () => {}

        attributes = new Map<string, string>()
        input:FakeInnerInput|null = null

        getAttribute (name:string):string|null {
            return this.attributes.get(name) ?? null
        }

        setAttribute (name:string, value:string):void {
            this.attributes.set(name, value)
            this.handleChange_inputAttribute(name, value)
        }

        removeAttribute (name:string):void {
            this.attributes.delete(name)
            this.handleChange_inputAttribute(name, null)
        }

        querySelector (selector:string):FakeInnerInput|null {
            return selector === 'input' ? this.input : null
        }

        handleChange_inputAttribute (
            name:string,
            newValue:string|null,
        ):void {
            if (!this.input) return
            if (newValue === null) {
                this.input.attributes.delete(name)
                return
            }

            this.input.attributes.set(name, newValue)
        }
    }

    return { SubstrateInput: FakeSubstrateInput }
})

import {
    SubstrateInput,
} from '../../src/substrate-input.js'

type FakeInnerInput = {
    value:string;
    attributes:Map<string, string>;
}

type FakeHost = {
    input:FakeInnerInput|null;
    value:string;
    getAttribute:(name:string) => string|null;
    setAttribute:(name:string, value:string) => void;
    handleChange_inputAttribute:(
        name:string,
        newValue:string|null,
    ) => void;
}

function host ():FakeHost {
    const Constructor = SubstrateInput as unknown as {
        new():FakeHost;
    }
    return new Constructor()
}

function innerInput (value:string):FakeInnerInput {
    return {
        value,
        attributes: new Map<string, string>(),
    }
}
```

### Step 2: Add the regression assertions

Add four focused cases:

```ts
describe('local SubstrateInput value patch', () => {
    it('clears the live inner value after the user has typed', () => {
        const element = host()
        element.input = innerInput('caregiver@example.com')

        element.value = ''

        expect(element.input?.value).toBe('')
    })

    it('preserves a value assigned before the inner input exists', () => {
        const element = host()

        element.value = 'caregiver@example.com'

        expect(element.getAttribute('value'))
            .toBe('caregiver@example.com')
        expect(element.value).toBe('caregiver@example.com')
    })

    it('updates the live value when the observed attribute changes', () => {
        const element = host()
        element.input = innerInput('typed value')

        element.handleChange_inputAttribute('value', '')

        expect(element.input?.value).toBe('')
    })

    it('keeps upstream forwarding for non-value attributes', () => {
        const element = host()
        element.input = innerInput('typed value')

        element.handleChange_inputAttribute(
            'placeholder',
            'caregiver@example.com',
        )

        expect(element.input.attributes.get('placeholder'))
            .toBe('caregiver@example.com')
        expect(element.input?.value).toBe('typed value')
    })
})
```

Add one more assertion to the first test after the initial red run:

```ts
expect(element.value).toBe('')
```

This proves the getter follows the live inner value, not a stale host
attribute.

### Step 3: Run the test and verify RED

Run:

```bash
npx vitest run --project unit \
    test/unit/substrate-input-value.spec.ts
```

Expected: FAIL because `src/substrate-input.ts` does not exist. If a skeleton
adapter was created first, expect the first test to fail because the inner
value remains `caregiver@example.com`.

Do not proceed if the test passes before the patch exists.

## Task 2: Implement the local compatibility adapter

**Files:**

- Create: `src/substrate-input.ts`
- Test: `test/unit/substrate-input-value.spec.ts`

### Step 1: Add the adapter

Create the following local module. Keep every line below 80 columns.

```ts
import {
    SubstrateInput as UpstreamSubstrateInput,
} from '@substrate-system/input'

type InputHost = InstanceType<typeof UpstreamSubstrateInput> & {
    value:string;
}

type InputPrototype = InputHost & {
    handleChange_inputAttribute:(
        name:string,
        newValue:string|null,
    ) => void;
}

function innerInput (host:Element):HTMLInputElement|null {
    return host.querySelector('input')
}

export function patchSubstrateInputValue ():void {
    const prototype = (
        UpstreamSubstrateInput.prototype
    ) as InputPrototype | undefined

    // Several tests replace the package class with a simple { TAG, define }
    // object. Keep that established mock contract working.
    if (!prototype) return

    // An upstream release may eventually provide the correct contract.
    // In that case, leave its implementation untouched.
    if (Object.getOwnPropertyDescriptor(prototype, 'value')) return

    const forwardInputAttribute =
        prototype.handleChange_inputAttribute

    prototype.handleChange_inputAttribute = function (
        name:string,
        newValue:string|null,
    ):void {
        if (name === 'value') {
            const input = innerInput(this)
            if (input) input.value = newValue ?? ''
            return
        }

        forwardInputAttribute.call(this, name, newValue)
    }

    Object.defineProperty(prototype, 'value', {
        configurable: true,
        get (this:InputHost):string {
            return innerInput(this)?.value ??
                this.getAttribute('value') ??
                ''
        },
        set (this:InputHost, value:string) {
            const normalized = String(value ?? '')

            if (this.getAttribute('value') !== normalized) {
                this.setAttribute('value', normalized)
            }

            const input = innerInput(this)
            if (input && input.value !== normalized) {
                input.value = normalized
            }
        },
    })
}

patchSubstrateInputValue()

export {
    UpstreamSubstrateInput as SubstrateInput,
}
```

The two write paths are intentional:

- Before connection, there is no inner input, so the setter reflects the
  value to the host attribute. The upstream `render()` can then consume it.
- After connection, the setter writes the inner input's `.value` property.
  That is the operation which clears a dirty native input.

The patched `handleChange_inputAttribute` also repairs callers that use
`setAttribute('value', ...)` directly. It delegates every other attribute to
the original upstream method.

### Step 2: Verify GREEN

Run:

```bash
npx vitest run --project unit \
    test/unit/substrate-input-value.spec.ts
```

Expected: all four tests PASS.

### Step 3: Type-check the adapter

Run:

```bash
npm run typecheck
npm run test:typecheck
```

Expected: both commands exit 0 with no TypeScript diagnostics.

If TypeScript rejects the mocked constructor cast, fix only the test-side
cast. Do not weaken the production adapter with `any`.

### Step 4: Commit the contract patch

```bash
git add src/substrate-input.ts \
    test/unit/substrate-input-value.spec.ts
git commit -m "fix: synchronize substrate input values"
```

## Task 3: Route every production import through the adapter

**Files:**

- Modify: `src/client/index.ts`
- Modify: `src/client/routes/account.ts`
- Modify: `src/client/routes/new-pet.ts`
- Modify: `src/client/routes/notification-settings.ts`
- Modify: `src/client/routes/pet-detail.ts`
- Modify: `src/client/routes/profile.ts`
- Modify: `src/client/routes/signup-passkey.ts`
- Modify: `src/client/routes/signup.ts`
- Modify: `src/client/components/routine-form.ts`
- Modify: `src/client/components/sms-consent-modal.ts`
- Modify: `src/client/components/username-editor.ts`
- Modify: `src/webmaster/routes/pages.ts`
- Modify: `AGENTS.md`

### Step 1: Replace direct production imports

Replace every production import of:

```ts
import { SubstrateInput } from '@substrate-system/input'
```

with the correct relative path to `src/substrate-input.ts`:

- From `src/client/index.ts`, use `../substrate-input.js`.
- From `src/client/routes/*.ts`, use `../../substrate-input.js`.
- From `src/client/components/*.ts`, use `../../substrate-input.js`.
- From `src/webmaster/routes/pages.ts`, use
  `../../substrate-input.js`.

Do not change CSS imports such as `@substrate-system/input/css`. The local
adapter patches behavior only and continues using the dependency's existing
styles.

Do not rewrite test mocks. The adapter's `if (!prototype) return` guard is
specifically intended to preserve the existing `{ TAG, define }` mock shape.

### Step 2: Prove there are no bypasses

Run:

```bash
rg -n "from '@substrate-system/input'" src \
    --glob '*.ts'
```

Expected: exactly one match, inside `src/substrate-input.ts`.

Also run:

```bash
rg -n "@substrate-system/input/css" src test \
    --glob '*.{ts,js}'
```

Expected: existing stylesheet imports, if any, remain unchanged.

### Step 3: Document the compatibility boundary

Add this rule to the SPA component guidance in `AGENTS.md`:

```md
- Import `SubstrateInput` through `src/substrate-input.ts`, not directly
  from `@substrate-system/input`. The local adapter supplies the missing
  live `value` property contract in `@substrate-system/input@0.0.22`, so
  Preact signal updates also update the inner native input after typing.
  The adapter intentionally no-ops when a future upstream release defines
  its own `value` property. Last reviewed 2026-07-20.
```

Keep the added lines below 80 columns.

### Step 4: Run focused component tests

Run the tests whose import graphs include the changed modules:

```bash
npx vitest run --project unit \
    test/unit/substrate-input-value.spec.ts \
    test/unit/username-editor-component.spec.ts \
    test/unit/routine-form-dirty.spec.ts
```

Then run the affected Worker-project route tests:

```bash
npx vitest run --project workers \
    test/signup-route.spec.ts \
    test/new-pet-route.spec.ts \
    test/notification-settings-sms-states.spec.ts \
    test/webmaster-login-ui.spec.ts
```

Expected: all selected tests PASS. A `document is not defined` error means a
transitive spec lacks its established `@substrate-system/input` mock. Add the
same `{ TAG, define }` stub already used elsewhere; do not add a DOM shim.

### Step 5: Commit the import migration and guidance

```bash
git add AGENTS.md src/client src/webmaster/routes/pages.ts
git commit -m "refactor: use local substrate input adapter"
```

## Task 4: Verify the account invitation regression

**Files:**

- Verify: `src/client/routes/account.ts`
- Verify: `src/substrate-input.ts`
- Test: `test/unit/substrate-input-value.spec.ts`

### Step 1: Confirm the route keeps the declarative state update

Inspect `onInviteSubmit` and verify that the successful branch still sets:

```ts
inviteEmail.value = ''
```

It must remain after both `State.inviteAccountUser(...)` and
`State.fetchAccountSettings()` succeed. The error branch must not clear the
signal.

Do not add a ref, `querySelector`, key counter, or `form.reset()` to this
route. The local custom-element contract is now responsible for reflecting
the controlled value.

### Step 2: Run all fast tests

Run:

```bash
npm run test:unit
```

Expected: the `style-guards` and `unit` projects both pass.

### Step 3: Run the full Miniflare superset

Run:

```bash
npm test
```

Expected: every Vitest project passes. This full run is required because the
adapter becomes a widely shared custom-element import and the fast suite does
not cover every transitive Worker-project import.

### Step 4: Run static and build verification

Run:

```bash
npm run lint
npm run typecheck
npm run test:typecheck
npm run build
git diff --check
```

Expected: every command exits 0. `git diff --check` must print nothing.

Also enforce the repository line-length agreement on changed source and test
files:

```bash
awk 'length($0) >= 80 { print FNR ":" length($0) ":" $0 }' \
    src/substrate-input.ts \
    test/unit/substrate-input-value.spec.ts
```

Expected: no output. If the repository interprets the agreement as allowing
exactly 79 characters, use `>= 80` as shown.

### Step 5: Perform one browser-level smoke test

Start the local application:

```bash
npm start
```

In an authenticated account-admin session:

1. Open `/account`.
2. Enter a valid caregiver email.
3. Click **Send Invitation**.
4. Wait for the green success message and refreshed pending list.
5. Confirm the visible email field is empty.
6. In DevTools, evaluate:

   ```js
   document.querySelector(
       '.account-settings__form substrate-input input'
   )?.value
   ```

7. Confirm the result is `''`.

For the preservation path, submit an address that the server rejects and
confirm the typed value stays visible so the user can correct or retry it.

Stop the development server after the check.

## Task 5: Record the upstream retirement condition

**Files:**

- Verify: `src/substrate-input.ts`
- Verify: `AGENTS.md`

The patch is intentionally temporary. When upgrading
`@substrate-system/input`, inspect the new class before removing it:

```bash
rg -n "get value|set value|handleChange_inputAttribute" \
    node_modules/@substrate-system/input/dist/index.js
```

Remove the adapter only when upstream provides both behaviors:

1. A host `value` getter/setter that reads and writes the inner input's live
   `.value` property.
2. Live updates when the observed `value` attribute changes after typing.

Before deleting the local patch, temporarily point production imports back
to the package and run
`test/unit/substrate-input-value.spec.ts` against the real upstream class in
a DOM-capable test environment. Keep the local test until that upstream
behavior has been verified.

No `package.json` override, copied `node_modules` artifact, or
`patch-package` postinstall hook should be added for this fix. Those options
would hide the behavior change in dependency installation and make the patch
harder to type-check and test within the application.
