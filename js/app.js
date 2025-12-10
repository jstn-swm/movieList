import * as supabase from "./supabase.js";

/* Main Variables */
let currentUser = null;
let currentFilter = "all";

/* Application Initialization */
document.addEventListener("DOMContentLoaded", async () => {
  // Wait for Supabase to be initialized
  await supabase.waitForSupabase();
  
  await checkAuthStatus();
  setupEventListeners();
  loadMovies();
});

async function checkAuthStatus() {
  const { user, error } = await supabase.getCurrentUser();

  if (user) {
    currentUser = user;
    showAuthenticatedUI();
  } else {
    showPublicUI();
  }
}

/* Event Listeners Setup */
function setupEventListeners() {
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document
    .getElementById("registerForm")
    ?.addEventListener("submit", handleRegistration);
  document
    .getElementById("logoutButton")
    ?.addEventListener("click", handleLogout);

  document
    .getElementById("addMovieForm")
    ?.addEventListener("submit", handleAddMovie);
  document
    .getElementById("filterOptions")
    ?.addEventListener("change", handleFilterChange);
  document
    .getElementById("showAddMovieButton")
    ?.addEventListener("click", () => showModal("addMovieModal"));

  document.querySelectorAll(".close-modal").forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.closest(".modal").id;
      hideModal(modalId);
    });
  });

  document
    .getElementById("showLoginButton")
    ?.addEventListener("click", () => showModal("loginModal"));
  document
    .getElementById("showRegisterButton")
    ?.addEventListener("click", () => showModal("registerModal"));
  document
    .getElementById("showLoginButton2")
    ?.addEventListener("click", () => showModal("loginModal"));
  document
    .getElementById("showRegisterButton2")
    ?.addEventListener("click", () => showModal("registerModal"));
}

/* Authentication Handlers */
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  showLoading("Logging in...");

  const { data, error } = await supabase.signIn(email, password);

  hideLoading();

  if (error) {
    showNotification(error.message, "error");
  } else {
    currentUser = data.user;
    hideModal("loginModal");
    showAuthenticatedUI();
    loadMovies();
    showNotification("Logged in successfully!", "success");
  }
}

async function handleRegistration(event) {
  event.preventDefault();

  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    showNotification("Passwords do not match", "error");
    return;
  }

  showLoading("Creating account...");

  const { data, error } = await supabase.signUp(email, password);

  hideLoading();

  if (error) {
    showNotification(error.message, "error");
  } else {
    hideModal("registerModal");
    showNotification(
      "Registration successful! Check your email for confirmation.",
      "success"
    );
  }
}

async function handleLogout() {
  showLoading("Logging out...");

  const { error } = await supabase.signOut();

  hideLoading();

  if (error) {
    showNotification(error.message, "error");
  } else {
    currentUser = null;
    showPublicUI();
    showNotification("Logged out successfully!", "success");
  }
}

/* Movie Management */
async function handleAddMovie(event) {
  event.preventDefault();

  const title = document.getElementById("movieTitle").value.trim();
  const year = document.getElementById("movieYear").value.trim();
  const description = document.getElementById("movieDescription").value.trim();
  const isRecommendation = document.getElementById("recommendMovie").checked;

  if (!title) {
    showNotification("Movie title is required", "error");
    return;
  }

  showLoading("Adding movie...");

  // Pass the current user's ID if authenticated
  const userId = currentUser ? currentUser.id : null;
  if (!userId) {
    showNotification("You must be logged in to add movies", "error");
    hideLoading();
    return;
  }

  const { data, error } = await supabase.addMovie(
    title,
    description,
    year,
    userId,
    isRecommendation
  );

  hideLoading();

  if (error) {
    const errorMessage =
      error.message || JSON.stringify(error) || "Unknown error";
    showNotification("Failed to add movie: " + errorMessage, "error");
  } else {
    document.getElementById("addMovieForm").reset();
    hideModal("addMovieModal");
    loadMovies();

    const successMessage = isRecommendation
      ? "Movie added and recommended to everyone!"
      : "Movie added successfully!";
    showNotification(successMessage, "success");
  }
}

async function handleDeleteMovie(movieId) {
  if (!confirm("Are you sure you want to delete this movie?")) return;

  showLoading("Deleting movie...");

  // Only allow users to delete their own movies
  const userId = currentUser ? currentUser.id : null;

  const { error } = await supabase.deleteMovie(movieId, userId);

  hideLoading();

  if (error) {
    const errorMessage =
      error.message || JSON.stringify(error) || "Unknown error";
    showNotification("Failed to delete movie: " + errorMessage, "error");
  } else {
    loadMovies();
    showNotification("Movie deleted successfully!", "success");
  }
}

async function handleToggleWatched(movieId, isWatched) {
  const newStatus = !isWatched;

  // Pass the current user's ID to only update their own movies
  const userId = currentUser ? currentUser.id : null;

  const { error } = await supabase.toggleWatchedStatus(
    movieId,
    newStatus,
    userId
  );

  if (error) {
    const errorMessage =
      error.message || JSON.stringify(error) || "Unknown error";
    showNotification("Failed to update status: " + errorMessage, "error");
  } else {
    loadMovies();
  }
}

async function handleToggleRecommendation(movieId, isRecommendation) {
  const userId = currentUser ? currentUser.id : null;

  if (!userId) {
    showNotification("You must be logged in to recommend movies", "error");
    return;
  }

  showLoading(
    isRecommendation ? "Removing recommendation..." : "Recommending movie..."
  );

  let error;
  if (isRecommendation) {
    const result = await supabase.unrecommendMovie(movieId, userId);
    error = result.error;
  } else {
    const result = await supabase.recommendMovie(movieId, userId);
    error = result.error;
  }

  hideLoading();

  if (error) {
    const errorMessage =
      error.message || JSON.stringify(error) || "Unknown error";
    showNotification(
      "Failed to update recommendation: " + errorMessage,
      "error"
    );
  } else {
    loadMovies();
    const message = isRecommendation
      ? "Movie is no longer recommended to everyone"
      : "Movie is now recommended to everyone!";
    showNotification(message, "success");
  }
}

function handleFilterChange(event) {
  currentFilter = event.target.value;
  loadMovies();
}

/* UI Rendering */
async function loadMovies() {
  const moviesList = document.getElementById("moviesList");
  if (!moviesList) return;

  showLoading("Loading movies...");

  // Only fetch movies for the logged-in user or public recommendations
  const userId = currentUser ? currentUser.id : null;
  const { data, error } = await supabase.getMovies(currentFilter, userId);

  hideLoading();

  if (error) {
    const errorMessage =
      error.message || JSON.stringify(error) || "Unknown error";
    showNotification("Failed to load movies: " + errorMessage, "error");
    return;
  }

  if (!data || data.length === 0) {
    moviesList.innerHTML =
      '<div class="empty-state">No movies found. Add your first movie!</div>';
    return;
  }

  moviesList.innerHTML = "";

  data.forEach((movie) => {
    const movieElement = document.createElement("li");
    movieElement.className = "movie-item";
    movieElement.dataset.id = movie.id;

    // Add recommendation badge if this is a recommended movie
    const recommendationBadge = movie.is_recommendation
      ? '<div class="recommendation-badge">Recommended</div>'
      : "";

    // Only show edit controls for user's own movies
    const isUserMovie = userId && movie.user_id === userId;

    // Prepare the action buttons based on ownership
    const actionButtons = isUserMovie
      ? `
        <div class="movie-actions">
          <label class="watched-toggle">
            <input type="checkbox" ${movie.watched ? "checked" : ""}>
            ${movie.watched ? "Watched" : "Not watched"}
          </label>
          <button class="recommend-button ${
            movie.is_recommendation ? "unrecommend" : ""
          }">
            ${movie.is_recommendation ? "Unrecommend" : "Recommend"}
          </button>
          <button class="delete-button">Delete</button>
        </div>
      `
      : `
        <div class="movie-actions">
          <label class="watched-toggle">
            <input type="checkbox" ${movie.watched ? "checked" : ""}>
            ${movie.watched ? "Watched" : "Not watched"}
          </label>
        </div>
      `;

    movieElement.innerHTML = `
      ${recommendationBadge}
      <div class="movie-poster">
        <img src="${movie.poster_url}" alt="${
      movie.title
    } poster" onerror="this.src='./public/poster.png'">
      </div>
      <div class="movie-details">
        <h3 class="movie-title">${movie.title} ${
      movie.year ? `(${movie.year})` : ""
    }</h3>
        <p class="movie-description">${
          movie.description || "No description available"
        }</p>
        ${actionButtons}
      </div>
    `;

    // Add event listener for watched toggle
    movieElement
      .querySelector(".watched-toggle input")
      .addEventListener("change", () => {
        handleToggleWatched(movie.id, movie.watched);
      });

    // Check if it's the user's movie (reusing the variable from above)
    if (isUserMovie) {
      // Add event listener for delete button
      const deleteButton = movieElement.querySelector(".delete-button");
      if (deleteButton) {
        deleteButton.addEventListener("click", () => {
          handleDeleteMovie(movie.id);
        });
      }

      // Add event listener for recommend button
      const recommendButton = movieElement.querySelector(".recommend-button");
      if (recommendButton) {
        recommendButton.addEventListener("click", () => {
          handleToggleRecommendation(movie.id, movie.is_recommendation);
        });
      }
    }

    moviesList.appendChild(movieElement);
  });
}

function showAuthenticatedUI() {
  const unauthenticatedContent = document.getElementById(
    "unauthenticatedContent"
  );
  const authenticatedContent = document.getElementById("authenticatedContent");
  const addMovieSection = document.querySelector(".add-movie-section");

  // Handle the header login/logout UI
  const authButtons = document.getElementById("authButtons");
  const headerUserInfo = document.getElementById("headerUserInfo");

  if (unauthenticatedContent) unauthenticatedContent.style.display = "none";
  if (authenticatedContent) authenticatedContent.style.display = "block";
  if (addMovieSection) addMovieSection.style.display = "block";

  // Hide login buttons, show user info with logout
  if (authButtons) authButtons.style.display = "none";
  if (headerUserInfo) headerUserInfo.style.display = "flex";

  // Update user email display in the header - extract just the username part
  const userEmailElement = document.querySelector(".user-email");
  if (userEmailElement && currentUser) {
    // Extract username from email (part before the @ symbol)
    const emailParts = currentUser.email.split("@");
    const username = emailParts[0];
    userEmailElement.textContent = username;
  }
}

function showPublicUI() {
  const unauthenticatedContent = document.getElementById(
    "unauthenticatedContent"
  );
  const authenticatedContent = document.getElementById("authenticatedContent");
  const addMovieSection = document.querySelector(".add-movie-section");

  // Handle the header login/logout UI
  const authButtons = document.getElementById("authButtons");
  const headerUserInfo = document.getElementById("headerUserInfo");

  if (unauthenticatedContent) unauthenticatedContent.style.display = "none";
  if (authenticatedContent) authenticatedContent.style.display = "block";
  if (addMovieSection) addMovieSection.style.display = "none";

  // Show login buttons, hide user info with logout
  if (authButtons) authButtons.style.display = "flex";
  if (headerUserInfo) headerUserInfo.style.display = "none";
}

/* UI Helpers */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
}

function showLoading(message = "Loading...") {
  const loadingElement = document.getElementById("loadingIndicator");
  const messageElement = document.getElementById("loadingMessage");

  if (messageElement) {
    messageElement.textContent = message;
  }

  if (loadingElement) {
    loadingElement.style.display = "flex";
  }
}

function hideLoading() {
  const loadingElement = document.getElementById("loadingIndicator");
  if (loadingElement) {
    loadingElement.style.display = "none";
  }
}

function showNotification(message, type = "info") {
  const notification = document.getElementById("notification");
  const notificationMessage = document.getElementById("notificationMessage");

  if (!notification || !notificationMessage) return;

  notification.className = `notification ${type}`;
  notificationMessage.textContent = message;

  notification.style.display = "block";

  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}
