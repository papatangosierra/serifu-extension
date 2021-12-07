import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { testData } from "./test-data.js";
import { theDoc } from "../app.jsx";

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
  console.log("Panel running");
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
  const [autoplaceActive, setAutoplaceActive] = useState(false);

  return (
    <div className="section">
      <button
        className={
          autoplaceActive ? "autoplace-toggle-on" : "autoplace-toggle-off"
        }
        id="autoplace-toggle-button"
        onClick={() => setAutoplaceActive(!autoplaceActive)}
      >
        {autoplaceActive ? "Deactivate Autoplace" : "Activate autoplace"}
      </button>
    </div>
  );
}

/* The ScriptPanel component contains the state for the currently displayed page of the script.
It sets up an event listener for the "newScriptPage" event, which will contain the data for a new script page to be rendered and displayed.
*/
export function ScriptPanel() {
  // const [pageData, setPageData] = useState(testData[0]);
  const [pageData, setPageData] = useState(theDoc.pageData[2]);

  // wrapper function to give event listener to call on update
  function updateWithNewPage(newPageData) {
    useState(newPageData);
  }

  useEffect(() => {
    document.addEventListener("newScriptPage", updateWithNewPage);
    return () => {
      // cleanup function; React calls this when the component unmounts
      document.removeEventListener("newScriptPage", updateWithNewPage);
    };
  });

  return (
    <div>
      <AutoplaceToggle />
      <Page data={pageData} />
    </div>
  );
}
