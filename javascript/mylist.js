import {
  getLikedItems,
  toggleLikeItem,
  IMAGE_BASE_URL,
  checkAndHideNavForGuest,
} from "../javascript/tmdbModule.js";

const getLikedItems = async (userId) => {
  try {
    const response = await fetch(`/api/user/${userId}/likedItems`);
    if (!response.ok) {
      throw new Error("Error fetching liked items");
    }
    const likedItems = await response.json();
    return likedItems;
  } catch (error) {
    console.error("Error fetching liked items:", error);
    return [];
  }
};

const toggleLikeItem = async (userId, item) => {
  try {
    const response = await fetch(`/api/user/${userId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ movieId: item.id }),
    });
    if (!response.ok) {
      throw new Error("Error liking the item");
    }
    displayMyList(userId);
  } catch (error) {
    console.error("Error toggling like:", error);
  }
};

const removeLikeItem = async (userId, itemId) => {
  try {
    const response = await fetch(`/api/user/${userId}/unlike`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ movieId: itemId }),
    });
    if (!response.ok) {
      throw new Error("Error removing liked item");
    }
    displayMyList(userId);
  } catch (error) {
    console.error("Error removing liked item:", error);
  }
};

const displayMyList = async (userId) => {
  const myListGrid = document.getElementById("myListGrid");
  const likedItems = await getLikedItems(userId);

  myListGrid.innerHTML = "";

  if (likedItems.length === 0) {
    myListGrid.innerHTML =
      "<p>You have no movies or TV shows in your list.</p>";
    return;
  }

  likedItems.forEach((item) => {
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
          <span class="material-icons like-icon" data-id="${item.id}">
            favorite
          </span>
        </div>
      </div>
    `;

    const likeIcon = contentItem.querySelector(".like-icon");
    likeIcon.addEventListener("click", async () => {
      await removeLikeItem(userId, item.id);
    });

    myListGrid.appendChild(contentItem);
  });
};

async function getLoggedInUser() {
  try {
    const res = await fetch("/auth/check", { credentials: "include" });
    const data = await res.json();
    if (data.loggedIn && data.user) return data.user;
  } catch {}
  return null;
}

// On DOMContentLoaded, check login and nav
window.addEventListener("DOMContentLoaded", async () => {
  await checkAndHideNavForGuest();
  const user = await getLoggedInUser();
  if (!user) {
    // Not logged in: hide list, show message, or redirect
    const myListGrid = document.getElementById("myListGrid");
    if (myListGrid)
      myListGrid.innerHTML =
        '<p style="color:#ffd700;text-align:center;margin-top:40px;">You must be logged in to view your list.</p>';
    return;
  }
  displayMyList(user);
});
