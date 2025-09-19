import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act as legacyAct } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormStore, ModularForm, ModularFormField, registerType, useModularForm } from '../lib';
import { registeredTypes, registeredTypeStrings } from '../lib/config';

// React 18.2 exposes act through test-utils; newer releases expose React.act.
const act = (React as typeof React & { act?: typeof legacyAct }).act ?? legacyAct;
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let container: HTMLDivElement;
function render(element: React.ReactElement) {
  if (!root) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  act(() => root!.render(element));
}
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  container?.remove();
});

describe('React integration regressions', () => {
  it('warns about invalid accessors on mount before submission', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      render(
        <ModularForm id="early-warning" parseAccessors>
          <ModularFormField formId="early-warning" name="items[]" type="text" />
        </ModularForm>
      );
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain('items[]');
    } finally {
      warn.mockRestore();
    }
  });

  it.each(['direct', 'build', 'buildById'] as const)(
    'skips unchanged inline validation but applies new validators through %s',
    async (builder) => {
      const valid = vi.fn(() => null);
      const invalid = vi.fn(() => 'INVALID');
      function Example({ validator }: { validator: () => string | null }) {
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
              validation: { required: true, validator }
            },
            { id: 'submit', name: 'submit', type: 'submit', disableOnInvalidForm: true }
          ] as const,
          { validateOnInput: true }
        );
        if (builder === 'direct') {
          return (
            <ModularForm id="stable-metadata">
              <ModularFormField
                formId="stable-metadata"
                name="name"
                type="text"
                value="Ada"
                validation={{ required: true, validator }}
              />
              <ModularFormField
                formId="stable-metadata"
                name="submit"
                type="submit"
                disableOnInvalidForm
              />
            </ModularForm>
          );
        }
        const buildField = builder === 'build' ? build : buildById;
        return (
          <Form>
            {buildField('name')}
            {buildField('submit')}
          </Form>
        );
      }
      await act(async () => render(<Example validator={valid} />));
      expect(valid).toHaveBeenCalledOnce();
      valid.mockClear();
      await act(async () => render(<Example validator={valid} />));
      expect(valid).not.toHaveBeenCalled();
      const button = container.querySelector<HTMLInputElement>('[type=submit]')!;
      expect(button.disabled).toBe(false);
      await act(async () => render(<Example validator={invalid} />));
      expect(invalid).toHaveBeenCalledOnce();
      expect(button.disabled).toBe(true);
    }
  );

  it('blocks submission when a provided optional number fails validation after coercion', () => {
    const onSubmit = vi.fn();
    const onSubmitError = vi.fn();
    render(
      <ModularForm id="optional-number" onSubmit={onSubmit} onSubmitError={onSubmitError}>
        <ModularFormField
          formId="optional-number"
          id="amount"
          name="amount"
          type="text"
          value="invalid"
          coerceType="int"
          validation={{
            validator: (value) => (typeof value === 'number' ? null : 'INVALID_NUMBER')
          }}
        />
      </ModularForm>
    );
    act(() => {
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSubmitError).toHaveBeenCalledExactlyOnceWith(expect.anything(), [
      ['amount', ['INVALID_NUMBER']]
    ]);
  });

  it('uses current validation on submission after props change', () => {
    const onSubmit = vi.fn();
    const onSubmitError = vi.fn();
    const view = (required: boolean) => (
      <ModularForm id="dynamic" onSubmit={onSubmit} onSubmitError={onSubmitError}>
        <ModularFormField formId="dynamic" name="email" type="text" validation={{ required }} />
      </ModularForm>
    );
    render(view(false));
    render(view(true));
    act(() => {
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSubmitError).toHaveBeenCalledOnce();
    render(view(false));
    expect(FormStore.getForm('dynamic').getErrors()).toEqual([]);
  });

  it('updates coercion without resetting the input or changing group order', () => {
    const view = (coerceType?: 'int') => (
      <ModularForm id="coercion">
        <ModularFormField
          formId="coercion"
          id="first"
          name="amount"
          type="text"
          value="12"
          coerceType={coerceType}
        />
        <ModularFormField formId="coercion" id="second" name="amount" type="text" value="34" />
      </ModularForm>
    );
    render(view());
    const originalInput = container.querySelector('input');
    render(view('int'));
    expect(container.querySelector('input')).toBe(originalInput);
    expect(FormStore.getForm('coercion').getValues()).toEqual({ amount: [12, '34'] });
  });

  it('uses the new getter when a field changes type', () => {
    const view = (type: 'text' | 'hidden', value: unknown) => (
      <ModularForm id="type-change">
        <ModularFormField formId="type-change" name="data" type={type} value={value} />
      </ModularForm>
    );
    render(view('text', 'initial'));
    render(view('hidden', { id: 42 }));
    expect(FormStore.getForm('type-change').getValues()).toEqual({ data: { id: 42 } });
  });

  it('moves field registration when form and field IDs change', () => {
    const view = (formId: string, id: string) => (
      <ModularForm id={formId}>
        <ModularFormField formId={formId} id={id} name="name" type="text" value="Ada" />
      </ModularForm>
    );
    render(view('before', 'old-field'));
    const oldStore = FormStore.getForm('before');
    render(view('after', 'new-field'));
    expect(oldStore.getValues()).toEqual({});
    expect(FormStore.getForm('after').getField('new-field')).toBeDefined();
    expect(FormStore.getForm('after').getValues()).toEqual({ name: 'Ada' });
  });

  it('handles adding and replacing external refs without changing hook order', () => {
    const first = React.createRef<HTMLInputElement>();
    const second = React.createRef<HTMLInputElement>();
    const view = (componentRef?: React.MutableRefObject<HTMLInputElement | null>) => (
      <ModularForm id="refs">
        <ModularFormField
          formId="refs"
          name="name"
          type="text"
          value="Ada"
          componentRef={componentRef}
        />
      </ModularForm>
    );
    render(view());
    render(view(first));
    render(view(second));
    expect(first.current).toBeNull();
    expect(second.current).toBe(container.querySelector('input'));
    expect(FormStore.getForm('refs').getValues()).toEqual({ name: 'Ada' });
  });

  it('updates disableOnInvalidForm and releases the button when it is turned off', async () => {
    const view = (disableOnInvalidForm: boolean) => (
      <ModularForm id="disable">
        <ModularFormField
          formId="disable"
          name="name"
          type="text"
          validation={{ required: true }}
        />
        <ModularFormField
          formId="disable"
          id="submit"
          name="submit"
          type="submit"
          disableOnInvalidForm={disableOnInvalidForm}
        />
      </ModularForm>
    );
    render(view(false));
    const button = container.querySelector<HTMLInputElement>('[type=submit]')!;
    await act(async () => render(view(true)));
    expect(button.disabled).toBe(true);
    render(view(false));
    expect(button.disabled).toBe(false);
  });

  it('validates each field once when inline metadata changes in one render', async () => {
    const validators = Array.from({ length: 12 }, () => vi.fn(() => null));
    const view = (required: boolean) => (
      <ModularForm id="batched">
        {validators.map((validator, index) => (
          <ModularFormField
            key={index}
            formId="batched"
            name={`field${index}`}
            type="text"
            value="valid"
            validation={{ required, validator }}
          />
        ))}
        <ModularFormField formId="batched" name="submit" type="submit" disableOnInvalidForm />
      </ModularForm>
    );
    await act(async () => render(view(false)));
    for (const validator of validators) {
      expect(validator).toHaveBeenCalledOnce();
      validator.mockClear();
    }
    await act(async () => render(view(true)));
    for (const validator of validators) expect(validator).toHaveBeenCalledOnce();
    expect(container.querySelector<HTMLInputElement>('[type=submit]')!.disabled).toBe(false);
  });

  it('refreshes disabled state when an invalid field is removed', async () => {
    const view = (showField: boolean) => (
      <ModularForm id="remove-invalid">
        {showField && (
          <ModularFormField
            formId="remove-invalid"
            name="required"
            type="text"
            validation={{ required: true }}
          />
        )}
        <ModularFormField
          formId="remove-invalid"
          name="submit"
          type="submit"
          disableOnInvalidForm
        />
      </ModularForm>
    );
    await act(async () => render(view(true)));
    const button = container.querySelector<HTMLInputElement>('[type=submit]')!;
    expect(button.disabled).toBe(true);
    await act(async () => render(view(false)));
    expect(button.disabled).toBe(false);
  });

  it('leaves a custom ref disabled property alone unless form disabling was enabled', () => {
    const type = 'custom-disabled-owner';
    const ref = { current: { value: 'value', disabled: true } };
    registerType<string, 'input', typeof ref.current>(type, {
      Component: () => null,
      getValue: (componentRef) => componentRef.current!.value
    });
    try {
      const view = (required: boolean) => (
        <ModularForm id="custom-disabled">
          <ModularFormField
            formId="custom-disabled"
            name="value"
            type={type}
            componentRef={ref}
            validation={{ required }}
          />
        </ModularForm>
      );
      render(view(false));
      expect(ref.current.disabled).toBe(true);
      render(view(true));
      expect(ref.current.disabled).toBe(true);
    } finally {
      delete registeredTypes[type];
      registeredTypeStrings.splice(registeredTypeStrings.indexOf(type), 1);
    }
  });

  it.each(['a[0]b', '__proto__.polluted'])(
    'cancels native submission when serialization rejects %s',
    (name) => {
      const onSubmit = vi.fn();
      const reported: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        reported.push(event.error);
        event.preventDefault();
      };
      window.addEventListener('error', onError);
      try {
        render(
          <ModularForm id="bad-accessor" parseAccessors onSubmit={onSubmit}>
            <ModularFormField formId="bad-accessor" name={name} type="text" value="value" />
          </ModularForm>
        );
        const event = new Event('submit', { bubbles: true, cancelable: true });
        act(() => {
          container.querySelector('form')!.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(true);
        expect(onSubmit).not.toHaveBeenCalled();
        expect(reported.length).toBeGreaterThan(0);
        expect(reported[0]).toBeInstanceOf(Error);
      } finally {
        window.removeEventListener('error', onError);
      }
    }
  );

  it('preserves native submission when a valid handler does not cancel it', () => {
    const onSubmit = vi.fn();
    render(
      <ModularForm id="native" parseAccessors onSubmit={onSubmit}>
        <ModularFormField formId="native" name="user.name" type="text" value="Ada" />
      </ModularForm>
    );
    const event = new Event('submit', { bubbles: true, cancelable: true });
    act(() => {
      container.querySelector('form')!.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.anything(), { user: { name: 'Ada' } });
  });

  it('keeps registration and forwarded refs correct in StrictMode', () => {
    const ref = React.createRef<FormStore>();
    render(
      <React.StrictMode>
        <ModularForm id="strict" ref={ref}>
          <ModularFormField formId="strict" name="name" type="text" value="Ada" />
        </ModularForm>
      </React.StrictMode>
    );
    expect(ref.current?.getValues()).toEqual({ name: 'Ada' });
    act(() => root!.unmount());
    root = undefined;
    expect(ref.current).toBeNull();
  });

  it('serializes all selected options initially and after change events', () => {
    const onChange = vi.fn();
    render(
      <ModularForm id="multiple">
        <ModularFormField
          formId="multiple"
          name="tags"
          type="select"
          multiple
          value={['a', 'b']}
          onChange={onChange}
        >
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </ModularFormField>
      </ModularForm>
    );
    expect(FormStore.getForm('multiple').getValues()).toEqual({ tags: ['a', 'b'] });
    const select = container.querySelector('select')!;
    act(() => {
      select.options[0].selected = false;
      select.options[2].selected = true;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(FormStore.getForm('multiple').getValues()).toEqual({ tags: ['b', 'c'] });
    expect(onChange.mock.calls[0][1]).toEqual(['b', 'c']);
    act(() => {
      for (const option of Array.from(select.options)) option.selected = false;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(FormStore.getForm('multiple').getValues()).toEqual({ tags: [] });
  });

  it('starts an unspecified multiple select empty and validates required selections', () => {
    render(
      <ModularForm id="empty-multiple">
        <ModularFormField
          formId="empty-multiple"
          name="tags"
          type="select"
          multiple
          validation={{ required: true }}
        >
          <option value="a">A</option>
        </ModularFormField>
      </ModularForm>
    );
    expect(FormStore.getForm('empty-multiple').getValues()).toEqual({ tags: [] });
    expect(FormStore.getForm('empty-multiple').getErrors()).toHaveLength(1);
  });

  it('preserves scalar serialization for single selects', () => {
    render(
      <ModularForm id="single-select">
        <ModularFormField formId="single-select" name="tag" type="select" value="b">
          <option value="a">A</option>
          <option value="b">B</option>
        </ModularFormField>
      </ModularForm>
    );
    expect(FormStore.getForm('single-select').getValues()).toEqual({ tag: 'b' });
  });

  it.each([
    ['month', '2026-11'],
    ['week', '2026-W46']
  ])('renders and serializes %s inputs', (type, value) => {
    render(
      <ModularForm id="period">
        <ModularFormField formId="period" name="period" type={type} value={value} />
      </ModularForm>
    );
    expect(container.querySelector('input')?.type).toBe(type);
    expect(FormStore.getForm('period').getValues()).toEqual({ period: value });
  });

  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
    'builds and submits a field named %s',
    (name) => {
      function Example() {
        const { ModularForm: Form, build } = useModularForm(
          [{ name, type: 'text', value: 'value' }],
          { id: 'names' }
        );
        return <Form>{build(name)}</Form>;
      }
      render(<Example />);
      expect(container.querySelector('input')).not.toBeNull();
      expect(FormStore.getForm('names').getValues()[name]).toBe('value');
    }
  );
});
