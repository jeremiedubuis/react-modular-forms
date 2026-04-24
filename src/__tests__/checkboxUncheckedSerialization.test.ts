import { describe, it, expect } from 'vitest';
import { FormStore } from '../lib/FormStore';
import { ModularFieldType } from '../lib/enums';
import { registeredTypes } from '../lib/config';

function registerCheckbox(
  store: FormStore,
  {
    id,
    name,
    checked = false,
    explicitValue
  }: { id: string; name: string; checked?: boolean; explicitValue?: string }
) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  if (typeof explicitValue !== 'undefined') {
    input.setAttribute('value', explicitValue);
    // In the library, this data attribute is used to detect that a value prop was explicitly set
    input.setAttribute('data-rmf-props-value', explicitValue);
  }
  input.checked = !!checked;

  const ref = { current: input } as any;

  store.registerField(
    id,
    ModularFieldType.Checkbox,
    name,
    ref,
    registeredTypes[ModularFieldType.Checkbox].getValue as any,
    {},
    () => {},
    () => {},
    (c) => (input.checked = c),
    false
  );

  return input;
}

describe('checkbox unchecked serialization', () => {
  it('serializes single unchecked checkbox without explicit value as false', () => {
    const store = FormStore.getForm('unchecked-no-value');
    registerCheckbox(store, { id: 'cb1', name: 'agree', checked: false });

    const values: any = store.getValues();
    expect(values.agree).toBe(false);
  });

  it('serializes single unchecked checkbox WITH explicit value as null', () => {
    const store = FormStore.getForm('unchecked-with-value');
    registerCheckbox(store, {
      id: 'cb1',
      name: 'agree',
      checked: false,
      explicitValue: 'YES'
    });

    const values: any = store.getValues();
    expect(values.agree).toBeNull();
  });

  it('serializes a group of all-UNchecked checkboxes (with explicit values) as empty array', () => {
    const store = FormStore.getForm('group-unchecked-with-values');
    registerCheckbox(store, {
      id: 'cb1',
      name: 'opts',
      checked: false,
      explicitValue: 'A'
    });
    registerCheckbox(store, {
      id: 'cb2',
      name: 'opts',
      checked: false,
      explicitValue: 'B'
    });

    const values: any = store.getValues();
    expect(values.opts).toEqual([]);
  });

  it('serializes a group with one checked and one unchecked (explicit values) including only the checked value', () => {
    const store = FormStore.getForm('group-mixed-checked-unchecked');
    registerCheckbox(store, {
      id: 'cb1',
      name: 'opts',
      checked: false,
      explicitValue: 'A'
    });
    registerCheckbox(store, {
      id: 'cb2',
      name: 'opts',
      checked: true,
      explicitValue: 'B'
    });

    const values: any = store.getValues();
    expect(values.opts).toEqual(['B']);
  });
});
