// Warten, bis das komplette HTML-Dokument geladen ist
document.addEventListener("DOMContentLoaded", () => {

  // Spotify API Token (gültig für 1 Stunde)
  // Wird benötigt, um autorisierte Anfragen an die Spotify API zu senden
  const token = "BQDHZ0KPeLxYF7-EkD8hzgpjlM43op5kqXmVZ71A2hjaoMq5P7osuYzF3hPhOaPwXEZKJsH5GUk1-OcEZ7A80hqRcI3ANz1xc466dvJ3wi3KvBMhSjK0tK9QedhI6r-it41iL1NTaaE";

  // HTTP-Header mit Authorization für alle Fetch-Anfragen
  const headers = { Authorization: `Bearer ${token}` };

  /* ---------- DOM-ELEMENTE ---------- */

  // Auswahl Song / Künstler / Album
  const searchType = document.getElementById("searchType");

  // Texteingabe für Suchbegriff
  const searchInput = document.getElementById("searchInput");

  // Container für Suchergebnisse (Cards)
  const results = document.getElementById("results");

  // Liste für Autocomplete-Vorschläge
  const autocompleteList = document.getElementById("autocompleteList");

  // Formular (Wizard)
  const wizardForm = document.getElementById("wizardForm");

  // Buttons für Formularnavigation
  const toStep2 = document.getElementById("toStep2");
  const backTo1 = document.getElementById("backTo1");

  // Alle Formular-Schritte
  const steps = document.querySelectorAll(".step");

  /* ---------- FORMULAR-NAVIGATION (Wizard) ---------- */

  // Zeigt nur den gewünschten Schritt an
  function showStep(step) {
    steps.forEach(s => s.classList.add("d-none"));
    document.querySelector(`[data-step="${step}"]`).classList.remove("d-none");
  }

  // Aktiviert den "Weiter"-Button erst, wenn ein Suchtyp gewählt wurde
  searchType.addEventListener("change", () => {
    toStep2.disabled = !searchType.value;
  });

  // Wechsel zu Schritt 2
  toStep2.addEventListener("click", () => {
    showStep(2);
    searchInput.focus();
  });

  // Zurück zu Schritt 1 und Zurücksetzen der Ergebnisse
  backTo1.addEventListener("click", () => {
    showStep(1);
    searchInput.value = "";
    results.innerHTML = "";
    autocompleteList.innerHTML = "";
  });

  // Formular absenden (Suche starten)
  wizardForm.addEventListener("submit", e => {
    e.preventDefault(); // verhindert Seitenreload
    autocompleteList.innerHTML = "";
    searchSpotify();
  });

  /* ---------- SPOTIFY SUCHE ---------- */

  // Führt die eigentliche Suche bei Spotify aus
  async function searchSpotify() {
    const query = searchInput.value.trim();
    if (!query) return;

    const type = searchType.value;

    // Spotify Search Endpoint
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=8`;

    const res = await fetch(url, { headers });
    const data = await res.json();

    results.innerHTML = "";

    // Je nach Suchtyp unterschiedliche Daten rendern
    if (type === "track") renderTracks(data.tracks.items);
    if (type === "artist") renderArtists(data.artists.items);
    if (type === "album") renderAlbums(data.albums.items);
  }

  /* ---------- RENDERING DER ERGEBNISSE ---------- */

  // Songs rendern
  function renderTracks(tracks) {
    renderCards(
      tracks.map(t =>
        cardTemplate(
          t.id,
          t.name,
          t.album.images[0]?.url,
          "track",
          t.external_urls.spotify
        )
      )
    );
  }

  // Künstler rendern
  function renderArtists(artists) {
    renderCards(
      artists.map(a =>
        cardTemplate(
          a.id,
          a.name,
          a.images[0]?.url,
          "artist",
          a.external_urls.spotify
        )
      )
    );
  }

  // Alben rendern
  function renderAlbums(albums) {
    renderCards(
      albums.map(a =>
        cardTemplate(
          a.id,
          a.name,
          a.images[0]?.url,
          "album",
          a.external_urls.spotify
        )
      )
    );
  }

  // Fügt mehrere Cards performant ins DOM ein
  function renderCards(cards) {
    const fragment = document.createDocumentFragment();

    cards.forEach(html => {
      const div = document.createElement("div");
      div.innerHTML = html;
      fragment.appendChild(div.firstElementChild);
    });

    results.appendChild(fragment);
  }

  // HTML-Template für eine einzelne Card
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

  /* ---------- MODAL & DETAILANSICHT ---------- */

  // Klick auf eine Card → Modal öffnen
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

  // Track-Details laden
  async function openTrack(id, spotifyUrl) {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, { headers });
    const t = await res.json();

    openModal(
      t.name,
      `
        ${accordion("Künstler", t.artists.map(a => a.name).join(", "), "a1")}
        ${accordion("Album", t.album.name, "a2")}
        ${accordion("Länge", formatDuration(t.duration_ms), "a3")}
      `,
      spotifyUrl
    );
  }

  // Künstler-Details laden
  async function openArtist(id, spotifyUrl) {
    const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, { headers });
    const a = await res.json();

    openModal(
      a.name,
      `
        ${accordion("Genres", a.genres.join(", ") || "keine Angaben", "a1")}
        ${accordion("Follower", a.followers.total.toLocaleString(), "a2")}
        ${accordion("Popularität", a.popularity + " / 100", "a3")}
      `,
      spotifyUrl
    );
  }

  // Album-Details laden
  async function openAlbum(id, spotifyUrl) {
    const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, { headers });
    const a = await res.json();

    const total = a.tracks.items.reduce((sum, t) => sum + t.duration_ms, 0);

    openModal(
      a.name,
      `
        ${accordion("Künstler", a.artists.map(ar => ar.name).join(", "), "a1")}
        ${accordion("Anzahl Songs", a.total_tracks, "a2")}
        ${accordion("Gesamtlaufzeit", formatDuration(total), "a3")}
      `,
      spotifyUrl
    );
  }

  // Öffnet das Bootstrap Modal
  function openModal(title, content, spotifyUrl) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalAccordion").innerHTML = content;

    const link = document.getElementById("spotifyLink");
    link.href = spotifyUrl;

    new bootstrap.Modal(document.getElementById("infoModal")).show();
  }

  // Accordion-HTML-Template
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

  // Formatiert Millisekunden in Minuten:Sekunden
  function formatDuration(ms) {
    const min = Math.floor(ms / 60000);
    const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    return `${min}:${sec} min`;
  }

  /* ---------- AUTOCOMPLETE ---------- */

  let debounceTimeout;

  // Autocomplete während der Eingabe
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);

    const query = searchInput.value.trim();
    if (!query) {
      autocompleteList.innerHTML = "";
      return;
    }

    // Verzögert API-Aufruf (Performance)
    debounceTimeout = setTimeout(async () => {
      const type = searchType.value;
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`;

      const res = await fetch(url, { headers });
      const data = await res.json();

      let items = [];
      if (type === "track") items = data.tracks?.items || [];
      if (type === "artist") items = data.artists?.items || [];
      if (type === "album") items = data.albums?.items || [];

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
    }, 250);
  });
});
