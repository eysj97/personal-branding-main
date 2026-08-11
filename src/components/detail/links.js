// Where each case study's "직접 살펴보기 →" sends a visitor.
//
// FILL THESE IN. An empty string is not a placeholder that renders as a dead
// link — VisitLink draws nothing at all for it, so a case study with no URL
// here simply has no link, and the page is not broken while you decide.
//
// One link per project, on purpose. This page already is the deck: Problem,
// Process and Retrospect are what the reader is looking at. So the one thing it
// cannot give them is the thing itself — the live site, or the prototype. Point
// this at that.
//
// The exception is a project with nothing to try. If the best artifact really
// is a document, put the document here; it is still the one link, and it still
// goes somewhere the page has not already taken them.
//
// Anything works: a deployed site, a Figma prototype share link, a Notion or
// PDF URL. It opens in a new tab.
export const VISIT = {
  aquaplanet: "https://na0ee.github.io/Ezen_aquaplanet_project/",
  layer: "https://ezen-layerproject.vercel.app",
  reviu: "https://reviu-keeplearningflow.vercel.app",
};

// And where "장표 다운로드 →" sends them: the planning deck each project was
// built from. A second link rather than a replacement for the one above —
// they are two different things and a reader wants them for different reasons.
// The page is the story, VISIT is the thing itself, and this is the working
// document behind both.
//
// Same rule as VISIT: an empty string draws no link rather than a dead one.
export const DECK = {
  aquaplanet:
    "https://drive.google.com/file/d/1QQxwNzVGJAaImrftqw6POXmNUhYx2v94/view?usp=sharing",
  layer:
    "https://drive.google.com/file/d/1ozTZxjgHhuDjPfiB5Kn7_BAsSJsQmhgJ/view?usp=sharing",
  reviu:
    "https://drive.google.com/file/d/1PQGFis_-f4qgDwfHUQRAtU3OekhYxwaA/view?usp=sharing",
};
