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
    do {
      if (cursor.type.name === "Page") {
        // associate current page number with index of last this.pageData element
        this.pageMap.set(pageNum, this.pageData.length);
        this.pageData.push([]);
        pageNum++;
        panelNum = -1;
      }
      if (cursor.type.name === "Spread") {
        // associate current AND NEXT page numbers with index of last this.pageData element
        this.pageMap.set(pageNum, this.pageData.length);
        this.pageMap.set(pageNum + 1, this.pageData.length);
        this.pageData.push([]);
        pageNum += 2;
        panelNum = -1;
      }
      if (cursor.type.name === "Panel") {
        this.pageData[pageNum].push([]);
        panelNum++;
      }
      if (cursor.type.name === "SfxTranslation") {
        this.pageData[pageNum][panelNum].push({
          type: "Sfx",
          text: this.text.substring(cursor.from, cursor.to).trim(),
        });
      }
      if (cursor.type.name === "Note") {
        this.pageData[pageNum][panelNum].push({
          type: "Note",
          text: this.text.substring(cursor.from, cursor.to),
        });
      }
      if (cursor.type.name === "Source") {
        // if we've found a Source token, we know we're in a Text line, so we can add the line and
        // assign the source simultaneously.
        this.pageData[pageNum][panelNum].push({
          type: "Text",
          source: this.text.substring(cursor.from, cursor.to),
          style: null,
          content: [],
        });
      }
      if (cursor.type.name === "Style") {
        this.pageData = deepEdit(
          this.pageData,
          "style",
          this.text.substring(cursor.from, cursor.to)
        );
      }
      if (cursor.type.name === "Bold") {
        this.pageData = deepPush(this.pageData, {
          emphasis: "Bold",
          text: this.text.substring(cursor.from, cursor.to).replace(/\*/g, ""), // remove asterisks
        });
      }
      if (cursor.type.name === "BoldItal") {
        this.pageData = deepPush(this.pageData, {
          emphasis: "BoldItal",
          text: this.text
            .substring(cursor.from, cursor.to)
            .replace(/\*\*/g, ""), // remove double asterisks
        });
      }
      if (cursor.type.name === "Ital") {
        this.pageData = deepPush(this.pageData, {
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
        this.pageData = deepPush(this.pageData, {
          emphasis: "none",
          text: this.text.substring(cursor.from, cursor.to), // push text as-is
        });
      }
      if (cursor.type.name === "BlockText") {
        this.pageData = deepPush(this.pageData, {
          emphasis: "BlockText",
          text: this.text.substring(cursor.from, cursor.to), // push text as-is
        });
      }
    } while (cursor.next());
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
