import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Use a fixed Supabase URL and key (already in the code)
const supabaseUrl = "https://rlxizlanwveayrjkgbsx.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseGl6bGFud3ZlYXlyamtnYnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA4ODQsImV4cCI6MjA2MDcxNjg4NH0.sArY7ytczr550iVRAL1LgmzmnZmkjH_Ht7PFPb4prA0";

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// ===== Authentication functions =====
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  return { user: data?.session?.user || null, error };
}

// ===== Movie database functions =====
export async function getMovies(filter = "all") {
  // Modified to not require authentication
  let query = supabase
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });

  // Apply filter if specified
  if (filter === "watched") {
    query = query.eq("watched", true);
  } else if (filter === "unwatched") {
    query = query.eq("watched", false);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function addMovie(title, description = "", year = "") {
  // Modified to not require authentication
  let posterUrl = "/public/default-poster.jpg"; // Default poster
  let omdbDescription = ""; // Variable to store OMDB description

  // Fixed OMDB API key - using the provided key
  const omdbApiKey = "beda5dab";

  try {
    const searchQuery = year ? `${title}&y=${year}` : title;
    const response = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(
        searchQuery
      )}&apikey=${omdbApiKey}&plot=full`
    );
    const movieData = await response.json();

    if (movieData.Response === "True") {
      // Get movie poster if available
      if (movieData.Poster && movieData.Poster !== "N/A") {
        posterUrl = movieData.Poster;
      }

      // Get movie description (plot) if available
      if (movieData.Plot && movieData.Plot !== "N/A") {
        omdbDescription = movieData.Plot;
      }

      // Get year if not provided and available from API
      if (!year && movieData.Year && movieData.Year !== "N/A") {
        year = movieData.Year;
      }
    }
  } catch (error) {
    console.error("Error fetching movie data from OMDB:", error);
  }

  // Use OMDB description if available, otherwise use the provided description
  const finalDescription = omdbDescription || description;

  // Add movie to database without requiring user authentication
  const { data, error } = await supabase
    .from("movies")
    .insert([
      {
        user_id: "public", // Use a fixed value for public movies
        title,
        description: finalDescription,
        year: year || null,
        watched: false,
        poster_url: posterUrl,
      },
    ])
    .select();

  return { data, error };
}

export async function toggleWatchedStatus(movieId, watched) {
  // Modified to not require authentication
  const { data, error } = await supabase
    .from("movies")
    .update({ watched })
    .eq("id", movieId)
    .select();

  return { data, error };
}

export async function deleteMovie(movieId) {
  // Modified to not require authentication
  const { data, error } = await supabase
    .from("movies")
    .delete()
    .eq("id", movieId);

  return { data, error };
}
