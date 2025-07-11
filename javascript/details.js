// import { setupSearchListeners } from "../javascript/tmdbModule.js";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const type = urlParams.get("type");
  const TMDB_BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

  // Fetch TMDB details using backend proxy to keep API key secure
  const fetchDetailsFromTMDB = async (id, type) => {
    try {
      const endpoint = `${type}/${id}`;
      const params = new URLSearchParams({
        append_to_response: "credits,recommendations,videos",
      });
      const response = await fetch(
        `/api/tmdb-proxy?endpoint=${endpoint}&${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching details from TMDB API:", error);
      return null;
    }
  };

  const details = await fetchDetailsFromTMDB(id, type);
  if (details) {
    document.body.classList.add("details-bg");
    document.body.style.backgroundImage = `url('${IMAGE_BASE_URL}${details.poster_path}')`;
    document.getElementById("movieTitle").innerText =
      details.title || details.name;
    document.getElementById("movieYear").innerText = `Year: ${new Date(
      details.release_date || details.first_air_date
    ).getFullYear()}`;
    document.getElementById("movieDescription").innerText = details.overview;

    const genres = details.genres.map((genre) => genre.name).join(", ");
    document.getElementById("movieGenre").innerText = `Genre: ${genres}`;

    const cast = details.credits.cast
      .slice(0, 5)
      .map((member) => member.name)
      .join(", ");
    document.getElementById("movieCast").innerText = `Cast: ${cast}`;

    const trailer = details.videos.results.find(
      (video) => video.type === "Trailer" && video.site === "YouTube"
    );
    if (trailer) {
      const trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
      document.getElementById("movieTrailer").src = trailerUrl;
    } else {
      console.log("Trailer not available");
    }
  } else {
    document.getElementById("movieTitle").innerText = "Details not found.";
  }
});

// setupSearchListeners(searchInput);
// loadTopRatedMovies().then(displayContent);

// loadGenres("selectMovieTvGenre", async (selectedGenreId) => {
//   const movies = await loadMoviesByGenre(selectedGenreId);

//   displayContent(movies);
// });
