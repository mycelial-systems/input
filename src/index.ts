import { WebComponent } from '@substrate-system/web-component'
import { define } from '@substrate-system/web-component/util'
import { ARIA_ATTRIBUTES, INPUT_ATTRIBUTES } from './util'

// for document.querySelector
declare global {
    interface HTMLElementTagNameMap {
        'substrate-input': SubstrateInput
    }
}

export class SubstrateInput extends WebComponent.create('substrate-input') {
    static TAG = 'substrate-input'
    static INPUT_ATTRIBUTES = INPUT_ATTRIBUTES
    static ARIA_ATTRIBUTES = ARIA_ATTRIBUTES

    static observedAttributes = (['label', 'id'])
        .concat(SubstrateInput.INPUT_ATTRIBUTES)
        .concat(SubstrateInput.ARIA_ATTRIBUTES)

    inputId:string|null = null
    inputAriaAttributes:Record<string, string> = {}
    ignoredAriaCallbackNames:Set<string> = new Set()
    ignoredIdCallback = false
    generatedInputId = `substrate-input-${Math.random().toString(36).slice(2, 10)}`

    handleChange_label (_oldValue, _newValue) {
        this.render()
    }

    handleChange_aria (
        name:string,
        _oldValue:string|null,
        newValue:string|null
    ) {
        if (this.ignoredAriaCallbackNames.has(name)) {
            this.ignoredAriaCallbackNames.delete(name)
            return
        }

        if (newValue === null) {
            delete this.inputAriaAttributes[name]
            this.querySelector('input')?.removeAttribute(name)
            return
        }

        this.inputAriaAttributes[name] = newValue
        this.querySelector('input')?.setAttribute(name, newValue)

        if (this.hasAttribute(name)) {
            this.ignoredAriaCallbackNames.add(name)
            this.removeAttribute(name)
        }
    }

    handleChange_id (_oldValue:string|null, newValue:string|null) {
        if (this.ignoredIdCallback) {
            this.ignoredIdCallback = false
            return
        }

        if (newValue === null) {
            this.inputId = null
            this.querySelector('input')?.removeAttribute('id')
            return
        }

        this.inputId = newValue
        this.querySelector('input')?.setAttribute('id', newValue)

        if (this.hasAttribute('id')) {
            this.ignoredIdCallback = true
            this.removeAttribute('id')
        }
    }

    handleChange_inputAttribute (name:string, newValue:string|null) {
        if (name === 'disabled') {
            newValue === null ?
                this.classList.remove('disabled') :
                this.classList.add('disabled')
        }

        const input = this.querySelector('input')
        if (!input) return

        if (newValue === null) {
            input.removeAttribute(name)
            return
        }

        input.setAttribute(name, newValue)
    }

    async attributeChangedCallback (
        name:string,
        oldValue:string,
        newValue:string
    ) {
        if (name === 'id') {
            this.handleChange_id(oldValue, newValue)
            return
        }

        if (name.startsWith('aria-')) {
            this.handleChange_aria(name, oldValue, newValue)
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

    connectedCallback () {
        this.render()
    }

    getInputIdForRender () {
        return this.inputId || this.generatedInputId
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

    render () {
        const label = this.getAttribute('label')
        const hostId = this.getAttribute('id')
        const hostAriaAttributes = Array.from(this.attributes)
            .filter(attr => attr.name.startsWith('aria-'))

        if (hostId !== null) {
            this.inputId = hostId
        }

        for (const attr of hostAriaAttributes) {
            this.inputAriaAttributes[attr.name] = attr.value
        }

        const name = this.getAttribute('name')
        const attrs = Array.from(this.attributes)
            .filter(attr =>
                attr.name !== 'label' &&
                attr.name !== 'id' &&
                !attr.name.startsWith('aria-')
            )
            .map(attr => attr.name + (attr.value === '' ?
                '' :
                ('=' + `"${attr.value}"`))
            )
            .join(' ')

        const classes = (this.getAttribute('class') ?? '').split(' ')
            .concat(['substrate', 'input', name || ''])
            .filter(Boolean)
            .join(' ')

        const inputId = this.getInputIdForRender()
        const renderedIdAttribute = `id="${inputId}"`
        const ariaAttributes = Object.entries(this.inputAriaAttributes)
            .map(([attrName, attrValue]) => {
                return (attrName + (attrValue === '' ?
                    '' :
                    ('=' + `"${attrValue}"`)))
            })
            .join(' ')

        if (this.hasAttribute('disabled')) {
            this.classList.add('disabled')
        } else {
            this.classList.remove('disabled')
        }

        this.innerHTML = label ? `
        <div class="${classes}">
            <label class="label-content" for="${inputId}">${label}</label>
            <input ${renderedIdAttribute} ${ariaAttributes} ${attrs}
                type="${this.getAttribute('type') || 'text'}"
            />
            </div>` :
        `<div class="${classes}">
            <input ${renderedIdAttribute} ${ariaAttributes} ${attrs}
                type="${this.getAttribute('type') || 'text'}"
            />
        </div>`

        if (this.hasAttribute('id')) {
            this.ignoredIdCallback = true
            this.removeAttribute('id')
        }
        for (const attr of hostAriaAttributes) {
            this.ignoredAriaCallbackNames.add(attr.name)
            this.removeAttribute(attr.name)
        }
    }
}

define(SubstrateInput.TAG, SubstrateInput)
