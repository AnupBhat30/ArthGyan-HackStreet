import os
import json  # To handle local storage data
from googleapiclient.discovery import build
from typing import List, Dict

class DynamicFinancialContentAggregator:
    def __init__(self, local_storage_path: str):
        """
        Initialize the aggregator with YouTube API and dynamically fetched topics
        """
        youtube_api_key = os.environ.get("YOUTUBE_API_KEY")
        if not youtube_api_key:
            raise ValueError("YouTube API key is missing. Set YOUTUBE_API_KEY in environment variables.")
        
        self.youtube_client = build('youtube', 'v3', developerKey=youtube_api_key)
        self.local_storage_path = local_storage_path  # File path to local storage JSON

    def get_weakest_topics(self) -> List[str]:
        """
        Retrieve lowest-rated financial topics from local storage.
        """
        try:
            with open(self.local_storage_path, "r") as file:
                user_data = json.load(file)  # Load stored ratings

            # Extract topics and their ratings
            topic_ratings = user_data.get("financial_knowledge_ratings", {})

            if not topic_ratings:
                return ["financial literacy India"]  # Default if no data available

            # Sort topics by lowest rating
            weakest_topics = sorted(topic_ratings, key=lambda x: topic_ratings[x])[:3]  # Pick 3 weakest topics
            
            return weakest_topics
        
        except Exception as e:
            print(f"Error fetching weakest topics: {e}")
            return ["financial literacy India"]

    def search_content(self, query: str, max_results: int = 5) -> List[Dict]:
        """
        Search YouTube for relevant financial content.
        """
        try:
            request = self.youtube_client.search().list(
                part="snippet",
                q=query,
                type="video",
                regionCode="IN",
                relevanceLanguage="hi",
                maxResults=max_results,
                order="relevance"
            )
            response = request.execute()
            
            return [
                {
                    'title': item['snippet']['title'],
                    'description': item['snippet']['description'][:250] + '...',
                    'thumbnail': item['snippet']['thumbnails']['medium']['url'],
                    'url': f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                    'source': 'YouTube',
                    'published_at': item['snippet']['publishedAt']
                } for item in response.get('items', [])
            ]
        except Exception as e:
            print(f"Content Search Error: {e}")
            return []

    def get_recommended_content(self) -> Dict:
        """
        Generate personalized recommendations based on weak topics.
        """
        weakest_topics = self.get_weakest_topics()
        search_queries = [f"{topic} finance India" for topic in weakest_topics]

        recommended_content = {'videos': []}

        for query in search_queries:
            content_results = self.search_content(query)
            recommended_content['videos'].extend(content_results)

        recommended_content['total_results'] = len(recommended_content['videos'])
        return recommended_content

# Example Usage
def main():
    # Path to the local storage file (Replace with actual localStorage retrieval method in frontend)
    local_storage_path = "user_financial_ratings.json"  # Example JSON file path

    aggregator = DynamicFinancialContentAggregator(local_storage_path)
    
    personalized_content = aggregator.get_recommended_content()
    
    print("🔹 Recommended Financial Content Based on Weakest Topics:")
    for video in personalized_content['videos'][:5]:  # Display first 5 videos
        print(f"📌 {video['title']}\n🔗 {video['url']}\n---")

if __name__ == "__main__":
    main()