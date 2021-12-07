import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { paragraphStyles, currentPage } from "../interface.js";
import { theDoc } from "../app.jsx";

// This component is just one item in a menu of available InDesign styles
function MenuItem(props) {
  console.log("menuitem");
  return <option value={props.id}>{props.name}</option>;
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
  console.log("one full menu");
  const menuItems = paragraphStyles.map((el) => {
    console.log(`el.name in GrafStyleSelectMenu: ${el.name}`);
    return (
      <MenuItem
        id={el.id}
        name={el.name}
        key={`${props.type}-${el.name}-select`}
      />
    );
  });

  return <select name={props.type}> {menuItems} </select>;
}

export function StyleToGrafStyle() {
  const allStyleMenus = theDoc.getStyles.map((el) => {
    console.log(`el in StyletoGrafStyle: ${el}`);
    return (
      <div key={el} className="style-select-menu">
        <label htmlFor={`style-${el}-select`} id={`style-${el}-select`}>
          {el}:
        </label>
        <GrafStyleSelectMenu type="style" />
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

export function SourceToGrafStyle(props) {
  const allSourceMenus = theDoc.getSources.map((el) => {
    console.log(`el in SourcetoGrafStyle: ${el}`);
    return (
      <div key={el} className="source-select-menu">
        <label htmlFor={`source-${el}-select`} id={`source-${el}-select`}>
          {el}:
        </label>
        <GrafStyleSelectMenu type="source" />
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
