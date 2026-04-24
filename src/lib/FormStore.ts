import type { ValidationType } from './types';
import { CoerceType, FormValues, SameNameFieldValuesHandler } from './types';
import { FieldError, ModularFieldType } from './enums';
import { FormField } from './FormField';
import { config, registeredTypes } from './config';
import { RefObject } from 'react';
import { accessorsToObject } from './accessorsHelpers';

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

  private disableTimeout: ReturnType<typeof setTimeout> | null = null;
  private disableDebounce = false;
  private parseAccessors = false;

  set(handleSameNameFieldValues?: SameNameFieldValuesHandler<TValues>, parseAccessors?: boolean) {
    if (handleSameNameFieldValues) this.handleSameNameFieldValues = handleSameNameFieldValues;
    this.parseAccessors = !!parseAccessors;
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

  unregisterField(id: string) {
    const index = this.fields.findIndex((f) => f.id === id);
    if (index === -1) return;

    const field = this.fields[index];
    if (field?.disableOnInvalidForm) {
      const toDisableIndex = this.fieldsToDisable.indexOf(field);
      if (toDisableIndex > -1) this.fieldsToDisable.splice(toDisableIndex, 1);
    }

    this.fields.splice(index, 1);
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
    let validation;

    if (
      ![ModularFieldType.Checkbox, ModularFieldType.Radio].includes(field.type as ModularFieldType)
    ) {
      validation = field.validation;
      value = field.getValue();
    } else {
      const fields = this.fields.filter((f) => f.name === field.name);
      validation = fields[0]?.validation || {};
      const checked = fields.filter((f) => f.isChecked());
      if (field.type === ModularFieldType.Radio) {
        value = checked[0]?.getValue();
      } else {
        value = checked.map((f) => f.getValue());
        if (fields.length === 1 && !config.handleSingleCheckboxAsArray) value = value[0];
      }
    }

    if (treatAsRequired) validation = { ...validation, required: true };

    return [validation, FormField.getErrors(validation, value)];
  }

  getField = (fieldId: string) => this.fields.find(({ id }) => id === fieldId);

  getFieldsIngroup = (group: string) => this.fields.filter((f) => f.validation?.group === group);

  getValues = (): TValues => {
    const grouped: Record<string, FormField<any, any, any, any, any>[]> = {};
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

    let values = singleFields.reduce(
      (acc: Record<string, unknown>, curr: FormField<any, any, any, any, any>) => {
        acc[curr.name] = curr.getValue();
        return acc;
      },
      {} as Record<string, unknown>
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
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(val)) {
            out[k] = mapEmpty(v);
          }
          return out;
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
      fields.forEach((f) => this.validateField(f.id, true));
    }
    this.disableFieldsIfFormInvalid();
  }

  disableFieldsIfFormInvalid(errors?: [string, (string | FieldError)[]][]) {
    if (this.fieldsToDisable.length) {
      if (this.disableTimeout) clearTimeout(this.disableTimeout);
      if (!this.disableDebounce) {
        this.disableDebounce = true;
        const formErrors = typeof errors !== 'undefined' ? errors : this.getErrors(true);
        const disabled = formErrors.length > 0;
        this.fieldsToDisable.forEach((f) => f.setDisabled(disabled));
        this.disableTimeout = setTimeout(() => {
          this.disableDebounce = false;
        }, 150);
      }
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
    if (this.disableTimeout) clearTimeout(this.disableTimeout);
    this.fields.length = 0;
    this.fieldsToDisable.length = 0;

    FormStore.forms.delete(this.id);
  }
}
