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
    this.sourceMap = {};
    this.styleMap = {};
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
        // list the Source as a key in our SourceMap (for mapping to INDD graf styles)
        this.sourceMap[this.text.substring(cursor.from, cursor.to)] = 0;
      }
      if (
        // if we find a Style token, and if its contents aren't already in our array of Styles
        cursor.type.name === "Style" &&
        !this.styles.includes(this.text.substring(cursor.from, cursor.to))
      ) {
        // add the Style to the list
        this.styles.push(this.text.substring(cursor.from, cursor.to));
        this.styleMap[this.text.substring(cursor.from, cursor.to)] = 0;
      }
    } while (cursor.next());


    // reassign cursor for second pass, and build canonical AST
    cursor = parser.parse(this.text).cursor();
    let pageMap = new Map([]); // holds the mapping for physical book page numbers (whicher are one-indexed, and have one per page but two for spreads) to AST page array indices (which are zero-indexed, one per page and spread)
    let pageStruct = [];
    let pageOffsetWithSpreads = 0; // we increment this every time a spread is encountered, to derive an offset
    let pageNum = -1;
    let panelNum = -1;
    let lineID = 0; // we assign a document-unique line number to every Text and SFX line.
    let lastSource = "";
    let lastStyle = "";
    do {
      if (cursor.type.name === "Page") {
        // increment immediately so we can reference pageNum as current
        pageNum++;
        // associate current page number with index of last pageStruct element
        pageMap.set(pageNum, pageStruct.length);
        pageStruct.push([]);
        panelNum = -1;
      }
      if (cursor.type.name === "Spread") {
        pageNum += 2;
        // associate current AND NEXT page numbers with index of last pageStruct element
        pageMap.set(pageNum - 1, pageStruct.length);
        pageMap.set(pageNum, pageStruct.length);
        pageStruct.push([]);
        pageOffsetWithSpreads++;
        panelNum = -1;
      }
      if (cursor.type.name === "Panel") {
        panelNum++;
        pageStruct[pageNum - pageOffsetWithSpreads].push([]);
      }
      if (cursor.type.name === "SfxTranslation") {
        pageStruct[pageNum - pageOffsetWithSpreads][panelNum].push({
          type: "Sfx",
          text: this.text.substring(cursor.from, cursor.to).trim(),
          id: lineID,
        });
        lineID++;
      }
      if (cursor.type.name === "SfxSource") {
        // add its value to the Sfx object, which should be right before this.
        pageStruct = deepEdit(
          pageStruct,
          "translationOf",
          this.text.substring(cursor.from + 1, cursor.to - 1)
        ); // we strip off the enclosing parens
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
          id: lineID,
          content: [],
        });
        lineID++;
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
          text: this.text.substring(cursor.from + 1, cursor.to - 1), // remove enclosing asterisks
        });
      }
      if (cursor.type.name === "BoldItal") {
        pageStruct = deepPush(pageStruct, {
          emphasis: "BoldItal",
          text: this.text.substring(cursor.from + 2, cursor.to - 2), // remove enclosing double asterisks
        });
      }
      if (cursor.type.name === "Ital") {
        pageStruct = deepPush(pageStruct, {
          emphasis: "Ital",
          text: this.text.substring(cursor.from + 1, cursor.to - 1), // remove enclosing underscores
        });
      }
      if (cursor.type.name === "Newline") {
        pageStruct = deepPush(pageStruct, {
          emphasis: "none",
          text: "\n", // remove underscores
        });
      }
      if (
        (cursor.type.name === "UnstyledText" ||
          cursor.type.name === "Star" ||
          cursor.type.name === "Colon" ||
          cursor.type.name === "DoubleStar" ||
          cursor.type.name === "Underscore") &&
        (cursor.node.parent.name === "Content" ||
          cursor.node.parent.name === "StyleBlock")
      ) {
        pageStruct = deepPush(pageStruct, {
          emphasis: "none",
          text: this.text.substring(cursor.from, cursor.to), // push text as-is
        });
      }
      if (cursor.type.name === "BlockText") {
        pageStruct = deepPush(pageStruct, {
          emphasis: "none",
          text: this.text.substring(cursor.from + 2, cursor.to - 2), // push text as-is
        });
      }
    } while (cursor.next());
    // console.log("canonical AST:");
    // console.log(JSON.stringify(pageStruct, 0, 4));
    this.pageData = pageStruct;
    this.pageMap = pageMap;
    this.pagesInScript = pageStruct.length + pageOffsetWithSpreads;
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

    nestedLinesForPage(pageNum) {
      let textLines = [];
      this.pageData[pageNum].forEach((panel, i) => {
        textLines.push([]);
        panel.forEach((line) => {
          if (line.type === "Text") {
            textLines[i].push(line);
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
