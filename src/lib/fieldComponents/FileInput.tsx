import React from 'react';
import { FieldComponentProps } from '../types';

export const FileInput: React.FC<
  FieldComponentProps<unknown, 'input', HTMLInputElement> &
    Omit<
      React.HTMLProps<HTMLInputElement>,
      'value' | 'checked' | 'onChange' | 'onBlur' | 'onFocus' | 'defaultValue' | 'defaultChecked'
    >
> = ({
  type,
  disabled,
  value: _value,
  onBlur,
  onFocus,
  onChange,
  errors,
  validation,
  componentRef,
  setComponentRef: _setComponentRef,
  children,
  formId: _formId,
  errorHtmlElement: _errorHtmlElement,
  setValue: _setValue,
  ...intrinsic
}) => {
  const inputRef = componentRef as React.RefObject<HTMLInputElement> | undefined;

  const sharedProps = {
    ref: inputRef,
    onChange,
    onFocus,
    onBlur,
    'aria-invalid': errors.length > 0,
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
