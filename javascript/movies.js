import {
  toggleLikeItem,
  isItemLiked,
  updateLikeIcon,
  loadTopRatedMovies,
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

// Patch displayMovies to protect like and details
function displayMoviesProtected(movies, container) {
  container.innerHTML = "";
  if (!movies.length) {
    container.innerHTML = "<p>No movies found.</p>";
    return;
  }
  movies.forEach((movie) => {
    if (movie.poster_path) {
      const movieElement = document.createElement("div");
      movieElement.classList.add("grid-item");
      movieElement.innerHTML = `
        <img src="${IMAGE_BASE_URL + movie.poster_path}" alt="${
        movie.title || movie.name
      }" class="grid-image">
        <div class="content-info">
          <p>${movie.title || movie.name} (${new Date(
        movie.release_date || movie.first_air_date
      ).getFullYear()})</p>
          <div class="actions">
            <a href="#" class="details-link" data-id="${movie.id}" data-type="${
        movie.title ? "movie" : "tv"
      }">
              <button class="view-details-button">View Details</button>
            </a>
            <div class="addToList">
              <span class="material-icons like-icon" data-id="${movie.id}">
                ${isItemLiked(movie.id) ? "favorite" : "favorite_border"}
              </span>
            </div>
          </div>
        </div>
      `;
      // Like button protection
      const likeIcon = movieElement.querySelector(".like-icon");
      likeIcon.addEventListener("click", async (e) => {
        const user = await getLoggedInUser();
        if (!user) {
          alert("You need to login to like items.");
          return;
        }
        toggleLikeItem(movie);
        updateLikeIcon(movie.id);
      });
      // Details button protection
      const detailsLink = movieElement.querySelector(".details-link");
      detailsLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const user = await getLoggedInUser();
        if (!user) {
          alert("You need to login to view details.");
          return;
        }
        window.location.href = `details.html?id=${movie.id}&type=${
          movie.title ? "movie" : "tv"
        }`;
      });
      container.appendChild(movieElement);
    }
  });
}

// Load paginated movies (default page 1)
const loadMoviesPage = async (page = 1) => {
  try {
    const { results, totalPages } = await loadPaginatedContent(
      "movie",
      "popular",
      page
    );
    displayMoviesProtected(results, contentGrid);
    setupPagination(totalPages, page, loadMoviesPage);
  } catch (error) {
    console.error("Error loading movies:", error);
    contentGrid.innerHTML =
      "<p>Failed to load movies. Please try again later.</p>";
  }
};

// Load genre dropdown and filter movies when selected
loadGenres("selectMovieTvGenre", async (selectedGenreId) => {
  try {
    const movies = await loadMoviesByGenre(selectedGenreId);
    displayMoviesProtected(movies, contentGrid);
  } catch (error) {
    console.error("Error loading movies by genre:", error);
    contentGrid.innerHTML = "<p>Failed to load genre movies.</p>";
  }
});

// Set up search bar event handlers (input only, no button)
if (searchInput) {
  setupSearchListeners(searchInput, (results) => {
    displayMoviesProtected(results, contentGrid);
  });
}

// Initial page load
window.addEventListener("DOMContentLoaded", async () => {
  await checkAndHideNavForGuest();
  loadMoviesPage(1);
});
