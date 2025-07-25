// articles.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { toHTML } from "https://cdn.jsdelivr.net/npm/@odiffey/discord-markdown@1.4.4/index.min.js";

// CONFIGS
const configs = [
  {
    name: "RTL World",
    source: "rtl-world",
    firebaseConfig: {
      apiKey: "AIzaSyBw7PSHW4fe2jptxyf7xHtyINSrYG_TupA",
      authDomain: "rtl-world.firebaseapp.com",
      projectId: "rtl-world",
    },
  },
  {
    name: "Imago Veritatis",
    source: "imago-veritatis",
    firebaseConfig: {
      apiKey: "AIzaSyD-5pyznzIMvmG5-qyRMSr0UXq7nDbJNuU",
      authDomain: "imago-veritatis.firebaseapp.com",
      projectId: "imago-veritatis",
    },
  },
];

let allArticles = [];
let lastVisiblePerSource = {};
let loading = false;

async function fetchNextBatch() {
  if (loading) return;
  loading = true;

  for (const config of configs) {
    const app = initializeApp(config.firebaseConfig, config.source);
    const db = getFirestore(app);
    const articlesRef = collection(db, "articles");

    let q = query(articlesRef, orderBy("realTimestamp", "desc"), limit(6));

    if (lastVisiblePerSource[config.source]) {
      q = query(
        articlesRef,
        orderBy("realTimestamp", "desc"),
        startAfter(lastVisiblePerSource[config.source]),
        limit(6)
      );
    }

    const snap = await getDocs(q);

    if (!snap.empty) {
      lastVisiblePerSource[config.source] = snap.docs[snap.docs.length - 1];

      for (const doc of snap.docs) {
        const d = doc.data();
        d.sourceName = config.name;
        allArticles.push(d);
      }
    }
  }

  // Tri des articles toutes sources confondues par date décroissante
  allArticles.sort((a, b) => {
    const dateA = a.realTimestamp?.toDate?.() ?? new Date(a.realTimestamp?.seconds * 1000);
    const dateB = b.realTimestamp?.toDate?.() ?? new Date(b.realTimestamp?.seconds * 1000);
    return dateB - dateA;
  });

  displayArticles();
  loading = false;
}

function displayArticles() {
  const container = document.getElementById("articles");
  container.innerHTML = "";

  for (const article of allArticles) {
    const html = toHTML(article.content || "");
    const preview = truncateHTML(html, 300);

    const timestamp = article.realTimestamp?.toDate?.() ?? new Date(article.realTimestamp?.seconds * 1000);
    const date = timestamp instanceof Date ? timestamp.toLocaleDateString() : "?";

    const card = document.createElement("div");
    card.className = "article-card";
    card.innerHTML = `
      <h3>${article.title || "Sans titre"}</h3>
      <p class="meta">Auteur : ${article.author || "?"} – Publié le : ${date} – Catégorie : ${article.category || "?"} – Source : ${article.sourceName}</p>
      <div class="preview">${preview}</div>
    `;
    container.appendChild(card);
  }
}

function truncateHTML(html, maxLength) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  let output = "";
  let total = 0;

  for (const node of temp.childNodes) {
    if (total >= maxLength) break;
    const text = node.textContent;
    if (text) {
      const chunk = text.slice(0, maxLength - total);
      output += chunk;
      total += chunk.length;
    }
  }
  return output + (total >= maxLength ? "..." : "");
}

// Scroll infini
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    fetchNextBatch();
  }
});

// Chargement initial
fetchNextBatch();