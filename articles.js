// articles.js combiné pour RTL World et Imago Veritatis

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  startAfter,
  limit
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { toHTML } from "https://cdn.jsdelivr.net/npm/@odiffey/discord-markdown@3.3.0/+esm";

const configs = [
  {
    name: "RTL World",
    source: "rtl-world",
    firebaseConfig: {
      apiKey: "AIzaSyBw7PSHW4fe2jptxyf7xHtyINSrYG_TupA",
      authDomain: "rtl-world.firebaseapp.com",
      projectId: "rtl-world"
    }
  },
  {
    name: "Imago Veritatis",
    source: "imago-veritatis",
    firebaseConfig: {
      apiKey: "AIzaSyCaexv-0SVEmPeRNYt-WviKBiUhH-Ju7XQ",
      authDomain: "imago-veritatis.firebaseapp.com",
      projectId: "imago-veritatis"
    }
  }
];

const pageSize = 6;
let allArticles = [];
let lastVisiblePerSource = {};
let isLoading = false;
let hasMore = true;

window.addEventListener("DOMContentLoaded", () => {
  const articlesContainer = document.getElementById("articles-container");
  const categoryFilter = document.getElementById("categoryFilter");
  const sentinel = document.createElement("div");
  sentinel.id = "scroll-sentinel";
  articlesContainer.after(sentinel);
  const categoriesSet = new Set();

  categoryFilter.addEventListener("change", () => {
    const selected = categoryFilter.value;
    const filtered = selected === "all" ? allArticles : allArticles.filter(a => a.category === selected);
    displayArticlesFromList(filtered);
  });

  function safeTruncate(html, maxLen) {
    let truncated = html.slice(0, maxLen);
    truncated = truncated.replace(/&[^\s;]*?$/, '');
    truncated = truncated.replace(/<[^>]*?$/, '');
    const openTags = [...truncated.matchAll(/<([a-z]+)(\s[^>]*)?>/gi)].map(m => m[1]);
    const closeTags = [...truncated.matchAll(/<\/([a-z]+)>/gi)].map(m => m[1]);
    const stack = [];
    openTags.forEach(tag => {
      const idxClose = closeTags.indexOf(tag);
      if (idxClose !== -1) closeTags.splice(idxClose, 1);
      else stack.push(tag);
    });
    stack.reverse().forEach(tag => truncated += `</${tag}>`);
    return truncated;
  }

  function displayArticlesFromList(list) {
    articlesContainer.innerHTML = "";
    list.forEach(article => {
      const el = document.createElement("div");
      el.classList.add("article-card");
      el.innerHTML = `
        <a href="article.html?id=${article.id}" class="article-link">
            <h2>${article.title}</h2>
            <p>Auteur : ${article.author} - Publié le : ${article.dateStr} - Catégorie : ${article.category} - Source : ${article.source}</p>
            <div>${article.previewHTML}...</div>
            ${article.meme ? `<img src="${article.meme}" alt="Meme" class="article-image">` : ''}
        </a>
      `;
      articlesContainer.appendChild(el);
    });
  }

  async function fetchArticlesFromSource(config) {
    const app = initializeApp(config.firebaseConfig, config.source);
    const db = getFirestore(app);
    const articlesRef = collection(db, "articles");

    let q = query(articlesRef, orderBy("realTimestamp", "desc"), limit(pageSize));
    if (lastVisiblePerSource[config.source]) {
      q = query(articlesRef, orderBy("realTimestamp", "desc"), startAfter(lastVisiblePerSource[config.source]), limit(pageSize));
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    lastVisiblePerSource[config.source] = snapshot.docs[snapshot.docs.length - 1];

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const discordContent = toHTML(data.content || "");
      const htmlContent = discordContent.replaceAll('</small>', '</small><br>');
      return {
        id: docSnap.id,
        title: data.title,
        author: data.author,
        category: data.category,
        meme: data.meme,
        dateStr: data.timestamp || data.realTimestamp?.toDate()?.toLocaleDateString() || "?",
        previewHTML: safeTruncate(htmlContent, 300),
        source: config.name
      };
    });
  }

  async function loadNextBatch() {
    if (isLoading || !hasMore) return;
    isLoading = true;

    const batchArticles = await Promise.all(configs.map(fetchArticlesFromSource));
    const newArticles = batchArticles.flat();

    if (newArticles.length === 0) {
      hasMore = false;
      isLoading = false;
      return;
    }

    allArticles = [...allArticles, ...newArticles].sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

    newArticles.forEach(article => {
      if (article.category && !categoriesSet.has(article.category)) {
        categoriesSet.add(article.category);
        const option = document.createElement("option");
        option.value = article.category;
        option.textContent = article.category;
        categoryFilter.appendChild(option);
      }
    });

    displayArticlesFromList(allArticles);
    isLoading = false;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) loadNextBatch();
    });
  }, { rootMargin: "200px" });
  observer.observe(sentinel);

  loadNextBatch();
});