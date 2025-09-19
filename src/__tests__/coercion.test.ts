import { describe, it, expect } from 'vitest';
import { FormStore } from '../lib/FormStore';
import { ModularFieldType } from '../lib/enums';

function register(store: FormStore, { id, name, value, coerceType }: any) {
  const ref = { current: { value } } as any;
  store.registerField(
    id,
    ModularFieldType.Text,
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

describe('coercion', () => {
  it('coerces int', () => {
    const s = FormStore.getForm('coerce-int');
    register(s, { id: 'f1', name: 'age', value: '42', coerceType: 'int' });
    expect((s.getValues() as any).age).toBe(42);
  });
  it('coerces float', () => {
    const s = FormStore.getForm('coerce-float');
    register(s, { id: 'f1', name: 'ratio', value: '3.14', coerceType: 'float' });
    expect((s.getValues() as any).ratio).toBeCloseTo(3.14);
  });
  it('coerces string using toString fallback', () => {
    const s = FormStore.getForm('coerce-string');
    register(s, { id: 'f1', name: 'data', value: 123, coerceType: 'string' });
    expect((s.getValues() as any).data).toBe('123');
  });
  it('coerces array wrapping single primitive', () => {
    const s = FormStore.getForm('coerce-array');
    register(s, { id: 'f1', name: 'tags', value: 'one', coerceType: 'array' });
    expect((s.getValues() as any).tags).toEqual(['one']);
  });
  it('coerces array returns [] for empty string', () => {
    const s = FormStore.getForm('coerce-array-empty');
    register(s, { id: 'f1', name: 'tags', value: '', coerceType: 'array' });
    expect((s.getValues() as any).tags).toEqual([]);
  });
  it('does not wrap if already array', () => {
    const s = FormStore.getForm('coerce-array-existing');
    register(s, { id: 'f1', name: 'tags', value: ['a', 'b'], coerceType: 'array' });
    expect((s.getValues() as any).tags).toEqual(['a', 'b']);
  });
  it('int coercion of empty string yields undefined', () => {
    const s = FormStore.getForm('coerce-int-empty');
    register(s, { id: 'f1', name: 'age', value: '', coerceType: 'int' });
    const v = (s.getValues() as any).age;
    expect(v).toBe(undefined);
  });
  it('float coercion of empty string yields undefined', () => {
    const s = FormStore.getForm('coerce-float-empty');
    register(s, { id: 'f1', name: 'ratio', value: '', coerceType: 'float' });
    const v = (s.getValues() as any).ratio;
    expect(v).toBe(undefined);
  });
});
