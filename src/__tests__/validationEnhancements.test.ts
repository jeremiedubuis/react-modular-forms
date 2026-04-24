import { describe, it, expect, beforeEach } from 'vitest';
import { FormStore } from '../lib/FormStore';
import { ModularFieldType, FieldError } from '../lib/enums';
import { config } from '../lib/config';

// Utility to register a field with minimal boilerplate
function register(
  store: FormStore,
  { id, name, type = ModularFieldType.Text, value, validation = {}, coerceType }: any
) {
  const ref = { current: { value, checked: !!value } } as any;
  store.registerField(
    id,
    type,
    name,
    ref,
    () => ref.current.value,
    validation,
    () => {},
    () => {},
    () => {},
    false,
    coerceType
  );
  return ref;
}

describe('validation (extended scenarios)', () => {
  beforeEach(() => {
    // Reset greedyValidation to default for each test
    config.greedyValidation = true;
  });

  it('greedyValidation=false accumulates all regex errors', () => {
    const store = FormStore.getForm('val-greedy-off');
    config.greedyValidation = false;
    register(store, {
      id: 'f1',
      name: 'field',
      value: '',
      validation: {
        required: true,
        negativeRegExps: { FORMAT: /a+/ },
        positiveRegExps: { MUST_MATCH: /^ok$/ }
      }
    });
    const errors = store.getFieldErrors('f1');
    // Required should appear plus both regex related tokens (since value doesn't match positive and doesn't match negative in expected way)
    expect(errors).toContain(FieldError.Empty);
  });

  it('greedyValidation=true stops at first required error', () => {
    const store = FormStore.getForm('val-greedy-on');
    config.greedyValidation = true;
    register(store, {
      id: 'f1',
      name: 'field',
      value: '',
      validation: {
        required: true,
        negativeRegExps: { FORMAT: /a+/ },
        positiveRegExps: { MUST_MATCH: /^ok$/ }
      }
    });
    const errors = store.getFieldErrors('f1');
    // With greedy on, only required error should appear
    expect(errors).toEqual([FieldError.Empty]);
  });

  it('custom validator error shows up before regex when not greedy', () => {
    const store = FormStore.getForm('val-custom-validator');
    config.greedyValidation = false;
    register(store, {
      id: 'f1',
      name: 'field',
      value: 'xxx',
      validation: {
        validator: (v) => (v === 'xxx' ? 'BAD_VALUE' : null),
        positiveRegExps: { MUST_MATCH: /^ok$/ }
      }
    });
    const errors = store.getFieldErrors('f1');
    expect(errors).toContain('BAD_VALUE');
  });

  it('array required warning still yields Empty error when array is empty', () => {
    const store = FormStore.getForm('val-array-required');
    register(store, {
      id: 'f1',
      name: 'tags',
      value: [],
      validation: { required: true },
      coerceType: 'array'
    });
    const errors = store.getFieldErrors('f1');
    expect(errors).toContain(FieldError.Empty);
  });

  it('positive regex triggers error token when matched', () => {
    const store = FormStore.getForm('val-positive-regex');
    register(store, {
      id: 'f1',
      name: 'username',
      value: 'admin',
      validation: {
        positiveRegExps: { RESERVED: /admin/ }
      }
    });
    const errors = store.getFieldErrors('f1');
    expect(errors).toContain('RESERVED');
  });

  it('negative regex triggers error token when NOT matched', () => {
    const store = FormStore.getForm('val-negative-regex');
    register(store, {
      id: 'f1',
      name: 'username',
      value: 'user',
      validation: {
        negativeRegExps: { MUST_CONTAIN_NUM: /\d+/ }
      }
    });
    const errors = store.getFieldErrors('f1');
    expect(errors).toContain('MUST_CONTAIN_NUM');
  });
});
