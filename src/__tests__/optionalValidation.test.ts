import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormField } from '../lib/FormField';
import { FormStore } from '../lib/FormStore';
import { config } from '../lib/config';
import { FieldError } from '../lib/enums';

const originalGreedyValidation = config.greedyValidation;
afterEach(() => {
  config.greedyValidation = originalGreedyValidation;
});

describe.each([true, false])('optional validation (greedyValidation=%s)', (greedy) => {
  it.each([
    { label: 'empty string', value: '' },
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'whitespace', value: ' \t\n' },
    { label: 'empty array', value: [] },
    { label: 'empty object', value: {} }
  ])('skips custom and regex validators for $label', ({ value }) => {
    config.greedyValidation = greedy;
    for (const required of [false, undefined]) {
      const validator = vi.fn(() => 'CUSTOM_ERROR');
      const negativeRegExp = /\d+/;
      const positiveRegExp = /.*/;
      const negativeTest = vi.spyOn(negativeRegExp, 'test');
      const positiveTest = vi.spyOn(positiveRegExp, 'test');
      expect(
        FormField.getErrors(
          {
            ...(required === undefined ? {} : { required }),
            validator,
            negativeRegExps: { FORMAT: negativeRegExp },
            positiveRegExps: { FORBIDDEN: positiveRegExp }
          },
          value
        )
      ).toEqual([]);
      expect(validator).not.toHaveBeenCalled();
      expect(negativeTest).not.toHaveBeenCalled();
      expect(positiveTest).not.toHaveBeenCalled();
    }
  });

  it.each([0, false, 'invalid'])('still validates a provided value: %s', (value) => {
    config.greedyValidation = greedy;
    const validator = vi.fn(() => null);
    expect(
      FormField.getErrors(
        {
          required: false,
          validator,
          negativeRegExps: { FORMAT: /^valid$/ },
          positiveRegExps: { FORBIDDEN: /.*/ }
        },
        value
      )
    ).toEqual(['FORMAT', 'FORBIDDEN']);
    expect(validator).toHaveBeenCalledExactlyOnceWith(value);
  });

  it('preserves required-field errors and the greedy setting', () => {
    config.greedyValidation = greedy;
    const validator = vi.fn(() => 'CUSTOM_ERROR');
    expect(
      FormField.getErrors(
        {
          required: true,
          validator,
          negativeRegExps: { FORMAT: /\d+/ }
        },
        ''
      )
    ).toEqual(greedy ? [FieldError.Empty] : [FieldError.Empty, 'CUSTOM_ERROR', 'FORMAT']);
    expect(validator).toHaveBeenCalledTimes(greedy ? 0 : 1);
  });

  it.each(['int', 'float'] as const)(
    'validates failed %s coercion while allowing empty numeric inputs',
    (coerceType) => {
      config.greedyValidation = greedy;
      const store = new FormStore('optional-numeric');
      const noop = () => {};
      try {
        for (const type of ['text', 'radio', 'checkbox']) {
          const ref = { current: { value: 'invalid', checked: true } };
          const validator = vi.fn((value: unknown) =>
            typeof value === 'number' ? null : 'INVALID_NUMBER'
          );
          const getter = vi.fn(() => ref.current.value);
          const field = store.registerField(
            type,
            type,
            type,
            ref,
            getter,
            {
              validator,
              negativeRegExps: { FORMAT: /^\d+$/ },
              positiveRegExps: { FORBIDDEN: /^undefined$/ }
            },
            noop,
            noop,
            noop,
            false,
            coerceType
          );
          for (const getErrors of [() => field.getErrors(), () => store.getFieldErrors(type)]) {
            for (const input of ['invalid', '', ' \t', '0', '42']) {
              ref.current.value = input;
              validator.mockClear();
              getter.mockClear();
              expect(getErrors()).toEqual(
                input === 'invalid'
                  ? greedy
                    ? ['INVALID_NUMBER']
                    : ['INVALID_NUMBER', 'FORMAT', 'FORBIDDEN']
                  : []
              );
              expect(getter).toHaveBeenCalledOnce();
              if (input.trim() === '') {
                expect(validator).not.toHaveBeenCalled();
              } else {
                expect(validator).toHaveBeenCalledExactlyOnceWith(
                  input === 'invalid' ? undefined : Number(input)
                );
              }
            }
          }
        }
      } finally {
        store.destroy();
      }
    }
  );
});

it('keeps group minimums while allowing unused optional members', () => {
  const store = new FormStore('optional-group');
  const first = { current: '' };
  const second = { current: '' };
  const noop = () => {};
  try {
    for (const [index, ref] of [first, second].entries()) {
      store.registerField(
        String(index),
        'text',
        String(index),
        ref,
        (r) => r.current,
        { group: 'contact', groupMin: 1, negativeRegExps: { FORMAT: /^valid$/ } },
        noop,
        noop,
        noop
      );
    }
    expect(store.getFieldErrors('0')).toEqual([FieldError.Group]);
    first.current = 'valid';
    expect(store.getErrors()).toEqual([]);
    second.current = 'invalid';
    expect(store.getFieldErrors('1')).toEqual(['FORMAT']);
  } finally {
    store.destroy();
  }
});
