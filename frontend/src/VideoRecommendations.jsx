import React, { useState, useEffect } from "react";
import { fetchYouTubeVideos } from "./api"; // Import the API function
// No need for "./Recommendation.css" anymore if using only Tailwind

// Import icons if needed, e.g., for external links
import { FiExternalLink } from 'react-icons/fi';

// Assume fetchYouTubeVideos returns objects like: { id: 'videoId', title: 'Video Title' }

const VideoRecommendations = () => {
  const [lowestRatedTopic, setLowestRatedTopic] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true); // Add loading state for videos
  const [loadingTopic, setLoadingTopic] = useState(true);  // Add loading state for topic

  // Hardcoded articles and blog links (same as before)
  const topicArticles = {
    "Investment": [
        { title: "Best Investment Strategies for Indian Market", link: "https://www.moneycontrol.com/news/business/personal-finance/best-investment-strategies-in-indian-market-8552421.html" },
        { title: "Top Investment Trends in India 2025", link: "https://www.moneycontrol.com/news/business/markets/top-investment-trends-india-2025-8457551.html" },
        { title: "How to Build a Strong Investment Portfolio", link: "https://www.financialexpress.com/money/investment/how-to-build-a-strong-investment-portfolio/2463476/" },
        { title: "10 Best Mutual Funds to Invest in India 2025", link: "https://www.moneycontrol.com/news/business/personal-finance/best-mutual-funds-to-invest-in-india-2025-8776971.html" },
        { title: "The Future of Cryptocurrency in India: What to Expect", link: "https://www.businessinsider.in/cryptocurrency/article/the-future-of-cryptocurrency-in-india-what-to-expect/79228356" },
    ],
    "Taxes": [
        { title: "Income Tax Filing Guide 2025", link: "https://www.financialexpress.com/money/income-tax/income-tax-return-filing-guide-2025-forms-revised-rules-and-exemptions-to-know/2905518/" },
        { title: "Tax Planning for Indian Citizens", link: "https://www.thehindu.com/business/tax-planning-ideas-for-indian-citizens/article37411239.ece" },
    ],
    "Insurance": [
        { title: "Best Health Insurance Policies in India 2025", link: "https://www.indiatoday.in/insurance/story/best-health-insurance-policies-in-india-2025-1796075-2021-06-25" },
        { title: "How to Choose the Right Life Insurance in India", link: "https://www.hindustantimes.com/money/insurance/how-to-choose-the-right-life-insurance-in-india/story-oHdz0wR8RHZLOhHRyYl9TO.html" },
    ],
    "Budgeting": [
        { title: "How to Create a Personal Budget in India", link: "https://www.financialexpress.com/money/personal-finance/how-to-create-a-personal-budget-in-india/2567252/" },
        { title: "Top Budgeting Apps for Indians in 2025", link: "https://www.moneycontrol.com/news/business/personal-finance/top-budgeting-apps-for-indians-in-2025-8499800.html" },
        { title: "Budgeting Tips for Beginners: A Complete Guide", link: "https://www.indiatoday.in/business/story/budgeting-tips-for-beginners-a-complete-guide-1875826-2021-08-01" },
        { title: "How to Save Money: Budgeting Tips for Every Income Level", link: "https://www.moneycontrol.com/news/business/personal-finance/how-to-save-money-budgeting-tips-for-every-income-level-8439736.html" },
        { title: "How to Stick to Your Monthly Budget: A Simple Guide", link: "https://www.financialexpress.com/money/personal-finance/how-to-stick-to-your-monthly-budget-a-simple-guide/2490363/" },
        { title: "10 Common Budgeting Mistakes You Should Avoid", link: "https://www.moneycontrol.com/news/business/personal-finance/10-common-budgeting-mistakes-you-should-avoid-8542500.html" },
        { title: "Zero-Based Budgeting: A New Approach to Manage Your Finances", link: "https://www.thehindu.com/business/zero-based-budgeting-a-new-approach-to-manage-your-finances/article30420637.ece" },
    ],
    // Add more topics and articles as needed
  };

  useEffect(() => {
    setLoadingTopic(true);
    setLoadingVideos(true);
    // Retrieve financial knowledge ratings from localStorage
    const storedData = localStorage.getItem("financialKnowledge");
    let topicToFetch = null;

    if (storedData) {
      try {
        const knowledge = JSON.parse(storedData);
        // Find the topic with the lowest rating
        const lowestTopicEntry = Object.entries(knowledge)
          .reduce((min, [topic, score]) => (score < min[1] ? [topic, score] : min), ["", Infinity]);

        if (lowestTopicEntry[0]) {
          topicToFetch = lowestTopicEntry[0];
          setLowestRatedTopic(topicToFetch);
        } else {
            // Handle case where knowledge exists but no topic has a score below Infinity
            console.warn("No valid lowest rated topic found in localStorage.");
            setLowestRatedTopic("General Finance"); // Fallback topic
            topicToFetch = "General Finance";
        }
      } catch (error) {
          console.error("Error parsing financialKnowledge from localStorage:", error);
          setLowestRatedTopic("General Finance"); // Fallback on error
          topicToFetch = "General Finance";
      }
    } else {
        console.warn("No financialKnowledge found in localStorage.");
        setLowestRatedTopic("General Finance"); // Fallback if no data
        topicToFetch = "General Finance";
    }
    setLoadingTopic(false);

    // Fetch videos for the determined topic
    if (topicToFetch) {
      fetchYouTubeVideos(topicToFetch)
        .then(fetchedVideos => {
          setVideos(fetchedVideos || []); // Ensure videos is always an array
          setLoadingVideos(false);
        })
        .catch(error => {
          console.error("Error fetching YouTube videos:", error);
          setVideos([]); // Clear videos on error
          setLoadingVideos(false);
        });
    } else {
        // If no topic could be determined, don't fetch videos
        setVideos([]);
        setLoadingVideos(false);
    }

  }, []); // Empty dependency array means this runs once on mount

  const currentArticles = lowestRatedTopic ? topicArticles[lowestRatedTopic] : null;

  return (
    // Apply base styles similar to FinancialLiteracyPlatform
    <div className="bg-gray-950 min-h-screen w-full font-sans text-white py-16 px-4 sm:px-6 lg:px-8">
      {/* Main content container */}
      <div className="max-w-7xl mx-auto">

        {/* Section Title for Videos */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 leading-tight">
          Recommended Videos on{' '}
          <span className="text-teal-400">
            {loadingTopic ? 'Loading topic...' : lowestRatedTopic || 'Finance'}
          </span>
        </h2>

        {/* Video Grid Section */}
        {loadingVideos ? (
          <p className="text-gray-400 text-center text-lg">Loading videos...</p>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-gray-800/60 rounded-lg overflow-hidden shadow-lg border border-gray-700/50 backdrop-blur-sm flex flex-col transform transition-transform duration-300 hover:scale-105"
              >
                <div className="aspect-video"> {/* Ensures 16:9 ratio */}
                  <iframe
                    className="w-full h-full" // Make iframe fill the container
                    src={`https://www.youtube.com/embed/${video.id}`}
                    title={video.title}
                    frameBorder="0" // Use frameBorder instead of frameborder
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="p-4 flex-grow"> {/* Allow text content to grow */}
                  <p className="text-gray-300 text-sm font-medium line-clamp-2"> {/* Limit title to 2 lines */}
                    {video.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center text-lg mb-16">
            No videos found for "{lowestRatedTopic}". Try exploring other topics!
          </p>
        )}

        {/* Articles and Blog Links Section */}
        {!loadingTopic && lowestRatedTopic && ( // Only show articles if topic is loaded and exists
            <div className="w-full max-w-4xl mx-auto mt-16">
            <h3 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                Related Articles & Blogs on <span className="text-purple-400">{lowestRatedTopic}</span>
            </h3>
            {currentArticles && currentArticles.length > 0 ? (
                <ul className="space-y-4">
                {currentArticles.map((article, index) => (
                    <li
                    key={index}
                    className="bg-gray-800/50 p-4 rounded-md border border-gray-700/50 hover:bg-gray-700/70 transition-colors duration-200 shadow-sm"
                    >
                    <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline flex justify-between items-center group"
                    >
                        <span>{article.title}</span>
                        <FiExternalLink className="ml-2 inline-block text-sm opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-center text-lg">
                No related articles available for "{lowestRatedTopic}".
                </p>
            )}
            </div>
        )}
      </div>
    </div>
  );
};

export default VideoRecommendations;