import { test } from '@substrate-system/tapzero'
import { waitFor } from '@substrate-system/dom'
import '../src/index.js'
import type { SubstrateInput } from '../src/index.js'

type SubstrateInputHost = HTMLElement & {
    value:string;
}

/**
 * Build the markup an app would render inside the host itself.
 */
function appMarkup (inputId:string):HTMLDivElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'substrate input'
    const label = document.createElement('label')
    label.className = 'label-content'
    label.htmlFor = inputId
    const input = document.createElement('input')
    input.id = inputId
    wrapper.append(label, input)
    return wrapper
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

test('should move aria attributes to inner input', async t => {
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

test('moves focus attributes off the host', async t => {
    document.body.innerHTML +=
        '<substrate-input name="focus-attrs" label="Focus" ' +
        'aria-describedby="hint" tabindex="0" autofocus>' +
        '</substrate-input>'

    const el = await waitFor('substrate-input[name="focus-attrs"]')
    const input = el!.querySelector('input')!

    t.equal(input.getAttribute('aria-describedby'), 'hint',
        'inner input should have aria-describedby')
    t.equal(input.getAttribute('tabindex'), '0',
        'inner input should have tabindex')
    t.ok(input.hasAttribute('autofocus'),
        'inner input should have autofocus')
    for (const name of ['aria-describedby', 'tabindex', 'autofocus']) {
        t.ok(!el!.hasAttribute(name), `host should not keep ${name}`)
    }
})

test('a moved attribute set after render moves too', async t => {
    document.body.innerHTML +=
        '<substrate-input name="late-aria"></substrate-input>'

    const el = await waitFor('substrate-input[name="late-aria"]')
    const input = el!.querySelector('input')!

    el!.setAttribute('aria-invalid', 'true')
    t.equal(input.getAttribute('aria-invalid'), 'true',
        'inner input should get aria-invalid')
    t.ok(!el!.hasAttribute('aria-invalid'),
        'host should not keep aria-invalid')

    el!.setAttribute('tabindex', '-1')
    t.equal(input.getAttribute('tabindex'), '-1',
        'inner input should get tabindex')
    t.ok(!el!.hasAttribute('tabindex'), 'host should not keep tabindex')
})

test('mirrors state attributes and keeps them on the host', async t => {
    document.body.innerHTML +=
        '<substrate-input name="mirrored" required></substrate-input>'

    const el = await waitFor('substrate-input[name="mirrored"]')
    const input = el!.querySelector('input')!

    t.equal(el!.getAttribute('name'), 'mirrored', 'host keeps name')
    t.ok(el!.hasAttribute('required'), 'host keeps required')
    t.ok(input.required, 'inner input is required')

    el!.setAttribute('disabled', '')
    t.ok(input.disabled, 'inner input should be disabled')
    t.ok(el!.hasAttribute('disabled'), 'host keeps disabled')

    el!.removeAttribute('disabled')
    t.ok(!input.disabled, 'inner input should no longer be disabled')

    el!.removeAttribute('required')
    t.ok(!input.required, 'inner input should no longer be required')
})

test('control property returns the inner input', async t => {
    document.body.innerHTML +=
        '<substrate-input name="control"></substrate-input>'

    const host = await waitFor(
        'substrate-input[name="control"]'
    ) as SubstrateInput
    const input = host.querySelector('input')!
    t.equal(host.control, input, 'control should be the inner input')

    // the way to change a moved attribute after connect
    host.control!.setAttribute('aria-invalid', 'true')
    host.control!.removeAttribute('aria-invalid')
    t.ok(!input.hasAttribute('aria-invalid'),
        'removal through control should stick')
})

test('aria attributes survive upgrade when after label', async t => {
    // upgrade queues a callback per attribute; label renders first
    document.body.innerHTML +=
        '<substrate-input name="aria-after-label" label="Label" ' +
        'aria-invalid="true"></substrate-input>'

    const el = await waitFor('substrate-input[name="aria-after-label"]')
    const input = el!.querySelector('input')
    t.equal(input?.getAttribute('aria-invalid'), 'true',
        'inner input should keep aria-invalid')
    t.ok(!el!.hasAttribute('aria-invalid'),
        'host element should not retain aria-invalid')
})

test('id survives upgrade when after label', async t => {
    document.body.innerHTML +=
        '<substrate-input name="id-after-label" label="Label" ' +
        'id="id-after-label"></substrate-input>'

    const el = await waitFor('substrate-input[name="id-after-label"]')
    const input = el!.querySelector('input')
    t.equal(input?.getAttribute('id'), 'id-after-label',
        'inner input should keep the delegated id')
    t.equal(el!.querySelector('label')?.htmlFor, 'id-after-label',
        'label should point at the inner input')
    t.ok(!el!.hasAttribute('id'),
        'host element should not retain the id attribute')
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

test('render does not interpret values as markup', async t => {
    const quoted = 'My "work" <laptop>'
    const payload = '"><img src=x onerror="window.__xss = true">'

    const host = document.createElement('substrate-input')
    host.setAttribute('name', 'escaping')
    host.setAttribute('value', quoted)
    host.setAttribute('placeholder', payload)
    host.setAttribute('aria-label', quoted)
    host.setAttribute('label', payload)
    document.body.appendChild(host)

    const input = await waitFor(
        'substrate-input[name="escaping"] input'
    ) as HTMLInputElement

    t.equal(input.value, quoted, 'live value should match exactly')
    t.equal(input.getAttribute('value'), quoted,
        'value attribute should match exactly')
    t.equal(input.getAttribute('placeholder'), payload,
        'placeholder should match exactly')
    t.equal(input.getAttribute('aria-label'), quoted,
        'aria-label should match exactly')
    t.equal(host.querySelector('label')?.textContent, payload,
        'label text should match the label attribute exactly')
    t.equal(host.querySelectorAll('img').length, 0,
        'no injected elements')
    t.equal(host.querySelectorAll('*').length, 3,
        'host should contain only the wrapper, label, and input')
})

test('render does not let values escape an attribute', async t => {
    const breakout = 'x" onfocus="window.__xss = true'

    const host = document.createElement(
        'substrate-input'
    ) as SubstrateInputHost
    host.setAttribute('name', 'breakout')
    host.setAttribute('id', breakout)
    host.setAttribute('class', breakout)
    host.setAttribute('required', '')
    host.value = breakout
    document.body.appendChild(host)

    const input = await waitFor(
        'substrate-input[name="breakout"] input'
    ) as HTMLInputElement
    const wrapper = host.firstElementChild as HTMLElement

    t.equal(input.value, breakout,
        'pre-connection value should survive render exactly')
    t.equal(input.getAttribute('id'), breakout,
        'delegated id should match exactly')
    t.ok(!input.hasAttribute('onfocus'),
        'input should not gain an injected attribute')
    t.ok(!wrapper.hasAttribute('onfocus'),
        'wrapper should not gain an injected attribute')
    t.ok(input.hasAttribute('required'),
        'empty-valued boolean attributes should still be forwarded')
    t.equal(host.querySelectorAll('*').length, 2,
        'host should contain only the wrapper and input')
})

test('render skips attribute names setAttribute rejects', async t => {
    // older engines reject names like `@click` that the parser accepts
    const original = HTMLInputElement.prototype.setAttribute
    HTMLInputElement.prototype.setAttribute = function (name, value) {
        if (name === '@click') {
            throw new DOMException('invalid name', 'InvalidCharacterError')
        }
        return original.call(this, name, value)
    }

    try {
        document.body.innerHTML +=
            '<substrate-input name="odd-attr" id="odd-attr-input" ' +
            '@click="noop"></substrate-input>'
    } finally {
        HTMLInputElement.prototype.setAttribute = original
    }

    const host = await waitFor('substrate-input[name="odd-attr"]')
    const input = host!.querySelector('input')
    t.ok(input, 'should still render the inner input')
    t.equal(input?.getAttribute('name'), 'odd-attr',
        'other attributes should still be forwarded')
    t.ok(!host!.hasAttribute('id'),
        'host id should still be delegated')
})

test('hydrates when the inner input is already there', async t => {
    const host = document.createElement('substrate-input')
    host.setAttribute('name', 'hydrate')
    const markup = appMarkup('hydrate-input')
    host.appendChild(markup)
    const input = markup.querySelector('input')!

    let inputEvents = 0
    input.addEventListener('input', () => inputEvents++)

    document.body.appendChild(host)

    t.equal(host.querySelector('input'), input,
        'should keep the same input node')
    t.equal(host.firstElementChild, markup,
        'should keep the same wrapper node')
    t.equal(host.querySelectorAll('input').length, 1,
        'should not add another input')

    input.dispatchEvent(new Event('input', { bubbles: true }))
    t.equal(inputEvents, 1,
        'a listener attached before connecting should still fire')
})

test('hydrating fills in missing attributes only', async t => {
    const host = document.createElement('substrate-input')
    host.setAttribute('name', 'hydrate-mirror')
    host.setAttribute('id', 'host-id')
    host.setAttribute('aria-describedby', 'hint')
    host.setAttribute('aria-label', 'From the host')
    const markup = appMarkup('hydrate-mirror-input')
    const input = markup.querySelector('input')!
    input.setAttribute('aria-label', 'From the app')
    host.appendChild(markup)
    document.body.appendChild(host)

    t.equal(input.getAttribute('aria-describedby'), 'hint',
        'existing input should get a missing aria attribute')
    t.equal(input.getAttribute('name'), 'hydrate-mirror',
        'existing input should get a missing input attribute')
    t.equal(input.getAttribute('aria-label'), 'From the app',
        'should not replace an attribute the app set')
    t.equal(input.id, 'hydrate-mirror-input',
        'should not replace the id the app gave the input')
    for (const name of ['id', 'aria-describedby', 'aria-label']) {
        t.ok(!host.hasAttribute(name), `host should not keep ${name}`)
    }
    t.equal(host.getAttribute('name'), 'hydrate-mirror',
        'host should keep mirrored attributes')
})

test('hydrated input keeps a removal the app made', async t => {
    const host = document.createElement('substrate-input')
    host.setAttribute('name', 'hydrate-removal')
    host.setAttribute('label', 'Label')
    const markup = appMarkup('hydrate-removal-input')
    const input = markup.querySelector('input')!
    input.setAttribute('aria-invalid', 'true')
    host.appendChild(markup)
    document.body.appendChild(host)

    t.equal(input.getAttribute('aria-invalid'), 'true',
        'should leave the existing aria-invalid alone')

    // what Preact does when the prop goes away
    input.removeAttribute('aria-invalid')

    // things that could make the element re-apply attributes
    host.setAttribute('label', 'Changed')
    host.setAttribute('placeholder', 'something')
    const container = document.createElement('div')
    document.body.appendChild(container)
    container.appendChild(host)

    t.ok(!input.hasAttribute('aria-invalid'),
        'the element should not add aria-invalid back')
    t.equal(host.querySelector('input'), input,
        'should still have the app input')
})

test('does not render before it is connected', async t => {
    // a framework sets attributes on a detached element, then appends
    // its own children, then connects it
    const host = document.createElement('substrate-input')
    host.setAttribute('label', 'Early label')
    host.setAttribute('name', 'detached')
    t.equal(host.children.length, 0,
        'should not render while detached')

    const markup = appMarkup('detached-input')
    host.appendChild(markup)
    document.body.appendChild(host)

    t.equal(host.querySelectorAll('input').length, 1,
        'should have only the app input')
    t.equal(host.firstElementChild, markup,
        'should keep the app markup')
})

test('changing the label keeps the same input', async t => {
    document.body.innerHTML +=
        '<substrate-input name="relabel" label="Before"></substrate-input>'

    const host = await waitFor(
        'substrate-input[name="relabel"]'
    ) as SubstrateInputHost
    const input = host.querySelector('input')!
    input.value = 'typed value'

    host.setAttribute('label', 'After')
    t.equal(host.querySelector('input'), input,
        'should keep the same input node')
    t.equal(input.value, 'typed value', 'should keep the live value')
    t.equal(host.querySelector('label')?.textContent,
        host.getAttribute('label'),
        'label should match the new attribute')
    t.equal(host.querySelector('label')?.htmlFor, input.id,
        'label should still point at the input')

    host.removeAttribute('label')
    t.ok(!host.querySelector('label'), 'should remove the label')
    t.equal(host.querySelector('input'), input,
        'should still keep the same input node')

    host.setAttribute('label', 'Again')
    const label = host.querySelector('label')
    t.equal(label?.htmlFor, input.id, 'should add a label for the input')
    t.equal(label?.nextElementSibling, input,
        'the label should come before the input')
})

test('reconnecting keeps the same input', async t => {
    document.body.innerHTML +=
        '<substrate-input name="reconnect" label="Move"></substrate-input>'

    const host = await waitFor('substrate-input[name="reconnect"]')
    const input = host!.querySelector('input')!
    input.value = 'typed value'

    const container = document.createElement('div')
    document.body.appendChild(container)
    container.appendChild(host!)

    t.equal(host!.querySelector('input'), input,
        'should keep the same input node')
    t.equal(host!.querySelectorAll('label').length, 1,
        'should not add another label')
    t.equal(input.value, 'typed value', 'should keep the live value')
})

test('inputId property sets the inner input id', async t => {
    document.body.innerHTML +=
        '<substrate-input name="input-id" label="Id"></substrate-input>'

    const host = await waitFor(
        'substrate-input[name="input-id"]'
    ) as SubstrateInput
    const input = host.querySelector('input')!
    const label = host.querySelector('label')!

    host.inputId = 'from-property'
    t.equal(input.id, 'from-property', 'input should get the id')
    t.equal(label.htmlFor, 'from-property', 'label should follow the id')
    t.equal(host.inputId, 'from-property', 'getter should return the id')
    t.ok(!host.hasAttribute('id'), 'host should not get the id')

    // frameworks clear a removed property with null or ''
    host.inputId = ''
    t.equal(host.inputId, null, 'clearing should reset the property')
    t.ok(input.id, 'input should fall back to a generated id')
    t.equal(label.htmlFor, input.id, 'label should follow the fallback')
})

test('setting the host id again updates the inner input', async t => {
    document.body.innerHTML +=
        '<substrate-input name="id-removal" label="Id" ' +
        'id="id-removal"></substrate-input>'

    const host = await waitFor('substrate-input[name="id-removal"]')
    const input = host!.querySelector('input')!

    host!.setAttribute('id', 'id-removal-2')
    t.equal(input.id, 'id-removal-2', 'input should get the new id')
    t.ok(!host!.hasAttribute('id'), 'host should not keep the id')
})

test('disabled property reflects to the inner input', async t => {
    document.body.innerHTML +=
        '<substrate-input name="disabled-prop"></substrate-input>'

    const host = await waitFor(
        'substrate-input[name="disabled-prop"]'
    ) as SubstrateInput
    const input = host.querySelector('input')!

    host.disabled = true
    t.ok(input.disabled, 'inner input should be disabled')
    t.ok(host.disabled, 'getter should return true')
    t.ok(host.classList.contains('disabled'), 'host gets the class')

    host.disabled = false
    t.ok(!input.disabled, 'inner input should be enabled')
    t.ok(!host.disabled, 'getter should return false')
    t.ok(!host.classList.contains('disabled'), 'host loses the class')
})

test('controlAttributes puts attributes on the input only', async t => {
    document.body.innerHTML +=
        '<substrate-input name="ca-set"></substrate-input>'
    const el = await waitFor(
        'substrate-input[name="ca-set"]'
    ) as SubstrateInput
    el.controlAttributes = { 'aria-describedby': 'hint', tabindex: 0 }
    t.equal(el.control!.getAttribute('aria-describedby'), 'hint',
        'input gets aria-describedby')
    t.equal(el.control!.getAttribute('tabindex'), '0', 'input gets tabindex')
    t.ok(!el.hasAttribute('aria-describedby'), 'host does not')
})

test('controlAttributes removes a name it no longer lists', async t => {
    document.body.innerHTML +=
        '<substrate-input name="ca-drop"></substrate-input>'
    const el = await waitFor(
        'substrate-input[name="ca-drop"]'
    ) as SubstrateInput
    el.controlAttributes = {
        'aria-invalid': 'true',
        'aria-describedby': 'err'
    }
    el.controlAttributes = { 'aria-describedby': undefined }
    t.ok(!el.control!.hasAttribute('aria-invalid'), 'aria-invalid is gone')
    t.ok(!el.control!.hasAttribute('aria-describedby'),
        'an undefined value removes it')
    el.controlAttributes = { 'aria-label': 'x' }
    el.controlAttributes = null
    t.ok(!el.control!.hasAttribute('aria-label'), 'null clears all')
    el.controlAttributes = { 'aria-label': 'x' }
    Reflect.set(el, 'controlAttributes', '')
    t.ok(!el.control!.hasAttribute('aria-label'), 'empty string clears all')
})

test('controlAttributes set before render reaches the input', async t => {
    const el = document.createElement('substrate-input') as SubstrateInput
    el.setAttribute('name', 'ca-early')
    el.controlAttributes = { 'aria-required': true }
    el.setAttribute('label', 'Early')
    document.body.appendChild(el)
    await waitFor('substrate-input[name="ca-early"]')
    t.equal(el.control!.getAttribute('aria-required'), 'true',
        'input has aria-required')
})

test('controlAttributes ignores names it does not move', async t => {
    document.body.innerHTML +=
        '<substrate-input name="ca-ignore"></substrate-input>'
    const el = await waitFor(
        'substrate-input[name="ca-ignore"]'
    ) as SubstrateInput
    el.controlAttributes = { name: 'x', id: 'y' }
    t.equal(el.control!.getAttribute('name'), 'ca-ignore',
        'name is unchanged')
    t.notEqual(el.control!.id, 'y', 'id is ignored')
})

test('controlAttributes writes booleans as Preact does', async t => {
    document.body.innerHTML +=
        '<substrate-input name="ca-bools"></substrate-input>'
    const el = await waitFor(
        'substrate-input[name="ca-bools"]'
    ) as SubstrateInput
    el.controlAttributes = { 'aria-invalid': false, autofocus: true }
    t.equal(el.control!.getAttribute('aria-invalid'), 'false',
        'aria false is the string "false"')
    t.equal(el.control!.getAttribute('autofocus'), '', 'true is present')
    el.controlAttributes = { autofocus: false }
    t.ok(!el.control!.hasAttribute('autofocus'), 'false removes it')
})

test('controlAttributes leaves a hydrated input\'s own attributes',
    async t => {
        const el = document.createElement('substrate-input') as
            SubstrateInput
        el.setAttribute('name', 'ca-hydrate')
        const markup = appMarkup('ca-hydrate-id')
        markup.querySelector('input')!.setAttribute('aria-label', 'app')
        el.appendChild(markup)
        el.controlAttributes = { 'aria-invalid': 'true' }
        document.body.appendChild(el)
        await waitFor('substrate-input[name="ca-hydrate"]')
        t.equal(el.control!.getAttribute('aria-invalid'), 'true',
            'hydrate applies it')
        el.controlAttributes = {}
        t.ok(!el.control!.hasAttribute('aria-invalid'),
            'its own attribute is removed')
        t.equal(el.control!.getAttribute('aria-label'), 'app',
            'the app attribute stays')
    })

test('controlAttributes follows a swapped inner input', async t => {
    const el = document.createElement('substrate-input') as SubstrateInput
    el.setAttribute('name', 'ca-swap')
    el.appendChild(appMarkup('ca-swap-id'))
    document.body.appendChild(el)
    await waitFor('substrate-input[name="ca-swap"]')
    el.controlAttributes = { 'aria-describedby': 'a' }

    const next = document.createElement('input')
    next.setAttribute('aria-describedby', 'app')
    el.control!.replaceWith(next)
    el.controlAttributes = { 'aria-invalid': 'true' }
    t.equal(next.getAttribute('aria-invalid'), 'true',
        'the new input gets it')
    t.equal(next.getAttribute('aria-describedby'), 'app',
        'the app attribute on the new input stays')
})

test('all done', () => {
    // @ts-expect-error tests
    window.testsFinished = true
})
