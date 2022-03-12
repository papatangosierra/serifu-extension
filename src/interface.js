// interface.js holds all the code that interfaces with the InDesign scripting environment. Any state coming from InDesign comes through here.

import { theDoc } from "./app.jsx";

// top-level state. There might be a better way to do this than global state, but I'm not sure what it is.
export let currentDisplayPage = 1;

let pageCheck = null; // the interval for checkDisplayPage
let styleCheck = null; // the interval for checking for new styles
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

// object describing our keyboard shortcuts

let keyboardEvents = [{
  "keyCode": 80,
},{
  "keyCode": 35
}]

// register our interest in keyboard events for our shortcuts.
console.log(`registering interest in key events: ${JSON.stringify(keyboardEvents)}`)
csInterface.registerKeyEventsInterest(JSON.stringify(keyboardEvents))

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

/* checkDisplayPage is called every second or so. It looks to see whether the 
currently displayed script page still matches the currently active InDesign 
page. It checks the page number that INDD reports against the SerifuDoc.pageMap 
mapping to find the script data for the currently displayed page irrespective 
of spreads. If the displayedscript page needs to change, checkDisplayPage 
dispatches an onNewDisplayPage event containing the data for the new current 
page. If autoplace is active, the queue is also refreshed with the new data. */
function checkDisplayPage() {
  csInterface.evalScript("getCurrentState();", (response) => {
    let curState = JSON.parse(response);
    // If our panel's record of the current page doesn't match the map value of what INDD says we're on,
    // we need to fire the onNewDisplayPage event with appropriate data.
    if (currentDisplayPage != theDoc.pageMap.get(curState.page)) {
      let e = new CustomEvent("onNewDisplayPage", {
        // use the pageMap lookup table to find the correct index in the page array
        // to reference for this INDD display page
        detail: theDoc.pageMap.get(curState.page),
      });
      document.dispatchEvent(e); // dispatch onNewDisplayPage event
      currentDisplayPage = theDoc.pageMap.get(curState.page); // update state of currentDisplayPage
    }
  });
}

export function placeLineInINDDTextFrame(nextLine) {
  nextLine.next = null;
  nextLine.previous = null; // clear circular structures
  console.log(`attempting to place: ${JSON.stringify(nextLine)}`);
  csInterface.evalScript(`placeNextLine(${nextLine})`);
}

export function createTextBox(nextLine) {
  const geometricBounds = [0,0,10,10]
  console.log(`attempting to create text box for: ${JSON.stringify(nextLine)}`);
  csInterface.evalScript(`createTextAtBounds(${JSON.stringify(nextLine)},${JSON.stringify(geometricBounds)})`);
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

// Style setting functions

export function getINDDGrafStyles() {
  // console.log("asking for paragraph styles");
  csInterface.evalScript("getDocParagraphStyles();", (response) => {
    const grafStyles = JSON.parse(response);
    // console.log("got styles: " + JSON.stringify(grafStyles));
    const e = new CustomEvent("grafStylesFetched", { detail: grafStyles });
    document.dispatchEvent(e);
  });
}

export function registerStyleCheck() {
  styleCheck = setInterval(getINDDGrafStyles, 2000);
}

export function unRegisterStyleCheck() {
  clearInterval(styleCheck);
}

// linkScriptNameToParagraphStyle calls the similarly-named function in the host jsx script with the given arguments, linking a style in the script to a Paragraph Style in the INDD doc
export function linkScriptNameToGrafStyle(linkType, name, id) {
  let params = '"' + linkType + '","' + name + '",' + id;
  // console.log(`linking ${linkType} ${name} to paragraph style id ` + id);
  csInterface.evalScript("linkScriptNameToParagraphStyle(" + params + ")");
}
