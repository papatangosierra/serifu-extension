import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  paragraphStyles,
  currentPage,
  registerStyleCheck,
  unRegisterStyleCheck,
  linkScriptNameToGrafStyle,
} from "../interface.js";
import { theDoc } from "../app.jsx";

// This component is just one item in a menu of available InDesign styles
function MenuItem(props) {
  return (
    <option value={props.id} name="{props.name}">
      {props.name}
    </option>
  );
}

// GrafMenu builds full menu by iterating over a list of all available InDesign styles of shape:
/*
[
	{ name: "Dialogue", id: 1 },
  ...etc.
]
*/
// props will contain a "type" (either "Source" or "Script")
function GrafStyleSelectMenu(props) {
  const menuItems = props.grafStyles.map((el) => {
    return (
      <MenuItem
        id={el.id}
        name={el.name}
        key={`${props.type}-${el.name}-select`}
      />
    );
  });

  return (
    <select
      onChange={(e) => {
        console.log();
        linkScriptNameToGrafStyle(
          props.type,
          props.name, // in-script name of newly selected style
          e.target.value // numerical ID, per INDD, of newly selected style
        );
      }}
      name={props.type}
    >
      {" "}
      {menuItems}{" "}
    </select>
  );
}

function StyleToGrafStyle(props) {
  const allStyleMenus = theDoc.getStyles.map((el) => {
    return (
      <div key={el} className="style-select-menu">
        <label htmlFor={`style-${el}-select`} id={`style-${el}-select`}>
          {el}:
        </label>
        <GrafStyleSelectMenu
          type="style"
          name={el}
          grafStyles={props.grafStyles}
        />
      </div>
    );
  });

  return (
    <div className="section">
      <span>Select Paragraph Styles to apply to styles found in script:</span>
      {allStyleMenus}
    </div>
  );
}

function SourceToGrafStyle(props) {
  const allSourceMenus = theDoc.getSources.map((el) => {
    return (
      <div key={el} className="source-select-menu">
        <label htmlFor={`source-${el}-select`} id={`source-${el}-select`}>
          {el}:
        </label>
        <GrafStyleSelectMenu
          type="source"
          name={el}
          grafStyles={props.grafStyles}
        />
      </div>
    );
  });

  return (
    <div className="section">
      <span>Select Paragraph Styles to apply to sources found in script:</span>
      {allSourceMenus}
    </div>
  );
}

export function StyleMenuPanel() {
  const [grafStyles, setGrafStyles] = useState([]);
  // update our list of paragraph styles when the event fires
  const refreshGrafStyles = (e) => {
    console.log(`refreshing graf styles: ${e.detail}`);
    setGrafStyles(e.detail);
  };
  useEffect(() => {
    document.addEventListener("grafStylesFetched", refreshGrafStyles);
    registerStyleCheck();
    return () => {
      // cleanup function
      document.removeEventListener("grafStylesFetched", refreshGrafStyles);
      unRegisterStyleCheck();
    };
  });
  return (
    <div>
      <SourceToGrafStyle grafStyles={grafStyles} />
      <StyleToGrafStyle grafStyles={grafStyles} />
    </div>
  );
}
