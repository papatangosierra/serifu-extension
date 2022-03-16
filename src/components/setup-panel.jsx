import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  paragraphStyles,
  currentPage,
  registerStyleCheck,
  unRegisterStyleCheck,
  linkScriptNameToGrafStyle,
  getINDDGrafStyles,
} from "../interface.js";
import { theDoc } from "../app.jsx";

// This component is just one item in a menu of available InDesign styles
function MenuItem(props) {
  return (
    <option value={props.id} name={props.name}>
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
  const [ selected, setSelected ] = useState(props.smap[props.name]);
  const menuItems = props.grafStyles.map((el) => {
    return (
      <MenuItem
        id={el.id}
        name={el.name}
        key={`${props.type}-${el.name}-select`}
      />
    );
  });

  useEffect(() => {
    if (props.type === "style") {
      theDoc.styleMap[props.name] = selected;
    } else {
      theDoc.sourceMap[props.name] = selected;
    }
  });

  return (
    <select
      onChange={(e) => {
        linkScriptNameToGrafStyle(
          props.type,
          props.name, // in-script name of newly selected style
          e.target.value // numerical ID, per INDD, of newly selected style
        );
        setSelected(e.target.value);
      }}
      name={props.type}
      value={selected} // the value prop specifies which option is currently selected
    >
      {" "}
      {menuItems}{" "}
    </select>
  );
}

function StyleToGrafStyle(props) {
  const allStyleMenus = theDoc.getStyles.map((el) => {
    return (
      <tr key={el} className="style-select-menu">
        <td>
          <label htmlFor={`style-${el}-select`} id={`style-${el}-select`}>
            {el}
          </label>
        </td>
        <td>
          <GrafStyleSelectMenu
            type="style"
            name={el}
            grafStyles={props.grafStyles}
            smap={theDoc.styleMap}
          />
        </td>
      </tr>
    );
  });

  return (
    <div className="section">
      <div className="style-menu-description">
        Select InDesign Paragraph Styles to apply to styles found in script:
      </div>
      <table>
        <tbody>
        <tr>
          <th>Script Style</th>
          <th>Paragraph Style</th>
        </tr>
        {allStyleMenus}
        </tbody>
      </table>
    </div>
  );
}

function SourceToGrafStyle(props) {
  const allSourceMenus = theDoc.getSources.map((el) => {
    return (
      <tr key={el} className="source-select-menu">
        <td>
          <label htmlFor={`source-${el}-select`} id={`source-${el}-select`}>
            {el}
          </label>
        </td>
        <td>
          <GrafStyleSelectMenu
            type="source"
            name={el}
            grafStyles={props.grafStyles}
            smap={theDoc.sourceMap}
          />
        </td>
      </tr>
    );
  });

  return (
    <div className="section">
      <div className="style-menu-description">
        Select InDesign Paragraph Styles to apply to sources found in script:
      </div>
      <table>
        <tbody>
        <tr>
          <th>Script Source</th>
          <th>Paragraph Style</th>
        </tr>
        {allSourceMenus}
        </tbody>
      </table>
    </div>
  );
}

export function StyleMenuPanel() {
  const [grafStyles, setGrafStyles] = useState([]);

  useEffect(() => {
    const refreshGrafStyles = async function () {
      console.log(`refreshing graf styles`);
      let fetchGrafStylesPending = getINDDGrafStyles();
      let fetchGrafStyles = await fetchGrafStylesPending;
      setGrafStyles(fetchGrafStyles);
    };

    refreshGrafStyles(); // call our async function to get currently defined graf styles from INDD

    return () => {} // cleanup
  }, []);
  return (
    <div>
      <SourceToGrafStyle grafStyles={grafStyles} />
      <StyleToGrafStyle grafStyles={grafStyles} />
    </div>
  );
}
