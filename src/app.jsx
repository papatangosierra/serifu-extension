import React from "react";
import ReactDOM from "react-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { ScriptPanel } from "./components/script-panel.jsx";
import {
  StyleToGrafStyle,
  SourceToGrafStyle,
} from "./components/setup-panel.jsx";
import { SerifuDoc } from "./doc.js";
import { serifuText } from "./components/test-data.js";
import { paragraphStyles, currentPage } from "./interface.js";

export const theDoc = new SerifuDoc(serifuText);

function QueueTestButton() {
  let textLines = [];
  theDoc.pageData[2].forEach((el) => {
    console.log("got text Panel");
    el.forEach((em) => {
      if (em.type === "Text") {
        textLines.push(em);
        console.log("got textLine");
      }
    });
  });

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
      </TabPanel>
      <TabPanel>
        <StyleToGrafStyle />
        <SourceToGrafStyle />
      </TabPanel>
    </Tabs>
  );
}

const app = <App />;
ReactDOM.render(app, document.getElementById("app"));
