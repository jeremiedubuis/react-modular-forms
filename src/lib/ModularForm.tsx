import React, { ForwardedRef, useEffect } from "react";
import { FormStore } from "./FormStore";
import type { ModularFormProps } from "./types";
import { config } from "./config";

export const ModularForm: React.FC<ModularFormProps> = React.forwardRef(
  (
    {
      children,
      id,
      onSubmit,
      onSubmitError,
      handleSameNameFieldValues,
      parseAccessors,
      ...intrinsic
    },
    ref: ForwardedRef<FormStore>
  ) => {
    useEffect(() => {
      if (ref) {
        const form = FormStore.getForm(id);
        if (typeof ref === "function") ref(form);
        else ref.current = form;
      }
    }, []);

    useEffect(() => {
      const form = FormStore.getForm(id);
      form.set(handleSameNameFieldValues, parseAccessors);
    }, [handleSameNameFieldValues, parseAccessors]);
    return (
      <form
        id={id}
        method={config.defaultFormMethod}
        {...intrinsic}
        onSubmit={(e) => {
          const form = FormStore.getForm(id);
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
