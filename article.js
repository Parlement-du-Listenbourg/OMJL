// article.js – OMJL (Imago + RTL)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { toHTML } from "https://cdn.jsdelivr.net/npm/@odiffey/discord-markdown@3.3.0/+esm";

// --- Config Firebase ---
const configImago = {
  apiKey: "AIzaSyCaexv-0SVEmPeRNYt-WviKBiUhH-Ju7XQ",
  authDomain: "imago-veritatis.firebaseapp.com",
  projectId: "imago-veritatis",
  storageBucket: "imago-veritatis.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:exampleid1"
};

const configRTL = {
  apiKey: "AIzaSyBw7PSHW4fe2jptxyf7xHtyINSrYG_TupA",
  authDomain: "rtl-world.firebaseapp.com",
  projectId: "rtl-world",
  storageBucket: "rtl-world.firebasestorage.app",
  messagingSenderId: "1092619392407",
  appId: "1:1092619392407:web:f968b6ef5416d66d6360d2",
  measurementId: "G-4GBT38563H"
};

// --- Initialisation Firebase ---
const appImago = initializeApp(configImago, "imago");
const appRTL   = initializeApp(configRTL, "rtl");
const dbImago  = getFirestore(appImago);
const dbRTL    = getFirestore(appRTL);

// --- Récupération paramètres URL ---
const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get("id");
const media     = urlParams.get("media");

// --- Menu déroulant ---
const toggleButton = document.getElementById("dropdownToggle");
const dropdownMenu = document.getElementById("dropdownMenu");

if (toggleButton && dropdownMenu) {
  toggleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
  });
  window.addEventListener("click", () => (dropdownMenu.style.display = "none"));
  dropdownMenu.addEventListener("click", (e) => e.stopPropagation());
}

// --- Emojis personnalisés (hébergés sur RTL World) ---
const EMOJI_BASE = "https://tris-250.github.io/RTL-World/emojis";
const EMOJI_MAP = {
  ":lieu:"  : `${EMOJI_BASE}/lieu.png`,
  ":source:": `${EMOJI_BASE}/source.png`,
  ":logo:"  : `${EMOJI_BASE}/logo.png`,
};

function injectCustomEmoji(html) {
  return html.replace(/:lieu:|:source:|:logo:/g, (m) =>
    `<img src="${EMOJI_MAP[m]}" alt="${m}" loading="lazy">`
  );
}

// --- Utilitaires ---
function getSourceFullName(key) {
  switch (key) {
    case "imago": return "Imago Veritatis";
    case "rtl":   return "RTL World";
    default:      return "Source inconnue";
  }
}

// --- Chargement d'un article ---
async function loadArticle() {
  const container = document.getElementById("article-content");
  if (!container) return;

  if (!articleId || !media) {
    container.innerHTML = "<p>Article introuvable</p>";
    return;
  }

  const db = media === "imago" ? dbImago : dbRTL;
  const articleRef = doc(db, "articles", articleId);
  const articleSnap = await getDoc(articleRef);

  if (!articleSnap.exists()) {
    container.innerHTML = "<p>Article non trouvé</p>";
    return;
  }

  const article = articleSnap.data();
  document.title = `${getSourceFullName(media)} - ${article.title || "Article"}`;

  let htmlContent = toHTML(article.content || "");
  htmlContent = htmlContent.replaceAll("</small>", "</small><br>");
  htmlContent = injectCustomEmoji(htmlContent);

  container.innerHTML = `
    <h1 class="article-title">${article.title || ""}</h1>
    <p class="article-meta">
      ${article.author || "Anonyme"} - ${article.timestamp || ""} |
      Source : ${getSourceFullName(media)}
    </p>
    <div class="article-body">${htmlContent}</div>
  `;

  if (article.image) {
    const img = document.createElement("img");
    img.src = article.image;
    img.alt = "Illustration";
    img.classList.add("article-image");
    document.body.appendChild(img);
  }
}

window.onload = loadArticle;