import React from "react";
import { FieldComponentProps } from "../types";

export const Textarea: React.FC<
  React.HTMLProps<HTMLTextAreaElement> & FieldComponentProps
> = ({
  type,
  disabled,
  value,
  onBlur,
  onFocus,
  onChange,
  errors,
  setComponentRef,
  validation,
  componentRef,
  children,
  ...intrinsic
}) => {
  const sharedProps = {
    ref: componentRef,
    onChange,
    onFocus,
    onBlur,
    "aria-invalid": !!errors,
    "aria-required": validation?.required,
    disabled,
    value,
    ...intrinsic,
  };

  return (
    <>
      <textarea {...sharedProps} />
      {children}
    </>
  );
};
