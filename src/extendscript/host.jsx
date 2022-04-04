#targetengine "com.serifu.panel_Engine_Id";
// Serifu InDesign Extention
// Initial Code: Paul Starr, May 13, 2020
// Updated December 2021

// THIS GIVE US JSON, WHICH WE DEFINITELY NEED.
#include "json2.js";
#include "KTUlib.jsx";

var theDoc = app.activeDocument
var thePages = app.activeDocument.pages
var theLayers = app.activeDocument.layers
var theMaster = app.activeDocument.masterSpreads.itemByName('A-Master')
var theTool = app.toolBoxTools;

// Set up window to use for progress bar when reversing pages, but don't display yet.
var w = new Window ("palette"); // must be defined at top level
var myMessage = w.add ("statictext"); 
myMessage.text = "Reversing page order...";

function doAsUndoable(f, description) {
  try { 
    KTUDoScriptAsUndoable(f, description)
  } catch(err) {
    alert("Error: " + err.description) 
  }
}

// global variable to hold currently queued lines for placing
// global lists to hold script style associations
var styleKeys = {};
var sourceKeys = {};

// createSfxLine creates a single text box with a paragraph style of "SFX" and places it in the center of
// the page
function createSfxLine(sfxText) {
  var oldOrigin = theDoc.viewPreferences.rulerOrigin // save old ruler origin
  theDoc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN
  app.scriptPreferences.measurementUnit = MeasurementUnits.PICAS;
  var page = app.activeWindow.activePage;
  var xPageSize = page.bounds[3] - page.bounds[1];
  var yPageSize = page.bounds[2] - page.bounds[0];
  // if there's not already a style named SFX, create it.
  if (!theDoc.paragraphStyles.itemByName("SFX").isValid) {
    theDoc.paragraphStyles.add( {name: "SFX" } )
  }

  var myFrame = page.textFrames.add({
    // place SFX in center of page, roughly
    geometricBounds: [
      (yPageSize / 2) - 5, 
      (xPageSize / 2) - 5, 
      (yPageSize / 2) + 5, 
      (xPageSize / 2) + 5, 
      ],
    strokeWidth: 0,
    label: "SFX"
  });
  myFrame.contents = sfxText; // place SFX text in frame
  // apply style
  myFrame.paragraphs.everyItem().appliedParagraphStyle = theDoc.paragraphStyles.itemByName("SFX");
  // reset ruler to whatever it was before
  theDoc.viewPreferences.rulerOrigin = oldOrigin;
}

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
      var emphasisStyleName = ""
      if (nextLine.content[i].emphasis != "none") {
        // cache the name of the emphasis character style we're going to look for.
        // it's "Paragraph Style Name [space] Emphasis Type", e.g. Dialogue Bold, Caption Ital, Thought BoldItal
        // If there's a paragraph style associated with this source, cache it
        if (sourceKeys.hasOwnProperty(nextLine.source)) {
          emphasisStyleName = theDoc.paragraphStyles.itemByID(sourceKeys[nextLine.source]).name + " " + nextLine.content[i].emphasis;
        } else { // otherwise, come up with a sensible (?) default
          emphasisStyleName = "Default " + nextLine.content[i].emphasis;
        }
        // then, if we're in a line with a Style applied, override whatever we just did with that,
        // because Styles take precedence over Sources. 
        if (styleKeys.hasOwnProperty(nextLine.style)) {
          emphasisStyleName = theDoc.paragraphStyles.itemByID(styleKeys[nextLine.style]).name + " " + nextLine.content[i].emphasis;
        }
        // check for nonexistance of character style for this emphasis + paragraph style combination
        if (!theDoc.characterStyles.itemByName(emphasisStyleName).isValid) {
            // if it doesn't exist, create it
            theDoc.characterStyles.add({
              name: emphasisStyleName,
            })
        }
        story.insertionPoints[-1].appliedCharacterStyle = emphasisStyleName; // "Bold", "Ital", or "BoldItal"
        story.insertionPoints[-1].contents = nextLine.content[i].text; // place text
      } else { // there's no emphasis, so just place text
        story.insertionPoints[-1].appliedCharacterStyle = theDoc.characterStyles[0]; // use "none" character style
        story.insertionPoints[-1].contents = nextLine.content[i].text;
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
    var emphasisStyleName = ""
    if (textLine.content[i].emphasis != "none") {
      // cache the name of the emphasis character style we're going to look for.
      // it's "Paragraph Style Name [space] Emphasis Type", e.g. Dialogue Bold, Caption Ital, Thought BoldItal
      // If there's a paragraph style associated with this source, cache it
      if (sourceKeys.hasOwnProperty(textLine.source)) {
        emphasisStyleName = theDoc.paragraphStyles.itemByID(sourceKeys[textLine.source]).name + " " + textLine.content[i].emphasis;
      } else { // otherwise, come up with a sensible (?) default
        emphasisStyleName = "Default " + textLine.content[i].emphasis;
      }
      // then, if we're in a line with a Style applied, override whatever we just did with that,
      // because Styles take precedence over Sources. 
      if (styleKeys.hasOwnProperty(textLine.style)) {
        emphasisStyleName = theDoc.paragraphStyles.itemByID(styleKeys[textLine.style]).name + " " + textLine.content[i].emphasis;
      }
      // check for nonexistance of character style for this emphasis + paragraph style combination
      if (!theDoc.characterStyles.itemByName(emphasisStyleName).isValid) {
          // if it doesn't exist, create it
          theDoc.characterStyles.add({
            name: emphasisStyleName,
          })
      }
      story.insertionPoints[-1].appliedCharacterStyle = emphasisStyleName; // "Bold", "Ital", or "BoldItal"
      story.insertionPoints[-1].contents = textLine.content[i].text; // place text
    } else { // there's no emphasis, so just place text
      story.insertionPoints[-1].appliedCharacterStyle = theDoc.characterStyles[0]; // use "none" character style
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



// Run KTUToggleBindingDirection on the current document, as undoable, with error catching
function toggleBindingDirectionFunc() {
  KTUToggleBindingDirection(theDoc)
}

function toggleBindingDirection() {
  doAsUndoable(toggleBindingDirectionFunc, "Toggle Binding Direction");
}

// reverse order of all pages
var reverseSpreadOrderFunc = function () {
  // first, lock all items in the document in place
  KTULockAllItems(theDoc)

  if (!w.pbar) { // if the progress bar doesn't exist
      w.pbar = w.add('progressbar', undefined, 0, app.activeDocument.spreads.length); 
  } else {
      w.pbar.value = 0;
      w.update();
  }
  w.pbar.preferredSize.width = 300;
  w.show(); // Show our progress bar window
  var refpage = 0;
  for (var i = 0; i < app.activeDocument.spreads.length; i++) { // move by spread, not page, so as not to fuck up formatting
      if (i != 0) {
          targetpage = app.activeDocument.spreads[i];
          targetpage.move(LocationOptions.BEFORE, refpage);
          refpage = targetpage;
      } else {
          refpage = app.activeDocument.spreads[i];
      }
      w.pbar.value = i + 1;
      w.update(); // Have to call this, or the progress bar won't update.
  }
  w.close();
  
  // then reverse the binding direction from wherever it was
  KTUToggleBindingDirection(theDoc)

  // then unlock all items in the document
  KTUUnLockAllItems(theDoc)
}

function reverseSpreadOrder() {
  doAsUndoable(reverseSpreadOrderFunc, "Reverse Spread Order");
}