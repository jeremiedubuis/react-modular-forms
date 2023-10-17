import React from 'react';
import { FieldComponentProps } from '../types';

export const HiddenInput: React.FC<React.HTMLProps<HTMLInputElement> & FieldComponentProps> = ({
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
  formId,
  errorHtmlElement,
  setValue,
  ...intrinsic
}) => {
  const sharedProps = {
    ref: componentRef,
    onChange,
    disabled,
    value: JSON.stringify(value),
    ...intrinsic
  };

  return (
    <>
      <input type={type} {...sharedProps} /> {children}
    </>
  );
};
