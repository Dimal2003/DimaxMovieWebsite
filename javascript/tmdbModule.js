// Use backend proxy to keep TMDB API key hidden
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const fetchFromTMDB = async (endpoint, params = {}) => {
  const url = new URL("/api/tmdb-proxy", window.location.origin);
  url.searchParams.set("endpoint", endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data; // Return the full data object
  } catch (error) {
    console.error("Error fetching data from TMDB:", error);
    return {};
  }
};

const LOCAL_STORAGE_KEY = "likedItems";

const getLikedItems = () =>
  JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];

const saveLikedItems = (items) =>
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));

const toggleLikeItem = (item) => {
  let likedItems = getLikedItems();
  const itemIndex = likedItems.findIndex((i) => i.id === item.id);

  if (itemIndex > -1) {
    likedItems.splice(itemIndex, 1);
  } else {
    likedItems.push(item);
  }

  saveLikedItems(likedItems);
  updateLikeIcon(item.id);
};

const isItemLiked = (itemId) =>
  getLikedItems().some((item) => item.id === itemId);

const updateLikeIcon = (itemId) => {
  const likeIcon = document.querySelector(`.like-icon[data-id='${itemId}']`);
  if (likeIcon) {
    likeIcon.textContent = isItemLiked(itemId) ? "favorite" : "favorite_border";
  }
};

const loadGenres = async () => {
  try {
    const data = await fetchFromTMDB("genre/movie/list", { language: "en-US" });
    return data.genres || [];
  } catch (error) {
    console.error("Error fetching genres:", error);
    return [];
  }
};

const loadMoviesByGenre = async (genreId) => {
  const data = await fetchFromTMDB("discover/movie", {
    with_genres: genreId,
    sort_by: "popularity.desc",
  });
  return data.results || [];
};

const loadPopularMovies = async () => {
  const data = await fetchFromTMDB("movie/popular");
  return data.results || [];
};

const loadPopularTVSeries = async () => {
  const data = await fetchFromTMDB("tv/popular");
  return data.results || [];
};

const loadLatestMovies = async () => {
  const data = await fetchFromTMDB("movie/now_playing");
  return data.results || [];
};

const loadLatestTVSeries = async () => {
  const data = await fetchFromTMDB("tv/airing_today");
  return data.results || [];
};

const searchContent = async (query) => {
  try {
    const [moviesData, tvShowsData] = await Promise.all([
      fetchFromTMDB("search/movie", { query }),
      fetchFromTMDB("search/tv", { query }),
    ]);
    const movies = moviesData.results || [];
    const tvShows = tvShowsData.results || [];
    const combinedResults = [...movies, ...tvShows].sort((a, b) => {
      const dateA = new Date(a.release_date || a.first_air_date).getTime();
      const dateB = new Date(b.release_date || b.first_air_date).getTime();
      return dateB - dateA;
    });
    return combinedResults;
  } catch (error) {
    console.error("Error searching content:", error);
    return [];
  }
};

const loadTopRatedMovies = async () => {
  const data = await fetchFromTMDB("movie/top_rated");
  return data.results || [];
};

const loadTopRatedTVSeries = async () => {
  const data = await fetchFromTMDB("tv/top_rated");
  return data.results || [];
};

const setupSearchListeners = (searchInput, displayCallback) => {
  searchInput.addEventListener("keypress", async (event) => {
    if (event.key === "Enter") {
      const query = searchInput.value.trim();
      if (query) {
        const results = await searchContent(query);
        displayCallback(results);
      }
    }
  });
};

const populateGenres = async () => {
  const selectMovieTvGenre = document.getElementById("selectMovieTvGenre");
  const genres = await loadGenres();
  selectMovieTvGenre.innerHTML = '<option value="">All Genres</option>';
  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre.id;
    option.text = genre.name;
    selectMovieTvGenre.appendChild(option);
  });
};

// Handle genre selection change
const handleGenreChange = async (event) => {
  const genreId = event.target.value;
  const contentGrid = document.getElementById("contentGrid");

  if (genreId) {
    const movies = await loadMoviesByGenre(genreId);
    displayMovies(movies, contentGrid);
  } else {
    const movies = await loadPopularMovies();
    displayMovies(movies, contentGrid);
  }
};

// Generalized paginated content loader

const loadPaginatedContent = async (
  type = "movie",
  category = "popular",
  page = 1
) => {
  try {
    const data = await fetchFromTMDB(`${type}/${category}`, { page });
    return {
      results: data.results || [],
      totalPages: data.total_pages || 1,
      currentPage: data.page || 1,
    };
  } catch (error) {
    console.error("Error fetching paginated content:", error);
    return { results: [], totalPages: 1, currentPage: 1 };
  }
};

// Helper to render movies (can be reused)
const displayMovies = (movies, container) => {
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
            <a href="details.html?id=${movie.id}&type=${
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
      const likeButton = movieElement.querySelector(".like-icon");
      likeButton.addEventListener("click", () => {
        toggleLikeItem(movie);
        updateLikeIcon(movie.id);
      });
      container.appendChild(movieElement);
    }
  });
};

// Pagination setup
const setupPagination = (totalPages, currentPage, onPageChange) => {
  let pagDiv = document.getElementById("pagination");
  if (!pagDiv) {
    pagDiv = document.createElement("div");
    pagDiv.id = "pagination";
    pagDiv.style = "text-align:center;margin:20px;";
    document.body.appendChild(pagDiv);
  }
  pagDiv.innerHTML = `
    <button id="prevPage" ${
      currentPage === 1 ? "disabled" : ""
    }>Previous</button>
    <span>Page ${currentPage} of ${totalPages}</span>
    <button id="nextPage" ${
      currentPage === totalPages ? "disabled" : ""
    }>Next</button>
  `;
  document.getElementById("prevPage").onclick = () =>
    onPageChange(currentPage - 1);
  document.getElementById("nextPage").onclick = () =>
    onPageChange(currentPage + 1);
};

const setupGenreListener = () => {
  const selectMovieTvGenre = document.getElementById("selectMovieTvGenre");
  selectMovieTvGenre.addEventListener("change", handleGenreChange);
};

const initGenreSection = async () => {
  await populateGenres();
  setupGenreListener();
};

initGenreSection();

// Checks login status and hides nav/profile for guests
export async function checkAndHideNavForGuest() {
  try {
    const res = await fetch("/auth/check", { credentials: "include" });
    const data = await res.json();
    const isLoggedIn = data.loggedIn === true;
    const profileContainer = document.querySelector(".profile-container");
    if (profileContainer) {
      if (isLoggedIn) {
        profileContainer.style.removeProperty("display"); // Always show for logged in
      } else {
        profileContainer.style.display = "none";
      }
    }
    // Hide My List link if not logged in
    const myListLink = document.querySelector('a[href="mylist.html"]');
    if (myListLink) {
      myListLink.style.display = isLoggedIn ? "inline-block" : "none";
    }
  } catch (e) {
    // fallback: hide for safety
    const profileContainer = document.querySelector(".profile-container");
    if (profileContainer) profileContainer.style.display = "none";
    const myListLink = document.querySelector('a[href="mylist.html"]');
    if (myListLink) myListLink.style.display = "none";
  }
}

export {
  fetchFromTMDB,
  getLikedItems,
  saveLikedItems,
  toggleLikeItem,
  isItemLiked,
  updateLikeIcon,
  loadGenres,
  loadMoviesByGenre,
  loadPopularMovies,
  loadPopularTVSeries,
  loadLatestMovies,
  loadLatestTVSeries,
  loadTopRatedMovies,
  loadTopRatedTVSeries,
  setupSearchListeners,
  IMAGE_BASE_URL,
  loadPaginatedContent,
  displayMovies,
  setupPagination,
};
