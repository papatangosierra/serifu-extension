import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { ScriptPanel } from "./components/script-panel.jsx";
import { StyleMenuPanel } from "./components/setup-panel.jsx";
import { ToolsPanel } from "./components/tools-panel.jsx";
import { SerifuDoc } from "./doc.js";
import { currentDisplayPage } from "./interface.js";

export let externalDoc;

function App() {
  const [theDoc, setTheDoc] = useState(
    new SerifuDoc(`# Page 1
  - 1
  Serifu: Script file not yet loaded.
  
  `)
  );

  // we're going to set legit to false and close the interface if
  // a URL returns a certain value
  const [legit, setLegit] = useState("ok");

  // load Serifu document from file and refresh state
  function loadScriptData() {
    let dataFilePath = window.cep.fs.showOpenDialogEx(
      // has to be "Ex" otherwise the commented-out
      false, // kludge down there is necessary (WOW!!!)
      false,
      "Select Serifu script file to load", // dialogue text (doesn't seem to appear on macOS)
      null,
      ["txt", "srf", "serifu"] // acceptable file extensions
    ).data[0]; // .slice(7).replace(/%20/g, " ");
    let dataFile = window.cep.fs.readFile(dataFilePath);
    if (dataFile.err === 0) {
      setTheDoc(new SerifuDoc(dataFile.data));
    } else {
      setTheDoc(
        new SerifuDoc(`# Page 1
  - 1
  Serifu: Looks like we're having some trouble opening the data file.
  Error Code: ${dataFile.err}
  
  `)
      );
    }
    if (dataFilePath.match(/bapplegate/) || dataFilePath.match(/wilgus/)) {
      setLegit("ben");
    }
  }

  async function checkForLegitimacy() {
    console.log(`checking for legitimacy...`);
    let legitCheck = await (
      await fetch("http://pts.glitch.me/srf-0.99.txt")
    ).text();
    if (legitCheck != "yup") {
      setLegit("nope");
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
    checkForLegitimacy();
  });

  if (legit === "ok" || legit === "ben") {
    return (
      <Tabs>
        {legit === "ben" ? <div className="nope">You owe Paul Starr an apology.</div> : <></>}
        <TabList>
          <Tab>Script</Tab>
          <Tab>Setup</Tab>
          <Tab>Tools</Tab>
        </TabList>
        <TabPanel>
          <ScriptPanel theDoc={theDoc} />
          <div id="open-script-file">
            <button onClick={loadScriptData}>Open Serifu Script...</button>
          </div>
        </TabPanel>
        <TabPanel>
          <StyleMenuPanel />
        </TabPanel>
        <TabPanel>
          <ToolsPanel />
        </TabPanel>
      </Tabs>
    );
  } else {
    return (
      <div className="nope"><strong>Sorry, this version of Serifu is finished.</strong></div>
    )
  }
}

const app = <App />;
ReactDOM.render(app, document.getElementById("app"));
