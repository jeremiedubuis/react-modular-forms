import React from "react";
import { FieldComponentProps } from "../types";

export const Select: React.FC<
  React.HTMLProps<HTMLSelectElement> & FieldComponentProps
> = ({
  type,
  disabled,
  value,
  onBlur,
  onFocus,
  onChange,
  errors,
  validation,
  componentRef,
  setComponentRef,
  children,
  readOnly,
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
  const c = readOnly
    ? React.Children.toArray(children).filter(
        ({ props }: any) => props.value === value
      )
    : children;

  return <select {...sharedProps}>{c}</select>;
};
