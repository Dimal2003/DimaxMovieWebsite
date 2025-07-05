import {
  toggleLikeItem,
  isItemLiked,
  updateLikeIcon,
  loadPopularMovies,
  loadPopularTVSeries,
  loadLatestMovies,
  loadLatestTVSeries,
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

// Helper to check login status
async function getLoggedInUser() {
  try {
    const res = await fetch("/auth/check", { credentials: "include" });
    const data = await res.json();
    if (data.loggedIn && data.user) return data.user;
  } catch {}
  return null;
}

const displayContent = (items) => {
  contentGrid.innerHTML = "";
  for (const item of items) {
    if (item.poster_path) {
      const isLiked = isItemLiked(item.id);
      const contentItem = document.createElement("div");
      contentItem.classList.add("grid-item");
      contentItem.innerHTML = `
        <img src="${IMAGE_BASE_URL + item.poster_path}" alt="${
        item.title || item.name
      }" class="grid-image">
        <div class="content-info">
          <p>${item.title || item.name} (${new Date(
        item.release_date || item.first_air_date
      ).getFullYear()})</p>
          <div class="actions">
            <a href="details.html?id=${item.id}&type=${
        item.title ? "movie" : "tv"
      }">
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

      const likeIcon = contentItem.querySelector(".like-icon");
      let liked = isItemLiked(item.id);
      likeIcon.addEventListener("click", () => {
        liked = !liked;
        toggleLikeItem(item);
        updateLikeIcon(item.id);
        likeIcon.innerHTML = liked ? "favorite" : "favorite_border";
      });

      contentGrid.appendChild(contentItem);
    }
  }
};

// Patch displayContent to protect like and details
function displayContentProtected(items) {
  contentGrid.innerHTML = "";
  for (const item of items) {
    if (item.poster_path) {
      const isLiked = isItemLiked(item.id);
      const contentItem = document.createElement("div");
      contentItem.classList.add("grid-item");
      contentItem.innerHTML = `
        <img src="${IMAGE_BASE_URL + item.poster_path}" alt="${
        item.title || item.name
      }" class="grid-image">
        <div class="content-info">
          <p>${item.title || item.name} (${new Date(
        item.release_date || item.first_air_date
      ).getFullYear()})</p>
          <div class="actions">
            <a href="#" class="details-link" data-id="${item.id}" data-type="${
        item.title ? "movie" : "tv"
      }">
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
        window.location.href = `details.html?id=${item.id}&type=${
          item.title ? "movie" : "tv"
        }`;
      });
      contentGrid.appendChild(contentItem);
    }
  }
}

async function loadAndDisplayContent() {
  try {
    const [popularMovies, popularTVSeries, latestMovies, latestTVSeries] =
      await Promise.all([
        loadPopularMovies(),
        loadPopularTVSeries(),
        loadLatestMovies(),
        loadLatestTVSeries(),
      ]);

    const uniqueItems = [];
    const itemIds = new Set();

    for (const item of [
      ...popularMovies,
      ...popularTVSeries,
      ...latestMovies,
      ...latestTVSeries,
    ]) {
      if (!itemIds.has(item.id)) {
        uniqueItems.push(item);
        itemIds.add(item.id);
      }
    }

    displayContent(uniqueItems);
  } catch (error) {
    console.error("Error loading content:", error);
  }
}

const loadNewAndPopularPage = async (page = 1) => {
  // Fetch latest and popular movies and TV shows
  const latestMovies = await loadPaginatedContent("movie", "now_playing", page);
  const popularMovies = await loadPaginatedContent("movie", "popular", page);
  const latestTV = await loadPaginatedContent("tv", "airing_today", page);
  const popularTV = await loadPaginatedContent("tv", "popular", page);
  // Combine and deduplicate by id
  const allResults = [
    ...latestMovies.results,
    ...popularMovies.results,
    ...latestTV.results,
    ...popularTV.results,
  ];
  const uniqueResults = Array.from(
    new Map(allResults.map((item) => [item.id, item])).values()
  );
  // Use the largest totalPages for pagination
  const totalPages = Math.max(
    latestMovies.totalPages,
    popularMovies.totalPages,
    latestTV.totalPages,
    popularTV.totalPages
  );
  displayContentProtected(uniqueResults);
  setupPagination(totalPages, page, loadNewAndPopularPage);
};

loadGenres("selectMovieTvGenre", async (selectedGenreId) => {
  const movies = await loadMoviesByGenre(selectedGenreId);

  displayContentProtected(movies);
});

// Set up search bar event handlers (input only, no button)
if (searchInput) {
  setupSearchListeners(searchInput, displayContentProtected);
}

window.addEventListener("DOMContentLoaded", async () => {
  await checkAndHideNavForGuest();
  loadNewAndPopularPage(1);
});
