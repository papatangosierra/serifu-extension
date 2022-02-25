import { parser } from "./serifu-parser/serifu-parser.js";
/* doc.js describes an object that contains a Serifu document, along with metadata computed by the object at the time of instantiation. It provides up-to-date information on Sources and Styles for autocomplete purposes, along with other state important to functionality but not strictly speaking part of the document itself. */

/* deepPush pushes a given val onto the end of an array after recursively descending into any array elements it finds first, and returns the new full array. This also descends into "content" properties, when found*/
function deepPush(arr, val) {
  function descend(inside, into) {
    if (typeof into === "object") {
      if (into.hasOwnProperty("content")) {
        //  descend(into.content, into.content[into.content.length - 1]);
        into.content.push(val);
      } else {
        descend(into, into[into.length - 1]);
      }
    } else {
      inside.push(val);
    }
    return inside;
  }
  return descend(arr, arr[arr.length - 1]);
}
// deepEdit finds the most deeply-nested object in the last element of an array, and assigns the given attribute to the given value, returning the new array
function deepEdit(arr, attr, val) {
  function descend(inside, into) {
    if (typeof into === "object" && into.length === undefined) {
      into[attr] = val;
    } else {
      descend(into, into[into.length - 1]);
    }
    return inside;
  }
  return descend(arr, arr[arr.length - 1]);
}

export class SerifuDoc {
  constructor(docText) {
    console.log(`docText length: ${docText.length}`);
    this.text = docText;
    this.sources = [];
    this.styles = [];
    let cursor = parser.parse(this.text).cursor();

    // go through the parse tree and extract unique Sources and Styles.
    do {
      if (
        // if we find a Source token, and if its contents aren't already in our array of Sources
        cursor.type.name === "Source" &&
        !this.sources.includes(this.text.substring(cursor.from, cursor.to))
      ) {
        // add the Source to the list
        this.sources.push(this.text.substring(cursor.from, cursor.to));
      }
      if (
        // if we find a Style token, and if its contents aren't already in our array of Sources
        cursor.type.name === "Style" &&
        !this.styles.includes(this.text.substring(cursor.from, cursor.to))
      ) {
        // add the Source to the list
        this.styles.push(this.text.substring(cursor.from, cursor.to));
      }
    } while (cursor.next());
    // reassign cursor for second pass
    cursor = parser.parse(this.text).cursor();
    this.pageData = []; // the nested array structure we'll use to provide information to the INDD extension
    this.pageMap = new Map([]); // the map that will map INDD page numbers to array items.
    let pageNum = -1; // counters
    let panelNum = -1;
    let spreadCount = 0; // this holds the offset to account for any spreads we hit. It will grow as spreads are encountered, making sure our pageMap remains accurate while still letting us use pageNum to index our page array as we build it.
    do {
      if (cursor.type.name === "Page") {
        // associate current page number with index of last pageStruct element
        pageMap.set(pageNum, pageStruct.length);
        pageStruct.push([]);
        pageNum++;
        panelNum = -1;
      }
      if (cursor.type.name === "Spread") {
        // associate current AND NEXT page numbers with index of last pageStruct element
        pageMap.set(pageNum, pageStruct.length);
        pageMap.set(pageNum + 1, pageStruct.length);
        pageStruct.push([]);
        pageOffsetWithSpreads++;
        pageNum += 2;
        panelNum = -1;
      }
      if (cursor.type.name === "Panel") {
        pageStruct[pageNum - pageOffsetWithSpreads].push([]);
        panelNum++;
      }
      if (cursor.type.name === "SfxTranslation") {
        pageStruct[pageNum - pageOffsetWithSpreads][panelNum].push({
          type: "Sfx",
          text: this.text.substring(cursor.from, cursor.to).trim(),
        });
      }
      if (cursor.type.name === "Note") {
        pageStruct[pageNum - pageOffsetWithSpreads][panelNum].push({
          type: "Note",
          text: this.text.substring(cursor.from, cursor.to),
        });
      }
      if (cursor.type.name === "Text") {
        // if we've found a Text token, we can add the line and
        // assign the source simultaneously.
        pageStruct[pageNum - pageOffsetWithSpreads][panelNum].push({
          type: "Text",
          source: null,
          style: null,
          content: [],
        });
      }
      if (cursor.type.name === "Source") {
        // save this as the most recently found Source
        lastSource = this.text.substring(cursor.from, cursor.to);
        // clear any saved Styles:
        lastStyle = null;
      }
      if (cursor.type.name === "Style") {
        // save this as the most recently found Style
        lastStyle = this.text.substring(cursor.from, cursor.to);
      }
      if (cursor.type.name === "Content") {
        // If have found a Content node, we've passed Source and Style,
        // which means we can apply the last-found Source and Style to the
        // node. If the containing Text node didn't have a Source or Style
        // specified, we won't have encountered those nodes, so the last-specified
        // Source and Style will control.
        pageStruct = deepEdit(pageStruct, "source", lastSource);
        pageStruct = deepEdit(pageStruct, "style", lastStyle);
      }
      if (cursor.type.name === "Bold") {
        pageStruct = deepPush(pageStruct, {
          emphasis: "Bold",
          text: this.text.substring(cursor.from, cursor.to).replace(/\*/g, ""), // remove asterisks
        });
      }
      if (cursor.type.name === "BoldItal") {
        pageStruct = deepPush(pageStruct, {
          emphasis: "BoldItal",
          text: this.text
            .substring(cursor.from, cursor.to)
            .replace(/\*\*/g, ""), // remove double asterisks
        });
      }
      if (cursor.type.name === "Ital") {
        pageStruct = deepPush(pageStruct, {
          emphasis: "Ital",
          text: this.text.substring(cursor.from, cursor.to).replace(/\_/g, ""), // remove underscores
        });
      }
      if (
        (cursor.type.name === "UnstyledText" ||
          cursor.type.name === "Star" ||
          cursor.type.name === "Colon" ||
          cursor.type.name === "DoubleStar" ||
          cursor.type.name === "Underscore") &&
        cursor.node.parent.name === "Content"
      ) {
        pageStruct = deepPush(pageStruct, {
          emphasis: "none",
          text: this.text.substring(cursor.from, cursor.to), // push text as-is
        });
      }
      if (cursor.type.name === "BlockText") {
        pageStruct = deepPush(pageStruct, {
          emphasis: "BlockText",
          text: this.text.substring(cursor.from, cursor.to), // push text as-is
        });
      }
    } while (cursor.next());
  }

  // linesForPage takes an integer page number and returns a flat array of the
  // text line objects appearing on that page.
  linesForPage(pageNum) {
    let textLines = [];
    this.pageData[pageNum].forEach((el) => {
      el.forEach((em) => {
        if (em.type === "Text") {
          textLines.push(em);
        }
      });
    });
    //console.log(`theDoc.linesForPage: ${JSON.stringify(textLines)}`);
    return textLines;
  }

  get pageMapAndData() {
    return { pageMap: this.pageMap, pageData: this.pageData };
  }

  get sourceChanged() {
    return this.sources.length != this.prevSourceCount;
  }

  get styleChanged() {
    return this.styles.length != this.prevStyleCount;
  }

  get getSources() {
    //    console.log("A document source list has been requested");
    return this.sources;
  }

  get getStyles() {
    return this.styles;
  }

  get getText() {
    return this.text;
  }
}
