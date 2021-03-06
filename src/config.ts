import type React from "react";
import type { RefObject } from "react";
import { FieldError, ModularFieldType } from "./enums";
import { RegularInput } from "./fieldComponents/RegularInput";
import { Textarea } from "./fieldComponents/Textarea";
import { Select } from "./fieldComponents/Select";
import { FieldComponentProps } from "./types";

export const config = {
  displayMultipleErrors: true,
  errorClassName: "modular-form-error",
  fieldClassName: "modular-form-field",
  greedyValidation: true,
  handleSameNameFieldValues: (name, values: any[]) => {
    return {
      [name]: values.filter((v) => typeof v !== "undefined" && v !== null),
    };
  },
  handleSingleCheckboxAsArray: false,
  validateOnBlur: true,
  errorMessages: {
    [FieldError.Empty]: "Field is empty",
    [FieldError.Group]: "Group error",
  },
};

const regularInputType = {
  Component: RegularInput,
  labelBefore: true,
  getValue: (ref: RefObject<any>) => {
    return ref.current.value;
  },
};

export const registeredTypes = {
  [ModularFieldType.Checkbox]: {
    Component: RegularInput,
    labelBefore: false,
    checkable: true,
    getValue: (ref: RefObject<any>) => {
      return ref.current.checked
        ? ref.current.value || true
        : ref.current.value
        ? null
        : false;
    },
  },
  [ModularFieldType.Color]: regularInputType,
  [ModularFieldType.Date]: regularInputType,
  [ModularFieldType.Email]: regularInputType,
  [ModularFieldType.File]: {
    ...regularInputType,
    getValue: (ref: RefObject<any>) => {
      return ref.current.getAttribute("multiple")
        ? [...ref.current.files]
        : ref.current.files[0];
    },
  },
  [ModularFieldType.Hidden]: regularInputType,
  [ModularFieldType.Number]: regularInputType,
  [ModularFieldType.Password]: regularInputType,
  [ModularFieldType.Radio]: {
    ...regularInputType,
    checkable: true,
    labelBefore: false,
  },
  [ModularFieldType.Select]: {
    ...regularInputType,
    Component: Select,
  },
  [ModularFieldType.Search]: regularInputType,
  [ModularFieldType.Submit]: regularInputType,
  [ModularFieldType.Tel]: regularInputType,
  [ModularFieldType.Text]: regularInputType,
  [ModularFieldType.Textarea]: {
    ...regularInputType,
    Component: Textarea,
  },
  [ModularFieldType.Url]: regularInputType,
};

export const registerType = (
  fieldType: string,
  componentOptions: {
    Component:
      | React.Component<React.HTMLProps<any> & FieldComponentProps>
      | React.FC<React.HTMLProps<any> & FieldComponentProps>;
    getValue: (ref: RefObject<any>) => any;
    labelBefore?: boolean;
    extraClass?: string;
  }
) => {
  if (typeof componentOptions.labelBefore === "undefined")
    componentOptions.labelBefore = true;
  registeredTypes[fieldType] = componentOptions;
};
