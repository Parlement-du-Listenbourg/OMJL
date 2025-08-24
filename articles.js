import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import showdown from "https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm";

// --- Configs Firebase
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

// --- Init Firebase
const appImago = initializeApp(configImago, "imago");
const appRTL   = initializeApp(configRTL,  "rtl");
const dbImago  = getFirestore(appImago);
const dbRTL    = getFirestore(appRTL);

// --- Markdown converter (même rendu que tes sites)
showdown.extension("smallText", function () {
  return [{ type: "lang", regex: /-# (.*?)(\n|$)/g, replace: "<small>$1</small>$2" }];
});
const converter = new showdown.Converter({
  simplifiedAutoLink: true, strikethrough: true, tables: true, extensions: ["smallText"]
});

// --- Utilitaires
function getFullSourceName(key) {
  return key === "imago" ? "Imago Veritatis" : key === "rtl" ? "RTL World" : "Inconnu";
}
function getComparableDate(article) {
  // Firestore Timestamp (objet)
  if (article.realTimestamp?.seconds) return new Date(article.realTimestamp.seconds * 1000);
  if (article.timestamp?.seconds)     return new Date(article.timestamp.seconds * 1000);

  // Chaîne JJ/MM/AAAA
  if (typeof article.timestamp === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(article.timestamp)) {
    const [d, m, y] = article.timestamp.split("/");
    return new Date(`${y}-${m}-${d}`);
  }
  // Chaîne ISO ou autre
  if (typeof article.timestamp === "string") return new Date(article.timestamp);

  return new Date(0); // fallback ancien
}

// --- État
let allArticles = [];

// --- Affichage
function displayArticles(articles) {
  const container = document.getElementById("articles-container");
  if (!container) return;
  container.innerHTML = "";

  articles.forEach(article => {
    const preview = converter.makeHtml((article.content || "").substring(0, 200));
    const card = document.createElement("div");
    card.className = "article-card";
    card.innerHTML = `
      <a href="article.html?id=${article.id}&media=${article.source}" class="article-link">
        <h2>${article.title || "(Sans titre)"}</h2>
        <p>
          Auteur : ${article.author || "Anonyme"} – Publié le : ${article.timestamp ? article.timestamp : "?"}
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

function updateCategoryFilter() {
  const mediaSel = document.getElementById("mediaFilter");
  const catSel   = document.getElementById("categoryFilter");
  if (!mediaSel || !catSel) return;

  const media = mediaSel.value;
  const categories = new Set();
  allArticles.forEach(a => {
    if (media === "all" || a.source === media) if (a.category) categories.add(a.category);
  });

  catSel.innerHTML = '<option value="all">Toutes les catégories</option>';
  Array.from(categories).sort().forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat; opt.textContent = cat;
    catSel.appendChild(opt);
  });
}

function filterAndDisplay() {
  const mediaSel = document.getElementById("mediaFilter");
  const catSel   = document.getElementById("categoryFilter");
  if (!mediaSel || !catSel) return;

  const media = mediaSel.value;
  const category = catSel.value;

  const filtered = allArticles.filter(a =>
    (media === "all" || a.source === media) &&
    (category === "all" || a.category === category)
  );
  displayArticles(filtered);
}

// --- Lien vers le dernier article (toutes sources confondues)
function setLastArticleLink() {
  const link = document.getElementById("lastArticleLink");
  if (!link || allArticles.length === 0) return;
  const latest = [...allArticles].sort((a, b) => getComparableDate(b) - getComparableDate(a))[0];
  link.href = `article.html?id=${latest.id}&media=${latest.source}`;
}

// --- Dropdown header
const toggleButton = document.getElementById("dropdownToggle");
const dropdownMenu = document.getElementById("dropdownMenu");
if (toggleButton && dropdownMenu) {
  toggleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
  });
  window.addEventListener("click", () => dropdownMenu.style.display = "none");
  dropdownMenu.addEventListener("click", (e) => e.stopPropagation());
}

// --- Chargement
async function loadArticles() {
  const [snapImago, snapRTL] = await Promise.all([
    getDocs(collection(dbImago, "articles")),
    getDocs(collection(dbRTL,   "articles"))
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

  // Tri global par date décroissante (utilise realTimestamp si présent)
  allArticles.sort((a, b) => getComparableDate(b) - getComparableDate(a));

  updateCategoryFilter();
  displayArticles(allArticles);
  setLastArticleLink();

  // Listeners (attachés une seule fois ici)
  const mediaSel = document.getElementById("mediaFilter");
  const catSel   = document.getElementById("categoryFilter");
  if (mediaSel) mediaSel.addEventListener("change", () => { updateCategoryFilter(); filterAndDisplay(); });
  if (catSel)   catSel.addEventListener("change", filterAndDisplay);
}

// Démarrage
window.onload = loadArticles;