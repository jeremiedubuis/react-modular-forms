import { describe, it, expect } from 'vitest';
import { FormStore } from '../lib/FormStore';
import { FieldError, ModularFieldType } from '../lib/enums';
import { ValidationType } from '../lib/types';

// Helper to create a dummy field
function registerDummyField(
  store: FormStore,
  opts: { id: string; name: string; value: any; validation?: ValidationType }
) {
  const ref = { current: { value: opts.value, checked: !!opts.value } } as any;
  store.registerField(
    opts.id,
    ModularFieldType.Text,
    opts.name,
    ref as any,
    () => ref.current.value,
    opts.validation,
    () => {},
    () => {},
    () => {},
    false
  );
  return ref;
}

describe('group validation', () => {
  it('adds FieldError.Group when groupMin not satisfied', () => {
    const store = FormStore.getForm('group-test-1');

    registerDummyField(store, {
      id: 'f1',
      name: 'opt1',
      value: 'A',
      validation: { group: 'g1', groupMin: 2, required: true }
    });
    registerDummyField(store, {
      id: 'f2',
      name: 'opt2',
      value: '',
      validation: { group: 'g1', groupMin: 2, required: true }
    });
    registerDummyField(store, {
      id: 'f3',
      name: 'opt3',
      value: '',
      validation: { group: 'g1', groupMin: 2, required: true }
    });

    const errors1 = store.getFieldErrors('f1');
    expect(errors1).toContain(FieldError.Group);
  });

  it('no group error when enough fields valid', () => {
    const store = FormStore.getForm('group-test-2');

    registerDummyField(store, {
      id: 'f1',
      name: 'opt1',
      value: 'A',
      validation: { group: 'g1', groupMin: 2, required: true }
    });
    registerDummyField(store, {
      id: 'f2',
      name: 'opt2',
      value: 'B',
      validation: { group: 'g1', groupMin: 2, required: true }
    });
    registerDummyField(store, {
      id: 'f3',
      name: 'opt3',
      value: '',
      validation: { group: 'g1', groupMin: 2, required: true }
    });

    const errors1 = store.getFieldErrors('f1');
    expect(errors1).not.toContain(FieldError.Group);
  });
});
