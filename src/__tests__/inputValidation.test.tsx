import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act as legacyAct } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config, ModularForm, ModularFormField, useModularForm } from '../lib';

const act = (React as typeof React & { act?: typeof legacyAct }).act ?? legacyAct;
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement;
const initialValidateOnInput = config.validateOnInput;

function render(element: React.ReactElement) {
  if (!root) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  act(() => root!.render(element));
}

function inputValue(value: string) {
  const input = container.querySelector('input')!;
  act(() => {
    // Use the native setter to simulate typing without updating React's value tracker.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  container?.remove();
  config.validateOnInput = initialValidateOnInput;
});

describe('input validation', () => {
  it('keeps validation on blur by default', () => {
    expect(config.validateOnInput).toBe(false);
    render(
      <ModularForm id="default-validation">
        <ModularFormField
          formId="default-validation"
          name="name"
          type="text"
          value="Ada"
          validation={{ required: true }}
        />
      </ModularForm>
    );
    inputValue('');
    expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('false');
    act(() => {
      container
        .querySelector('input')!
        .dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it.each([
    [false, true, true],
    [true, undefined, true],
    [true, false, false]
  ] as const)(
    'resolves global=%s and field=%s to input validation=%s',
    (globalSetting, fieldSetting, shouldValidate) => {
      config.validateOnInput = globalSetting;
      const onChange = vi.fn();
      render(
        <ModularForm id="input-options">
          <ModularFormField
            formId="input-options"
            name="name"
            type="text"
            value="Ada"
            onChange={onChange}
            validation={{ required: true, validateOnInput: fieldSetting, validateOnBlur: false }}
          />
        </ModularForm>
      );
      inputValue('');
      expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe(
        String(shouldValidate)
      );
      expect(onChange).toHaveBeenLastCalledWith(expect.anything(), '');
      inputValue('Grace');
      expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('false');
      expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'Grace');
    }
  );

  it('validates current coerced values and updates disabled submit buttons through the hook', async () => {
    const validator = vi.fn((value: unknown) => (value === 42 ? null : 'Expected 42'));
    function Example() {
      const { ModularForm: Form, build } = useModularForm([
        {
          name: 'answer',
          type: 'text',
          coerceType: 'int',
          validation: { required: true, validateOnInput: true, validateOnBlur: false, validator }
        },
        { name: 'submit', type: 'submit', disableOnInvalidForm: true }
      ] as const);
      return (
        <Form>
          {build('answer')}
          {build('submit')}
        </Form>
      );
    }
    render(<Example />);
    await act(async () => {});
    const submit = container.querySelector<HTMLInputElement>('[type=submit]')!;
    expect(submit.disabled).toBe(true);
    inputValue('41');
    expect(validator).toHaveBeenCalledWith(41);
    expect(container.textContent).toContain('Expected 42');
    inputValue('42');
    expect(validator).toHaveBeenCalledWith(42);
    expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('false');
    expect(submit.disabled).toBe(false);
    validator.mockClear();
    act(() => {
      container
        .querySelector('input')!
        .dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(validator).not.toHaveBeenCalled();
  });

  it('uses the current per-field setting after rerender', () => {
    const view = (validateOnInput: boolean) => (
      <ModularForm id="dynamic-input">
        <ModularFormField
          formId="dynamic-input"
          name="name"
          type="text"
          validation={{ required: true, validateOnInput }}
        />
      </ModularForm>
    );
    render(view(false));
    inputValue('Ada');
    inputValue('');
    expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('false');
    render(view(true));
    inputValue('Grace');
    inputValue('');
    expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  describe.each(['build', 'buildById'] as const)('%s hook defaults', (builder) => {
    it.each([
      [false, true, undefined, true],
      [true, false, undefined, false],
      [true, undefined, undefined, true],
      [false, true, false, false],
      [false, false, true, true]
    ] as const)(
      'resolves global=%s, hook=%s, field=%s to input validation=%s',
      (globalSetting, hookSetting, fieldSetting, shouldValidate) => {
        config.validateOnInput = globalSetting;
        function Example() {
          const {
            ModularForm: Form,
            build,
            buildById
          } = useModularForm(
            [
              {
                id: 'name',
                name: 'name',
                type: 'text',
                value: 'Ada',
                validation: { required: true, validateOnInput: fieldSetting }
              }
            ] as const,
            { validateOnInput: hookSetting }
          );
          return <Form>{(builder === 'build' ? build : buildById)('name')}</Form>;
        }
        render(<Example />);
        inputValue('');
        expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe(
          String(shouldValidate)
        );
      }
    );

    it('honors validation overrides passed to the builder', () => {
      function Example() {
        const {
          ModularForm: Form,
          build,
          buildById
        } = useModularForm([{ id: 'name', name: 'name', type: 'text', value: 'Ada' }] as const, {
          validateOnInput: true
        });
        return (
          <Form>
            {(builder === 'build' ? build : buildById)('name', {
              validation: { required: true, validateOnInput: false }
            })}
          </Form>
        );
      }
      render(<Example />);
      inputValue('');
      expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('false');
    });
  });

  it('updates the hook default without remounting the form or resetting input', () => {
    const fields = [{ name: 'name', type: 'text', validation: { required: true } }] as const;
    function Example({ validateOnInput }: { validateOnInput: boolean }) {
      const { ModularForm: Form, build } = useModularForm(fields, { validateOnInput });
      return <Form>{build('name')}</Form>;
    }
    render(<Example validateOnInput={false} />);
    inputValue('Ada');
    const input = container.querySelector('input')!;
    render(<Example validateOnInput />);
    expect(container.querySelector('input')).toBe(input);
    expect(input.value).toBe('Ada');
    inputValue('');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    inputValue('Grace');
    render(<Example validateOnInput={false} />);
    inputValue('');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(fields[0].validation).toEqual({ required: true });
  });

  it('validates checkbox changes without requiring blur', () => {
    render(
      <ModularForm id="checkbox-input">
        <ModularFormField
          formId="checkbox-input"
          name="accepted"
          type="checkbox"
          validation={{ required: true, validateOnInput: true }}
        />
      </ModularForm>
    );
    const checkbox = container.querySelector('input')!;
    act(() => checkbox.click());
    expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('false');
    act(() => checkbox.click());
    expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
    act(() => checkbox.click());
    expect(container.querySelector('input')!.getAttribute('aria-invalid')).toBe('false');
  });

  it('validates select changes without requiring blur', () => {
    render(
      <ModularForm id="select-input">
        <ModularFormField
          formId="select-input"
          name="choice"
          type="select"
          value="a"
          validation={{ required: true, validateOnInput: true }}
        >
          <option value="">Choose</option>
          <option value="a">A</option>
        </ModularFormField>
      </ModularForm>
    );
    const select = container.querySelector('select')!;
    act(() => {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(select.getAttribute('aria-invalid')).toBe('true');
    act(() => {
      select.value = 'a';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(select.getAttribute('aria-invalid')).toBe('false');
  });
});
