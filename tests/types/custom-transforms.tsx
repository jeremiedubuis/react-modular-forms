import React from 'react';
import { expectTypeOf } from './assert';
import { useModularForm } from 'react-modular-forms';

declare module 'react-modular-forms' {
  interface SameNameFieldValueTransforms {
    'checkbox-group': <T>(values: T[]) => Set<T>;
    'radio-group': <T>(value: T) => T | null;
  }
}

export function CustomGroups() {
  const { ModularForm: Form } = useModularForm([
    { id: 'a', name: 'tags', type: 'checkbox', value: 'a' },
    { id: 'b', name: 'tags', type: 'checkbox', value: 'b' },
    { id: 'email', name: 'contact', type: 'radio', value: 'email' },
    { id: 'phone', name: 'contact', type: 'radio', value: 'phone' }
  ] as const);
  return (
    <Form
      onSubmit={(_event, data) => {
        expectTypeOf(data.tags).toEqualTypeOf<Set<string> | undefined>();
        expectTypeOf(data.contact).toEqualTypeOf<string | null | undefined>();
        // @ts-expect-error A Set must not expose array methods.
        data.tags?.push('invalid');
      }}
    />
  );
}

export function NestedCustomGroups() {
  const { ModularForm: Form } = useModularForm(
    [
      { id: 'a', name: 'prefs.tags', type: 'checkbox', value: 'a' },
      { id: 'b', name: 'prefs.tags', type: 'checkbox', value: 'b' }
    ] as const,
    { parseAccessors: true }
  );
  return (
    <Form
      onSubmit={(_event, data) => {
        expectTypeOf(data.prefs.tags).toEqualTypeOf<Set<string> | undefined>();
      }}
    />
  );
}
