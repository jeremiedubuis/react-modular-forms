import React from 'react';
import { FieldComponentProps } from '../types';

export const FileInput: React.FC<React.HTMLProps<HTMLInputElement> & FieldComponentProps> = ({
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
  ...intrinsic
}) => {
  const sharedProps = {
    ref: componentRef,
    onChange,
    onFocus,
    onBlur,
    'aria-invalid': !!errors,
    'aria-required': validation?.required,
    disabled,
    ...intrinsic
  };

  return (
    <>
      <input type={type} {...sharedProps} /> {children}
    </>
  );
};
