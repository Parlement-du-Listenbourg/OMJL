import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import showdown from "https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm";

// Configs Firebase
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

// Init Firebase
const appImago = initializeApp(configImago, "imago");
const appRTL = initializeApp(configRTL, "rtl");
const dbImago = getFirestore(appImago);
const dbRTL = getFirestore(appRTL);

// Markdown
showdown.extension('smallText', function () {
    return [{
        type: 'lang',
        regex: /-# (.*?)(\n|$)/g,
        replace: '<small>$1</small>$2'
    }];
});

const converter = new showdown.Converter({
    simplifiedAutoLink: true,
    strikethrough: true,
    tables: true,
    extensions: ['smallText']
});

function getFullSourceName(key) {
    return key === "imago" ? "Imago Veritatis" : key === "rtl" ? "RTL World" : "Inconnu";
}

let allArticles = [];

function getComparableDate(article) {
    if (article.timestamp?.seconds) {
        return new Date(article.timestamp.seconds * 1000);
    }
    if (typeof article.timestamp === "string") {
        const [d, m, y] = article.timestamp.split("/");
        return new Date(`${y}-${m}-${d}`);
    }
    return new Date(0);
}

async function loadArticles() {
    const [snapImago, snapRTL] = await Promise.all([
        getDocs(collection(dbImago, "articles")),
        getDocs(collection(dbRTL, "articles"))
    ]);

    allArticles = [];

    snapImago.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        data.source = "imago";
        allArticles.push(data);
    });

    snapRTL.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        data.source = "rtl";
        allArticles.push(data);
    });

    allArticles.sort((a, b) => getComparableDate(b) - getComparableDate(a));

    populateMediaFilter();
    updateCategoryFilter();
    displayArticles(allArticles);

    document.getElementById("mediaFilter").addEventListener("change", () => {
        updateCategoryFilter();
        filterAndDisplay();
    });

    document.getElementById("categoryFilter").addEventListener("change", () => {
        filterAndDisplay();
    });
}

function populateMediaFilter() {
    // Media filter is already hardcoded
}

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

    let filtered = allArticles.filter(a => {
        return (media === "all" || a.source === media) &&
               (category === "all" || a.category === category);
    });

    displayArticles(filtered);
}

function displayArticles(articles) {
    const container = document.getElementById("articles-container");
    container.innerHTML = "";

    articles.forEach(article => {
        const preview = converter.makeHtml(article.content.substring(0, 200));
        const card = document.createElement("div");
        card.className = "article-card";
        card.innerHTML = `
            <a href="article.html?id=${article.id}&media=${article.source}" class="article-link">
                <h2>${article.title}</h2>
                <p>
                    Auteur : ${article.author} – Publié le : ${article.timestamp} – Catégorie : ${article.category || "Non spécifiée"} |
                    Source : <strong>${getFullSourceName(article.source)}</strong>
                </p>
                <div>${preview}...</div>
                ${article.meme ? `<img src="${article.meme}" alt="Illustration" class="article-image">` : ''}
            </a>
        `;
        container.appendChild(card);
    });
}

window.onload = loadArticles;