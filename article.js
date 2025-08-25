import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { toHTML } from "https://cdn.jsdelivr.net/npm/@odiffey/discord-markdown@3.3.0/+esm";

// 🔧 Configs Firebase
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

// 🔌 Initialisation Firebase
const appImago = initializeApp(configImago, "imago");
const appRTL = initializeApp(configRTL, "rtl");
const dbImago = getFirestore(appImago);
const dbRTL = getFirestore(appRTL);

const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get("id");
const media = urlParams.get("media");

const toggleButton = document.getElementById('dropdownToggle');
const dropdownMenu = document.getElementById('dropdownMenu');

if (toggleButton && dropdownMenu) {
  toggleButton.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = (dropdownMenu.style.display === 'block') ? 'none' : 'block';
  });

  window.addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
  });

  dropdownMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// === Emoji via images hébergées sur GitHub Pages ===
const EMOJI_MAP = {
    ":lieu:"  : "https://tris-250.github.io/RTL-World/emojis/lieu.png",
    ":source:": "https://tris-250.github.io/RTL-World/emojis/source.png",
    ":logo:"  : "https://tris-250.github.io/RTL-World/emojis/logo.png"
};

showdown.extension('customEmoji', function () {
  return [{
    type: 'lang',
    regex: /:(lieu|source|logo):/g,
    replace: (match, key) => {
      const url = EMOJI_MAP[":" + key + ":"];
      return url
        ? `<img class="emoji" src="${url}" alt="${match}" loading="lazy">`
        : match;
    }
  }];
});

const converter = new showdown.Converter({
  simplifiedAutoLink: true,
  strikethrough: true,
  tables: true,
  extensions: ['customEmoji']  // <== seulement customEmoji
});

setLastArticleLink();

function getSourceFullName(media) {
  switch (media) {
    case "imago": return "Imago Veritatis";
    case "rtl": return "RTL World";
    default: return "Source inconnue";
  }
}

async function loadArticle() {
  if (!articleId || !media) {
    document.getElementById("article-content").innerHTML = "<p>Article introuvable</p>";
    return;
  }

  const db = media === "imago" ? dbImago : dbRTL;
  const articleRef = doc(db, "articles", articleId);
  const articleSnap = await getDoc(articleRef);    

  if (articleSnap.exists()) {
    let article = articleSnap.data();

    document.title = `${getSourceFullName(media)} - ${article.title}`;

    document.getElementById("article-category").textContent = article.category;

    let discordContent = toHTML(article.content);
    let htmlContent = discordContent.replaceAll('</small>', '</small><br>');

    document.getElementById("article-content").innerHTML = `
      <h1 class="article-title">${article.title}</h1>
      <p class="article-meta">${article.author} - ${article.timestamp} | Source : ${getSourceFullName(media)}</p>
      <div class="article-body">${htmlContent}</div>
    `;

    if (article.image) {
      let img = document.createElement("img");
      img.src = article.image;
      img.alt = "Illustration";
      img.classList.add("article-image");
      document.body.appendChild(img);
    }
  } else {
    document.getElementById("article-content").innerHTML = "<p>Article non trouvé</p>";
  }
}
async function setLastArticleLink() {
  try {
    console.log("Début de la récupération du dernier article...");

    // Récupérer le dernier article de chaque journal
    const [imagoSnapshot, rtlSnapshot] = await Promise.all([
      getDocs(query(collection(dbImago, 'articles'), orderBy('realTimestamp', 'desc'), limit(1))),
      getDocs(query(collection(dbRTL, 'articles'), orderBy('realTimestamp', 'desc'), limit(1)))
    ]);

    console.log("Nombre d'articles Imago récupérés :", imagoSnapshot.size);
    console.log("Nombre d'articles RTL récupérés :", rtlSnapshot.size);

    let latestArticle = null;
    let latestDate = new Date(0); // Date très ancienne

    // Vérifiez le dernier article d'Imago
    if (!imagoSnapshot.empty) {
      const docSnap = imagoSnapshot.docs[0];
      const articleData = docSnap.data();
      const articleDate = getComparableDate(articleData);
      console.log("Dernier article Imago trouvé :", articleData, "Date :", articleDate);

      if (articleDate > latestDate) {
        latestDate = articleDate;
        latestArticle = { id: docSnap.id, source: 'imago', ...articleData };
      }
    }

    // Vérifiez le dernier article de RTL
    if (!rtlSnapshot.empty) {
      const docSnap = rtlSnapshot.docs[0];
      const articleData = docSnap.data();
      const articleDate = getComparableDate(articleData);
      console.log("Dernier article RTL trouvé :", articleData, "Date :", articleDate);

      if (articleDate > latestDate) {
        latestDate = articleDate;
        latestArticle = { id: docSnap.id, source: 'rtl', ...articleData };
      }
    }

    if (latestArticle) {
      const link = document.getElementById('lastArticleLink');
      if (link) {
        link.href = `article.html?id=${latestArticle.id}&media=${latestArticle.source}`;
        console.log("Lien du dernier article mis à jour :", link.href);
      } else {
        console.error("Élément 'lastArticleLink' non trouvé dans le DOM.");
      }
    } else {
      console.warn("Aucun article trouvé pour mettre à jour le lien du dernier article.");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du dernier article :", error);
  }
}

window.onload = loadArticle;