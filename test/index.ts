import { test } from '@substrate-system/tapzero'
import { waitFor } from '@substrate-system/dom'
import '../src/index.js'

type SubstrateInputHost = HTMLElement & {
    value:string;
}

test('should find the element', async t => {
    document.body.innerHTML += `
        <substrate-input
            id="test-input"
            label="Test"
            placeholder="Enter text"
        ></substrate-input>
    `

    const el = await waitFor('substrate-input input')
    t.ok(el, 'should find an input element')
})

test('input element should always have a type', async t => {
    document.body.innerHTML += `
        <substrate-input id="abc"></substrate-input>
        <substrate-input id="custom-type" type="foo"></substrate-input>
    `

    const el = await waitFor('#abc') as HTMLInputElement
    t.equal(el.getAttribute('type'), 'text', 'should default to "text" type')
    const el2 = await waitFor('#custom-type') as HTMLInputElement
    t.equal(el2.getAttribute('type'), 'foo',
        'Can pass in an arbitrary "type" attribute')
})

test('should delegate id to inner input', async t => {
    document.body.innerHTML += `
        <substrate-input id="my-field" name="field"></substrate-input>
    `

    const el = await waitFor('substrate-input[name="field"]')
    const input = el!.querySelector('input')
    t.equal(input?.getAttribute('id'), 'my-field',
        'inner input should have the delegated id')
    t.ok(!el!.hasAttribute('id'),
        'host element should not retain the id attribute')
})

test('should delegate aria attributes to inner input', async t => {
    document.body.innerHTML += `
        <substrate-input
            name="aria-test"
            aria-describedby="hint"
        ></substrate-input>
    `

    const el = await waitFor('substrate-input[name="aria-test"]')
    const input = el!.querySelector('input')
    t.equal(input?.getAttribute('aria-describedby'), 'hint',
        'inner input should have aria-describedby')
    t.ok(!el!.hasAttribute('aria-describedby'),
        'host element should not retain aria attributes')
})

test('should render label when label attribute is set', async t => {
    document.body.innerHTML += `
        <substrate-input
            name="labeled"
            label="My Label"
        ></substrate-input>
    `

    const el = await waitFor('substrate-input[name="labeled"]')
    const label = el!.querySelector('label')
    t.ok(label, 'should render a label element')
    t.equal(label?.textContent?.trim(), 'My Label',
        'label should have correct text')
})

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

test('all done', () => {
    // @ts-expect-error tests
    window.testsFinished = true
})
