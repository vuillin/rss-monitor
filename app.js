const FEEDS = [
  {
    url: "https://news.ycombinator.com/rss",
    title: "Hacker News",
    image: "/hacker-news.svg"
  }
];

const statusText = document.querySelector("#status");
const result = document.querySelector("#feed-result");

loadFeeds();

async function loadFeeds() {
  setStatus("Recuperation des flux...");
  result.replaceChildren();

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  let articleCount = 0;
  let failedCount = 0;

  for (const resultItem of results) {
    if (resultItem.status === "fulfilled") {
      articleCount += resultItem.value.items.length;
      renderFeed(resultItem.value);
    } else {
      failedCount += 1;
      renderFeedError(resultItem.reason);
    }
  }

  if (articleCount === 0 && failedCount > 0) {
    setStatus("Aucun flux n'a pu etre recupere.");
    return;
  }

  setStatus(failedCount > 0 ? `${failedCount} flux ignore(s).` : "");
}

async function fetchFeed(source) {
  const response = await fetch(`/api/feed?url=${encodeURIComponent(source.url)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${source.url} - ${data.error || "Impossible de recuperer le flux."}`);
  }

  return {
    ...data.feed,
    title: source.title,
    image: source.image
  };
}

function renderFeedError(error) {
  const message = document.createElement("p");
  message.className = "feed-error";
  message.textContent = error.message;
  result.append(message);
}

function renderFeed(feed) {
  const header = document.createElement("div");
  header.className = "feed-header";

  const titleRow = document.createElement("div");
  titleRow.className = "feed-title-row";

  if (feed.image) {
    const logo = document.createElement("img");
    logo.className = "feed-logo";
    logo.src = feed.image;
    logo.alt = "";
    logo.loading = "lazy";
    titleRow.append(logo);
  }

  const title = document.createElement("h2");
  title.className = "feed-title";
  title.textContent = feed.title || "Flux RSS";

  titleRow.append(title);

  const count = document.createElement("span");
  count.className = "feed-count";
  count.textContent = `${feed.items.length} article(s)`;
  titleRow.append(count);

  header.append(titleRow);
  result.append(header);

  const divider = document.createElement("div");
  divider.className = "feed-divider";
  divider.setAttribute("aria-hidden", "true");
  result.append(divider);

  const carousel = document.createElement("div");
  carousel.className = "article-carousel";

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

    const meta = document.createElement("div");
    meta.className = "article-meta";

    const source = document.createElement("span");
    source.className = "article-source";

    if (feed.image) {
      const sourceLogo = document.createElement("img");
      sourceLogo.className = "article-source-logo";
      sourceLogo.src = feed.image;
      sourceLogo.alt = "";
      sourceLogo.loading = "lazy";
      source.append(sourceLogo);
    }

    const sourceName = document.createElement("span");
    sourceName.textContent = feed.title || "Flux RSS";
    source.append(sourceName);

    meta.append(source);

    if (item.pubDate) {
      const date = document.createElement("small");
      date.className = "article-date";

      const dateIcon = document.createElement("span");
      dateIcon.className = "article-date-icon";
      dateIcon.setAttribute("aria-hidden", "true");
      dateIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" focusable="false"><path d="M224.62-120q-27.62 0-46.12-18.5Q160-157 160-184.62v-510.76q0-27.62 18.5-46.12Q197-760 224.62-760h70.76v-89.23h43.08V-760h286.16v-89.23h40V-760h70.76q27.62 0 46.12 18.5Q800-723 800-695.38v510.76q0 27.62-18.5 46.12Q763-120 735.38-120H224.62Zm0-40h510.76q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93v-350.76H200v350.76q0 9.24 7.69 16.93 7.69 7.69 16.93 7.69ZM200-575.39h560v-119.99q0-9.24-7.69-16.93-7.69-7.69-16.93-7.69H224.62q-9.24 0-16.93 7.69-7.69 7.69-7.69 16.93v119.99Zm0 0V-720-575.39Z"/></svg>`;

      const dateText = document.createElement("span");
      dateText.textContent = formatArticleDate(item.pubDate);

      date.append(dateIcon, dateText);
      meta.append(date);
    }

    const title = document.createElement("span");
    title.className = "article-title";
    title.textContent = item.title || "Article sans titre";

    const separator = document.createElement("span");
    separator.className = "article-separator";
    separator.setAttribute("aria-hidden", "true");

    cardLink.append(meta, separator, title);

    if (item.description) {
      const description = document.createElement("p");
      description.className = "article-description";
      description.textContent = item.description;
      cardLink.append(description);
    }

    listItem.append(cardLink);
    list.append(listItem);
  }

  carousel.append(list);
  result.append(carousel);
}

function setStatus(message) {
  statusText.textContent = message;
}

function enableDragScroll(list) {
  let isDragging = false;
  let didDrag = false;
  let startX = 0;
  let startScrollLeft = 0;
  let capturedPointerId = null;
  const dragThreshold = 10;

  list.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    isDragging = true;
    didDrag = false;
    startX = event.clientX;
    startScrollLeft = list.scrollLeft;
  });

  list.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    const distance = event.clientX - startX;
    if (!didDrag && Math.abs(distance) > dragThreshold) {
      didDrag = true;
      list.classList.add("is-dragging");

      try {
        list.setPointerCapture(event.pointerId);
        capturedPointerId = event.pointerId;
      } catch {
        // Some browsers can reject capture if the pointer is already released.
      }
    }

    if (didDrag) {
      event.preventDefault();
      list.scrollLeft = startScrollLeft - distance;
    }
  });

  list.addEventListener("pointerup", (event) => {
    isDragging = false;
    list.classList.remove("is-dragging");

    if (capturedPointerId !== null) {
      try {
        list.releasePointerCapture(capturedPointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }

      capturedPointerId = null;
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
    capturedPointerId = null;
    list.classList.remove("is-dragging");
  });
}

function formatArticleDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace(/\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}$/, "");
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) {
    return "Aujourd'hui";
  }

  if (isSameDay(date, yesterday)) {
    return "Hier";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function isSameDay(date, referenceDate) {
  return date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate();
}
