#targetengine "com.serifu.panel_Engine_Id";
// Serifu InDesign Extention
// Initial Code: Paul Starr, May 13, 2020
// Updated December 2021

// THIS GIVE US JSON, WHICH WE DEFINITELY NEED.
#include "json2.js";

var theDoc = app.activeDocument
var thePages = app.activeDocument.pages
var theLayers = app.activeDocument.layers
var theMaster = app.activeDocument.masterSpreads.itemByName('A-Master')
var theTool = app.toolBoxTools;

// #include "KTUlib.jsx";

// alert("hello")

// global variable to hold currently queued lines for placing
// global lists to hold script style associations
var styleKeys = {};
var sourceKeys = {};

// basic dimensions and position of auto-placed text box;
// we'll offset this by various values to derive the final placement
// var defaultBounds = [0, 36, ];

// placeNextLine places the next line in the selected textbox,
// shifts the line queue, and returns the new state of the queue

function placeNextLine(nextLine) {
  //alert('attempting to place: ' + JSON.stringify(nextLine));
  if (theDoc.selection[0] instanceof TextFrame) //  if the new selection is a textFrame and the only thing selected
  {
    // we're placing text in the parent story of the object because it's considerably more convenient this way.
    // see: https://stackoverflow.com/questions/23985785/indesign-jsx-scripted-add-of-heading-and-content-into-textframe
    var story = theDoc.selection[0].parentStory
    // iterate over the objects in nextLineText and place them in the story, applying character styles as we go
    // the [-1] index returns an insertion point at the end of the story. (wow, convenient for once)
    story.contents = ""; // clear anything that's already there
    for (var i = 0; i < nextLine.content.length; i++) {
      // alert('placing line section ' + i + ' of ' + nextLine.content.length)
      if (nextLine.content[i].emphasis != "none") {
        story.insertionPoints[-1].appliedCharacterStyle = nextLine.content[i].emphasis; // "Bold", "Ital", or "BoldItal"
        story.insertionPoints[-1].contents = nextLine.content[i].text // place text
      } else { // there's no emphasis, so just place text
        story.insertionPoints[-1].appliedCharacterStyle = theDoc.characterStyles[0];
        story.insertionPoints[-1].contents = nextLine.content[i].text
      }
    }
    // apply style -- if there is both an applicable source
    // and style for a given line, the style will take precedence,
    // since it's applied last
    // try to find a source that applies
    if (sourceKeys.hasOwnProperty(nextLine.source)) {
      //alert('we seem to have a source style for this line: ' + JSON.stringify(sourceKeys))
      theDoc.selection[0].paragraphs.everyItem().appliedParagraphStyle = theDoc.paragraphStyles.itemByID(sourceKeys[nextLine.source])
    }
    // then try to find a style that applies
    if (styleKeys.hasOwnProperty(nextLine.style) && nextLine.style != "") {
      //alert('we seem to have a style for this line: ' + JSON.stringify(nextLine.style) + "\n" + "it is: " + styleKeys[nextLine.style])
      theDoc.selection[0].paragraphs.everyItem().appliedParagraphStyle = theDoc.paragraphStyles.itemByID(styleKeys[nextLine.style])
    }
  }
  return "done";
}

// createTextAtBounds takes a serifu textLine and indesign-style geometricBounds as arguments
// and creates a new text frame on the current page at those bounds, with the given text
function createTextAtBounds(textLine, bounds, page) {
  app.scriptPreferences.measurementUnit = MeasurementUnits.PICAS;
  var myFrame = page.textFrames.add({
    // take a bit off the bounds of the placed box to give it breathing room next to the others
    geometricBounds: [bounds[0], bounds[1], bounds[2] - .5, bounds[3] - .5],
    strokeWidth: 0,
  });
  var story = myFrame.parentStory;
  // iterate over the objects in nextLineText and place them in the story, applying character styles as we go
  // the [-1] index returns an insertion point at the end of the story. (wow, convenient for once)
  for (var i = 0; i < textLine.content.length; i++) {
    // alert('placing line section ' + i + ' of ' + nextLine.content.length)
    if (textLine.content[i].emphasis != "none") {
      story.insertionPoints[-1].appliedCharacterStyle = textLine.content[i].emphasis; // "Bold", "Ital", or "BoldItal"
      story.insertionPoints[-1].contents = textLine.content[i].text; // place text
    } else { // there's no emphasis, so just place text
      story.insertionPoints[-1].appliedCharacterStyle = theDoc.characterStyles[0];
      story.insertionPoints[-1].contents = textLine.content[i].text;
    }
  }
  // apply style -- if there is both an applicable source
  // and style for a given line, the style will take precedence, since it's applied last
  // first, try to find a source that applies
  if (sourceKeys.hasOwnProperty(textLine.source)) {
    //alert('we seem to have a source style for this line: ' + JSON.stringify(sourceKeys))
    myFrame.paragraphs.everyItem().appliedParagraphStyle = theDoc.paragraphStyles.itemByID(sourceKeys[textLine.source])
  }
    // then try to find a style that applies
  if (styleKeys.hasOwnProperty(textLine.style) && textLine.style != "") {
    //alert('we seem to have a style for this line: ' + JSON.stringify(nextLine.style) + "\n" + "it is: " + styleKeys[nextLine.style])
    myFrame.paragraphs.everyItem().appliedParagraphStyle = theDoc.paragraphStyles.itemByID(styleKeys[textLine.style])
  }
}

// placeAllTextForPage takes a page's worth of Serifu's AST and
// places the text lines in fairly sane defaults
function placeAllTextForPage(pageData, pageNum) {
  // if we caught a -1 argument, use the current page, otherwise lookup the page
  // specified in the argument.
  var page = pageNum == -1 ? app.activeWindow.activePage : theDoc.pages[pageNum];
  // alert('placing text for page ' + page.name);
  // set the ruler to "Spine Origin" so our placement math works out.
  var oldOrigin = theDoc.viewPreferences.rulerOrigin // save old ruler origin
  theDoc.viewPreferences.rulerOrigin = RulerOrigin.SPINE_ORIGIN

  // SANE DEFAULTS:
  // our text boxes are going to be 1/8th the size of the overall page, unless
  // there are a LOT of panels, in which case they'll be a little shorter;
  // specifically: page height * (1 / number of panels)
  var yScaleFactor = pageData.length > 8 ? pageData.length : 8;
  var xPageSize = theMaster.pages[0].bounds[3] - theMaster.pages[0].bounds[1];
  var yPageSize = theMaster.pages[0].bounds[2] - theMaster.pages[0].bounds[0];
  var yLength = yPageSize / yScaleFactor;
  // On right-side pages our x position grows positively, on left, negatively
  // We use i and j as multiplication factors against our base xLength and yLength
  //  to ensure a unique and hopefully fairly sensible default placement for each line
  for (var i = 0; i < pageData.length; i++) {
    // xScaleFactor and xLength are defined inside the top loop because the horizontal
    // constraint affects how lines are placed, rather than the panel arrays that contain
    // them, and it's most convenient to make that decision on a per-panel basis as we iterate
    // over them.
    var xScaleFactor = pageData[i].length > 8 ? pageData[i].length : 8;
    var xLength = xPageSize / xScaleFactor;
    for (var j = 0; j < pageData[i].length; j++) {
      // if this is a page line
      if (pageData[i][j].type == "Text") {
        // if binding direction is right to left and the current page number is 
        // evenly-numbered, OR if binding direction is left-to right and page number is odd,
        // then we're on a right-side page.
        if (
          (theDoc.documentPreferences.pageBinding == PageBindingOptions.RIGHT_TO_LEFT &&
            parseInt(page.name) % 2 == 0) ||
          (theDoc.documentPreferences.pageBinding == PageBindingOptions.LEFT_TO_RIGHT &&
            parseInt(page.name) % 2 != 0)
        ) {
          createTextAtBounds(pageData[i][j], [
            yLength * i,
            (xLength * j) + xPageSize,
            (yLength * i) + yLength,
            (xLength * j) + (xPageSize + xLength)
          ], page)
        } else {
          createTextAtBounds(pageData[i][j], [
            yLength * i,
            -((xLength * j) + (xPageSize + xLength)),
            (yLength * i) + yLength,
            -((xLength * j) + xPageSize)
          ], page)
        }
      }
    }
  }
  // reset ruler preferences to whatever they were before
  theDoc.viewPreferences.rulerOrigin = oldOrigin;
}


// receive text from panel and turn on Event Listeners 
// The received text is an array of objects structured thus:
// {
//     "type": "Text" or "Sfx",
//     "source": string containing source string: character, caption, etc,
//     "style": string containing translator-defined line style,
//     "content": string containing an array of objects representing the line's content.
// }
/* The content array is composed of objects structured thus:
 {
    emphasis: "none" or "Ital" or "Bold" or "BoldItal",
    text: "A string with the given emphasis",
}
*/

// clearSelection deselects everything. We use this function before setting the OnSelectionChanged
// event listener, because we want to make sure the next selection change will reliably indicate
// a directive from the use to place text in the selected textFrame
function clearSelection() {
  theDoc.selection = null;
}

// activateSelectionTool activates the basic selection tool, which is what the user will use to 
// indicate the textframe in which to place the next enqueued piece of text. 
function activateSelectionTool() {
  // alert('line queue activated with: ' + JSON.stringify(newNextLine.content))
  theTool.currentTool = UITools.SELECTION_TOOL; // set current tool to basic selection tool
}

function selectionIsNotEmpty() {
  return theDoc.selection.length > 0 ? true : false;
}


// Return current document page
// (We poll the page every second or so and update the panel view accordingly)

function getCurrentState() {
  var curState = {}
  curState.page = app.activeWindow.activePage.documentOffset
  return JSON.stringify(curState);
}

// getDocParagraphStyles returns a JSON'd object containing all of the paragraph styles 
// currently defined in the document. The client script calls this function in order to build its
// style-paragraph style association interface.

function getDocParagraphStyles() {
  var stylesObj = [];
  var l = theDoc.paragraphStyles.length
  for (var i = 0; i < l; i++) {
    stylesObj.push({
      "name": theDoc.paragraphStyles[i].name,
      "id": theDoc.paragraphStyles[i].id
    })
  }
  return JSON.stringify(stylesObj)
}

// linkScriptToParagraphStyle takes three arguments:
// a linkType, which is either "source" or "style"
// a name, which is the name of the source or style as specified in the script data
// a paragraphStyle name to associate with that name
function linkScriptNameToParagraphStyle(linkType, name, id) {
  // alert("current sourceKeys: " + JSON.stringify(sourceKeys));
  if (linkType === "source") {
    sourceKeys[name] = id;
  } else if (linkType === "style") {
    styleKeys[name] = id;
  }
  //alert("added style: " + sourceKeys[name]);
  //alert("style keys: " + JSON.stringify(styleKeys) + "source keys: " + JSON.stringify(sourceKeys))
}

// panicButton turns off the event listeners, clears the currentline array, and removes all style associations
function panicButton() {
  styleKeys = {};
  sourceKeys = {};
  currentLines = [];
  theDoc.removeEventListener(Event.AFTER_SELECTION_CHANGED, placeNextLine);
  alert("Don't panic!\nThe selection event listener has been cleared, the style links broken, and the current line queue flushed. You may want to save your work now.")
}


// placeAllTextForPage(['hello'], "3")