import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Use a fixed Supabase URL and key (already in the code)
const supabaseUrl = "https://rlxizlanwveayrjkgbsx.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseGl6bGFud3ZlYXlyamtnYnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA4ODQsImV4cCI6MjA2MDcxNjg4NH0.sArY7ytczr550iVRAL1LgmzmnZmkjH_Ht7PFPb4prA0";

// Initialize Supabase client with error handling
let supabaseClient;
try {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
  supabaseClient = null;
}

export const supabase = supabaseClient;

// ===== Authentication functions =====
export async function signUp(email, password) {
  if (!supabase) {
    return { data: null, error: { message: "Supabase client not initialized" } };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email, password) {
  if (!supabase) {
    return { data: null, error: { message: "Supabase client not initialized" } };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  if (!supabase) {
    return { error: { message: "Supabase client not initialized" } };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  if (!supabase) {
    return { user: null, error: { message: "Supabase client not initialized" } };
  }
  const { data, error } = await supabase.auth.getSession();
  return { user: data?.session?.user || null, error };
}

// ===== Movie database functions =====
export async function getMovies(filter = "all", userId = null) {
  let query = supabase
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });

  // If userId is provided, fetch only that user's movies or recommendations for all
  if (userId) {
    query = query.or(`user_id.eq.${userId},is_recommendation.eq.true`);
  } else {
    // Only show public/recommended movies when not logged in
    query = query.eq("is_recommendation", true);
  }

  // Apply filter if specified
  if (filter === "watched") {
    query = query.eq("watched", true);
  } else if (filter === "unwatched") {
    query = query.eq("watched", false);
  } else if (filter === "my-movies") {
    // Only show the user's own movies
    query = query.eq("user_id", userId);
  } else if (filter === "recommendations") {
    // Only show recommendations
    query = query.eq("is_recommendation", true);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function addMovie(
  title,
  description = "",
  year = "",
  userId = null,
  isRecommendation = false
) {
  let posterUrl = "./public/poster.png"; // Default poster with relative path
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

  // Add movie to database with user ID if authenticated
  const { data, error } = await supabase
    .from("movies")
    .insert([
      {
        user_id: userId || "public",
        title,
        description: finalDescription,
        year: year || null,
        watched: false,
        poster_url: posterUrl,
        is_recommendation: isRecommendation,
      },
    ])
    .select();

  return { data, error };
}

export async function toggleWatchedStatus(movieId, watched, userId = null) {
  let query = supabase.from("movies").update({ watched }).eq("id", movieId);

  // Add user constraint if userId is provided
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select();
  return { data, error };
}

export async function deleteMovie(movieId, userId = null) {
  let query = supabase.from("movies").delete().eq("id", movieId);

  // Add user constraint if userId is provided
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function recommendMovie(movieId, userId = null) {
  let query = supabase
    .from("movies")
    .update({ is_recommendation: true })
    .eq("id", movieId);

  // Add user constraint if userId is provided
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select();
  return { data, error };
}

export async function unrecommendMovie(movieId, userId = null) {
  let query = supabase
    .from("movies")
    .update({ is_recommendation: false })
    .eq("id", movieId);

  // Add user constraint if userId is provided
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select();
  return { data, error };
}
