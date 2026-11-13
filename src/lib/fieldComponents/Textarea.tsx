import React from 'react';
import { FieldComponentProps } from '../types';

export const Textarea: React.FC<
  FieldComponentProps<unknown, 'textarea', HTMLTextAreaElement> &
    Omit<
      React.HTMLProps<HTMLTextAreaElement>,
      'value' | 'checked' | 'onChange' | 'onBlur' | 'onFocus' | 'defaultValue' | 'defaultChecked'
    >
> = ({
  disabled,
  value,
  onBlur,
  onFocus,
  onChange,
  errors,
  setComponentRef: _setComponentRef,
  validation,
  componentRef,
  children,
  formId: _formId,
  errorHtmlElement: _errorHtmlElement,
  setValue: _setValue,
  ...intrinsic
}) => {
  const sharedProps = {
    ref: componentRef as React.Ref<HTMLTextAreaElement>,
    onChange,
    onFocus,
    onBlur,
    'aria-invalid': errors.length > 0,
    'aria-required': validation?.required,
    disabled,
    value: (value ?? '') as any,
    ...intrinsic
  };

  return (
    <>
      <textarea {...sharedProps} />
      {children}
    </>
  );
};
