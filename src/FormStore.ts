import type { ValidationType } from "./types";
import { CoerceType, FormValues, SameNameFieldValuesHandler } from "./types";
import { FieldError, ModularFieldType } from "./enums";
import { FormField } from "./FormField";
import { config } from "./config";
import { RefObject } from "react";
import { accessorsToObject } from "./accessorsToObject";

const forms: FormStore[] = [];

export class FormStore {
  static getForm(id: string) {
    return (
      forms.find((f) => f.id === id) || forms[forms.push(new FormStore(id)) - 1]
    );
  }

  private id: string;
  private handleSameNameFieldValues: SameNameFieldValuesHandler;
  private fields: FormField[] = [];
  private fieldsToDisable: FormField[] = [];

  private disableTimeout: any;
  private disableDebounce = false;
  private parseAccessors = false;

  set(
    handleSameNameFieldValues?: SameNameFieldValuesHandler,
    parseAccessors?: boolean
  ) {
    if (handleSameNameFieldValues)
      this.handleSameNameFieldValues = handleSameNameFieldValues;
    this.parseAccessors = !!parseAccessors;
  }

  constructor(
    id: string,
    handleSameNameFieldValues?: SameNameFieldValuesHandler,
    parseAccessors?: boolean
  ) {
    this.id = id;
    this.handleSameNameFieldValues =
      handleSameNameFieldValues || config.handleSameNameFieldValues;
    this.parseAccessors = !!parseAccessors;
  }

  registerField(
    id: string,
    type: ModularFieldType | string,
    name: string,
    componentRef,
    getValue: (ref: RefObject<any>) => any,
    validation: ValidationType = {},
    setSuccess: Function,
    setErrors: Function,
    disableOnInvalidForm?: boolean,
    coerceType?: CoerceType
  ) {
    const ff = new FormField({
      id,
      type,
      name,
      componentRef,
      getValue,
      validation,
      setSuccess,
      setErrors,
      disableOnInvalidForm,
      coerceType,
    });
    this.fields.push(ff);
    if (disableOnInvalidForm) {
      this.fieldsToDisable.push(ff);
      this.disableFieldsIfFormInvalid();
    }
  }

  unregisterField(id: string) {
    console.log("un", id);
    const index = this.fields.findIndex((f) => f.id === id);
    if (this.fields[index].disableOnInvalidForm)
      this.fieldsToDisable.splice(
        this.fieldsToDisable.indexOf(this.fields[index]),
        1
      );
    if (index > -1) this.fields.splice(index, 1);
  }

  getFieldErrors(fieldId: string) {
    const field = this.getField(fieldId);
    if (!field) return [FieldError.Undefined];

    const [validation, errors] = this.getSingleFieldErrors(field);

    if (validation?.group) {
      const fieldsInGroup = this.getFieldsIngroup(validation.group);

      let valid = 0;
      fieldsInGroup.forEach((f) => {
        let singleFieldErrors = this.getSingleFieldErrors(f, true);
        if (singleFieldErrors[1].length === 0) valid++;
      });

      if (valid < (validation.groupMin || 1)) errors.push(FieldError.Group);
    }

    return errors;
  }

  getSingleFieldErrors(
    field: FormField,
    treatAsRequired?: boolean
  ): [ValidationType, (FieldError | string)[]] {
    let value;
    let validation;

    if (
      ![ModularFieldType.Checkbox, ModularFieldType.Radio].includes(
        field.type as ModularFieldType
      )
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
        if (fields.length === 1 && !config.handleSingleCheckboxAsArray)
          value = value[0];
      }
    }

    if (treatAsRequired) validation = { ...validation, required: true };

    return [validation, FormField.getErrors(validation, value)];
  }

  getField = (fieldId: string) => this.fields.find(({ id }) => id === fieldId);

  getFieldsIngroup = (group) =>
    this.fields.filter((f) => f.validation?.group === group);

  getValues(): FormValues {
    const grouped = {};
    const singleFields: FormField[] = [];

    this.fields.forEach((f) => {
      if (grouped[f.name]) return;
      const fieldsWithSameName = this.fields.filter(
        (field) => field.name === f.name
      );
      if (fieldsWithSameName.length > 1) {
        console.log(fieldsWithSameName);
        grouped[f.name] = fieldsWithSameName;
        return;
      }
      singleFields.push(f);
    });

    let values = singleFields.reduce((acc: FormValues, curr: FormField) => {
      acc[curr.name] = curr.getValue();
      return acc;
    }, {} as FormValues);

    Object.keys(grouped).forEach((name) => {
      values = {
        ...values,
        ...this.handleSameNameFieldValues(
          name,
          grouped[name].map((f) => f.getValue())
        ),
      };
    });
    if (this.parseAccessors) {
      values = accessorsToObject(values);
    }
    return values;
  }

  getErrors(silent = true) {
    let errors: [string, (string | FieldError)[]][] = [];

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
      const fields = this.getFieldsIngroup(field.validation.group).filter(
        (f) => f.id !== fieldId
      );
      fields.forEach((f) => this.validateField(f.id, true));
    }
    this.disableFieldsIfFormInvalid();
  }

  disableFieldsIfFormInvalid(errors?: [string, (string | FieldError)[]][]) {
    if (this.fieldsToDisable.length) {
      clearTimeout(this.disableTimeout);
      if (!this.disableDebounce) {
        this.disableDebounce = true;
        const formErrors =
          typeof errors !== undefined ? errors : this.getErrors(true);
        const disabled =
          typeof formErrors !== "undefined" && formErrors.length > 1;
        this.fieldsToDisable.forEach((f) => f.setDisabled(disabled));
        this.disableTimeout = setTimeout(() => {
          this.disableDebounce = false;
        }, 150);
      }
    }
  }
}
