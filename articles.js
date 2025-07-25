// ✅ OMJL - articles.js combiné RTL World + Imago Veritatis

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, startAfter, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { toHTML } from "https://cdn.jsdelivr.net/npm/@odiffey/discord-markdown@3.3.0/+esm";

// Configs Firebase
const configRTL = {
    apiKey: "AIzaSyBw7PSHW4fe2jptxyf7xHtyINSrYG_TupA",
    authDomain: "rtl-world.firebaseapp.com",
    projectId: "rtl-world",
    storageBucket: "rtl-world.firebasestorage.app",
    messagingSenderId: "1092619392407",
    appId: "1:1092619392407:web:f968b6ef5416d66d6360d2"
};

const configImago = {
    apiKey: "AIzaSyCaexv-0SVEmPeRNYt-WviKBiUhH-Ju7XQ",
    authDomain: "imago-veritatis.firebaseapp.com",
    projectId: "imago-veritatis",
    storageBucket: "imago-veritatis.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:exampleid1"
};

const appRTL = initializeApp(configRTL, "rtl");
const appImago = initializeApp(configImago, "imago");
const dbs = {
    rtl: getFirestore(appRTL),
    imago: getFirestore(appImago)
};

const pageSize = 8;
let lastVisibleDocs = { rtl: null, imago: null };
let hasMore = { rtl: true, imago: true };
let isLoading = false;
let currentSource = "all";

const articlesContainer = document.getElementById("articles-container");
const mediaFilter = document.getElementById("mediaFilter");
const sentinel = document.createElement("div");
sentinel.id = "scroll-sentinel";
articlesContainer.after(sentinel);

const allArticles = [];

function safeTruncate(html, maxLen) {
  let truncated = html.slice(0, maxLen);
  truncated = truncated.replace(/&[^
\s;]*?$/, '');
  truncated = truncated.replace(/<[^>]*?$/, '');
  const openTags = [...truncated.matchAll(/<([a-z]+)(\s[^>]*)?>/gi)].map(m => m[1]);
  const closeTags = [...truncated.matchAll(/<\/([a-z]+)>/gi)].map(m => m[1]);
  const stack = [];
  openTags.forEach(tag => {
    const idxClose = closeTags.indexOf(tag);
    if (idxClose !== -1) closeTags.splice(idxClose, 1);
    else stack.push(tag);
  });
  stack.reverse().forEach(tag => {
    truncated += `</${tag}>`;
  });
  return truncated;
}

function showPlaceholders() {
  for (let i = 0; i < 3; i++) {
    const p = document.createElement("div");
    p.className = "article-card placeholder";
    p.innerHTML = `<h2>Chargement...</h2><div class="shimmer"></div>`;
    articlesContainer.appendChild(p);
  }
}

function removePlaceholders() {
  document.querySelectorAll(".placeholder").forEach(e => e.remove());
}

function displayArticles() {
  articlesContainer.innerHTML = "";
  let toDisplay = [...allArticles];
  if (currentSource !== "all") {
    toDisplay = toDisplay.filter(a => a.source === currentSource);
  }
  toDisplay.sort((a, b) => b.timestamp - a.timestamp).forEach(data => {
    const label = data.source === "rtl" ? "RTL World" : "Imago Veritatis";
    const el = document.createElement("div");
    el.classList.add("article-card");
    el.innerHTML = `
      <a href="article.html?id=${data.id}&media=${data.source}" class="article-link">
        <h2>${data.title}</h2>
        <p>Auteur : ${data.author} – Publié le : ${data.dateStr} – Catégorie : ${data.category || "Non spécifiée"} – Source : ${label}</p>
        <div>${data.preview}...</div>
        ${data.meme ? `<img src="${data.meme}" alt="Illustration" class="article-image">` : ''}
      </a>
    `;
    articlesContainer.appendChild(el);
  });
}

async function loadBatch(source) {
  if (isLoading || !hasMore[source]) return;
  isLoading = true;
  showPlaceholders();

  const db = dbs[source];
  const col = collection(db, "articles");
  let q = query(col, orderBy("realTimestamp", "desc"), limit(pageSize));
  if (lastVisibleDocs[source]) {
    q = query(col, orderBy("realTimestamp", "desc"), startAfter(lastVisibleDocs[source]), limit(pageSize));
  }

  const snap = await getDocs(q);
  removePlaceholders();

  if (snap.empty) {
    hasMore[source] = false;
    isLoading = false;
    return;
  }

  lastVisibleDocs[source] = snap.docs[snap.docs.length - 1];

  for (const doc of snap.docs) {
    const d = doc.data();
    const html = toHTML(d.content || "");
    const preview = safeTruncate(html.replaceAll('</small>', '</small><br>'), 300);

    const timestamp = typeof d.realTimestamp?.toDate === 'function'
      ? d.realTimestamp.toDate()
      : d.realTimestamp?.seconds
      ? new Date(d.realTimestamp.seconds * 1000)
      : new Date();

    allArticles.push({
      id: doc.id,
      title: d.title,
      author: d.author,
      category: d.category,
      meme: d.meme,
      preview,
      timestamp,
      dateStr: timestamp.toLocaleDateString(),
      source
    });
  }

  displayArticles();
  isLoading = false;
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && currentSource === "all") {
      loadBatch("rtl");
      loadBatch("imago");
    } else if (entry.isIntersecting) {
      loadBatch(currentSource);
    }
  });
}, { rootMargin: "200px" });

observer.observe(sentinel);

if (mediaFilter) {
  mediaFilter.addEventListener("change", () => {
    currentSource = mediaFilter.value;
    displayArticles();
  });
}

loadBatch("rtl");
loadBatch("imago");