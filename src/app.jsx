import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { ScriptPanel } from "./components/script-panel.jsx";
import { StyleMenuPanel } from "./components/setup-panel.jsx";
import { SerifuDoc } from "./doc.js";
import { serifuText } from "./components/test-data.js";
import { paragraphStyles, currentPage, testLink } from "./interface.js";

export const theDoc = new SerifuDoc(serifuText);

function QueueTestButton() {
  return (
    <button
      onClick={() => {
        console.log(
          `firing place queue update: ${JSON.stringify(textLines[0])}`
        );
        const e = new CustomEvent("placeQueueUpdate", {
          detail: textLines.shift(),
        });
        document.dispatchEvent(e);
      }}
    >
      Test Queue Advance
    </button>
  );
}

function LinkTestButton() {
  return <button onClick={testLink}>Test INDD Link</button>;
}

function App() {
  return (
    <Tabs>
      <TabList>
        <Tab>Script</Tab>
        <Tab>Setup</Tab>
      </TabList>
      <TabPanel>
        <ScriptPanel />
        <QueueTestButton />
        <LinkTestButton />
      </TabPanel>
      <TabPanel>
        <StyleMenuPanel />
      </TabPanel>
    </Tabs>
  );
}

const app = <App />;
ReactDOM.render(app, document.getElementById("app"));
