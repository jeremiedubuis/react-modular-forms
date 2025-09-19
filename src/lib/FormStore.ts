import type { ValidationType } from './types';
import { CoerceType, FormValues, SameNameFieldValuesHandler } from './types';
import { FieldError, ModularFieldType } from './enums';
import { FormField } from './FormField';
import { config, registeredTypes } from './config';
import { RefObject } from 'react';
import { accessorsToObject, validateAccessor } from './accessorsHelpers';

export class FormStore<TValues extends FormValues = FormValues> {
  private static forms: Map<string, FormStore<FormValues>> = new Map();

  static getForm<TValues extends FormValues = FormValues>(id: string) {
    let form = this.forms.get(id) as FormStore<TValues> | undefined;
    if (!form) {
      form = new FormStore<TValues>(id);
      this.forms.set(id, form);
    }
    return form;
  }

  private id: string;
  private handleSameNameFieldValues: SameNameFieldValuesHandler<TValues>;
  private fields: FormField<any, any, any, any, any>[] = [];
  private fieldsToDisable: FormField<any, any, any, any, any>[] = [];
  private pendingDisableCheck?: object;

  private parseAccessors = false;
  private warnedAccessors = new Set<string>();

  set(handleSameNameFieldValues?: SameNameFieldValuesHandler<TValues>, parseAccessors?: boolean) {
    this.handleSameNameFieldValues =
      handleSameNameFieldValues ||
      (config.handleSameNameFieldValues as SameNameFieldValuesHandler<TValues>);
    const wasParsingAccessors = this.parseAccessors;
    this.parseAccessors = !!parseAccessors;
    if (this.parseAccessors && !wasParsingAccessors) {
      this.fields.forEach((field) => this.warnInvalidAccessor(field.name));
    }
  }

  constructor(
    id: string,
    handleSameNameFieldValues?: SameNameFieldValuesHandler<TValues>,
    parseAccessors?: boolean
  ) {
    this.id = id;
    this.handleSameNameFieldValues =
      (handleSameNameFieldValues as SameNameFieldValuesHandler<TValues>) ||
      (config.handleSameNameFieldValues as SameNameFieldValuesHandler<TValues>);
    this.parseAccessors = !!parseAccessors;
  }

  private warnInvalidAccessor(name: string) {
    if (
      process.env.NODE_ENV === 'production' ||
      !this.parseAccessors ||
      this.warnedAccessors.has(name)
    )
      return;
    try {
      validateAccessor(name);
    } catch (error) {
      this.warnedAccessors.add(name);
      console.warn(
        `[react-modular-forms] Form "${this.id}": ${String(error)}. ` +
          'Use supported accessor paths (for example, items[0].name), or disable parseAccessors for literal names. Serialization will throw for this name.'
      );
    }
  }

  registerField<
    TRaw = unknown,
    TEl = HTMLElement,
    TRef = TEl,
    TC extends CoerceType | undefined = CoerceType | undefined
  >(
    id: string,
    type: keyof typeof registeredTypes,
    name: string,
    componentRef: RefObject<TRef>,
    getValue: (ref: RefObject<TRef>) => TRaw,
    validation: ValidationType = {},
    setSuccess: (success: boolean) => void,
    setErrors: (errors: (FieldError | string)[]) => void,
    setIsChecked: (checked: boolean) => void,
    disableOnInvalidForm?: boolean,
    coerceType?: TC
  ) {
    this.warnInvalidAccessor(name);
    const ff = new FormField<TRaw, TEl, TRef, TC>({
      id,
      type,
      name,
      componentRef,
      rawGetValue: getValue,
      validation,
      setSuccess,
      setErrors,
      setIsChecked,
      disableOnInvalidForm,
      coerceType
    });
    this.fields.push(ff);
    if (disableOnInvalidForm) {
      this.fieldsToDisable.push(ff);
      this.disableFieldsIfFormInvalid();
    }

    return ff;
  }

  updateField(
    id: string,
    options: Pick<FormField, 'validation' | 'coerceType' | 'disableOnInvalidForm'>,
    deferDisableCheck = false
  ) {
    const field = this.getField(id);
    if (!field) return;
    Object.assign(field, options);
    const index = this.fieldsToDisable.indexOf(field);
    if (field.disableOnInvalidForm && index === -1) this.fieldsToDisable.push(field);
    if (!field.disableOnInvalidForm && index !== -1) this.fieldsToDisable.splice(index, 1);
    if (deferDisableCheck) this.scheduleDisableCheck();
    else this.disableFieldsIfFormInvalid();
    return field;
  }

  unregisterField(id: string) {
    const index = this.fields.findIndex((f) => f.id === id);
    if (index === -1) return;

    const field = this.fields[index];
    if (field?.disableOnInvalidForm) {
      const toDisableIndex = this.fieldsToDisable.indexOf(field);
      if (toDisableIndex > -1) this.fieldsToDisable.splice(toDisableIndex, 1);
    }

    this.fields.splice(index, 1);
    this.scheduleDisableCheck();
  }

  getFieldErrors(fieldId: string) {
    const field = this.getField(fieldId);
    if (!field) return [FieldError.Undefined];

    const [validation, errors] = this.getSingleFieldErrors(field);

    if (validation?.group) {
      const fieldsInGroup = this.getFieldsIngroup(validation.group);

      let valid = 0;
      fieldsInGroup.forEach((f) => {
        const singleFieldErrors = this.getSingleFieldErrors(f, true);
        if (singleFieldErrors[1].length === 0) valid++;
      });

      if (valid < (validation.groupMin || 1)) errors.push(FieldError.Group);
    }

    return errors;
  }

  getSingleFieldErrors(
    field: FormField<any, any, any, any, any>,
    treatAsRequired?: boolean
  ): [ValidationType | undefined, (FieldError | string)[]] {
    let value;
    let rawValue;
    let validation;

    if (
      ![ModularFieldType.Checkbox, ModularFieldType.Radio].includes(field.type as ModularFieldType)
    ) {
      validation = field.validation;
      ({ value, rawValue } = field.getValueWithRaw());
    } else {
      const fields = this.fields.filter((f) => f.name === field.name);
      validation = fields[0]?.validation || {};
      const checked = fields.filter((f) => f.isChecked());
      if (field.type === ModularFieldType.Radio) {
        ({ value, rawValue } = checked[0]?.getValueWithRaw() ?? {});
      } else {
        const values = checked.map((f) => f.getValueWithRaw());
        value = values.map((entry) => entry.value);
        rawValue = values.map((entry) => entry.rawValue);
        if (fields.length === 1 && !config.handleSingleCheckboxAsArray) {
          value = value[0];
          rawValue = rawValue[0];
        }
      }
    }

    if (treatAsRequired) validation = { ...validation, required: true };

    return [validation, FormField.getErrors(validation, value, rawValue)];
  }

  getField = (fieldId: string) => this.fields.find(({ id }) => id === fieldId);

  getFieldsIngroup = (group: string) => this.fields.filter((f) => f.validation?.group === group);

  getValues = (): TValues => {
    const grouped: Record<string, FormField<any, any, any, any, any>[]> = Object.create(null);
    const singleFields: FormField<any, any, any, any, any>[] = [];

    this.fields.forEach((f) => {
      if (grouped[f.name]) return;
      const fieldsWithSameName = this.fields.filter((field) => field.name === f.name);
      if (fieldsWithSameName.length > 1) {
        grouped[f.name] = fieldsWithSameName;
        return;
      }
      singleFields.push(f);
    });

    let values: Record<string, unknown> = Object.fromEntries(
      singleFields.map((field) => [field.name, field.getValue()])
    );

    Object.keys(grouped).forEach((name) => {
      values = {
        ...values,
        ...this.handleSameNameFieldValues(
          name,
          grouped[name].map((f) => f.getValue()),
          grouped[name]
        )
      };
    });
    if (this.parseAccessors) {
      values = accessorsToObject(values);
    }

    if (config.sendEmptyStringsAs !== '') {
      const isPlainObject = (o: unknown): o is Record<string, unknown> => {
        if (o === null || typeof o !== 'object') return false;
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      };

      const mapEmpty = (val: unknown): unknown => {
        if (val === '') return config.sendEmptyStringsAs;
        if (Array.isArray(val)) return val.map(mapEmpty);
        // Only recurse into plain objects. Preserve instances like Date, File, Map, etc.
        if (isPlainObject(val)) {
          return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, mapEmpty(v)]));
        }
        return val;
      };
      values = mapEmpty(values) as typeof values;
    }

    return values as TValues;
  };

  getErrors(silent = true) {
    const errors: [string, (string | FieldError)[]][] = [];

    for (let i = 0, iLength = this.fields.length; i < iLength; i++) {
      const e = this.getFieldErrors(this.fields[i].id);
      if (!silent) {
        this.fields[i].setErrors(e);
      }
      if (e.length) errors.push([this.fields[i].id, e]);
    }

    if (!silent) this.disableFieldsIfFormInvalid(errors);

    return errors;
  }

  validateField(fieldId: string, ignoreGroup: boolean = false) {
    const field = this.getField(fieldId);
    if (!field) return;
    const errors = this.getFieldErrors(fieldId);
    field.setErrors(errors);
    if (!ignoreGroup && field.validation?.group) {
      const fields = this.getFieldsIngroup(field.validation.group).filter((f) => f.id !== fieldId);
      // Refresh group errors before checking the whole form once below.
      fields.forEach((f) => f.setErrors(this.getFieldErrors(f.id)));
    }
    this.disableFieldsIfFormInvalid();
  }

  private scheduleDisableCheck() {
    if (!this.fieldsToDisable.length || this.pendingDisableCheck) return;
    const pending = (this.pendingDisableCheck = {});
    // Coalesce React field effects, while explicit validation remains synchronous.
    queueMicrotask(() => {
      if (this.pendingDisableCheck === pending) this.disableFieldsIfFormInvalid();
    });
  }

  disableFieldsIfFormInvalid(errors?: [string, (string | FieldError)[]][]) {
    this.pendingDisableCheck = undefined;
    if (this.fieldsToDisable.length) {
      const formErrors = errors ?? this.getErrors(true);
      this.fieldsToDisable.forEach((field) => field.setDisabled(formErrors.length > 0));
    }
  }

  checkRadioField(fieldId: string) {
    const field = this.getField(fieldId);
    if (!field) return;
    this.fields.forEach((f) => {
      if (f.name === field.name) f.setIsChecked(f.id === fieldId);
    });
  }

  destroy() {
    this.pendingDisableCheck = undefined;
    this.fields.length = 0;
    this.fieldsToDisable.length = 0;
    this.warnedAccessors.clear();

    FormStore.forms.delete(this.id);
  }
}
