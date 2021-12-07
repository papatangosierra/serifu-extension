export const serifuText = `# Page 1
- 1.1
Title: Me & Roboco
Chapter Title: Photos & Bondo
! I want the official Me & Roboco Christmas cake.

# Page 2
- 2.1
* diiing doooong
Sign: Bermuda
- 2.2
Gorilla/Thick: Ch-Check this out, Motsuo!!
* Bah ha ha ha ha
Motsuo/Bold: Bwaa ha ha ha ha!!
- 2.3
Gorilla/Bold: This one, too!
* slam
- 2.4
Gorilla/Bold: And this one!
* slam
- 2.5
Gorilla/Bold: And this one!
* slam
- 2.6
Sign: Class 5-1 Goal: Swift Death to Evil
! "Aku Soku Zan," Hajime Saito's motto/catchphrase in Rurouni Kenshin.
Gorilla/Thick: These pics of Bondo from the hiking field trip are ookin' hilarious!!
* Oook!!
Motsuo/Bold: He's got a creepy stalker expression on in every single one!!
* Heeee!!
Bondo: Aw, they're not _that_ funny!!
- 2.7
Gorilla/Thick: C'mon, let's go put these on the bulletin board!!
Bondo: Huh?! No, stop!!

# Page 3
- 3.1
Gorilla/Serious: I can't wait to show the whole school what good friends we are, ook!
Bondo/Bold: I still want you to stop, but that _is_ nice to hear!
Motsuo/Aside: This one's my favorite.
- 3.2
Bondo: Okay, well what about the photos of _you_ guys?!
Gorilla: Ours are normal, ook.
- 3.3
Bondo/Bold: Oh, yeah?! I'll bet you're making some weird faces in _some_ of these!!
* snatch
Gorilla: H-Hey, man, you don't have to be like that.
- 3.4
* flip
Bondo: Hmph...
- 3.5
* flip
Bondo: Ngh!
- 3.6
Bondo/Thought: What's up with these guys? They're not just normal, they're downright photogenic! Why am I the only one who...
- 3.7
Bondo/Bold: Huh?!

`;

export const testData = [
  [
    [
      {
        type: "Text",
        source: "Lucky Kazuma",
        style: null,
        next: true,
        content: [
          {
            emphasis: "none",
            text: " Okay, ",
          },
          {
            emphasis: "Ital",
            text: "wait",
          },
          {
            emphasis: "none",
            text: ". Let me just get this straight.",
          },
        ],
      },
      {
        type: "Text",
        source: "Hoshi Two-Beer",
        style: null,
        content: [
          {
            emphasis: "none",
            text: " Sure. Take your time, K.",
          },
        ],
      },
      {
        type: "Text",
        source: "Doc Sensei",
        style: null,
        content: [
          {
            emphasis: "none",
            text: " You boys been drinkin'?",
          },
        ],
      },
    ],
    [
      {
        type: "Text",
        source: "Lucky Kazuma",
        style: "Bold",
        content: [
          {
            emphasis: "none",
            text: " You're telling me...",
          },
        ],
      },
      {
        type: "Text",
        source: "Hoshi Two-Beer",
        style: null,
        content: [
          {
            emphasis: "none",
            text: "  Mm-hmm...",
          },
        ],
      },
      {
        type: "Text",
        source: "Nadeshiko",
        style: "Whisper",
        content: [
          {
            emphasis: "none",
            text: " They started ",
          },
          {
            emphasis: "Ital",
            text: "quite",
          },
          {
            emphasis: "none",
            text: " a while ago.",
          },
        ],
      },
      {
        type: "Sfx",
        text: "nod nod",
      },
    ],
    [
      {
        type: "Text",
        source: "Doc Sensei",
        style: "Aside",
        content: [
          {
            emphasis: "none",
            text: " You don't say.",
          },
        ],
      },
      {
        type: "Text",
        source: "Lucky Kazuma",
        style: null,
        content: [
          {
            emphasis: "none",
            text: " ...that a ",
          },
          {
            emphasis: "BoldItal",
            text: "shrimp",
          },
          {
            emphasis: "none",
            text: " fried this InDesign panel?",
          },
        ],
      },
    ],
    [
      {
        type: "Text",
        source: "Hoshi Two-Beer",
        style: null,
        content: [
          {
            emphasis: "none",
            text: " Shimp fried panel, baby.",
          },
        ],
      },
      {
        type: "Sfx",
        text: "sizzle sizzle",
      },
    ],
  ],
];
