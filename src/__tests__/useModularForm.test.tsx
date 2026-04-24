import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { ModularFieldType, useModularForm } from '../lib';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type RenderResult = {
  container: HTMLDivElement;
  root: Root;
};

function render(element: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return { container, root };
}

function cleanup({ container, root }: RenderResult) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useModularForm', () => {
  it('buildById submits duplicate-name fields without losing group semantics', () => {
    const fields = [
      { id: 'color-red', name: 'color', type: ModularFieldType.Radio, value: 'red' },
      { id: 'color-blue', name: 'color', type: ModularFieldType.Radio, value: 'blue' }
    ] as const;
    const onSubmit = vi.fn();

    function TestForm() {
      const { ModularForm, buildById } = useModularForm(fields, { id: 'color-form' });

      return (
        <ModularForm onSubmit={onSubmit}>
          {buildById('color-red')}
          {buildById('color-blue')}
          <button type="submit">Submit</button>
        </ModularForm>
      );
    }

    const view = render(<TestForm />);
    const blueRadio = view.container.querySelector('#color-blue') as HTMLInputElement;
    const form = view.container.querySelector('form') as HTMLFormElement;

    expect(view.container.querySelector('#color-red')).not.toBeNull();
    expect(view.container.querySelector('#color-blue')).not.toBeNull();
    expect(view.container.querySelectorAll('input[type="radio"][name="color"]')).toHaveLength(2);

    act(() => {
      blueRadio.click();
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[1]).toEqual({ color: 'blue' });

    cleanup(view);
  });

  it('build(name) warns and renders nothing when duplicate-name fields are ambiguous', () => {
    const fields = [
      { id: 'size-small', name: 'size', type: ModularFieldType.Checkbox, value: 'S' },
      { id: 'size-large', name: 'size', type: ModularFieldType.Checkbox, value: 'L' }
    ] as const;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    function TestForm() {
      const { ModularForm, build } = useModularForm(fields, { id: 'size-form' });

      return <ModularForm>{build('size')}</ModularForm>;
    }

    const view = render(<TestForm />);

    expect(view.container.querySelectorAll('input')).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      'useModularForm.build: field name "size" is ambiguous because multiple fields share that name. Use buildById(...) for checkbox or radio groups. Rendering nothing.'
    );

    cleanup(view);
    warnSpy.mockRestore();
  });
});
