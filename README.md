# react-modular-forms

Type-safe, extensible forms for React. Define fields once, get strongly-typed submit data, plug in any input component, and keep validation simple.

• React 18/19 • Tiny API • Works with native inputs and custom components

## Contents

- [Install](#install)
- [Quick start](#quick-start-recommended)
  - [Field wrapping](#field-wrapping-optional)
- [Components](#components)
  - [ModularForm](#modularform)
  - [ModularFormField](#modularformfield)
- [Validation](#validation)
- [Value coercion and empty strings](#value-coercion-and-empty-strings)
- [Custom inputs (registerType)](#custom-inputs-registertype)
  - [Strong typing for custom field values](#strong-typing-for-custom-field-values)
- [Accessing the FormStore](#accessing-the-formstore)
- [Config (global behavior)](#config-global-behavior)
- [Minimal API reference](#minimal-api-reference)
- [FAQ](#faq)

## Install

```bash
npm install react-modular-forms
# or
pnpm add react-modular-forms
# or
yarn add react-modular-forms
```

Peer deps: react, react-dom (v18 or v19).

## Quick start (recommended)

Use the `useModularForm` hook. You define the fields once and get:

- A ready-to-use `ModularForm` component bound to a stable id
- A `build(name)` helper for unique field names and `buildById(id)` for duplicate-name groups
- Strong TypeScript inference for the `onSubmit` data

```tsx
import { useModularForm, ModularFieldType } from 'react-modular-forms';

export function SignupForm() {
  const fields = [
    { name: 'email', type: ModularFieldType.Email, validation: { required: true } },
    { name: 'age', type: ModularFieldType.Number, coerceType: 'int' as const },
    { name: 'tags', type: ModularFieldType.Text, coerceType: 'array' as const }
  ] as const; // "as const" enables precise typing

  const { ModularForm, build } = useModularForm(fields);

  return (
    <ModularForm
      onSubmit={(e, data) => {
        // data.email: string (required)
        // data.age?: number
        // data.tags?: unknown[]
        console.log(data);
      }}
    >
      {build('email')}
      {build('age')}
      {build('tags')}
      <button type="submit">Create account</button>
    </ModularForm>
  );
}
```

### Field wrapping (optional)

Wrap every field with a layout or design system element:

- Global: `config.wrapField = (field, props) => ReactElement`
- Per form: `<ModularForm wrapField={(field, props) => ...}>`
- Per field: `build('name', overrides, { wrap: (field, props) => ... })` or `buildById('field-id', overrides, { wrap: ... })`; use `wrap: null` to disable

Precedence: per-field > per-form > global.

### Duplicate-name groups with the hook

Checkbox and radio groups often reuse the same `name`. That is still the correct way to model grouped values.

When you render through `useModularForm`, `build(name)` is only for names that resolve to exactly one field. If multiple fields share the same `name`, give each field an explicit `id` and render them with `buildById(id)`.

```tsx
const fields = [
  { id: 'contact-email', name: 'contact', type: 'radio', value: 'email' },
  { id: 'contact-phone', name: 'contact', type: 'radio', value: 'phone' }
] as const;

const { ModularForm, buildById } = useModularForm(fields);

<ModularForm>
  {buildById('contact-email')}
  {buildById('contact-phone')}
</ModularForm>;
```

`name` still controls how values are grouped on submit. `id` only disambiguates which field to render.

## Components

### ModularForm

Form wrapper. Handles validation and transforms values before calling `onSubmit`.

Props highlights:

- `id` string (required if used directly)
- `onSubmit(e, data)` typed with your values
- `onSubmitError(e, errors)` to intercept validation errors
- `parseAccessors` to convert names like `user.address[0].city` into nested objects
- `wrapField` when used with `useModularForm`’s returned component

You can also use `ModularForm` directly (without the hook) and pass a generic for the values shape:

```tsx
import { ModularForm } from 'react-modular-forms';

type ProfileValues = { email: string; preferences: string[] };

<ModularForm<ProfileValues>
  id="profile-form"
  onSubmit={(e, data) => {
    // data is ProfileValues
  }}
>
  {/* fields */}
</ModularForm>;
```

### ModularFormField

Renders a single field. Works with all native inputs out of the box.

Required: either `id` or `name` plus the parent `formId`.

Common props:

- `type`: any HTML type (text, email, number, checkbox, radio, select, textarea, file, …) or a custom registered type
- `validation`: see Validation below
- `coerceType`: 'int' | 'float' | 'string' | 'array'
- `label`, `className`, `innerClassName`, `error`, `errorMessages`, `onErrorChange`

Example:

```tsx
const formId = 'my-form';

<ModularForm id={formId}>
  <ModularFormField formId={formId} name="email" type="email" validation={{ required: true }} />
  <button type="submit">Save</button>
</ModularForm>;
```

## Validation

Add a `validation` object per field:

```ts
type Validation = {
  required?: boolean;
  negativeRegExps?: { [error: string]: RegExp }; // show error if it DOESN'T match
  positiveRegExps?: { [error: string]: RegExp }; // show error if it DOES match
  validator?: (value: unknown) => string | null; // return an error message or null
  validateOnBlur?: boolean; // per-field override (default from config.validateOnBlur)
  group?: string; // validate multiple fields together
  groupMin?: number; // how many fields in the group must be valid
};
```

Checkbox/radio groups: use the same `name` to have values merged (see Config below for merge rules).

## Value coercion and empty strings

Normalize raw strings into predictable types.

- Per field via `coerceType`:

  - `int` → parseInt(value); non‑numeric input (including 'abc') yields `undefined`; empty string `''` → `undefined`
  - `float` → parseFloat(value); non‑numeric input yields `undefined`; empty string `''` → `undefined`
  - `string` → value.toString()
  - `array` → wrap into array; `undefined | null | ''` → `[]`

- Global empty string mapping via `config.sendEmptyStringsAs`:
  - `''` (default) | `null` | `undefined`
  - Applied deeply across nested objects and arrays (including values generated by `parseAccessors`)

Example:

```tsx
import { config } from 'react-modular-forms';

config.sendEmptyStringsAs = null; // map all '' to null on submit
```

Order of operations: read value → coerce per field → merge same-name groups → parse accessors (optional) → map empty strings (global).

## Custom inputs (registerType)

Plug in third‑party components or your own. Provide a component and a way to read its value.

```tsx
import { registerType, type FieldComponentProps } from 'react-modular-forms';
import Select from 'react-select';

type SelectValue = string | undefined;

const ReactSelectWrapper: React.FC<FieldComponentProps<SelectValue, HTMLElement, SelectValue>> = ({
  name,
  value: _value,
  onChange,
  componentRef,
  ...props
}) => {
  const [value, setValue] = React.useState<SelectValue>(_value);
  const handleChange = (val: SelectValue) => {
    setValue(val);
    componentRef.current = val; // the value that will be read for validation/submit
    onChange?.({} as React.ChangeEvent<HTMLElement>, val);
  };
  return (
    <Select
      name={Array.isArray(name) ? name.join('.') : name}
      value={value}
      onChange={(opt) => handleChange(opt?.value)}
      {...props}
    />
  );
};

registerType<SelectValue, HTMLElement, SelectValue>('react-select', {
  Component: ReactSelectWrapper,
  getValue: (ref) => ref.current
});
```

Composite/static components: set `isStatic: true` when your registered component renders other `ModularFormField`s and doesn’t expose a value via ref.

### Strong typing for custom field values

Make custom `type` strings strongly typed in `onSubmit` by augmenting the `CustomFieldValueMap` interface. This will also provide better typing for direct usage
of ModularFormField by specifying the type of the second argument of the onChange callback.

```ts
// react-modular-forms.custom-types.d.ts
import type { CustomFieldValueMap } from 'react-modular-forms';

declare module 'react-modular-forms' {
  interface CustomFieldValueMap {
    'user-picker': { id: number; firstname: string; lastname: string };
  }
}
```

Then use the type:

```tsx
const fields = [
  { name: 'assignee', type: 'user-picker' as const, validation: { required: true } }
] as const;

const { ModularForm, build } = useModularForm(fields);

<ModularForm
  onSubmit={(e, data) => {
    // data.assignee is typed as your mapping
  }}
>
  {build('assignee')}
</ModularForm>;
```

### Customizing same-name field value aggregation types

If you override `config.handleSameNameFieldValues` to customize how fields with the same name are aggregated (e.g., returning Sets instead of arrays for checkbox groups), you can make the TypeScript types match by augmenting the `SameNameFieldValueTransforms` interface:

```ts
// custom-types.d.ts
import type { SameNameFieldValueTransforms } from 'react-modular-forms';

declare module 'react-modular-forms' {
  interface SameNameFieldValueTransforms {
    // Change ALL checkbox groups to return Sets instead of arrays
    'checkbox-group': <T>(values: T[]) => Set<T>;

    // Change ALL radio groups to allow null
    'radio-group': <T>(value: T) => T | null;
  }
}
```

Then implement the matching runtime handler:

```tsx
import { config } from 'react-modular-forms';

config.handleSameNameFieldValues = (name, values, fields) => {
  const accessorName = Array.isArray(name) ? arrayToAccessor(name) : name;

  // All checkboxes: return a Set
  if (fields.every((f) => f.type === 'checkbox')) {
    const checkedValues = fields
      .filter((f) => f.componentRef.current?.checked)
      .map((f) => f.getValue())
      .filter((v) => v != null);
    return { [accessorName]: new Set(checkedValues) };
  }

  // All radios: return single value or null
  if (fields.every((f) => f.type === 'radio')) {
    const checkedField = fields.find((f) => f.componentRef.current?.checked);
    return { [accessorName]: checkedField?.getValue() ?? null };
  }

  // Default behavior for other cases
  return { [accessorName]: values.filter((v) => v != null) };
};
```

Now your inferred types will match:

```tsx
const fields = [
  { name: 'tags', type: 'checkbox' as const, value: 'react' },
  { name: 'tags', type: 'checkbox' as const, value: 'typescript' }
] as const;

const { ModularForm } = useModularForm(fields);

<ModularForm
  onSubmit={(e, data) => {
    // ✅ data.tags is correctly typed as Set<string> | undefined
    data.tags?.forEach((tag) => console.log(tag));
  }}
/>;
```

**Note:** The default transforms are:

- `'checkbox-group'`: `<T>(values: T[]) => T[]` (identity - returns array)
- `'radio-group'`: `<T>(value: T) => T` (identity - returns single value)
- `'mixed-group'`: `<T>(value: T) => T` (identity)

## Accessing the FormStore

`ModularForm` forwards a ref to a `FormStore` with useful methods:

```tsx
import { FormStore } from 'react-modular-forms';

const ref = React.useRef<FormStore<{ email: string }>>(null);

<ModularForm ref={ref} id="f" onSubmit={(e, data) => {}}>
  {/* fields */}
</ModularForm>;

// Later (e.g., on a button click):
const store = ref.current;
store?.getErrors(false); // validate and surface errors
const values = store?.getValues();
```

You can also access it anywhere by id: `FormStore.getForm<'Shape'>(formId)`.

Key methods:

- `getValues()` → current values (after coercion/accessor/empty‑string mapping)
- `getErrors(silent?: boolean)` → tuples of `[fieldId, errors[]]`; pass `false` to also update UI
- `validateField(fieldId)` and `getFieldErrors(fieldId)`

## Config (global behavior)

Import `config` to tweak behavior globally:

- `defaultFormMethod` ('POST' | 'GET')
- `displayMultipleErrors` (show all errors per field)
- `errorClassName`, `fieldClassName`
- `greedyValidation` (validate on each change)
- `validateOnBlur` (default per-field)
- `wrapField` (global field wrapper; see above)
- `handleSameNameFieldValues(name, values, fields)` merge strategy for same‑name fields (e.g., checkbox/radio groups)
- `handleSingleCheckboxAsArray` (treat single checkbox as array)
- `sendEmptyStringsAs`: '', null, or undefined
- `errorMessages`: default messages

Most apps only customize `sendEmptyStringsAs`, `wrapField`, and sometimes `handleSameNameFieldValues`.

## Minimal API reference

Exports:

- `useModularForm`, `ModularForm`, `ModularFormField`
- `registerType`, `config`, `ModularFieldType`
- `FormStore`
- Types: `ValidationType`, `FieldComponentProps`, `ModularFormFieldProps`, `ModularFormProps`, `CustomFieldValueMap`

`useModularForm(fields)` returns:

- `ModularForm`
- `build(name, overrides?, options?)` for unique field names
- `buildById(id, overrides?, options?)` for explicit field ids, including duplicate-name checkbox/radio groups
- `formId`, `fields`, `getFormValues()`

Built‑in field types (via `ModularFieldType`):
`text`, `email`, `password`, `search`, `tel`, `url`, `color`, `date`, `datetime-local`, `month`, `time`, `week`, `textarea`, `hidden`, `number`, `select`, `radio`, `checkbox`, `file`, `submit`.

## FAQ

- Do I have to use `useModularForm`? No. You can use `ModularForm` and `ModularFormField` directly; the hook just reduces boilerplate and gives better typing.
- How do checkbox/radio groups submit? Values are merged by `config.handleSameNameFieldValues`. By default: radios → a single value; checkboxes → array of checked values; mixed → filtered values array.
- How do I render checkbox/radio groups with `useModularForm`? Keep the shared `name` for grouping, assign explicit `id`s, and call `buildById(id)` for each field. `build(name)` intentionally renders nothing when that name is ambiguous.
- How do I type custom fields? Augment `CustomFieldValueMap` as shown above. If you also use `coerceType`, the coerced type wins.
