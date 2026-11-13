import { describe, it, expect } from 'vitest';
import { FormStore } from '../lib/FormStore';
import { ModularFieldType } from '../lib/enums';

function register(store: FormStore, { id, type, name, value, checked }: any) {
  const ref = { current: { value, checked: !!checked } } as any;
  store.registerField(
    id,
    type,
    name,
    ref,
    () =>
      type === ModularFieldType.Checkbox || type === ModularFieldType.Radio
        ? value
        : ref.current.value,
    {},
    () => {},
    () => {},
    (c) => (ref.current.checked = c),
    false
  );
  if (type === ModularFieldType.Radio && checked) store.checkRadioField(id);
  return ref;
}

describe('same-name aggregation', () => {
  it('aggregates checkbox values into array (excluding unchecked / null)', () => {
    const store = FormStore.getForm('agg-checkbox');
    register(store, {
      id: 'cb1',
      type: ModularFieldType.Checkbox,
      name: 'opts',
      value: 'A',
      checked: true
    });
    register(store, {
      id: 'cb2',
      type: ModularFieldType.Checkbox,
      name: 'opts',
      value: 'B',
      checked: false
    });
    register(store, {
      id: 'cb3',
      type: ModularFieldType.Checkbox,
      name: 'opts',
      value: 'C',
      checked: true
    });

    const values: any = store.getValues();
    expect(values.opts).toEqual(['A', 'C']);
  });

  it('aggregates radios picking single selected value', () => {
    const store = FormStore.getForm('agg-radio');
    register(store, {
      id: 'r1',
      type: ModularFieldType.Radio,
      name: 'choice',
      value: 'YES',
      checked: false
    });
    register(store, {
      id: 'r2',
      type: ModularFieldType.Radio,
      name: 'choice',
      value: 'NO',
      checked: true
    });
    register(store, {
      id: 'r3',
      type: ModularFieldType.Radio,
      name: 'choice',
      value: 'MAYBE',
      checked: false
    });

    const values: any = store.getValues();
    expect(values.choice).toEqual('NO');
  });
});
