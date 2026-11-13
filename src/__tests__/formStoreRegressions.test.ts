import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormStore } from '../lib/FormStore';
import { config } from '../lib/config';

const noop = () => {};
const store = new FormStore('regressions');

afterEach(() => {
  store.destroy();
  config.sendEmptyStringsAs = '';
});

function input(id: string, value = '', name = id) {
  const ref = { current: { value } };
  store.registerField(
    id,
    'text',
    name,
    ref,
    (r) => r.current!.value,
    { required: true },
    noop,
    noop,
    noop
  );
  return ref.current;
}

describe('FormStore regressions', () => {
  it.each(['items[]', 'price(€)', 'a+b', 'x=y', '😀', '__proto__.polluted'])(
    'warns early about %s regardless of when accessor parsing is enabled',
    (name) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
      try {
        for (const parseBeforeRegistration of [false, true]) {
          const form = new FormStore('accessor-warning', undefined, parseBeforeRegistration);
          const getter = vi.fn(() => 'value');
          warn.mockClear();
          try {
            form.registerField(
              'field',
              'text',
              name,
              { current: null },
              getter,
              {},
              noop,
              noop,
              noop
            );
            expect(warn).toHaveBeenCalledTimes(parseBeforeRegistration ? 1 : 0);
            form.set(undefined, true);
            expect(warn).toHaveBeenCalledOnce();
            expect(warn.mock.calls[0][0]).toContain(name);
            expect(warn.mock.calls[0][0]).toContain('accessor-warning');
            expect(getter).not.toHaveBeenCalled();
            form.set(undefined, false);
            form.set(undefined, true);
            expect(warn).toHaveBeenCalledOnce();
            expect(() => form.getValues()).toThrow();
          } finally {
            form.destroy();
          }
        }
      } finally {
        warn.mockRestore();
      }
    }
  );

  it('keeps production accessor enforcement without development warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
    vi.stubEnv('NODE_ENV', 'production');
    try {
      store.set(undefined, true);
      input('field', 'value', 'items[]');
      expect(warn).not.toHaveBeenCalled();
      expect(() => store.getValues()).toThrow('Invalid accessor');
    } finally {
      store.set(undefined, false);
      vi.unstubAllEnvs();
      warn.mockRestore();
    }
  });

  it('cancels a deferred check when explicit validation has already refreshed the form', async () => {
    input('name', 'valid');
    const button = { current: { disabled: false } };
    store.registerField('submit', 'submit', 'submit', button, () => '', {}, noop, noop, noop, true);
    const validator = vi.fn(() => 'INVALID');
    store.updateField('name', { validation: { validator } }, true);
    expect(validator).not.toHaveBeenCalled();
    store.getErrors(false);
    expect(button.current.disabled).toBe(true);
    expect(validator).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(validator).toHaveBeenCalledOnce();
  });

  it('cancels deferred validation on destruction', async () => {
    input('name', 'valid');
    const button = { current: { disabled: false } };
    store.registerField('submit', 'submit', 'submit', button, () => '', {}, noop, noop, noop, true);
    const validator = vi.fn(() => null);
    store.updateField('name', { validation: { validator } }, true);
    store.destroy();
    await Promise.resolve();
    expect(validator).not.toHaveBeenCalled();
  });

  it('updates disabled state immediately through repeated validations', () => {
    const field = input('name');
    const button = { current: { disabled: false } };
    store.registerField('submit', 'submit', 'submit', button, () => '', {}, noop, noop, noop, true);
    expect(button.current.disabled).toBe(true);
    store.validateField('name');
    field.value = 'valid';
    store.validateField('name');
    expect(button.current.disabled).toBe(false);
    field.value = '';
    store.getErrors(false);
    expect(button.current.disabled).toBe(true);
    field.value = 'valid again';
    store.getErrors(false);
    expect(button.current.disabled).toBe(false);
  });

  it('updates disabled state when validation recursively checks a group', () => {
    const first = input('first');
    input('second');
    for (const id of ['first', 'second']) {
      store.updateField(id, { validation: { group: 'contact', groupMin: 1 } });
    }
    const button = { current: { disabled: false } };
    store.registerField('submit', 'submit', 'submit', button, () => '', {}, noop, noop, noop, true);
    store.validateField('first');
    first.value = 'valid';
    store.validateField('first');
    expect(button.current.disabled).toBe(false);
  });

  it('bounds validator work while refreshing all group errors and disabled state', () => {
    const count = 100;
    const validator = vi.fn(() => null);
    const members = Array.from({ length: count }, (_, index) => {
      const id = `member-${index}`;
      const ref = { current: { value: 'valid' } };
      const setErrors = vi.fn();
      store.registerField(
        id,
        'text',
        id,
        ref,
        (r) => r.current!.value,
        { group: 'members', groupMin: count, validator },
        noop,
        setErrors,
        noop
      );
      return { ref, setErrors };
    });
    const button = { current: { disabled: false } };
    store.registerField('submit', 'submit', 'submit', button, () => '', {}, noop, noop, noop, true);

    for (const value of ['', 'valid']) {
      members[0].ref.current.value = value;
      validator.mockClear();
      for (const member of members) member.setErrors.mockClear();
      store.validateField('member-0');
      expect(button.current.disabled).toBe(value === '');
      for (const member of members) {
        expect(member.setErrors).toHaveBeenCalledOnce();
        expect(member.setErrors.mock.calls[0][0].length).toBe(value === '' ? 1 : 0);
      }
      // Allow group checks plus one form scan, but not a form scan per member.
      expect(validator.mock.calls.length).toBeLessThanOrEqual(3 * count * count);
    }
  });

  it.each([false, true])(
    'preserves automatic disabling during partial metadata updates (deferred=%s)',
    async (deferred) => {
      const field = input('name');
      const button = { current: { disabled: false } };
      store.registerField(
        'submit',
        'submit',
        'submit',
        button,
        () => '',
        {},
        noop,
        noop,
        noop,
        true
      );
      expect(button.current.disabled).toBe(true);

      field.value = 'valid';
      store.updateField('submit', { validation: {} }, deferred);
      if (deferred) await Promise.resolve();
      expect(button.current.disabled).toBe(false);

      field.value = '';
      store.updateField('submit', { coerceType: 'string' }, deferred);
      if (deferred) await Promise.resolve();
      expect(button.current.disabled).toBe(true);

      field.value = 'valid again';
      store.validateField('name', true);
      expect(button.current.disabled).toBe(false);
    }
  );

  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
    'serializes a single field named %s',
    (name) => {
      input('field', 'value', name);
      const values = store.getValues();
      expect(Object.keys(values)).toEqual([name]);
      expect(values[name]).toBe('value');
      expect(Object.getPrototypeOf(values)).toBe(Object.prototype);
    }
  );

  it.each(['constructor', '__proto__'])('aggregates duplicate fields named %s', (name) => {
    input('first', 'a', name);
    input('second', 'b', name);
    expect(store.getValues()[name]).toEqual(['a', 'b']);
  });

  it('preserves own __proto__ keys during empty-string mapping', () => {
    input('field', '', '__proto__');
    config.sendEmptyStringsAs = null;
    const values = store.getValues();
    expect(Object.keys(values)).toEqual(['__proto__']);
    expect(values.__proto__).toBeNull();
    expect(Object.getPrototypeOf(values)).toBe(Object.prototype);
  });

  it('rejects prototype pollution through the public store API', () => {
    store.set(undefined, true);
    input('field', 'yes', '__proto__.polluted');
    expect(() => store.getValues()).toThrow('Unsafe accessor');
    expect(Object.prototype).not.toHaveProperty('polluted');
    store.set(undefined, false);
  });
});
