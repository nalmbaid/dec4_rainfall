function isShoppingSite() {
  const bodyText = document.body.innerText.toLowerCase();

  // 1. Detect common shopping keywords anywhere on the page
  const shoppingKeywords = [
    "add to cart", "add to bag", "add to basket",
    "buy now", "checkout", "free shipping", "in stock",
    "cart", "bag", "basket",
    "$", "€", "£"
  ];
  const keywordHit = shoppingKeywords.some(k => bodyText.includes(k));

  // 2. Detect typical button classes 
  const buttons = [...document.querySelectorAll("button, a, input")];
  const classHit = buttons.some(b =>
    /(add|cart|bag|basket|buy|checkout)/i.test(b.className)
  );

  // 3. Detect common ecommerce URL patterns
  const urlHit = /(product|item|cart|checkout|shop)/.test(location.pathname.toLowerCase());

  // 4. Detect JSON-LD product schema (chatgpt help with this one)
  const hasProductSchema = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .some(tag => {
      try {
        const data = JSON.parse(tag.textContent);
        return data["@type"] === "Product" ||
               (Array.isArray(data) && data.some(d => d["@type"] === "Product"));
      } catch { return false; }
    });

  // 
  return keywordHit || classHit || urlHit || hasProductSchema;
}




// --- Image sets ---
const baseImages = [
  "ems0.png", "ems1.png", "ems2.png", "ems3.png", "ems4.png",
  "ems5.png", "ems6.png", "ems7.png", "ems8.png", "ems9.png", "ems10.png"
];
const tbImages = [
  "ems1_b.png", "ems2_b.png", "ems3_b.png", "ems4_b.png",
  "ems5_b.png", "ems6_b.png", "ems7_b.png", "ems8_b.png",
  "ems9_b.png", "ems10_b.png"
];

let currentImageIndex = 0;
let activeImageElement = null;
let activeTBImage = null;

// --- Create popup image ---
function createPopupImage(filename, options = {}) {
  const img = document.createElement("img");
  img.src = chrome.runtime.getURL(filename);

  Object.assign(img.style, {
    position: "fixed",
    right: options.right || "20px",
    top: options.top || "20px",
    width: options.width || "100px",
    height: "auto",
    opacity: "0",
    borderRadius: "8px",
    zIndex: options.zIndex || "9999",
    pointerEvents: "none",
    transition: "opacity 0.6s ease"
  });

  document.body.appendChild(img);
  requestAnimationFrame(() => (img.style.opacity = options.opacity || "0.8"));
  return img;
}

// --- Show main image ---
function updateDisplayedImage(showTB = true) {
  const chosenImage = baseImages[currentImageIndex];

  if (!activeImageElement) {
    activeImageElement = createPopupImage(chosenImage, { width: "100px" });
  } else {
    activeImageElement.src = chrome.runtime.getURL(chosenImage);
    activeImageElement.style.width = "100px";
  }

  localStorage.setItem("currentImageIndex", currentImageIndex);

  // Only show temporary TB if requested
  if (showTB) {
    showTemporaryTBImage(currentImageIndex);
  }
}

// --- Show temporary TB overlay ---
function showTemporaryTBImage(index) {
  const tbFile = tbImages[index - 1];
  if (!tbFile) return;

  if (activeTBImage) {
    activeTBImage.remove();
    activeTBImage = null;
  }

  const ratio = 1792 / 454;
  const tbWidth = 100 * ratio;

  activeTBImage = createPopupImage(tbFile, {
    width: tbWidth + "px",
    zIndex: "10000",
    opacity: 0.9
  });

  setTimeout(() => {
    if (activeTBImage) {
      activeTBImage.style.opacity = "0";
      setTimeout(() => {
        activeTBImage?.remove();
        activeTBImage = null;
      }, 600);
    }
  }, 5000);
}

// --- Initialize on load ---
if (isShoppingSite()) {
  const savedIndex = parseInt(localStorage.getItem("currentImageIndex"), 10);
  currentImageIndex = isNaN(savedIndex) ? 0 : Math.min(savedIndex, baseImages.length - 1);

  activeImageElement = createPopupImage(baseImages[currentImageIndex], { width: "100px" });
  console.log("Restored image:", baseImages[currentImageIndex]);
}

// --- Click handling ---
document.addEventListener("click", (e) => {
  if (!isShoppingSite()) return;

  const button = e.target.closest("button, a");
  if (!button) return;

  const text = (button.textContent || "").toLowerCase();
  const aria = (button.getAttribute("aria-label") || "").toLowerCase();
  const classes = (button.className || "").toLowerCase();

  const addKeywords = ["add to cart", "add to bag", "buy now", "purchase", "add", "shop now", "order now", "+"];
  const removeKeywords = ["remove", "minus", "-"];

  const isAdd = addKeywords.some(word => text.includes(word) || aria.includes(word) || classes.includes(word));
  const isRemove = removeKeywords.some(word => text.includes(word) || aria.includes(word) || classes.includes(word));

  if (isAdd) {
    currentImageIndex = Math.min(currentImageIndex + 1, baseImages.length - 1);
    updateDisplayedImage(true);   // show TB image
  } else if (isRemove) {
    currentImageIndex = Math.max(currentImageIndex - 1, 0);
    updateDisplayedImage(false);  // DO NOT show TB image
  }
});
