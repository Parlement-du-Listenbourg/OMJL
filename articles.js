// articles.js — OMJL (Imago + RTL) — affichage simple des images (pas de redimension JS)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import showdown from "https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm";

// ---------- Config Firebase ----------
const configImago = {
  apiKey: "AIzaSyCaexv-0SVEmPeRNYt-WviKBiUhH-Ju7XQ",
  authDomain: "imago-veritatis.firebaseapp.com",
  projectId: "imago-veritatis",
  storageBucket: "imago-veritatis.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:exampleid1",
};
const configRTL = {
  apiKey: "AIzaSyBw7PSHW4fe2jptxyf7xHtyINSrYG_TupA",
  authDomain: "rtl-world.firebaseapp.com",
  projectId: "rtl-world",
  storageBucket: "rtl-world.firebasestorage.app",
  messagingSenderId: "1092619392407",
  appId: "1:1092619392407:web:f968b6ef5416d66d6360d2",
  measurementId: "G-4GBT38563H",
};

const appImago = initializeApp(configImago, "imago");
const appRTL   = initializeApp(configRTL,   "rtl");
const dbImago  = getFirestore(appImago);
const dbRTL    = getFirestore(appRTL);

// ---------- Showdown (Markdown) ----------
showdown.extension("smallText", () => [{
  type: "lang",
  regex: /-# (.*?)(\n|$)/g,
  replace: "<small>$1</small>$2",
}]);

// Emojis personnalisés : on remplace simplement par <img src="..."> sans taille
const EMOJI_MAP = {
  ":lieu:"  : "https://parlement-du-listenbourg.github.io/OMJL/emojis/lieu.png",
  ":source:": "https://parlement-du-listenbourg.github.io/OMJL/emojis/source.png",
  ":logo:"  : "https://parlement-du-listenbourg.github.io/OMJL/emojis/logo.png",
};
showdown.extension("customEmoji", () => [{
  type: "lang",
  regex: /:(lieu|source|logo):/g,
  replace: (match, key) => {
    const url = EMOJI_MAP[":" + key + ":"];
    return url ? `<img src="${url}" alt="${match}" loading="lazy">` : match;
  },
}]);

const converter = new showdown.Converter({
  simplifiedAutoLink: true,
  strikethrough: true,
  tables: true,
  extensions: ["smallText", "customEmoji"],
});

// ---------- Helpers ----------
function getFullSourceName(key) {
  return key === "imago" ? "Imago Veritatis"
       : key === "rtl"   ? "RTL World"
       : "Inconnu";
}

// Convertit les dates en Date fiable (prend realTimestamp en priorité)
function toDateSafe(obj) {
  if (obj?.realTimestamp && typeof obj.realTimestamp.toDate === "function") {
    return obj.realTimestamp.toDate();
  }
  if (obj?.timestamp && typeof obj.timestamp === "object" && "seconds" in obj.timestamp) {
    return new Date(obj.timestamp.seconds * 1000);
  }
  if (typeof obj?.timestamp === "string") {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(obj.timestamp)) {
      const [d, m, y] = obj.timestamp.split("/");
      return new Date(`${y}-${m}-${d}`);
    }
    const d = new Date(obj.timestamp);
    if (!isNaN(+d)) return d;
  }
  return new Date(0);
}

function previewHTMLFrom(content) {
  const md = (content || "").substring(0, 200);
  return converter.makeHtml(md);
}

// ---------- État ----------
let allArticles = [];

// ---------- Lien "Dernier article" (toutes sources confondues) ----------
async function setLastArticleLink() {
  const [snapIm, snapRtl] = await Promise.all([
    getDocs(query(collection(dbImago, "articles"), orderBy("realTimestamp", "desc"), limit(1))),
    getDocs(query(collection(dbRTL,   "articles"), orderBy("realTimestamp", "desc"), limit(1))),
  ]);

  const cand = [];
  if (!snapIm.empty) {
    const d = snapIm.docs[0].data();
    cand.push({ when: toDateSafe(d), id: snapIm.docs[0].id, media: "imago" });
  }
  if (!snapRtl.empty) {
    const d = snapRtl.docs[0].data();
    cand.push({ when: toDateSafe(d), id: snapRtl.docs[0].id, media: "rtl" });
  }

  if (cand.length) {
    cand.sort((a, b) => b.when - a.when);
    const last = cand[0];
    const a = document.getElementById("lastArticleLink");
    if (a) a.href = `article.html?id=${last.id}&media=${last.media}`;
  }
}

// ---------- Filtres ----------
function updateCategoryFilter() {
  const media = document.getElementById("mediaFilter").value;
  const categories = new Set();

  allArticles.forEach(a => {
    if (media === "all" || a.source === media) {
      if (a.category) categories.add(a.category);
    }
  });

  const categoryFilter = document.getElementById("categoryFilter");
  categoryFilter.innerHTML = '<option value="all">Toutes les catégories</option>';
  Array.from(categories).sort().forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
}

function filterAndDisplay() {
  const media = document.getElementById("mediaFilter").value;
  const category = document.getElementById("categoryFilter").value;

  const filtered = allArticles.filter(a =>
    (media === "all" || a.source === media) &&
    (category === "all" || a.category === category)
  );
  displayArticles(filtered);
}

// ---------- Affichage ----------
function displayArticles(articles) {
  const container = document.getElementById("articles-container");
  container.innerHTML = "";

  articles.forEach(article => {
    const preview = previewHTMLFrom(article.content);
    const card = document.createElement("div");
    card.className = "article-card";
    card.innerHTML = `
      <a href="article.html?id=${article.id}&media=${article.source}" class="article-link">
        <h2>${article.title}</h2>
        <p>
          Auteur : ${article.author || "Anonyme"} – Publié le : ${article.timestamp || "?"}
          – Catégorie : ${article.category || "Non spécifiée"} |
          Source : <strong>${getFullSourceName(article.source)}</strong>
        </p>
        <div>${preview}...</div>
        ${article.meme ? `<img src="${article.meme}" alt="Illustration" class="article-image">` : ""}
      </a>
    `;
    container.appendChild(card);
  });
}

// ---------- Chargement principal ----------
async function loadArticles() {
  const [snapImago, snapRTL] = await Promise.all([
    getDocs(collection(dbImago, "articles")),
    getDocs(collection(dbRTL, "articles")),
  ]);

  allArticles = [];

  snapImago.forEach(docSnap => {
    const data = docSnap.data();
    data.id = docSnap.id;
    data.source = "imago";
    allArticles.push(data);
  });

  snapRTL.forEach(docSnap => {
    const data = docSnap.data();
    data.id = docSnap.id;
    data.source = "rtl";
    allArticles.push(data);
  });

  // Tri décroissant par date
  allArticles.sort((a, b) => toDateSafe(b) - toDateSafe(a));

  updateCategoryFilter();
  displayArticles(allArticles);

  // Listeners filtres
  document.getElementById("mediaFilter").addEventListener("change", () => {
    updateCategoryFilter();
    filterAndDisplay();
  });
  document.getElementById("categoryFilter").addEventListener("change", filterAndDisplay);

  // Lien "Dernier article"
  await setLastArticleLink();
}

// ---------- Dropdown header ----------
const toggleButton = document.getElementById("dropdownToggle");
const dropdownMenu = document.getElementById("dropdownMenu");
if (toggleButton && dropdownMenu) {
  toggleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
  });
  window.addEventListener("click", () => { dropdownMenu.style.display = "none"; });
  dropdownMenu.addEventListener("click", (e) => e.stopPropagation());
}

// Démarre une fois le DOM prêt
window.addEventListener("DOMContentLoaded", loadArticles);