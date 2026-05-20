const form = document.querySelector("#feed-form");
const input = document.querySelector("#feed-url");
const statusText = document.querySelector("#status");
const result = document.querySelector("#feed-result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const url = input.value.trim();
  if (!url) {
    return;
  }

  setStatus("Recuperation du flux...");
  result.replaceChildren();

  try {
    const response = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Impossible de recuperer le flux.");
    }

    renderFeed(data.feed);
    setStatus(`${data.feed.items.length} article(s) trouve(s).`);
  } catch (error) {
    setStatus(error.message);
  }
});

function renderFeed(feed) {
  const title = document.createElement("h2");
  title.textContent = feed.title || "Flux RSS";
  result.append(title);

  const list = document.createElement("ul");

  for (const item of feed.items) {
    const listItem = document.createElement("li");
    const link = document.createElement("a");

    link.textContent = item.title || "Article sans titre";
    link.href = item.link || "#";
    link.target = "_blank";
    link.rel = "noreferrer";

    listItem.append(link);

    if (item.pubDate) {
      const date = document.createElement("small");
      date.textContent = ` - ${item.pubDate}`;
      listItem.append(date);
    }

    if (item.description) {
      const description = document.createElement("p");
      description.textContent = item.description;
      listItem.append(description);
    }

    list.append(listItem);
  }

  result.append(list);
}

function setStatus(message) {
  statusText.textContent = message;
}
