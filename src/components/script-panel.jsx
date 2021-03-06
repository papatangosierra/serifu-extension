import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import {
  csInterface,
  currentDisplayPage,
  registerPageCheck,
  unRegisterPageCheck,
  registerSelectionCheck,
  unRegisterSelectionCheck,
  placeLineInINDDTextFrame,
  clearINDDSelection,
  activateINDDSelectionTool,
  selectionIsNotEmpty,
  stageAllTextForPage,
  stageAllTextForDocument,
  createSfxLine,
  activateSerifuPanel,
} from "../interface.js";
import { prefs } from "./setup-panel.jsx";

function Line(props) {
  // we're using the ref hook so highlit lines can scroll themselves into view
  const lineRef = useRef(null);

  function fireLineClickedEvent() {
    console.log(`line clicked: ${props.id}`)
    const e = new CustomEvent("jumpToNewLine", {
      detail: {
        id: props.id,
      },
    });
    document.dispatchEvent(e);
  }

  // if we're the next line, scroll into view
  useEffect(() => {
    if (props.lineIsNext && lineRef.current) {
      lineRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [props.lineIsNext]); // putting lineIsNext here makes sure we'll run this effect any time it changes.

  // build our dialogue line from the content prop
  const lineContent = props.content.map((el, i) => {
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
    <div className={props.lineIsNext ? "line-next" : "line"} ref={lineRef} onClick={fireLineClickedEvent}>
      <div className="line-source">{props.source}</div>
      {props.style ? <div className="line-style">{props.style}</div> : null}
      <div className="line-content">{lineContent}</div>
    </div>
  );
}

function Sfx(props) {
  function placeSfxLine() {
    switch (prefs.sfxContent) {
      case "text-only":
        createSfxLine(props.text);
        break;
      case "tl-only":
        createSfxLine(props.tl);
        break;
      case "tl-text":
        createSfxLine(`${props.tl}\\n(${props.text})`);
        break;
    }
  }
  return (
    <div className="sfx" onClick={placeSfxLine}>
      {props.text}
    </div>
  );
}

function Note(props) {
  return <div className="note">{props.text}</div>;
}

function Panel(props) {
  const data = props.data;
  const panelContent = data.map((el, i) => {
    if (el.type === "Text") {
      console.log(
        `panel nextLineID prop: ${JSON.stringify(props.nextLineID, 0, 4)}`
      );
      return (
        <Line
          key={"text-" + i.toString()}
          source={el.source}
          style={el.style}
          content={el.content}
          id={el.id}
          lineIsNext={el.id === props.nextLineID ? true : false}
        />
      );
    }
    if (el.type === "Sfx") {
      return (
        <Sfx key={"sfx-" + i.toString()} text={el.text} tl={el.translationOf} />
      );
    }
    if (el.type === "Note") {
      return <Note key={"note-" + i.toString()} text={el.text} />;
    }
  });
  return <div className="panel">{panelContent}</div>;
}

function Page(props) {
  const panels = props.data.map((el, i) => (
    <Panel
      key={i.toString()}
      data={el}
      lineQueue={props.lineQueue}
      nextLineID={props.nextLineID}
    />
  ));

  function stagePageText() {
    stageAllTextForPage(props.data);
  }

  function stageAllText() {
    stageAllTextForDocument();
  }

  return (
    <div className="section">
      <div id="staging-buttons">
        <button onClick={stagePageText} className={"stage-button"}>
          Stage Page Text
        </button>
        <button onClick={stageAllText} className={"stage-button"}>
          Stage All Text
        </button>
      </div>
      <div className="page">{panels}</div>
    </div>
  );
}

/* The ScriptPanel component contains the state for the currently displayed page of the script.
It sets up an event listener for the "newScriptPage" event, which will contain the data for a new script page to be rendered and displayed.
*/

export function ScriptPanel(props) {
  const [lineQueue, setLineQueue] = useState(props.theDoc.linesForPage(0));
  const [curLine, setCurLine] = useState(0);
  const [pageData, setPageData] = useState(props.theDoc.pageData[0]);
  const [autoplaceActive, setAutoplaceActive] = useState(false);

  function updateWithNewPage(e) {
    console.log(`looking for page index: ${e.detail}`);
    setLineQueue(props.theDoc.linesForPage(e.detail));
    setPageData(props.theDoc.pageData[e.detail]);
    setCurLine(0);
    // on a new display page, reset the place queue to the first line of the new page
    if (autoplaceActive) {
      const q = new CustomEvent("placeQueueUpdate", {
        detail: {
          pageRefresh: true,
        },
      });
      document.dispatchEvent(q);
    }
  }

  // dispatchNextLine gets called under two circumstances, and its behavior in each
  // case must differ.
  // if it's being called as an INDD-originating afterSelectionChanged event listener, we want to
  // place the text into the newly-selected text box and advance the state of both the place queue
  // and the React props that indicate the currently highlit line.
  // if it's being called from updateWithNewPage, we need to refresh the place queue to start at the first
  // element of the lines for the new page, and refresh the React props for highlighting
  // It's asynchronous in order to avoid a race condition with INDD's firing of
  // afterSelectionChanged events
  const dispatchNextLine = async function (incoming_e) {
    let goodSelectionStatusPending = selectionIsNotEmpty();
    let goodSelectionStatus = await goodSelectionStatusPending;
    // console.log(`BUDDY, we have selected something: ${goodSelectionStatus}`)
    // If we're updating curLine because a line was clicked
    if (autoplaceActive && goodSelectionStatus) {
      if (incoming_e.appId === "IDSN") {
        console.log("setting next line: " + JSON.stringify(lineQueue[curLine]));
        // actually place text in line
        placeLineInINDDTextFrame(lineQueue[curLine]);
        // bring Serifu panel back to focus (there is currently no programmatic way to do this)
        // activateSerifuPanel();
        if (curLine >= lineQueue.length) {
          setCurLine(0);
        } else {
          // otherwise increment to the next one
          setCurLine(curLine + 1);
        }
      }
      if (incoming_e.pageRefresh) {
        setCurLine(0);
      }
    }
  }

  // advanceToNextLine is called when the space bar is pressed. It skips to the next item
  // in the line queue, unless we're at the end, in which case it wraps around to the beginning
  function advanceToNextLine() {
    if (curLine === lineQueue.length - 1) {
      setCurLine(0);
    } else {
      setCurLine(curLine + 1);
    }
  }

  // reverseToPreviousLine is called when shift+space is pressed. It returns to the previous item in
  // the line queue, unless we're at the beginning, in which case it wraps around to the end.
  function reverseToPreviousLine() {
    if (curLine === 0) {
      setCurLine(lineQueue.length - 1);
    } else {
      setCurLine(curLine - 1);
    }
  }

  // goToArbiraryLine is called when autoplace is active and a line is clicked on. It sets curLine
  // to the appropriate value such that the clicked-on line will be selected as next in the queue.
  function setCurLineToLineWithId(e) {
    console.log(`setCurLineToLineWithId: attempting to go to ${e.detail.id}`)
    for (let i = 0; i < lineQueue.length; i++) {
      if (lineQueue[i].id === e.detail.id) {
        setCurLine(i)
      }
    }
  }

  // handleKeyEvents is called by the event listener set for the keydown event. It checks which keys
  // were pressed and calls the appropriate function
  function handleKeyEvents(e) {
    if (autoplaceActive && e.code === "Space" && !e.shiftKey) {
      // space with no shift
      e.preventDefault();
      advanceToNextLine();
    }
    if (autoplaceActive && e.code === "Space" && e.shiftKey) {
      // shift+space
      e.preventDefault();
      reverseToPreviousLine();
    }
  }

  function togglePlaceQueue() {
    clearINDDSelection();
    activateINDDSelectionTool();
    // if autoplace isn't active, that means it's about to become active (at the end of this function),
    // so we should clear the current INDD selection, pick the selection tool, and set the
    // afterSelectionChanged event listener
    if (!autoplaceActive) {
      // clear INDD selection and pick selection tool
      // clearINDDSelection();
      // activateINDDSelectionTool();
      setAutoplaceActive(true);
    } else {
      setAutoplaceActive(false);
    }
  }

  useEffect(() => {
    // updateWithNewPage is only called upon firing of the onNewDisplayPage event,
    // which will contain in its detail property the data for the new page.
    document.addEventListener("onNewDisplayPage", updateWithNewPage);
    registerPageCheck();
    // add listener for autoplaceStateChange, which will activate the autoplace queue when
    // the new state is true.
    document.addEventListener("placeQueueUpdate", dispatchNextLine);
    // add listener for keypress events
    document.addEventListener("keydown", handleKeyEvents);
    // add listener for jumpToNewLine events
    document.addEventListener("jumpToNewLine", setCurLineToLineWithId);


    registerSelectionCheck(dispatchNextLine);

    return () => {
      // cleanup function; React calls this when the component unmounts
      document.removeEventListener("onNewDisplayPage", updateWithNewPage);
      document.removeEventListener("placeQueueUpdate", dispatchNextLine);
      document.removeEventListener("keydown", handleKeyEvents);
      document.removeEventListener("jumpToNewLine", setCurLineToLineWithId);

      unRegisterSelectionCheck(dispatchNextLine);
      unRegisterPageCheck();
    };
  });
  if (pageData) {
    return (
      <div>
        <button
          className={
            autoplaceActive ? "autoplace-toggle-on" : "autoplace-toggle-off"
          }
          id="autoplace-toggle-button"
          onClick={togglePlaceQueue}
        >
          {autoplaceActive ? "Deactivate Autoplace" : "Activate autoplace"}
        </button>
        {/* <AutoplaceToggle autoplaceActive={autoplaceActive} /> */}
        <Page
          data={pageData}
          lineQueue={lineQueue}
          nextLineID={
            autoplaceActive && lineQueue[curLine] ? lineQueue[curLine].id : null
          }
        />
      </div>
    );
  } else {
    return (
      <div>
        <div className="no-data">No script data loaded.</div>
        <button onClick={loadScriptData}>Load Serifu Script File</button>
      </div>
    );
  }
}
