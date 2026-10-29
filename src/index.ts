import { WebComponent } from '@substrate-system/web-component'
import { define } from '@substrate-system/web-component/util'
import {
    ARIA_ATTRIBUTES,
    INPUT_ATTRIBUTES,
    MOVED_ATTRIBUTES
} from './util.js'

/**
 * Attributes for the inner input, set through `controlAttributes`.
 */
export type ControlAttributes = Record<
    string,
    string|number|boolean|null|undefined
>

// for document.querySelector
declare global {
    interface HTMLElementTagNameMap {
        'substrate-input': SubstrateInput
    }
}

/**
 * Properties a page or framework can set before this element is
 * defined. `upgradeProperties` runs them through their setters.
 */
const UPGRADED_PROPERTIES = [
    'controlAttributes',
    'inputId',
    'value',
    'label',
    'disabled'
]

/**
 * What Preact writes for the two properties that have no attribute of
 * their own, when it renders before this element is defined.
 */
const PROPERTY_ATTRIBUTES = ['controlattributes', 'inputid']

export class SubstrateInput extends WebComponent.create('substrate-input') {
    static TAG = 'substrate-input'
    static INPUT_ATTRIBUTES = INPUT_ATTRIBUTES
    static ARIA_ATTRIBUTES = ARIA_ATTRIBUTES
    static MOVED_ATTRIBUTES = MOVED_ATTRIBUTES

    static observedAttributes = (['label', 'id'])
        .concat(SubstrateInput.INPUT_ATTRIBUTES)
        .concat(SubstrateInput.ARIA_ATTRIBUTES)

    _inputId:string|null = null

    generatedInputId = 'substrate-input-' +
        Math.random().toString(36).slice(2, 10)

    // the inner input this element has rendered or adopted
    inputEl:HTMLInputElement|null = null
    // false when the app rendered the inner markup itself
    ownsMarkup = false

    _controlAttributes:ControlAttributes = {}
    // names applyControlAttributes wrote to the current inner input
    appliedControlAttributes:string[] = []

    handleChange_label (_oldValue:string|null, newValue:string|null) {
        if (this.ownsMarkup) {
            const input = this.querySelector('input')
            if (input) this.updateLabel(input, newValue)
            return
        }

        // A framework sets attributes before it appends children, so
        // wait for connectedCallback instead of rendering detached.
        if (!this.inputEl && this.isConnected) this.render()
    }

    /**
     * Move an attribute from the host to the inner input.
     */
    handleChange_movedAttribute (name:string, newValue:string|null) {
        // A removal is either ours, or happens before there is an inner
        // input to update. A value the host no longer has was already
        // moved; during upgrade its callback can arrive after render.
        if (newValue === null || !this.hasAttribute(name)) return

        const input = this.querySelector('input')
        // render moves it later
        if (!input) return

        if (name === 'id') {
            this.inputId = newValue
        } else {
            forwardAttribute(input, name, newValue)
            // the host write now owns the name
            this.appliedControlAttributes = this.appliedControlAttributes
                .filter(applied => applied !== name)
        }
        this.removeAttribute(name)
    }

    handleChange_inputAttribute (name:string, newValue:string|null) {
        if (name === 'disabled') {
            this.classList.toggle('disabled', newValue !== null)
        }

        const input = this.querySelector('input')
        if (!input) return

        forwardAttribute(input, name, newValue)
    }

    async attributeChangedCallback (
        name:string,
        oldValue:string,
        newValue:string
    ) {
        if (isMoved(name)) {
            this.handleChange_movedAttribute(name, newValue)
            return
        }

        if (SubstrateInput.INPUT_ATTRIBUTES.includes(name)) {
            this.handleChange_inputAttribute(name, newValue)
            return
        }

        if (this[`handleChange_${name}`]) {
            this[`handleChange_${name}`](oldValue, newValue)
        }
    }

    /**
     * Re-set properties that were set before this element was
     * defined, so they go through the setters, and take over the
     * attributes Preact writes for them.
     */
    upgradeProperties ():void {
        for (const name of UPGRADED_PROPERTIES) {
            if (!Object.hasOwn(this, name)) continue
            const value = Reflect.get(this, name)
            Reflect.deleteProperty(this, name)
            Reflect.set(this, name, value)
        }

        const inputId = this.getAttribute('inputid')
        for (const name of PROPERTY_ATTRIBUTES) this.removeAttribute(name)
        // an id given another way wins
        if (
            inputId !== null &&
            this._inputId === null &&
            !this.hasAttribute('id')
        ) {
            this.inputId = inputId
        }
    }

    connectedCallback () {
        this.upgradeProperties()
        this.render()
    }

    getInputIdForRender () {
        return this._inputId || this.generatedInputId
    }

    /**
     * The inner input. Change `aria-*`, `tabindex`, and `autofocus` here
     * after connect, because they are moved off the host.
     */
    get control ():HTMLInputElement|null {
        return this.querySelector('input')
    }

    /**
     * The id of the inner input. The host can't share an id with it, so
     * set this property instead of the `id` attribute when a framework
     * needs to change or clear it later.
     */
    set inputId (value:string|null) {
        // frameworks clear a removed property with `null` or ''
        this._inputId = value || null

        const input = this.querySelector('input')
        if (!input) return

        if (!this.ownsMarkup) {
            // the app owns the markup; only apply an id it asked for
            if (this._inputId) input.id = this._inputId
            return
        }

        input.id = this.getInputIdForRender()
        const label = this.querySelector('label')
        if (label) label.htmlFor = input.id
    }

    get inputId ():string|null {
        return this._inputId
    }

    /**
     * Every `aria-*`, `tabindex`, and `autofocus` attribute the inner
     * input should have. A name left out of a later value is removed, so
     * a framework can clear one on any render.
     */
    set controlAttributes (value:ControlAttributes|null) {
        // frameworks clear a removed property with `null` or ''
        this._controlAttributes = (value && typeof value === 'object') ?
            { ...value } :
            {}
        this.applyControlAttributes()
    }

    get controlAttributes ():ControlAttributes {
        return { ...this._controlAttributes }
    }

    /**
     * Write `controlAttributes` to the inner input, and remove the names
     * it wrote last time but no longer lists.
     */
    applyControlAttributes () {
        const input = this.querySelector('input')
        if (!input) return

        // An input this element has not adopted yet, because it is not
        // connected or the app swapped it. Adopting it applies these.
        if (input !== this.inputEl) {
            if (this.isConnected) this.render()
            return
        }

        // Names are lowercased. A later key replaces an earlier one
        // with the same lowercased name.
        const values = new Map<string, string|null>()
        for (const [key, value] of Object.entries(this._controlAttributes)) {
            const name = key.toLowerCase()
            // `id` goes through `inputId`
            if (name === 'id' || !isMoved(name)) continue
            values.set(name, toAttributeValue(name, value))
        }

        for (const name of this.appliedControlAttributes) {
            if (values.get(name) == null) input.removeAttribute(name)
        }

        const applied:string[] = []
        for (const [name, attrValue] of values) {
            if (attrValue === null) continue
            try {
                input.setAttribute(name, attrValue)
                applied.push(name)
            } catch (_err) {
                // skip names setAttribute rejects
            }
        }
        this.appliedControlAttributes = applied
    }

    set label (value:string|null) {
        if (value === null) {
            this.removeAttribute('label')
            return
        }
        this.setAttribute('label', value)
    }

    get label ():string|null {
        return this.getAttribute('label')
    }

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

    set disabled (value:boolean) {
        this.toggleAttribute('disabled', !!value)
    }

    get disabled ():boolean {
        return this.hasAttribute('disabled')
    }

    updateLabel (input:HTMLInputElement, text:string|null) {
        let labelEl = this.querySelector('label')

        if (!text) {
            labelEl?.remove()
            return
        }

        if (!labelEl) {
            labelEl = document.createElement('label')
            labelEl.className = 'label-content'
            input.before(labelEl)
        }

        labelEl.htmlFor = input.id
        labelEl.textContent = text
    }

    render () {
        this.classList.toggle('disabled', this.hasAttribute('disabled'))

        const existing = this.querySelector('input')
        if (!existing) {
            this.build()
        } else if (existing !== this.inputEl) {
            this.hydrate(existing)
        }
    }

    /**
     * Adopt an inner input the app rendered. The app keeps every node,
     * and every attribute it already set on the input.
     */
    hydrate (input:HTMLInputElement) {
        this.inputEl = input
        this.ownsMarkup = false
        this.appliedControlAttributes = []

        const hostId = this.getAttribute('id')
        if (hostId !== null && !input.id) {
            this._inputId = hostId
            input.id = hostId
        }

        for (const attr of Array.from(this.attributes)) {
            if (attr.name === 'id' || !isForwarded(attr.name)) continue
            if (input.hasAttribute(attr.name)) continue
            forwardAttribute(input, attr.name, attr.value)
        }

        this.removeMovedAttributes()
        this.applyControlAttributes()
    }

    build () {
        const hostId = this.getAttribute('id')
        if (hostId !== null) {
            this._inputId = hostId
        }

        const label = this.getAttribute('label')
        const name = this.getAttribute('name')
        const forwardedAttributes = Array.from(this.attributes)
            .filter(attr => (
                attr.name !== 'label' &&
                attr.name !== 'id' &&
                !PROPERTY_ATTRIBUTES.includes(attr.name)
            ))

        const classes = (this.getAttribute('class') ?? '').split(' ')
            .concat(['substrate', 'input', name || ''])
            .filter(Boolean)
            .join(' ')

        const inputId = this.getInputIdForRender()

        // build with DOM APIs so attribute values are never parsed as HTML
        const input = document.createElement('input')
        input.setAttribute('id', inputId)
        for (const attr of forwardedAttributes) {
            try {
                input.setAttribute(attr.name, attr.value)
            } catch (_err) {
                // some engines reject names the parser allows, like `@click`
            }
        }
        input.setAttribute('type', this.getAttribute('type') || 'text')

        const wrapper = document.createElement('div')
        wrapper.setAttribute('class', classes)
        wrapper.appendChild(input)
        this.replaceChildren(wrapper)

        this.inputEl = input
        this.ownsMarkup = true
        this.appliedControlAttributes = []
        this.updateLabel(input, label)
        this.removeMovedAttributes()
        this.applyControlAttributes()
    }

    removeMovedAttributes () {
        for (const attr of Array.from(this.attributes)) {
            if (isMoved(attr.name)) this.removeAttribute(attr.name)
        }
    }
}

/**
 * `aria-*`, `id`, `tabindex`, and `autofocus` describe the focusable
 * control, so they move off the host.
 */
function isMoved (name:string):boolean {
    return (name.startsWith('aria-') ||
        SubstrateInput.MOVED_ATTRIBUTES.includes(name))
}

function isForwarded (name:string):boolean {
    return (isMoved(name) || SubstrateInput.INPUT_ATTRIBUTES.includes(name))
}

/**
 * Copy a host attribute to the inner input. `value` goes through the
 * live property, so it still applies after someone has typed.
 */
function forwardAttribute (
    input:HTMLInputElement,
    name:string,
    value:string|null
) {
    if (name === 'value') {
        input.value = value ?? ''
        return
    }

    if (value === null) {
        input.removeAttribute(name)
        return
    }

    input.setAttribute(name, value)
}

/**
 * Turn a `controlAttributes` value into an attribute value the way
 * Preact does. `null` means the attribute should be absent.
 */
function toAttributeValue (
    name:string,
    value:ControlAttributes[string]
):string|null {
    if (value === null || value === undefined) return null
    if (typeof value === 'boolean') {
        if (name.startsWith('aria-')) return String(value)
        return value ? '' : null
    }
    return String(value)
}

define(SubstrateInput.TAG, SubstrateInput)
