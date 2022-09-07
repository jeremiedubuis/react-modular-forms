import React from "react";
import ReactDOM from "react-dom";
import { ModularFieldType, ModularForm, ModularFormField } from "../src";
ReactDOM.render(
  <React.StrictMode>
    <ModularForm
      id="form"
      parseAccessors
      onSubmit={(e, data) => {
        e.preventDefault();
        console.log(data);
      }}
    >
      <ModularFormField
        formId="form"
        type={ModularFieldType.Text}
        name="blocks[0].text"
        label="Text"
        validation={{ required: true }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        name={["blocks", 0, "checkedNoValue"]}
        id="checkbox"
        label="checkbox"
        validation={{ required: true }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        id="checkbox-a"
        name="blocks[0].checked2"
        label="A"
        value="a"
        validation={{ group: "cb" }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        id="checkbox-b"
        name="abc"
        label="B"
        value="b"
        validation={{ group: "cb" }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        id="checkbox-c"
        name="abc"
        label="C"
        value="c"
        validation={{ group: "cb" }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Tel}
        id="tel"
        label="Tel 1"
        validation={{
          group: "tel",
          negativeRegExps: { "Must be number": /^\d*$/ },
        }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Tel}
        id="tel2"
        label="Tel 2"
        validation={{
          group: "tel",
          negativeRegExps: { "Must be number": /^\d*$/ },
        }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Select}
        id="select"
        label="select"
      >
        <option>Sélectionner une option</option>
        <option value="value">Valeur</option>
      </ModularFormField>
      <ModularFormField
        formId="form"
        type={ModularFieldType.Submit}
        id="submit"
        value="Submit"
        disableOnInvalidForm={true}
      />
    </ModularForm>
  </React.StrictMode>,
  document.getElementById("app")
);
