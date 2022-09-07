import React from "react";
import { FieldComponentProps } from "../types";

export const HiddenInput: React.FC<
  React.HTMLProps<HTMLInputElement> & FieldComponentProps
> = ({
  type,
  disabled,
  value,
  onChange,
  componentRef,
  children,
  ...intrinsic
}) => {
  const sharedProps = {
    ref: componentRef,
    onChange,
    disabled,
    value: JSON.stringify(value),
    ...intrinsic,
  };

  return (
    <>
      <input type={type} {...sharedProps} /> {children}
    </>
  );
};
