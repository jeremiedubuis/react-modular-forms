import React, { ForwardedRef, useEffect } from 'react';
import { FormStore } from './FormStore';
import type { ModularFormProps, FormValues } from './types';
import { config } from './config';

export const ModularForm = React.forwardRef(
  <TValues extends FormValues = FormValues>(
    {
      children,
      id,
      onSubmit,
      onSubmitError,
      handleSameNameFieldValues,
      parseAccessors,
      wrapField: _wrapField,
      ...intrinsic
    }: ModularFormProps<TValues>,
    ref: ForwardedRef<FormStore<TValues>>
  ) => {
    useEffect(() => {
      if (ref) {
        const form = FormStore.getForm<TValues>(id);
        if (typeof ref === 'function') ref(form);
        else ref.current = form;
      }

      return () => {
        FormStore.getForm<TValues>(id).destroy();
      };
    }, []);

    useEffect(() => {
      const form = FormStore.getForm<TValues>(id);
      form.set(handleSameNameFieldValues, parseAccessors);
    }, [handleSameNameFieldValues, parseAccessors]);
    return (
      <form
        id={id}
        method={config.defaultFormMethod}
        {...intrinsic}
        onSubmit={(e) => {
          const form = FormStore.getForm<TValues>(id);
          const errors = form.getErrors(false);
          if (!errors.length) {
            onSubmit?.(e, form.getValues());
          } else {
            e.preventDefault();
            onSubmitError?.(e, errors);
          }
        }}
      >
        {children}
      </form>
    );
  }
);
ModularForm.displayName = 'ModularForm';
