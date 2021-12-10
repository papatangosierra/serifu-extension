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
} from "../interface.js";

function Line(props) {
  const content = props.content;
  const [lineIsNext, setLineIsNext] = useState(props.next);

  // add an event listener for when this Line is next in the place queue
  useEffect(() => {
    // this is really inefficient because I'm setting as many eventListeners as there are
    // dialogue lines on the current page, each of which compares itself to the detail of the event every
    // time the event fires.
    function compareAndUpdate(e) {
      // consider using deepequal or something here eventually
      if (JSON.stringify(e.detail.content) === JSON.stringify(props.content)) {
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
  return <div className="panel">{panelContent}</div>;
}

function Page(props) {
  const data = props.data;
  const panels = data.map((el, i) => <Panel key={i.toString()} data={el} />);
  return (
    <div className="section">
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
  const [lineQueue, _setLineQueue] = useState(theDoc.linesForPage(0)); // _setLineQueue because we're defining setLineQueue in a few lines
  const [pageData, setPageData] = useState(theDoc.pageData[0]);
  const [autoplaceActive, setAutoplaceActive] = useState(false);

  const lineQueueRef = useRef(lineQueue); // this ref's .current will hold state that we can mutate and dispatch

  function setLineQueue(data) {
    lineQueueRef.current = data;
    _setLineQueue(data);
  }

  // ********************************************************************
  // GOOD MORNING PAUL: Today you're starting by rewriting ScriptPanel and AutoplaceToggle such that the
  // autoplace activation state lives natively inside ScriptPanel, and is passed down to AutoplaceToggle
  // in a prop.
  // ********************************************************************
  function updateWithNewPage(e) {
    setLineQueue(theDoc.linesForPage(e.detail));
    setPageData(theDoc.pageData[e.detail]);
  }
  // send the next line and update queue state only if autoplace is currently active
  function dispatchNextLine() {
    if (autoplaceActive) {
      console.log(
        "setting Next Line: " + JSON.stringify(lineQueueRef.current[0])
      );
      placeLineInINDDTextFrame(lineQueueRef.current[0]);
      setLineQueue(lineQueue.slice(1));
    }
  }

  function togglePlaceQueue() {
    console.log(
      `caught autoplace toggle event. autoPlace was: ${autoplaceActive}`
    );
    setAutoplaceActive(!autoplaceActive);
  }

  useEffect(() => {
    // set global next queued line to first element of our current queue.
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
