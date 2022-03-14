import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { testData } from "./test-data.js";
import { theDoc } from "../app.jsx";
import {
  csInterface,
  currentDisplayPage,
  registerPageCheck,
  unRegisterPageCheck,
  placeLineInINDDTextFrame,
  clearINDDSelection,
  placeAllTextForPage,
  stageAllTextForDocument
} from "../interface.js";

function Line(props) {
  const content = props.content;
  const [lineIsNext, setLineIsNext] = useState(props.next);

  // add an event listener for when this Line is next in the place queue
  useEffect(() => {
    /* This is less inefficient than it used to be, and a bug has been squashed.  
    There's still an event listener on every Line, which feels inefficient. However,
    that event listener isn't doing a comparison of the JSON-stringified content
    of the line anymore—since each line has a globally unique id number assigned
    at parse time, we can just listen for that id number. If a given line hears
    its ID number announced as the next one to be placed, it highlights itself.
    */
    function compareAndUpdate(e) {
      // consider using deepequal or something here eventually
      console.log(`event line id: ${e.detail.id}`);
      console.log(`component props id: ${props.id}`)
      if (e.detail.id === props.id) {
        setLineIsNext(true);
      } else {
        setLineIsNext(false);
      }
    }
    document.addEventListener("placeQueueUpdate", compareAndUpdate);
    return () => {
      // cleanup function; React calls this when the component unmounts
      document.removeEventListener("placeQueueUpdate", compareAndUpdate);
    };
  });

  // build our dialogue line from the content prop
  const lineContent = content.map((el, i) => {
    if (el.emphasis === "none") {
      return <span key={i.toString()}>{el.text}</span>;
    }
    if (el.emphasis === "Ital") {
      return (
        <span key={i.toString()}>
          <em>{el.text}</em>
        </span>
      );
    }
    if (el.emphasis === "Bold") {
      return (
        <span key={i.toString()}>
          <strong key={i.toString()}>{el.text}</strong>
        </span>
      );
    }
    if (el.emphasis === "BoldItal") {
      return (
        <span key={i.toString()}>
          <em key={i.toString()}>
            <strong>{el.text}</strong>
          </em>
        </span>
      );
    }
  });

  return (
    <div className={lineIsNext ? "line-next" : "line"}>
      <div className="line-source">{props.source}</div>
      {props.style ? <div className="line-style">{props.style}</div> : null}
      <div className="line-content">{lineContent}</div>
    </div>
  );
}

function Sfx(props) {
  return <div className="sfx">{props.text}</div>;
}

function Note(props) {
  return <div className="note">{props.text}</div>;
}

function Panel(props) {
  const data = props.data;
  const panelContent = data.map((el, i) => {
    if (el.type === "Text") {
      return (
        <Line
          key={"text-" + i.toString()}
          source={el.source}
          style={el.style}
          content={el.content}
          id={el.id}
          next={el.next}
        />
      );
    }
    if (el.type === "Sfx") {
      return <Sfx key={"sfx-" + i.toString()} text={el.text} />;
    }
    if (el.type === "Note") {
      return <Note key={"note-" + i.toString()} text={el.text} />;
    }
  });
  return (
    <div className="panel">
      <button>Place</button>
      {panelContent}
    </div>
    );
}

function Page(props) {
  const data = props.data;
  const panels = data.map((el, i) => <Panel key={i.toString()} data={el} />);

  function stagePageText() {
    placeAllTextForPage(data);
  }

  function stageAllText() {
    stageAllTextForDocument();
  }

  return (
    <div className="section">
      <button onClick={stagePageText}>Stage Page Text</button>
      <button onClick={stageAllText}>Stage All Text</button>

      <div className="page">{panels}</div>
    </div>
  );
}

function AutoplaceToggle(props) {
  function toggle() {
    // clear the INDD selection and select the select tool
    // fire an autoplaceStateChange event indicating that the autoplace was toggled.
    const e = new CustomEvent("autoplaceToggleFired");
    document.dispatchEvent(e); // dispatch onNewDisplayPage event
  }

  return (
    <div className="section">
      <button
        className={
          props.autoplaceActive ? "autoplace-toggle-on" : "autoplace-toggle-off"
        }
        id="autoplace-toggle-button"
        onClick={toggle}
      >
        {props.autoplaceActive ? "Deactivate Autoplace" : "Activate autoplace"}
      </button>
    </div>
  );
}

/* The ScriptPanel component contains the state for the currently displayed page of the script.
It sets up an event listener for the "newScriptPage" event, which will contain the data for a new script page to be rendered and displayed.
*/

export function ScriptPanel() {
  const [lineQueue, setLineQueue] = useState(theDoc.linesForPage(0));
  const [curLine, setCurLine] = useState(0);
  const [pageData, setPageData] = useState(theDoc.pageData[0]);
  const [autoplaceActive, setAutoplaceActive] = useState(false);

  function updateWithNewPage(e) {
    console.log(`looking for page index: ${e.detail}`);
    setLineQueue(theDoc.linesForPage(e.detail));
    setPageData(theDoc.pageData[e.detail]);
    setCurLine(0)
  }
  // send the next line and update queue state only if autoplace is currently active
  function dispatchNextLine() {
    if (autoplaceActive) {
      console.log(
        "setting Next Line: " + JSON.stringify(lineQueue[curLine])
      );
      // fire placeQueueUpdate to notify display to highlight next line.
      const e = new CustomEvent("placeQueueUpdate", {
        detail: lineQueue[curLine + 1], // send NEXT line in queue, not this one
      });
      console.log(`firing placeQueueUpdate event with ${JSON.stringify(lineQueue[curLine + 1])}`)

      document.dispatchEvent(e);

      placeLineInINDDTextFrame(lineQueue[curLine]);
      // if we've reached the end of our list of text lines to be placed,
      // reset to the first one
      if (curLine >= lineQueue.length) {
        setCurLine(0)
      } else { // otherwise increment to the next one
        setCurLine(curLine + 1)
      }
    }
  }

  function togglePlaceQueue() {
    console.log(
      `caught autoplace toggle event. autoPlace was: ${autoplaceActive}`
    );
    // if autoplace isn't active, that means it's about to become active, so we should clear the
    // current INDD selection and pick the selection tool
    if (!autoplaceActive) {
      // fire placeQueueUpdate to start line highlighting
      const e = new CustomEvent("placeQueueUpdate", {
        detail: lineQueue[curLine], // send first line in queue
      });
      document.dispatchEvent(e);
      // clear INDD selection 
      clearINDDSelection();
    } else {
      const e = new CustomEvent("placeQueueUpdate", {
        detail: { id: null }, // send nonce so all matches fail and nothing is marked as next
      });
      document.dispatchEvent(e);
    }
    setAutoplaceActive(!autoplaceActive);
  }

  useEffect(() => {
    // updateWithNewPage is only called upon firing of the onNewDisplayPage event,
    // which will contain in its detail property the data for the new page.
    document.addEventListener("onNewDisplayPage", updateWithNewPage);
    registerPageCheck();
    // add listener for autoplaceStateChange, which will activate the autoplace queue when
    // the new state is true.
    document.addEventListener("autoplaceToggleFired", togglePlaceQueue);
    csInterface.addEventListener("afterSelectionChanged", dispatchNextLine);

    return () => {
      // cleanup function; React calls this when the component unmounts
      document.removeEventListener("onNewDisplayPage", updateWithNewPage);
      document.removeEventListener("autoplaceToggleFired", togglePlaceQueue);
      csInterface.removeEventListener(
        "afterSelectionChanged",
        dispatchNextLine
      );
      unRegisterPageCheck();
    };
  });
  if (pageData) {
    return (
      <div>
        <AutoplaceToggle autoplaceActive={autoplaceActive} />
        <Page data={pageData} />
      </div>
    );
  } else {
    return (
      <div>
        <AutoplaceToggle />
        <div className="no-data">No script data for this page found.</div>
      </div>
    );
  }
}
