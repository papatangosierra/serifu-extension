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
import { externalDoc as theDoc } from "../app.jsx";

// we're going to store preferences here; when we need preferences to persist, we'll
// use useEffect hooks to read/write to this object.
export let prefs = {
  sfxContent: "text-only",
};

function SfxContentSelectItem(props) {
  return (
    <div className="sfx-option">
      <input
        className="sfx-option-btn"
        onChange={props.handleChange}
        type="radio"
        id={props.id}
        name="sfx-content"
        value={props.value}
        checked={props.selected}
      />
      <label htmlFor={props.id}>{props.text}</label>
    </div>
  );
}
// this is the radio button list that allows selection of different combinations of SFX text + transliteration
// to be placed
function SfxContentSelect() {
  let [sfxContentPref, setSfxContentPref] = useState(prefs.sfxContent);
  
  function handleChange(e) {
    setSfxContentPref(e.target.value)
  }

  useEffect(() => {
    prefs.sfxContent = sfxContentPref;
  });

  return (
    <form>
      <div className="sfx-settings">
        <div className="style-menu-description">
          Select content of placed SFX:
        </div>
        <SfxContentSelectItem
          id="babump"
          value="text-only"
          text={<div className="sfx-desc">babump babump</div>}
          selected={sfxContentPref === "text-only"}
          handleChange={handleChange}
        />
        <SfxContentSelectItem
          id="doki"
          value="tl-only"
          text={<div className="sfx-desc">doki doki</div>}
          selected={sfxContentPref === "tl-only"}
          handleChange={handleChange}
        />
        <SfxContentSelectItem
          id="doki-babump"
          value="tl-text"
          text={
            <div className="sfx-desc">
              doki doki
              <br />
              (babump babump)
            </div>
          }
          selected={sfxContentPref === "tl-text"}
          handleChange={handleChange}
        />
      </div>
    </form>
  );
}

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
  const [selected, setSelected] = useState(props.smap[props.name]);
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

export function StyleMenuPanel(props) {
  const [grafStyles, setGrafStyles] = useState([]);

  useEffect(() => {
    const refreshGrafStyles = async function () {
      console.log(`refreshing graf styles`);
      let fetchGrafStylesPending = getINDDGrafStyles();
      let fetchGrafStyles = await fetchGrafStylesPending;
      setGrafStyles(fetchGrafStyles);
    };

    refreshGrafStyles(); // call our async function to get currently defined graf styles from INDD

    return () => {}; // cleanup
  }, []);
  return (
    <div>
      <SfxContentSelect />
      <SourceToGrafStyle grafStyles={grafStyles} />
      <StyleToGrafStyle grafStyles={grafStyles} />
    </div>
  );
}
