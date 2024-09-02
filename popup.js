document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".content");
  const loadingElement = document.getElementById("loading");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.getAttribute("data-tab");
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`${tabName}-content`).classList.add("active");
    });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: getPageInfo,
      },
      (results) => {
        loadingElement.style.display = "none";
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        const pageInfo = results[0].result;
        displayFonts(pageInfo.fonts);
        displayColors(pageInfo.colors);
        displayMetaInfo(pageInfo.meta);
        document.getElementById("fonts-content").classList.add("active");
      }
    );
  });
  analyzeLayout();
});

function displayFonts(fonts) {
  const fontsContent = document.getElementById("fonts-content");
  fontsContent.innerHTML = "";
  Object.entries(fonts).forEach(([fontFamily, sizes]) => {
    const fontItem = document.createElement("div");
    fontItem.className = "font-item";
    fontItem.innerHTML = `
          <h3>${fontFamily}</h3>
          <p>Font sizes:</p>
          <div class="font-sizes">
              ${Array.from(sizes)
                .sort((a, b) => a - b)
                .map((size) => `<span class="font-size">${size}px</span>`)
                .join("")}
          </div>
      `;
    fontItem.addEventListener("mouseover", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "highlightFont",
          font: fontFamily,
        });
      });
    });
    fontItem.addEventListener("mouseout", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "removeHighlight" });
      });
    });
    fontsContent.appendChild(fontItem);
  });
}

function displayColors(colors) {
  const colorsContent = document.getElementById("colors-content");
  colorsContent.innerHTML = '<div class="color-grid"></div>';
  const colorGrid = colorsContent.querySelector(".color-grid");
  colors.forEach((color) => {
    const hexColor = rgbaToHex(color);
    const colorItem = document.createElement("div");
    colorItem.className = "color-item";
    colorItem.innerHTML = `
          <div class="color-box" style="background-color: ${color};"></div>
          <p>${color}</p>
          <p>HEX: ${hexColor}</p>
      `;
    colorGrid.appendChild(colorItem);
  });
}

function rgbaToHex(rgba) {
  return rgba
    .replace(/^rgba?\(|\s+|\)$/g, "")
    .split(",")
    .map((str, index) => {
      const int = parseInt(str, 10);
      if (index === 3) {
        return Math.round(parseFloat(str) * 255)
          .toString(16)
          .padStart(2, "0");
      }
      return int.toString(16).padStart(2, "0");
    })
    .join("");
}

// New function to analyze accessibility
function analyzeAccessibility() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: checkAccessibility,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        displayAccessibilityResults(results[0].result);
      }
    );
  });
}

function displayAccessibilityResults(results) {
  const accessibilityContent = document.getElementById("accessibility-content");
  accessibilityContent.innerHTML = `
      <h3>Accessibility Check</h3>
      <p>Alt texts missing: ${results.missingAltTexts}</p>
      <p>Contrast issues: ${results.contrastIssues}</p>
      <p>Heading structure: ${
        results.headingStructure ? "Good" : "Needs improvement"
      }</p>
  `;
}

function displayMetaInfo(meta) {
  const metaContent = document.getElementById("meta-content");
  metaContent.innerHTML = "";
  Object.entries(meta).forEach(([key, value]) => {
    const metaItem = document.createElement("div");
    metaItem.className = "meta-item";
    metaItem.innerHTML = `<strong>${key}:</strong> ${value}`;
    metaContent.appendChild(metaItem);
  });
}

function getPageInfo() {
  const fonts = {};
  const colors = new Set();
  const meta = {
    title: document.title,
    description:
      document.querySelector('meta[name="description"]')?.content ||
      "No description found",
    keywords:
      document.querySelector('meta[name="keywords"]')?.content ||
      "No keywords found",
    author:
      document.querySelector('meta[name="author"]')?.content ||
      "No author found",
    viewport:
      document.querySelector('meta[name="viewport"]')?.content ||
      "No viewport information",
    charset: document.characterSet,
    domainName: window.location.hostname,
    protocol: window.location.protocol.slice(0, -1),
    totalLinks: document.getElementsByTagName("a").length,
    totalImages: document.getElementsByTagName("img").length,
    loadTime: performance.now().toFixed(2) + " ms",
  };

  function traverseElements(element) {
    const style = window.getComputedStyle(element);
    const fontFamily = style.fontFamily
      .split(",")[0]
      .replace(/['"]/g, "")
      .trim();
    const fontSize = parseInt(style.fontSize);

    if (!fonts[fontFamily]) {
      fonts[fontFamily] = new Set();
    }
    fonts[fontFamily].add(fontSize);

    const color = style.color;
    const backgroundColor = style.backgroundColor;

    if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
      colors.add(color);
    }
    if (
      backgroundColor !== "rgba(0, 0, 0, 0)" &&
      backgroundColor !== "transparent"
    ) {
      colors.add(backgroundColor);
    }

    for (let child of element.children) {
      traverseElements(child);
    }
  }

  traverseElements(document.body);

  return {
    fonts: Object.fromEntries(
      Object.entries(fonts).map(([k, v]) => [k, Array.from(v)])
    ),
    colors: Array.from(colors),
    meta: meta,
  };
}

function analyzeLayout() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: getLayoutInfo,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        displayLayoutResults(results[0].result);
      }
    );
  });
}

function displayLayoutResults(results) {
  const layoutContent = document.getElementById("layout-content");
  layoutContent.innerHTML = `
      <h3>Layout Analysis</h3>
      <div class="layout-item">
          <h4>Grid Systems</h4>
          <p>Elements using CSS Grid: ${results.gridCount}</p>
          <p>Most common grid structure: ${results.commonGridStructure}</p>
      </div>
      <div class="layout-item">
          <h4>Flexbox Usage</h4>
          <p>Elements using Flexbox: ${results.flexboxCount}</p>
      </div>
      <div class="layout-item">
          <h4>Responsive Design</h4>
          <p>Media Queries: ${results.mediaQueriesCount}</p>
          <p>Viewport Meta Tag: ${
            results.hasViewportMeta ? "Present" : "Missing"
          }</p>
      </div>
      <div class="layout-item">
          <h4>Main Layout Structure</h4>
          <p>${results.mainLayoutStructure}</p>
      </div>
      <div class="layout-item">
          <h4>Whitespace Analysis</h4>
          <p>Average padding: ${results.averagePadding}px</p>
          <p>Average margin: ${results.averageMargin}px</p>
      </div>
  `;
}
