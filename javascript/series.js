import {
  toggleLikeItem,
  isItemLiked,
  updateLikeIcon,
  setupSearchListeners,
  IMAGE_BASE_URL,
  loadGenres,
  loadMoviesByGenre,
  loadPaginatedContent,
  setupPagination,
  checkAndHideNavForGuest,
} from "../javascript/tmdbModule.js";

const contentGrid = document.getElementById("contentGrid");
const searchButton = document.getElementById("searchButton");
const searchInput = document.getElementById("searchInput");
const genreSelect = document.getElementById("selectMovieTvGenre");

let currentPage = 1;
let totalPages = 1;
let currentType = "tv"; //tv or "tv"

// --- TV GENRE SUPPORT ---
// Helper to load TV genres
const loadTVGenres = async () => {
  // Use backend proxy to keep API key secure
  const url = `/api/tmdb-proxy?endpoint=genre/tv/list&language=en-US`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.genres || [];
  } catch (error) {
    console.error("Error fetching TV genres:", error);
    return [];
  }
};

// Helper to load TV series by genre
const loadTVByGenre = async (genreId, page = 1) => {
  // Use backend proxy to keep API key secure
  const url = `/api/tmdb-proxy?endpoint=discover/tv&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      results: data.results || [],
      totalPages: data.total_pages || 1,
    };
  } catch (error) {
    console.error("Error fetching TV by genre:", error);
    return { results: [], totalPages: 1 };
  }
};

// Patch displayContent to protect like and details
function displayContentProtected(items) {
  contentGrid.innerHTML = "";
  items.forEach((item) => {
    if (item.poster_path) {
      const isLiked = isItemLiked(item.id);
      const contentItem = document.createElement("div");
      contentItem.classList.add("grid-item");
      contentItem.innerHTML = `
        <img src="${IMAGE_BASE_URL + item.poster_path}" alt="${
        item.name
      }" class="grid-image">
        <div class="content-info">
          <p>${item.name} (${new Date(item.first_air_date).getFullYear()})</p>
          <div class="actions">
            <a href="#" class="details-link" data-id="${
              item.id
            }" data-type="tv">
              <button class="view-details-button">View Details</button>
            </a>
            <div class="addToList">
              <span class="material-icons like-icon" data-id="${item.id}">
                ${isLiked ? "favorite" : "favorite_border"}
              </span>
            </div>
          </div>
        </div>
      `;
      // Like button protection
      const likeIcon = contentItem.querySelector(".like-icon");
      likeIcon.addEventListener("click", async (e) => {
        const user = await getLoggedInUser();
        if (!user) {
          alert("You need to login to like items.");
          return;
        }
        toggleLikeItem(item);
        updateLikeIcon(item.id);
      });
      // Details button protection
      const detailsLink = contentItem.querySelector(".details-link");
      detailsLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const user = await getLoggedInUser();
        if (!user) {
          alert("You need to login to view details.");
          return;
        }
        window.location.href = `details.html?id=${item.id}&type=tv`;
      });
      contentGrid.appendChild(contentItem);
    }
  });
}

// Render pagination controls
const renderPagination = () => {
  const paginationDiv = document.getElementById("pagination");
  if (!paginationDiv) return;

  paginationDiv.innerHTML = `
    <button id="prevPage" ${
      currentPage === 1 ? "disabled" : ""
    }>Previous</button>
    <span>Page ${currentPage} of ${totalPages}</span>
    <button id="nextPage" ${
      currentPage === totalPages ? "disabled" : ""
    }>Next</button>
  `;

  paginationDiv.querySelector("#prevPage").onclick = () =>
    changePage(currentPage - 1);
  paginationDiv.querySelector("#nextPage").onclick = () =>
    changePage(currentPage + 1);
};

// Change page handler — loads content based on current type and page
const changePage = async (page) => {
  if (page < 1 || page > totalPages) return; // Boundary check

  currentPage = page;
  const selectedGenreId = genreSelect ? genreSelect.value : "";
  let data;
  if (selectedGenreId) {
    data = await loadTVByGenre(selectedGenreId, currentPage);
  } else {
    data = await loadPaginatedContent("tv", "popular", currentPage);
  }
  totalPages = data.totalPages || 1;
  displayContentProtected(data.results);
  renderPagination();
};

// Initialize genres dropdown and genre change listener
const initGenres = async () => {
  if (!genreSelect) return;
  const genres = await loadTVGenres();
  genreSelect.innerHTML = '<option value="">All Genres</option>';
  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre.id;
    option.text = genre.name;
    genreSelect.appendChild(option);
  });
  genreSelect.addEventListener("change", async () => {
    currentPage = 1;
    const selectedGenreId = genreSelect.value;
    if (selectedGenreId) {
      const data = await loadTVByGenre(selectedGenreId, currentPage);
      totalPages = data.totalPages;
      displayContentProtected(data.results);
      renderPagination();
    } else {
      await changePage(currentPage);
    }
  });
};

// Setup search listeners (input only, no button)
if (searchInput) {
  setupSearchListeners(searchInput, (results) => {
    totalPages = 1;
    currentPage = 1;
    displayContentProtected(results);
    renderPagination();
  });
}

// Main load function, always use tv
const loadPage = async (page = 1) => {
  currentType = "tv";
  currentPage = page;
  const data = await loadPaginatedContent("tv", "popular", page);
  totalPages = data.totalPages || 1;
  displayContentProtected(data.results);
  renderPagination();
  await initGenres();
};

// Helper to check login status
async function getLoggedInUser() {
  try {
    const res = await fetch("/auth/check", { credentials: "include" });
    const data = await res.json();
    if (data.loggedIn && data.user) return data.user;
  } catch {}
  return null;
}

// Load movie page by default (change to "tv" to load series)
window.addEventListener("DOMContentLoaded", async () => {
  await checkAndHideNavForGuest();
  loadPage(1);
});
