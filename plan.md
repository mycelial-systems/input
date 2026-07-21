# Live SubstrateInput Value Contract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make controlled <substrate-input> values update the inner native
input's live value after a user has typed.

**Architecture:** Implement the contract in the SubstrateInput class in
src/index.ts, which is the source of the published custom element. Add a
public value getter and setter on the host element. Route the observed value
attribute through the inner input's .value property while retaining the
existing attribute-forwarding behavior for every other input attribute.

**Tech Stack:** TypeScript, Custom Elements, @substrate-system/web-component,
the browser-based @substrate-system/tapzero test harness, esbuild, and npm
scripts.

---

## Background and boundaries

src/index.ts currently lists value in INPUT_ATTRIBUTES, so the host observes
changes to the attribute. Its handleChange_inputAttribute method currently
forwards every input attribute with setAttribute. For a native input whose
value has been changed by the user, changing the value attribute updates the
default value but does not replace the live .value property.

The fix belongs in this package because this repository publishes the
substrate-input custom element. Do not add an application adapter,
route-specific DOM lookup, keyed remount, form.reset(), or a dependency
override. Do not change the custom-element tag name or registration model.

The existing test harness runs in a browser-like environment and imports
src/index.ts directly. Keep the tests in that harness; do not introduce a
Vitest project or a DOM shim.

### Expected behavior

- Reading host.value returns the inner input's live value when connected.
- Reading host.value before rendering falls back to the host attribute.
- Setting host.value updates the inner input's live .value immediately.
- Setting host.value before connection preserves the initial value for the
  first render.
- Setting or removing the host value attribute updates the live inner value.
- Non-value input attributes keep their current forwarding behavior.
- Existing label, id, ARIA, disabled, and input rendering behavior remains
  unchanged.

## Task 1: Add failing browser regression tests

**Files:**

- Modify: test/index.ts
- Test target: src/index.ts

### Step 1: Add a typed host helper

After the existing imports, add a small structural type for the public value
contract. Keep the test compatible with the existing document and waitFor
setup:

    type SubstrateInputHost = HTMLElement & {
        value:string;
    }

Use a cast at the point where a queried custom element is read. Do not import
an additional test framework or add a new test entry point.

### Step 2: Write the failing live-value tests

Add a test that proves a dirty native input is cleared through the host
property. Use a unique name attribute and append the element to document.body:

    test('host value setter updates the live inner value', async t => {
        document.body.innerHTML +=
            '<substrate-input name="value-setter" value="initial">' +
            '</substrate-input>'

        const host = await waitFor(
            'substrate-input[name="value-setter"]'
        ) as SubstrateInputHost
        const input = host.querySelector('input') as HTMLInputElement

        input.value = 'typed value'
        host.value = ''

        t.equal(input.value, '',
            'setting host value should clear the live inner value')
        t.equal(host.value, '',
            'host getter should return the live inner value')
    })

Add a test for setting the property before the element is connected:

    test('host value preserves a pre-connection value', async t => {
        const host = document.createElement(
            'substrate-input'
        ) as SubstrateInputHost
        host.setAttribute('name', 'pre-connection-value')
        host.value = 'caregiver@example.com'

        t.equal(host.getAttribute('value'), 'caregiver@example.com',
            'pre-connection setter should preserve the host attribute')

        document.body.appendChild(host)
        const input = await waitFor(
            'substrate-input[name="pre-connection-value"] input'
        ) as HTMLInputElement

        t.equal(input.value, 'caregiver@example.com',
            'first render should consume the pre-connection value')
    })

Add a test for direct attribute updates and removal:

    test('value attribute updates the live inner value', async t => {
        document.body.innerHTML +=
            '<substrate-input name="value-attribute" value="initial">' +
            '</substrate-input>'

        const host = await waitFor(
            'substrate-input[name="value-attribute"]'
        ) as SubstrateInputHost
        const input = host.querySelector('input') as HTMLInputElement

        input.value = 'typed value'
        host.setAttribute('value', 'updated')
        t.equal(input.value, 'updated',
            'value attribute should update the live inner value')

        host.removeAttribute('value')
        t.equal(input.value, '',
            'removing value should clear the live inner value')
    })

Add a test proving unrelated attributes still use the existing forwarder:

    test('non-value input attributes remain forwarded', async t => {
        document.body.innerHTML +=
            '<substrate-input name="non-value-forwarding" ' +
            'value="initial"></substrate-input>'

        const host = await waitFor(
            'substrate-input[name="non-value-forwarding"]'
        ) as SubstrateInputHost
        const input = host.querySelector('input') as HTMLInputElement

        input.value = 'typed value'
        host.setAttribute('placeholder', 'caregiver@example.com')

        t.equal(input.getAttribute('placeholder'),
            'caregiver@example.com',
            'placeholder should still be forwarded')
        t.equal(input.value, 'typed value',
            'forwarding another attribute should not change the value')
    })

### Step 3: Run the tests and verify RED

Run:

    npm test

Expected: the existing tests pass, and the new live-value assertions fail
because SubstrateInput has no host value property and still forwards the value
attribute with setAttribute.

If the test command cannot find dependencies, run npm install once and rerun
npm test. Do not change source code to work around a missing install. Do not
proceed until the new tests fail for the missing behavior rather than because
of a test typo or harness error.

## Task 2: Implement the live value contract

**Files:**

- Modify: src/index.ts
- Test: test/index.ts

### Step 1: Update value attribute handling

In handleChange_inputAttribute, preserve the existing disabled-class logic
and the early return when no inner input exists. After obtaining the input,
handle name === 'value' with the live property:

    if (name === 'value') {
        input.value = newValue ?? ''
        return
    }

Keep the existing removeAttribute and setAttribute forwarding branches for
all other input attributes.

### Step 2: Add the host getter and setter

Add the following accessors to SubstrateInput, near the existing label
accessor. Keep the setter string-compatible with native input values and
normalize nullish runtime values to the empty string:

    set value (value:string) {
        const normalized = String(value ?? '')

        if (this.getAttribute('value') !== normalized) {
            this.setAttribute('value', normalized)
        }

        const input = this.querySelector('input')
        if (input && input.value !== normalized) {
            input.value = normalized
        }
    }

    get value ():string {
        return this.querySelector('input')?.value ??
            this.getAttribute('value') ??
            ''
    }

The setter writes the host attribute when necessary so an unconnected
element's first render can consume the value. It also writes the native
property directly so a connected, dirty input changes immediately. The
attribute-change handler covers direct setAttribute and removeAttribute calls.

### Step 3: Run the focused test and verify GREEN

Run:

    npm test

Expected: all existing and new tests pass with no failures. If a test fails,
fix the implementation rather than weakening the assertion.

### Step 4: Run type and lint checks

This repository does not define typecheck or test:typecheck npm scripts. Use
the project tools directly:

    npx tsc --noEmit
    npm run lint

Expected: both commands exit 0 with no TypeScript diagnostics or lint errors.

### Step 5: Commit the implementation

Review the diff, then commit only the source and test changes:

    git diff --check
    git add src/index.ts test/index.ts
    git commit -m "fix: synchronize substrate input values"

## Task 3: Document the public value behavior

**Files:**

- Modify: README.md

### Step 1: Update the API documentation

In the input element attributes section, clarify that value is forwarded to
the inner input and that the component exposes a live host property. Add a
short paragraph after the attribute list:

    The value property on <substrate-input> reads and writes the inner native
    input's live value. This makes controlled updates work after a user has
    typed, while the value attribute still supplies the initial value during
    render.

Keep the documentation accurate for both markup and JavaScript consumers.
Do not change the package install instructions or CSS documentation.

### Step 2: Check documentation formatting

Run:

    git diff --check

Expected: no output. Keep changed lines below 80 columns in source, tests,
and documentation, following the repository working agreement.

### Step 3: Commit the documentation

    git add README.md
    git commit -m "docs: describe live substrate input values"

## Task 4: Run the complete package verification

**Files:**

- Verify: src/index.ts
- Verify: test/index.ts
- Verify: README.md

### Step 1: Run the browser test suite

Run:

    npm test

Expected: every tapzero test passes, including the value contract tests.

### Step 2: Run static checks

Run:

    npx tsc --noEmit
    npm run lint
    git diff --check

Expected: every command exits 0 and git diff --check prints nothing.

### Step 3: Run the package build

Run:

    npm run build

Expected: CommonJS, ESM, declaration, minified ESM, and CSS artifacts build
successfully. Build output is generated under dist/; do not commit it unless
the repository's existing release workflow requires tracked artifacts.

### Step 4: Enforce line length on changed files

Run:

    awk 'length($0) >= 80 { print FNR ":" length($0) ":" $0 }' \
        src/index.ts test/index.ts README.md

Expected: no output. Wrap any reported lines without changing behavior.

### Step 5: Inspect the final diff and status

Run:

    git diff HEAD~2..HEAD --stat
    git status --short

Expected: the two implementation commits contain only the intended source,
test, and README changes. Generated build output and temporary files should
not be included.

## Task 5: Record and preserve the retirement condition

**Files:**

- Verify: src/index.ts
- Verify: README.md

The value contract is now part of this package rather than a downstream
compatibility adapter. When changing the implementation or upgrading
@substrate-system/web-component, preserve these two behaviors:

1. A host value getter/setter reads and writes the inner input's live .value
   property.
2. Observed value attribute changes update the live inner value after typing,
   including removal of the attribute.

Before changing or removing the accessors, add or update tests in
test/index.ts, run npm test, npx tsc --noEmit, npm run lint, and npm run build,
and confirm that initial render and controlled updates still work. No
application-level adapter, package override, copied dependency, or
postinstall patch is needed for this repository.
