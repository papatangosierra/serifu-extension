import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { ScriptPanel } from "./components/script-panel.jsx";
import { StyleMenuPanel } from "./components/setup-panel.jsx";
import { SerifuDoc } from "./doc.js";
import { currentDisplayPage }  from "./interface.js";

export let externalDoc;

function App() {
  const [theDoc, setTheDoc] = useState(new SerifuDoc(`# Page 1
  - 1
  Serifu: Script file not yet loaded.
  
  `));

    // load Serifu document from file and refresh state
    function loadScriptData() {
      let dataFilePath = window.cep.fs.showOpenDialogEx( // has to be "Ex" otherwise the commented-out
      false,                                           // kludge down there is necessary (WOW!!!)
      false,
      "Select Serifu script file to load", // dialogue text (doesn't seem to appear on macOS)
      null,
      ["txt", "srf", "serifu"] // acceptable file extensions
    ).data[0] // .slice(7).replace(/%20/g, " ");
    let dataFile = window.cep.fs.readFile(dataFilePath);
    if (dataFile.err === 0) {
      setTheDoc(new SerifuDoc(dataFile.data));      
    } else {
      setTheDoc( new SerifuDoc(`# Page 1
  - 1
  Serifu: Looks like we're having some trouble opening the data file.
  Error Code: ${dataFile.err}
  
  `));
    }
  }
  useEffect(() => {
    // set externalDoc to theDoc so we can reference it in interface.js
    externalDoc = theDoc;

    // fire page update event to make sure display updates when new script data comes in
    let e = new CustomEvent("onNewDisplayPage", {
      // use the pageMap lookup table to find the correct index in the page array
      // to reference for this INDD display page
      detail: theDoc.pageMap.get(currentDisplayPage),
    });
    document.dispatchEvent(e); // dispatch onNewDisplayPage event
  });

  return (
    <Tabs>
      <TabList>
        <Tab>Script</Tab>
        <Tab>Setup</Tab>
        <Tab>Tools</Tab>
      </TabList>
      <TabPanel>
        <ScriptPanel theDoc={theDoc} />
        <button onClick={loadScriptData}>Open Serifu File</button>
      </TabPanel>
      <TabPanel>
        <StyleMenuPanel/>
      </TabPanel>
      <TabPanel>
        <p>toolz go here</p>
      </TabPanel>
    </Tabs>
  );
}

const app = <App />;
ReactDOM.render(app, document.getElementById("app"));
