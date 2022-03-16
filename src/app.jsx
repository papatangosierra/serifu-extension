import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { ScriptPanel } from "./components/script-panel.jsx";
import { StyleMenuPanel } from "./components/setup-panel.jsx";
import { SerifuDoc } from "./doc.js";
import { serifuText } from "./components/test-data.js";

function importDataFromFile() {
  let dataFilePath = window.cep.fs.showOpenDialogEx( // has to be "Ex" otherwise the commented-out
    false,                                           // kludge down there is necessary (WOW!!!)
    false,
    "Select Serifu script file to load",
    null,
    ["txt", "srf", "serifu"]
  ).data[0] // .slice(7).replace(/%20/g, " ");
  console.log(`data file path is: ${dataFilePath}`)
  let dataFile = window.cep.fs.readFile(dataFilePath);
  if (dataFile.err === 0) {
    return new SerifuDoc(dataFile.data);
  } else {
    console.log(JSON.stringify(dataFile, 0, 4));
    return new SerifuDoc(`# Page 1
    - 1
    Serifu-chan: Looks like we're having some trouble opening the data file.

    `);
  }
}

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
