// interface.js holds all the code that interfaces with the InDesign scripting environment. Any state coming from InDesign comes through here.

// List of Paragraph and Character styles

export const paragraphStyles = [
  { name: "Dialogue", id: 1 },
  { name: "Dialogue Large", id: 2 },
  { name: "Dialogue BoldItal", id: 3 },
  { name: "Thought", id: 4 },
  { name: "Playful", id: 5 },
  { name: "Aside", id: 6 },
];

export const characterStyles = [
  { name: "Italic", id: 1 },
  { name: "Bold", id: 2 },
  { name: "BoldItal", id: 3 },
];

export const currentPage = 1;
