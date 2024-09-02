chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "highlightFont") {
    highlightElementsWithFont(request.font);
  } else if (request.action === "removeHighlight") {
    removeHighlight();
  }
});

function highlightElementsWithFont(fontFamily) {
  const elements = document.body.getElementsByTagName("*");
  for (let element of elements) {
    if (window.getComputedStyle(element).fontFamily.includes(fontFamily)) {
      element.style.outline = "2px solid red";
    }
  }
}

function removeHighlight() {
  const elements = document.body.getElementsByTagName("*");
  for (let element of elements) {
    element.style.outline = "";
  }
}

// New function in getPageInfo() to check accessibility
function checkAccessibility() {
  const images = document.getElementsByTagName("img");
  const missingAltTexts = Array.from(images).filter((img) => !img.alt).length;

  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const headingLevels = Array.from(headings).map((h) => parseInt(h.tagName[1]));
  const headingStructure = headingLevels.every(
    (level, index, arr) => index === 0 || level <= arr[index - 1] + 1
  );

  // Simple contrast check (this is a basic implementation and not fully accurate)
  let contrastIssues = 0;
  const elements = document.body.getElementsByTagName("*");
  for (let element of elements) {
    const style = window.getComputedStyle(element);
    const backgroundColor = style.backgroundColor;
    const color = style.color;
    if (
      backgroundColor !== "rgba(0, 0, 0, 0)" &&
      color !== "rgba(0, 0, 0, 0)"
    ) {
      if (!hasGoodContrast(backgroundColor, color)) {
        contrastIssues++;
      }
    }
  }

  return {
    missingAltTexts,
    headingStructure,
    contrastIssues,
  };
}

function hasGoodContrast(bg, fg) {
  // This is a simplified contrast check and not fully accurate
  const getBrightness = (color) => {
    const rgb = color.match(/\d+/g).map(Number);
    return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  };
  const brightness1 = getBrightness(bg);
  const brightness2 = getBrightness(fg);
  const diff = Math.abs(brightness1 - brightness2);
  return diff > 125;
}

function getLayoutInfo() {
  const allElements = document.body.getElementsByTagName("*");
  let gridCount = 0;
  let flexboxCount = 0;
  let gridStructures = {};
  let totalPadding = 0;
  let totalMargin = 0;
  let elementCount = 0;

  for (let element of allElements) {
    const style = window.getComputedStyle(element);

    if (style.display === "grid") {
      gridCount++;
      const structure = `${style.gridTemplateColumns} / ${style.gridTemplateRows}`;
      gridStructures[structure] = (gridStructures[structure] || 0) + 1;
    }

    if (style.display === "flex") {
      flexboxCount++;
    }

    totalPadding +=
      parseInt(style.paddingTop) +
      parseInt(style.paddingBottom) +
      parseInt(style.paddingLeft) +
      parseInt(style.paddingRight);
    totalMargin +=
      parseInt(style.marginTop) +
      parseInt(style.marginBottom) +
      parseInt(style.marginLeft) +
      parseInt(style.marginRight);
    elementCount++;
  }

  const styleSheets = document.styleSheets;
  let mediaQueriesCount = 0;
  for (let sheet of styleSheets) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      for (let rule of rules) {
        if (rule.type === CSSRule.MEDIA_RULE) {
          mediaQueriesCount++;
        }
      }
    } catch (e) {
      console.log("Cannot read cross-origin stylesheet");
    }
  }

  const commonGridStructure =
    Object.entries(gridStructures).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "None detected";

  const mainLayoutStructure = analyzeMainLayout();

  return {
    gridCount,
    flexboxCount,
    commonGridStructure,
    mediaQueriesCount,
    hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
    mainLayoutStructure,
    averagePadding: Math.round(totalPadding / (elementCount * 4)),
    averageMargin: Math.round(totalMargin / (elementCount * 4)),
  };
}

function analyzeMainLayout() {
  const body = document.body;
  const childrenDisplay = Array.from(body.children).map(
    (child) => window.getComputedStyle(child).display
  );

  if (childrenDisplay.includes("grid")) {
    return "The main layout appears to use CSS Grid";
  } else if (childrenDisplay.includes("flex")) {
    return "The main layout appears to use Flexbox";
  } else if (childrenDisplay.includes("table")) {
    return "The main layout appears to use table-based layout (not recommended for modern web design)";
  } else {
    return "The main layout appears to use standard block/inline flow";
  }
}
