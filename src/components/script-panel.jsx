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
  createTextBox
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
      // console.log(`event line id: ${e.detail.id}`);
      // console.log(`component props id: ${props.id}`)
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
          next={false}
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
  const [lineQueue, _setLineQueue] = useState(theDoc.pageData[0].firstText); // _setLineQueue because we're defining setLineQueue in a few lines
  const [pageData, setPageData] = useState(theDoc.pageData[0]);
  const [autoplaceActive, setAutoplaceActive] = useState(false);

  const lineQueueRef = useRef(lineQueue); // this ref's .current will hold state that we can mutate and dispatch

  function setLineQueue(data) {
    lineQueueRef.current = data;
    _setLineQueue(data);
  }

  function updateWithNewPage(e) {
    console.log(`looking for page index: ${e.detail}`);
    setLineQueue(theDoc.pageData[e.detail].firstText);
    setPageData(theDoc.pageData[e.detail]);
  }
  // send the next line and update queue state only if autoplace is currently active
  function dispatchNextLine() {
    if (autoplaceActive) {
      console.log(
        "setting Next Line: " + JSON.stringify(lineQueueRef.current.id)
      );
      // fire placeQueueUpdate to notify display to highlight next line.
      const e = new CustomEvent("placeQueueUpdate", {
        detail: lineQueueRef.current.next, // send NEXT line in queue, not this one
      });
      console.log(`firing placeQueueUpdate event with ${lineQueueRef.current.next.id}`)

      document.dispatchEvent(e);
      console.log(`trying to place lineQueueRef.current: ${lineQueueRef.current.id}`)
      placeLineInINDDTextFrame(lineQueueRef.current);
      setLineQueue(lineQueue.next);
    }
  }

  // createNextLine will create a new text frame with the contents of the next enqueued line
  // advancing the queue, regardless of whether auto-place is on or off
  function createNextLine(e) {
    console.log(
      "attempting to create new line" + JSON.stringify(lineQueueRef.current.content[0].text)
    );
    createTextBox(lineQueueRef.current);
    setLineQueue(lineQueue.current.next);
    console.log(`keycode: ${e.code}`)
  }

  function togglePlaceQueue() {
    console.log(
      `caught autoplace toggle event. autoPlace was: ${autoplaceActive}`
    );
    // if autoplace isn't active, that means it's about to become active, so we should clear the
    // current INDD selection and pick the selection tool
    if (!autoplaceActive) {
      clearINDDSelection();
      // also, fire placeQueueUpdate to start line highlighting
      const e = new CustomEvent("placeQueueUpdate", {
        detail: lineQueueRef.current // send first line in queue
      });
      console.log(`firing placeQueueUpdate event with ${lineQueueRef.current.id}`)
      document.dispatchEvent(e);
    } 
    // else {
    //   const e = new CustomEvent("placeQueueUpdate", {
    //     detail: { foo: "bar" }, // send nonce to all matches fail and nothing is marked as next
    //   });
    //   document.dispatchEvent(e);
    // }
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
    // add listener for keyboard shortcut event that creates text box with next line in queue
    document.addEventListener('keydown', createNextLine);
    
        return () => {
      // cleanup function; React calls this when the component unmounts
      document.removeEventListener("onNewDisplayPage", updateWithNewPage);
      document.removeEventListener("autoplaceToggleFired", togglePlaceQueue);
      document.removeEventListener('keydown', createNextLine);
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
