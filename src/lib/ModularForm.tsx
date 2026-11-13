import React, { ForwardedRef, useEffect } from 'react';
import { FormStore } from './FormStore';
import type { ModularFormProps, FormValues } from './types';
import { config } from './config';

const ModularFormImpl = React.forwardRef(
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
      const form = FormStore.getForm<TValues>(id);
      return () => form.destroy();
    }, [id]);

    useEffect(() => {
      if (ref) {
        const form = FormStore.getForm<TValues>(id);
        if (typeof ref === 'function') ref(form);
        else ref.current = form;
      }

      return () => {
        if (typeof ref === 'function') ref(null);
        else if (ref) ref.current = null;
      };
    }, [id, ref]);

    useEffect(() => {
      const form = FormStore.getForm<TValues>(id);
      form.set(handleSameNameFieldValues, parseAccessors);
    }, [id, handleSameNameFieldValues, parseAccessors]);
    return (
      <form
        id={id}
        method={config.defaultFormMethod}
        {...intrinsic}
        onSubmit={(e) => {
          try {
            const form = FormStore.getForm<TValues>(id);
            const errors = form.getErrors(false);
            if (!errors.length) {
              onSubmit?.(e, form.getValues());
            } else {
              e.preventDefault();
              onSubmitError?.(e, errors);
            }
          } catch (error) {
            // A serialization/handler exception must not fall through to native submission.
            e.preventDefault();
            throw error;
          }
        }}
      >
        {children}
      </form>
    );
  }
);
ModularFormImpl.displayName = 'ModularForm';

// forwardRef erases the render function's generic. Preserve it at the public boundary.
export const ModularForm = ModularFormImpl as {
  <TValues extends FormValues = FormValues>(
    props: ModularFormProps<TValues> & React.RefAttributes<FormStore<TValues>>
  ): React.ReactElement | null;
  displayName?: string;
};
