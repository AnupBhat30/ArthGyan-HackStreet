# ArthGyan: Own Your Finances. Own Your Future

# Video Demo: https://drive.google.com/file/d/1EUpZ9aexeyU00m3zomH4AoDTaR2xK8cC/view?usp=sharing

## Team Information

**Team Name:** HackStreet  
**Team Leader:** Anup Bhat  

**Team Members:**  
- Anup Bhat - 7420811010, anupbhat67@gmail.com  
- Hamdan Shaik - 9762541380, hamdanshaikh11133@gmail.com  
- Aaron Rebello - 8999085365, aaronrebello110@gmail.com  

## Problem Statement
##  PS1: Building India’s Next-Gen Financial Literacy Platform

Description 
In India, financial literacy remains low, with many individuals unaware of how to manage their money, plan for the future, or navigate complex financial instruments like investments, insurance, and taxation. A lack of accessible, structured, and practical financial education prevents people from making informed financial decisions. Your challenge is to design and develop a scalable digital platform that empowers individuals of all ages—from students to working professionals and retirees—to understand, learn, and apply financial literacy tailored to the Indian financial ecosystem.


## Project Overview
ArthGyan is an AI-powered financial management platform designed to make personal finance accessible and understandable for everyone. Our solution provides a comprehensive toolkit to analyze contracts, offer multilingual financial assistance, simulate financial decisions through gamification, and deliver personalized content to improve financial literacy.

## Features

### 1. Contract Analyzer for Financial Documents
**Objective:** Detect hidden clauses and predatory statements in financial contracts.

**Details:**
- Uses Natural Language Processing (NLP) to analyze financial documents.
- Highlights potentially harmful or predatory clauses.
- Provides recommendations for users to review the contract thoroughly.

### 2. Multilingual Voice Assistant
**Objective:** Assist digitally illiterate users through voice-based financial guidance.

**Details:**
- Integrated with a multilingual voice assistant (e.g., AI4Bharat IndicTrans and BharatGPT).
- Allows users to interact using voice commands in multiple languages.
- Answers queries related to financial planning, tax filing, investment, etc.

### 3. Gamification of Financial Decisions
**Objective:** Help users make real-life financial decisions through a game-like environment.

**Details:**
- Simulates financial scenarios where users make choices related to spending, saving, and investing.
- Offers rewards for wise financial decisions and feedback on poor choices.
- Designed to make financial learning fun and interactive, similar to the BitLife simulator.

### 4. Fine-Tuned Chatbot for Financial Health
**Objective:** Analyze user financial health and provide personalized suggestions.

**Details:**
- Utilizes Google Gemini to offer tailored strategies for managing spending, savings, and investments.
- Helps users with tax filing, selecting the best investment options, and insurance policies.
- Provides insights based on financial health data.

### 5. Financial Knowledge Radar
**Objective:** Identify gaps in users' financial knowledge and recommend learning resources.

**Details:**
- Scans user interactions to pinpoint areas where they lack financial knowledge.
- Recommends relevant financial topics for further learning.
- Provides users with curated resources to enhance their financial literacy.

### 6. Curated Content Recommendations
**Objective:** Suggest educational content to users based on their financial learning needs.

**Details:**
- Uses YouTube Data API to recommend videos on financial planning, taxation, and investments.
- Pulls articles and blogs from Google News RSS to provide updated information on financial topics.
- Customizes recommendations based on the user's financial knowledge radar.

## Technology Stack
- **Frontend:** React
- **Backend:** Python (FastAPI, FastRTC)
- **AI Models:** Google Gemini, Groq, LLaMA 70B
- **APIs:** YouTube Data API, Google News RSS

## Contributions

- **Anup Bhat:** Worked on the contract analyzer, multimodal multilingual voice assistant using Gemini-2.0-flash and FastRTC, and gamification.
- **Hamdan Shaik:** Developed the fine-tuned chatbot using Gemini or Groq (LLaMA-70B Versatile) and implemented financial analytics visualization.
- **Aaron Rebello:** Designed the financial content aggregation system based on users' knowledge gaps.

## Project Structure
```
RETROTHON-HackStreet/
├── backend/
│   ├── contract.py
│   ├── fastrc.py
│   ├── index.html
    └── game.py
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env
│   ├── .gitignore
│   ├── app.py
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## How to Run the Project


### Clone the Repository
```bash
git clone https://github.com/AnupBhat30/ArthGyan-HackStreet
cd Arthgyan-HackStreet
```

### 1. Run the Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python fastrc.py  # For the voice assistant
python contract.py  # For the contract analyzer
```

Access the services at `http://localhost:5000`

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.


## Contact
For any queries or contributions, feel free to reach out:

- **Anup Bhat**: anupbhat67@gmail.com
- **Hamdan Shaik**: hamdanshaikh11133@gmail.com
- **Aaron Rebello**: aaronrebello110@gmail.com

---
**Own Your Finances. Own Your Future.**

