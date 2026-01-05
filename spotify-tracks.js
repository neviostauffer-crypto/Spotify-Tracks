document.addEventListener("DOMContentLoaded", () => {
  const token = "BQDzAxxTFG_Qsxqk1spguw-yPM_PJkRzfxD21mb8qWFfkxjdCXdyXQPRUEDV5qg4Fe6dCIo-dBaEY_bsME3tu0yQqGZA2WmBz4hUnRemqSd68fBCYPB7oEL5z-tyiXOcPD5kPKVt0SM";
  const headers = { Authorization: `Bearer ${token}` };

  const searchType = document.getElementById("searchType");
  const searchInput = document.getElementById("searchInput");
  const results = document.getElementById("results");
  const autocompleteList = document.getElementById("autocompleteList");

  const wizardForm = document.getElementById("wizardForm");
  const toStep2 = document.getElementById("toStep2");
  const backTo1 = document.getElementById("backTo1");
  const steps = document.querySelectorAll(".step");

  function showStep(step) {
    steps.forEach(s => s.classList.add("d-none"));
    document.querySelector(`[data-step="${step}"]`).classList.remove("d-none");
  }

  searchType.addEventListener("change", () => {
    toStep2.disabled = !searchType.value;
  });

  toStep2.addEventListener("click", () => {
    showStep(2);
    searchInput.focus();
  });

  backTo1.addEventListener("click", () => {
    showStep(1);
    searchInput.value = "";
    results.innerHTML = "";
    autocompleteList.innerHTML = "";
  });

  wizardForm.addEventListener("submit", e => {
    e.preventDefault();
    autocompleteList.innerHTML = "";
    searchSpotify();
  });

  async function searchSpotify() {
    const query = searchInput.value.trim();
    if (!query) return;

    const type = searchType.value;
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=8`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    results.innerHTML = "";

    if (type === "track") renderTracks(data.tracks.items);
    if (type === "artist") renderArtists(data.artists.items);
    if (type === "album") renderAlbums(data.albums.items);
  }

  /* ---------- RENDER ---------- */
  function renderTracks(tracks) {
    renderCards(tracks.map(t => cardTemplate(t.id, t.name, t.album.images[0]?.url, "track", t.external_urls.spotify)));
  }

  function renderArtists(artists) {
    renderCards(artists.map(a => cardTemplate(a.id, a.name, a.images[0]?.url, "artist", a.external_urls.spotify)));
  }

  function renderAlbums(albums) {
    renderCards(albums.map(a => cardTemplate(a.id, a.name, a.images[0]?.url, "album", a.external_urls.spotify)));
  }

  function renderCards(cards) {
    // Fragment zur Minimierung von Forced Reflows
    const fragment = document.createDocumentFragment();
    cards.forEach(html => {
      const div = document.createElement("div");
      div.innerHTML = html;
      fragment.appendChild(div.firstElementChild);
    });
    results.appendChild(fragment);
  }

  function cardTemplate(id, title, img, type, spotifyUrl) {
    return `
      <div class="col-md-3">
        <div class="card clickable h-100"
             data-type="${type}"
             data-id="${id}"
             data-spotify="${spotifyUrl}">
          <img src="${img || 'https://via.placeholder.com/300'}" alt="${title}">
          <div class="card-body d-flex flex-column">
            <h3 class="h6">${title}</h3>
            <a href="${spotifyUrl}" target="_blank" rel="noopener"
               class="btn btn-outline-success btn-sm mt-auto"
               aria-label="${title} auf Spotify öffnen">
               Auf Spotify öffnen
            </a>
          </div>
        </div>
      </div>`;
  }

  /* ---------- MODAL ---------- */
  results.addEventListener("click", async e => {
    const card = e.target.closest(".clickable");
    if (!card) return;

    const id = card.dataset.id;
    const type = card.dataset.type;
    const spotifyUrl = card.dataset.spotify;

    if (type === "track") openTrack(id, spotifyUrl);
    if (type === "artist") openArtist(id, spotifyUrl);
    if (type === "album") openAlbum(id, spotifyUrl);
  });

  async function openTrack(id, spotifyUrl) {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, { headers });
    const t = await res.json();
    openModal(t.name, `
      ${accordion("Künstler", t.artists.map(a => a.name).join(", "), "a1")}
      ${accordion("Album", t.album.name, "a2")}
      ${accordion("Länge", formatDuration(t.duration_ms), "a3")}
    `, spotifyUrl);
  }

  async function openArtist(id, spotifyUrl) {
    const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, { headers });
    const a = await res.json();
    const genres = a.genres.length ? a.genres.join(", ") : "kein spezifisches Genre";

    openModal(a.name, `
      ${accordion("Genres", genres, "a1")}
      ${accordion("Follower", a.followers.total.toLocaleString(), "a2")}
      ${accordion("Popularität", a.popularity + " / 100", "a3")}
    `, spotifyUrl);
  }

  async function openAlbum(id, spotifyUrl) {
    const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, { headers });
    const a = await res.json();
    const total = a.tracks.items.reduce((s, t) => s + t.duration_ms, 0);

    openModal(a.name, `
      ${accordion("Künstler", a.artists.map(ar => ar.name).join(", "), "a1")}
      ${accordion("Anzahl Songs", a.total_tracks, "a2")}
      ${accordion("Gesamtlaufzeit", formatDuration(total), "a3")}
    `, spotifyUrl);
  }

  function openModal(title, content, spotifyUrl) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalAccordion").innerHTML = content;
    const link = document.getElementById("spotifyLink");
    link.href = spotifyUrl;
    link.setAttribute("aria-label", `${title} auf Spotify öffnen`);
    new bootstrap.Modal(document.getElementById("infoModal")).show();
  }

  function accordion(title, content, id) {
    return `
      <div class="accordion-item bg-dark text-white">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed bg-dark text-white"
                  data-bs-toggle="collapse"
                  data-bs-target="#${id}">
            ${title}
          </button>
        </h2>
        <div id="${id}" class="accordion-collapse collapse">
          <div class="accordion-body">${content}</div>
        </div>
      </div>`;
  }

  function formatDuration(ms) {
    const min = Math.floor(ms / 60000);
    const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    return `${min}:${sec} min`;
  }

  /* ---------- AUTOCOMPLETE ---------- */
  let debounceTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    const query = searchInput.value.trim();
    if (!query) {
      autocompleteList.innerHTML = "";
      return;
    }

    debounceTimeout = setTimeout(async () => {
      const type = searchType.value;
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`;
      const res = await fetch(url, { headers });
      const data = await res.json();

      let items = [];
      if (type === "track") items = data.tracks?.items || [];
      if (type === "artist") items = data.artists?.items || [];
      if (type === "album") items = data.albums?.items || [];

      // Minimiert Forced Reflows
      const fragment = document.createDocumentFragment();
      autocompleteList.innerHTML = "";
      items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item.name;
        li.className = "list-group-item list-group-item-action";
        li.addEventListener("click", () => {
          searchInput.value = item.name;
          autocompleteList.innerHTML = "";
        });
        fragment.appendChild(li);
      });
      autocompleteList.appendChild(fragment);
    }, 250); // Debounce, um API-Calls zu reduzieren
  });
});
