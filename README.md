# Input
[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/input/nodejs.yml?style=flat-square)](https://github.com/substrate-system/input/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/@substrate-system/input?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/input?cache-control=no-cache)](https://packagephobia.com/result?p=@substrate-system/input)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


Inputs with style. Use this web component, and it will forward any relevant
attributes to the inner `input` element, like an `id` or `name`, for example.
`aria-*` attributes are handled intelligently too.

[See a live demo](https://substrate-system.github.io/input/)

<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [Install](#install)
- [CSS](#css)
  * [Import CSS](#import-css)
  * [Theme](#theme)
- [Use](#use)
  * [JS](#js)
  * [HTML](#html)
  * [Render the markup yourself](#render-the-markup-yourself)
  * [pre-built](#pre-built)
- [API](#api)
  * [Attributes](#attributes)
  * [Properties](#properties)
  * [Events](#events)

<!-- tocstop -->

</details>

## Install

```sh
npm i -S @substrate-system/input
```

## CSS

### Import CSS

```js
import '@substrate-system/input/css'
```

Or minified:
```js
import '@substrate-system/input/min/css'
```

### Theme

Set these CSS variables to theme the input. Each one has a fallback, so
the component works without any of them.

| Variable | Used for | Default |
|----------|----------|---------|
| `--substrate-text` | Input text color | `FieldText` |
| `--substrate-surface` | Input background | `Field` |
| `--substrate-border` | Input border color | `currentcolor` |
| `--substrate-radius` | Input border radius | `0` |
| `--substrate-focus` | Focus ring color | `currentcolor` |
| `--substrate-focus-width` | Focus ring width | `2px` |
| `--substrate-focus-offset` | Focus ring offset | `2px` |

```css
:root {
    --substrate-focus: var(--color-focus);
    --substrate-focus-width: 0.1875rem;
    --substrate-focus-offset: 0.125rem;
}
```

## Use

This calls the global function `customElements.define`. Just import, then use
the tag in your HTML.

### JS
```js
import { SubstrateInput } from '@substrate-system/input'

// TAG property

document.body.innerHTML += `
<${SubstrateInput.TAG}></${SubstrateInput.TAG}>
`
```

### HTML
```html
<div>
    <substrate-input></substrate-input>
</div>
```

### Render the markup yourself

If the element already has an inner `<input>` when it connects, it
keeps the existing markup instead of replacing it. Then a framework
like Preact can render every node itself, and the element only adds
behavior. It leaves the label alone, and every attribute the app already
set on the input. Host attributes only fill in what the input is
missing.

Put `id`, `tabindex`, `autofocus`, and every `aria-*` straight on the
inner input. Then the framework updates and removes them on a node it
owns. Keep the value and state attributes (`name`, `value`, `disabled`,
`required`, `form`) on the host.

Use these classes so the CSS applies:

```html
<substrate-input name="email" required>
    <div class="substrate input email">
        <label class="label-content" for="email">Email</label>
        <input id="email" type="email" aria-describedby="email-hint">
    </div>
</substrate-input>
```

The element does not render while it is detached from the document. A
framework can set attributes and append children first, and the
element renders, or adopts the markup, when it connects.

### pre-built
This package exposes minified JS and CSS files too. Copy them to a location that is
accessible to your web server, then link to them in HTML.

#### copy
```sh
cp ./node_modules/@substrate-system/input/dist/index.min.js ./public/substrate-input.min.js
cp ./node_modules/@substrate-system/input/dist/style.min.css ./public/substrate-input.css
```

#### HTML

```html
<head>
    <link rel="stylesheet" href="./substrate-input.css">
</head>
<body>
    <!-- ... -->
    <script type="module" src="./substrate-input.min.js"></script>
</body>
```

## API

### Attributes

#### Component attributes

These are handled by `substrate-input` directly.

| Attribute | Description |
|-----------|-------------|
| `label` | Text content for the `<label>` element rendered above the input. When omitted, no label is rendered. |
| `id` | Moved to the inner `<input>` element (see [Moved attributes](#moved-attributes)). When omitted, a random id is generated for the input. Use the `inputId` property to change or clear it later. |

#### `input` element attributes

These are copied to the inner `<input>` element and kept on the host.
Removing one from the host removes it from the input too. The exceptions
are `autofocus` and `tabindex`, which are moved instead.

`accept`, `alt`, `autocomplete`, `autocapitalize`, `autocorrect`,
`autofocus`, `capture`, `dirname`, `disabled`, `enterkeyhint`, `form`,
`inputmode`, `list`, `max`, `maxlength`, `min`, `minlength`, `multiple`,
`name`, `pattern`, `placeholder`, `readonly`, `required`, `size`,
`spellcheck`, `step`, `tabindex`, `title`, `type`, `value`

#### Moved attributes

`id`, `tabindex`, `autofocus`, and every `aria-*` attribute describe
the focusable control, so they are moved: copied to the inner `<input>`
and removed from the host. Left on the host they would cause problems.
An `aria-label` on an element with no role fails axe's
`aria-prohibited-attr`, `aria-hidden` hides the whole control, and a
`tabindex` adds a second tab stop.

Because the host no longer has the attribute, removing it from the host
later does nothing. So don't set these on the host from a framework.
Either [render the inner input yourself](#render-the-markup-yourself)
and put them there, pass them in the
[`controlAttributes`](#controlattributes) property, or change them
through the `control` property:

```js
const el = document.querySelector('substrate-input')
el.control.setAttribute('aria-invalid', 'true')
el.control.removeAttribute('aria-invalid')
```

Setting a moved attribute on the host again does work. It moves the new
value to the input.

#### ARIA attributes

These are observed, so setting one on the host after connect moves it
to the inner input. Any other `aria-*` attribute on the host moves when
the element renders.

`aria-activedescendant`, `aria-atomic`, `aria-autocomplete`,
`aria-braillelabel`, `aria-brailleroledescription`, `aria-busy`,
`aria-checked`, `aria-colcount`, `aria-colindex`, `aria-colindextext`,
`aria-colspan`, `aria-controls`, `aria-current`, `aria-describedby`,
`aria-description`, `aria-details`, `aria-disabled`, `aria-dropeffect`,
`aria-errormessage`, `aria-expanded`, `aria-flowto`, `aria-grabbed`,
`aria-haspopup`, `aria-hidden`, `aria-invalid`, `aria-keyshortcuts`,
`aria-label`, `aria-labelledby`, `aria-level`, `aria-live`, `aria-modal`,
`aria-multiline`, `aria-multiselectable`, `aria-orientation`, `aria-owns`,
`aria-placeholder`, `aria-posinset`, `aria-pressed`, `aria-readonly`,
`aria-relevant`, `aria-required`, `aria-roledescription`, `aria-rowcount`,
`aria-rowindex`, `aria-rowindextext`, `aria-rowspan`, `aria-selected`,
`aria-setsize`, `aria-sort`, `aria-valuemax`, `aria-valuemin`,
`aria-valuenow`, `aria-valuetext`

### Properties

| Property | Description |
|----------|-------------|
| `control` | The inner `<input>` element, or `null` before render. Read only. |
| `value` | Reads and writes the inner input's live value. |
| `disabled` | Boolean. Sets or removes the `disabled` attribute. |
| `inputId` | The inner input's id. Set it to `null` or `''` to clear it; the input then gets a generated id. |
| `controlAttributes` | The inner input's `aria-*`, `tabindex`, and `autofocus` attributes, as an object. See [below](#controlattributes). |
| `label` | Sets or removes the `label` attribute. |

#### `controlAttributes`

Use this property to set and clear the inner input's `aria-*`,
`tabindex`, and `autofocus` from a framework. Pass every one the input
should have, on every render. A name you passed before and leave out
now is removed from the input, so clearing an error clears its
`aria-invalid` and `aria-describedby` too.

```js
import { html } from 'htm/preact'

html`<substrate-input
    name="email"
    label="Email"
    controlAttributes=${{
        'aria-invalid': bad ? 'true' : undefined,
        'aria-describedby': bad ? 'email-error' : undefined
    }}
></substrate-input>`
```

Values follow Preact's rules for attributes. `null` and `undefined`
remove the attribute. For `aria-*`, `true` and `false` become `"true"`
and `"false"`. For `tabindex` and `autofocus`, `true` is an empty
attribute and `false` removes it. Any other value becomes a string.
Setting the property to `null` or `''` clears every attribute it set.

Other names, including `id`, are ignored. Use `inputId` for the id.
`controlAttributes` only removes attributes it set itself, so an
attribute already on an input you
[rendered yourself](#render-the-markup-yourself) stays.

A host `aria-*` attribute and `controlAttributes` write to the same
attribute on the input, so whichever is set last wins. Setting
`autofocus` after the element has rendered does not move focus.

### Events

`substrate-input` does not emit any custom events. All native `<input>`
events (`change`, `input`, `focus`, `blur`, etc.) bubble up through the
component as normal.

```js
const el = document.querySelector('substrate-input')
el.addEventListener('input', ev => {
    console.log(ev.target.value)
})
```

