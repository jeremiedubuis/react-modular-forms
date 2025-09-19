import { describe, it, expect, beforeEach } from 'vitest';
import { FormStore } from '../lib/FormStore';
import { ModularFieldType } from '../lib/enums';
import { config } from '../lib/config';

function register(
  store: FormStore,
  { id, name, value, type = ModularFieldType.Text, coerceType }: any
) {
  const ref = { current: { value, checked: !!value } } as any;
  store.registerField(
    id,
    type,
    name,
    ref,
    () => ref.current.value,
    {},
    () => {},
    () => {},
    () => {},
    false,
    coerceType
  );
}

describe('deep empty string mapping and NaN coercion', () => {
  beforeEach(() => {
    config.sendEmptyStringsAs = null as any;
  });

  it('maps nested empty strings to null when parseAccessors is true', () => {
    const s = FormStore.getForm('deep-empty');
    // Simulate nested shape via accessor names
    register(s, { id: 'f1', name: 'user.name', value: '' });
    register(s, { id: 'f2', name: 'user.address[0].street', value: '' });
    register(s, { id: 'f3', name: 'user.address[0].zip', value: '12345' });
    register(s, { id: 'f4', name: 'tags[0]', value: '' });
    s.set(undefined as any, true);
    const v: any = s.getValues();
    expect(v.user.name).toBeNull();
    expect(v.user.address[0].street).toBeNull();
    expect(v.user.address[0].zip).toBe('12345');
    expect(v.tags[0]).toBeNull();
  });

  it('int/float coercion maps NaN to undefined', () => {
    const s = FormStore.getForm('nan-mapping');
    register(s, { id: 'i1', name: 'age', value: 'not-a-number', coerceType: 'int' });
    register(s, { id: 'f1', name: 'ratio', value: 'xx.yy', coerceType: 'float' });
    const v: any = s.getValues();
    expect(v.age).toBeUndefined();
    expect(v.ratio).toBeUndefined();
  });
});
