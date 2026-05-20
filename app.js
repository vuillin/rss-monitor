const FEED_URLS = [
  "https://feeds.arstechnica.com/arstechnica/index"
];

const statusText = document.querySelector("#status");
const result = document.querySelector("#feed-result");

loadFeeds();

async function loadFeeds() {
  setStatus("Recuperation des flux...");
  result.replaceChildren();

  try {
    const feeds = await Promise.all(FEED_URLS.map(fetchFeed));
    let articleCount = 0;

    for (const feed of feeds) {
      articleCount += feed.items.length;
      renderFeed(feed);
    }

    setStatus(`${articleCount} article(s) trouve(s).`);
  } catch (error) {
    setStatus(error.message);
  }
}

async function fetchFeed(url) {
  const response = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Impossible de recuperer le flux.");
  }

  return data.feed;
}

function renderFeed(feed) {
  const title = document.createElement("h2");
  title.className = "feed-title";
  title.textContent = feed.title || "Flux RSS";
  result.append(title);

  const carousel = document.createElement("div");
  carousel.className = "article-carousel";

  const previousButton = document.createElement("button");
  previousButton.className = "carousel-button carousel-button-previous";
  previousButton.type = "button";
  previousButton.textContent = "<";
  previousButton.setAttribute("aria-label", "Articles precedents");

  const nextButton = document.createElement("button");
  nextButton.className = "carousel-button carousel-button-next";
  nextButton.type = "button";
  nextButton.textContent = ">";
  nextButton.setAttribute("aria-label", "Articles suivants");

  const list = document.createElement("ul");
  list.className = "article-list";
  enableDragScroll(list);

  for (const item of feed.items) {
    const listItem = document.createElement("li");
    listItem.className = "article-item";

    const cardLink = document.createElement("a");
    cardLink.className = "article-card";
    cardLink.href = item.link || "#";
    cardLink.target = "_blank";
    cardLink.rel = "noreferrer";
    cardLink.draggable = false;
    cardLink.setAttribute("aria-label", item.title || "Article sans titre");

    const title = document.createElement("span");
    title.className = "article-title";
    title.textContent = item.title || "Article sans titre";

    cardLink.append(title);

    if (item.pubDate) {
      const date = document.createElement("small");
      date.className = "article-date";
      date.textContent = formatArticleDate(item.pubDate);
      cardLink.append(date);
    }

    if (item.description) {
      const description = document.createElement("p");
      description.className = "article-description";
      description.textContent = item.description;
      cardLink.append(description);
    }

    listItem.append(cardLink);
    list.append(listItem);
  }

  previousButton.addEventListener("click", () => {
    scrollCarousel(list, -1);
  });

  nextButton.addEventListener("click", () => {
    scrollCarousel(list, 1);
  });

  carousel.append(previousButton, list, nextButton);
  result.append(carousel);
}

function setStatus(message) {
  statusText.textContent = message;
}

function scrollCarousel(list, direction) {
  const card = list.querySelector(".article-item");
  const cardWidth = card ? card.getBoundingClientRect().width : 300;
  const gap = 16;

  list.scrollBy({
    left: direction * (cardWidth + gap),
    behavior: "smooth"
  });
}

function enableDragScroll(list) {
  let isDragging = false;
  let didDrag = false;
  let startX = 0;
  let startScrollLeft = 0;

  list.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    isDragging = true;
    didDrag = false;
    startX = event.clientX;
    startScrollLeft = list.scrollLeft;
    list.classList.add("is-dragging");

    try {
      list.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers can reject capture if the pointer is already released.
    }
  });

  list.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    const distance = event.clientX - startX;
    if (Math.abs(distance) > 5) {
      didDrag = true;
      event.preventDefault();
    }

    list.scrollLeft = startScrollLeft - distance;
  });

  list.addEventListener("pointerup", (event) => {
    isDragging = false;
    list.classList.remove("is-dragging");

    try {
      list.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  });

  list.addEventListener("click", (event) => {
    if (didDrag) {
      event.preventDefault();
      event.stopPropagation();
      didDrag = false;
    }
  }, true);

  list.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  list.addEventListener("pointercancel", () => {
    isDragging = false;
    list.classList.remove("is-dragging");
  });
}

function formatArticleDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace(/\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}$/, "");
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
