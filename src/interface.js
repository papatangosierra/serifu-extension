// interface.js holds all the code that interfaces with the InDesign scripting environment. Any state coming from InDesign comes through here.

import { theDoc } from "./app.jsx";

// top-level state. There might be a better way to do this than global state, but I'm not sure what it is.
export let currentDisplayPage = 1;

let pageCheck = null; // the interval for checkDisplayPage

// List of Paragraph and Character styles

export const paragraphStyles = [
  { name: "Dialogue", id: 1 },
  { name: "Dialogue Large", id: 2 },
  { name: "Dialogue BoldItal", id: 3 },
  { name: "Thought", id: 4 },
  { name: "Playful", id: 5 },
  { name: "Aside", id: 6 },
];

export const characterStyles = [
  { name: "Italic", id: 1 },
  { name: "Bold", id: 2 },
  { name: "BoldItal", id: 3 },
];

export const currentPage = 1;

// instantiate our interface to the host script
export const csInterface = new CSInterface();

// helper function to return a promise object from a CSInterface call

function runEvalScript(script) {
  console.log(`helper function runEvalScript called with: ${script}`);
  return new Promise((resolve, reject) => {
    csInterface.evalScript(script, resolve);
  });
}

export function testLink() {
  csInterface.evalScript('alert("testing panel link")');
}

/* checkDisplayPage is called every second or so. It looks to see whether the currently displayed script page
still matches the currently active InDesign page. It checks the page number that INDD reports against
the SerifuDoc.pageMap mapping to find the script data for the page irrespective of spreads. If the displayed
script page needs to change, checkDisplayPage dispatches an onNewDisplayPage event containing the data for the
new current page. If autoplace is active, the queue is also refreshed with the new data.
*/
function checkDisplayPage() {
  csInterface.evalScript("getCurrentState();", (response) => {
    let curState = JSON.parse(response);
    // If our panel's record of the current page doesn't match the map value of what INDD says we're on,
    // we need to fire the onNewDisplayPage event with appropriate data.
    if (currentDisplayPage != theDoc.pageMap.get(curState.page)) {
      let e = new CustomEvent("onNewDisplayPage", {
        detail: theDoc.pageMap.get(curState.page),
      });
      document.dispatchEvent(e); // dispatch onNewDisplayPage event
      currentDisplayPage = theDoc.pageMap.get(curState.page); // update state of currentDisplayPage
    }
  });
}

export function placeLineInINDDTextFrame(nextLine) {
  console.log(`attempting to place: ${JSON.stringify(nextLine)}`);
  csInterface.evalScript(`placeNextLine(${JSON.stringify(nextLine)})`);
}

export function clearINDDSelection() {
  csInterface.evalScript("clearSelectionAndActivateSelectionTool();");
}

export function registerPageCheck() {
  pageCheck = setInterval(checkDisplayPage, 500);
}

// call to stop the page check from occurring
export function unRegisterPageCheck() {
  clearInterval(pageCheck);
}
