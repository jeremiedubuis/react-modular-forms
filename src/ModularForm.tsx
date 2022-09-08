import React, { ForwardedRef } from "react";
import { FormStore } from "./FormStore";
import type { ModularFormProps } from "./types";

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
  ) => (
    <form
      id={id}
      {...intrinsic}
      onSubmit={(e) => {
        const form = FormStore.getForm(id);
        if (ref) {
          if (typeof ref === "function") ref(form);
          else ref.current = form;
        }
        form.set(handleSameNameFieldValues, parseAccessors);
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
  )
);
