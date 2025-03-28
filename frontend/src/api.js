const API_KEY = ""; // Replace with your API key
const BASE_URL = "https://www.googleapis.com/youtube/v3/search";

export const fetchYouTubeVideos = async (query) => {
  try {
    const response = await fetch(
      `${BASE_URL}?q=${query} finance&part=snippet&type=video&maxResults=5&key=${API_KEY}`
    );
    const data = await response.json();

    return data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
    }));
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return [];
  }
};