import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { ScriptPanel } from "./components/script-panel.jsx";
import { StyleMenuPanel } from "./components/setup-panel.jsx";
import { SerifuDoc } from "./doc.js";
import { serifuText } from "./components/test-data.js";

// function importDataFromFile() {
//   // let newScriptState
//   console.log("attempting import...");
//   const reader = new FileReader();
//   const importFile = id("import").files[0]; // select the first file from the input widget
//   let myDoc;
//   console.log("file size: " + importFile.size);
//   reader.onload = () => {
//     // when file is loaded
//     console.log("reader.onload triggered");
//     myDoc = new SerifuDoc(reader.result);
//     // have Indesign show an alert to grab focus
//     // csInterface.evalScript('alert("Script data imported.")');
//   };
//   reader.readAsText(importFile);
//   console.log("attempting to read as text");
//   return myDoc;
// }

export const theDoc = importDataFromFile();

function App() {
  return (
    <Tabs>
      <TabList>
        <Tab>Script</Tab>
        <Tab>Setup</Tab>
      </TabList>
      <TabPanel>
        <ScriptPanel />
      </TabPanel>
      <TabPanel>
        <StyleMenuPanel />
      </TabPanel>
    </Tabs>
  );
}

const app = <App />;
ReactDOM.render(app, document.getElementById("app"));
