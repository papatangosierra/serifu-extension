import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import {

} from "../interface.js";

export const ToolsPanel = function () {
  return (
    <>
      <div className="section">
        <h2>Setup & Pages</h2>
        <h3>Binding & Reading Direction</h3>
        <button>Reverse Binding Direction</button><br />
        <button>Reverse Document Page Order</button><br />
        <h3>Document Setup</h3>
        <button>Auto-Place Artwork From Folder</button><br />
        <button>Create Master Page Art Frames</button><br />
        <button>Add Guides & Page Numbers</button><br />
        <button>Create Basic Paragraph Styles</button><br />


      </div>
      <div className="section">
        <h2>Items</h2>
        <h3>Layout Adjustment</h3>
        <button>Match Art Frame to Page Size</button><br />
        <button>Nudge Horizontal Guides In</button><br />
        <button>Nudge Horizontal Guides Out</button><br />
        <button>Nudge Vertical Guides In</button><br />
        <button>Nudge Horizontal Guides Out</button><br />
        <h3>Utility</h3>
        <button>Lock All Items</button><br />
        <button>Unlock All Items</button><br />
        <button>Find Next Empty Text Frame</button><br />
        <button>Export Current Page As PDF</button><br />
      </div>
    </>
  );
}
