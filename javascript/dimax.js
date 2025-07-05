import {
  toggleLikeItem,
  isItemLiked,
  updateLikeIcon,
  loadTopRatedMovies,
  loadTopRatedTVSeries,
  setupSearchListeners,
  IMAGE_BASE_URL,
  loadGenres,
  loadMoviesByGenre,
  loadPaginatedContent,
  setupPagination,
  checkAndHideNavForGuest,
} from "../javascript/tmdbModule.js";

const contentGrid = document.getElementById("contentGrid");
const searchInput = document.getElementById("searchInput");
const genreSelect = document.getElementById("selectMovieTvGenre");

// Populate genres dropdown
async function populateGenresDropdown() {
  if (genreSelect) {
    const genres = await loadGenres();
    genreSelect.innerHTML = '<option value="">All Genres</option>';
    genres.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre.id;
      option.text = genre.name;
      genreSelect.appendChild(option);
    });
  }
}
populateGenresDropdown();

// Setup search listeners for input only
if (searchInput) {
  setupSearchListeners(searchInput, displayContentProtected);
}

// Setup genre change listener
if (genreSelect) {
  genreSelect.addEventListener("change", async (e) => {
    const genreId = e.target.value;
    if (genreId) {
      const movies = await loadMoviesByGenre(genreId);
      displayContentProtected(movies);
    } else {
      loadMainPage(1);
    }
  });
}

// Helper to check login status
async function getLoggedInUser() {
  try {
    const res = await fetch("/auth/check", { credentials: "include" });
    const data = await res.json();
    if (data.loggedIn && data.user) return data.user;
  } catch {}
  return null;
}

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

const loadAndDisplayContent = async () => {
  try {
    const [movies, tvSeries] = await Promise.all([
      loadTopRatedMovies(),
      loadTopRatedTVSeries(),
    ]);
    const combinedItems = [...movies, ...tvSeries];
    displayContentProtected(combinedItems);
  } catch (error) {
    console.error("Error loading content:", error);
  }
};

loadGenres("selectMovieTvGenre", async (selectedGenreId) => {
  const movies = await loadMoviesByGenre(selectedGenreId);
  displayContentProtected(movies);
});

const loadMainPage = async (page = 1) => {
  const movieData = await loadPaginatedContent("movie", "popular", page);
  const seriesData = await loadPaginatedContent("tv", "popular", page);
  const allResults = [...movieData.results, ...seriesData.results];
  displayContentProtected(allResults);
  const totalPages = Math.max(movieData.totalPages, seriesData.totalPages);
  setupPagination(totalPages, page, loadMainPage);
};

window.addEventListener("DOMContentLoaded", async () => {
  await checkAndHideNavForGuest();
  loadMainPage(1);
});
