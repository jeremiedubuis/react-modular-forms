import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FormStore } from './FormStore';
import { config, registeredTypes } from './config';
import type { ModularFormFieldProps } from './types';
import { FieldError, ModularFieldType } from './enums';
import { arrayToAccessor } from './accessorsHelpers';

const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter((c) => c).join(' ');

/**
 * Determines if a field type should default to empty string to maintain controlled component behavior.
 * Returns true for text-based inputs, selects, and textareas.
 */
const shouldUseStringDefault = (type: string): boolean => {
  const typeInfo = registeredTypes[type];
  if (!typeInfo) return false;

  // Checkable fields (checkbox, radio) don't need string defaults
  if (typeInfo.checkable) return false;

  // File inputs and hidden inputs have special handling
  if (type === ModularFieldType.File || type === ModularFieldType.Hidden) return false;

  // All other input types (text, number, email, etc.), select, and textarea should use string defaults
  return true;
};

export function ModularFormField({
  children,
  innerClassName,
  className,
  disableOnInvalidForm,
  error: errorProp,
  formId,
  id: _id,
  label,
  labelClassName,
  name: _name,
  onChange,
  onFocus,
  onBlur,
  type,
  wrapperProps = {},
  validation,
  disabled,
  readOnly,
  errorMessages,
  value: _value,
  coerceType,
  componentRef: _componentRef,
  checked,
  errorHtmlElement,
  hideErrors,
  onErrorChange,
  ...intrinsic
}: ModularFormFieldProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const [isChecked, setIsChecked] = useState(!!checked);
  const [errors, setErrors] = useState<(FieldError | string)[]>([]);
  const [success, setSuccess] = useState(false);

  // Ensure value is never undefined/null for string-based fields to prevent uncontrolled warnings
  const useStringDefault = shouldUseStringDefault(type);
  const safeValue = useStringDefault ? _value ?? config.sendEmptyStringsAs ?? '' : _value;
  const [value, setValue] = useState(safeValue);

  const componentRef = _componentRef || useRef<HTMLElement | null>(null);
  const setComponentRef = useCallback(
    (node: HTMLElement | null) => {
      if (node && componentRef)
        (componentRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [componentRef]
  );

  useEffect(() => {
    const useStringDefault = shouldUseStringDefault(type);
    setValue(useStringDefault ? _value ?? config.sendEmptyStringsAs ?? '' : _value);
  }, [_value, type]);

  useEffect(() => {
    setIsChecked(!!checked);
  }, [checked]);

  const computedName = Array.isArray(_name) ? arrayToAccessor(_name) : _name;
  const id: string | undefined =
    _id || (formId && computedName ? formId + computedName : undefined);

  const name = computedName
    ? computedName
    : type !== ModularFieldType.Submit
    ? computedName || _id
    : computedName;

  useEffect(() => {
    if (!formId || registeredTypes[type]?.isStatic) return;
    if (name && id) {
      const form = FormStore.getForm(formId as string);
      form.registerField(
        id,
        type,
        name as string,
        componentRef,
        registeredTypes[type].getValue,
        validation,
        setSuccess,
        setErrors,
        setIsChecked,
        disableOnInvalidForm,
        coerceType
      );

      return () => form.unregisterField(id);
    }
  }, [name]);

  const sharedProps: Record<string, unknown> = {
    children,
    className: cn(
      typeof config.innerClassName === 'function'
        ? config.innerClassName(type)
        : config.innerClassName,
      innerClassName
    ),
    id,
    name,
    // mark invalid only when there are actual error entries (array presence alone is truthy)
    'aria-invalid': Boolean(errorProp || errors.length > 0),
    'aria-required': Boolean((validation as { required?: boolean } | undefined)?.required),
    disabled,
    readOnly,
    type,
    value,
    setValue,
    componentRef,
    setComponentRef,
    errors,
    checked: isChecked,
    formId,
    errorHtmlElement,
    onFocus: (e: React.SyntheticEvent<any>) => {
      setIsFocused(true);
      // Delegate with narrowed type when possible via overloads
      (onFocus as ((e: any) => void) | undefined)?.(e);
    },
    onBlur: (e: React.SyntheticEvent<any>) => {
      setIsFocused(false);
      const validateOnBlur =
        typeof (validation as { validateOnBlur?: boolean } | undefined)?.validateOnBlur !==
        'undefined'
          ? (validation as { validateOnBlur?: boolean })!.validateOnBlur!
          : config.validateOnBlur;
      if (formId && validateOnBlur && id) FormStore.getForm(formId).validateField(id);
      (onBlur as ((e: any) => void) | undefined)?.(e);
    },

    'data-rmf-props-value': type === 'checkbox' ? _value : undefined,
    ...intrinsic
  };

  if (!registeredTypes[type]?.isStatic) {
    sharedProps.onChange = (e: React.ChangeEvent<any>) => {
      if (registeredTypes[type].checkable) {
        if (type === ModularFieldType.Radio) {
          if (formId && id) FormStore.getForm(formId).checkRadioField(id);
        } else {
          setIsChecked((e.currentTarget as HTMLInputElement).checked);
        }
      }

      const getter = registeredTypes[type].getValue;
      if (getter) {
        const nextVal = getter(componentRef as React.RefObject<any>);
        if (!registeredTypes[type].checkable) setValue(nextVal as any);
        // Forward event with specific element type based on field kind
        (onChange as ((e: any, value: any) => void) | undefined)?.(e, nextVal as any);
      } else {
        // Static components or custom without getValue
        (onChange as ((e: any, value: never) => void) | undefined)?.(
          e as React.ChangeEvent<any>,
          undefined as never
        );
      }
    };
  } else {
    sharedProps.onChange = onChange as any;
  }

  const Component = registeredTypes[type].Component;
  const extraClass = registeredTypes[type].extraClass;

  useEffect(() => {
    (onErrorChange as ((e: (FieldError | string)[]) => void) | undefined)?.(errors);
  }, [errors]);

  const errorContent = !hideErrors && (errorProp || errors.length > 0) && (
    <div
      className={config.errorClassName}
      {...{
        'aria-live': 'polite',
        'aria-relevant': 'text'
      }}
    >
      {errorProp ? (
        <p>{errorProp}</p>
      ) : (
        errors
          .slice(0, config.displayMultipleErrors ? errors.length : 1)
          .map((e, i) => <p key={i}>{errorMessages?.[e] || config.errorMessages[e] || e}</p>)
      )}
    </div>
  );

  return (
    <div
      className={cn(
        config.fieldClassName,
        className as string | undefined,
        `is-${type}`,
        isFocused ? 'is-focused' : undefined,
        isChecked ? 'is-checked' : undefined,
        Boolean(errorProp) || errors.length > 0 ? 'has-error' : undefined,
        Boolean(validation) && !!success ? 'has-success' : undefined,
        readOnly ? 'is-read-only' : undefined,
        value ? 'has-value' : undefined,
        extraClass
      )}
      {...(wrapperProps as object)}
    >
      {registeredTypes[type].labelBefore && label && (
        <label htmlFor={id} className={cn(config.labelClassName, labelClassName)}>
          {label as any}
        </label>
      )}
      <Component
        {...(sharedProps as unknown as import('./types').FieldComponentProps<unknown, any, any> &
          Record<string, unknown>)}
      />
      {!registeredTypes[type].labelBefore && label && (
        <label htmlFor={id} className={cn(config.labelClassName, labelClassName)}>
          {label as any}
        </label>
      )}

      {errorContent
        ? errorHtmlElement
          ? (() => {
              const target =
                typeof errorHtmlElement === 'string'
                  ? (document.querySelector(errorHtmlElement) as Element | null)
                  : (errorHtmlElement as Element | null);
              // If target is not found, gracefully fall back to inline rendering
              return target ? ReactDOM.createPortal(errorContent, target) : errorContent;
            })()
          : errorContent
        : null}
    </div>
  );
}
