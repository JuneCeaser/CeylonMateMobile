# CeylonMate - Intelligent Tourism Ecosystem for Sri Lanka

**CeylonMate** is a comprehensive, AI-driven smart tourism platform designed to revolutionize the travel experience in Sri Lanka. Developed as a final-year research project, it combines historical preservation, personalized planning, community engagement, and tourist safety into a single cohesive mobile ecosystem.

---

## 🚀 Project Components

This research project consists of four integrated intelligent modules:

### 1. Smart Heritage Guide & Time Travel AR
**Focus:** Digital Preservation & Interactive History
* **Auto-Location Detection:** GPS-based content triggering that identifies historical sites automatically.
* **Time Travel AR:** Visualizes ancient ruins as they appeared in the past using Augmented Reality overlays.
* **Context-Aware AI Guide:** A location-locked chatbot (Llama-3) that answers history questions via voice and text, specific to the user's current site.
* **Hybrid Visualization:** Seamless switching between AR camera overlays and interactive 3D digital twins.

### 2. AI-Powered Personalized Itinerary Generator
**Focus:** Smart Travel Planning
* **Tailored Schedules:** Uses AI algorithms to generate custom travel plans based on user interests, available time, and budget.
* **Dynamic Routing:** Optimizes travel paths to save time and fuel.
* **Smart Suggestions:** Recommends hidden gems and optimal stops along the route.

### 3. Community Cultural Experience Marketplace
**Focus:** Local Economy & Authentic Experiences
* **Direct Booking:** Connects tourists directly with local artisans, guides, and cultural performers.
* **Authentic Interactions:** Promotes traditional crafts, cooking classes, and village tours.
* **Fair Trade:** Ensures local communities and creators benefit directly from tourism revenue.

### 4. Smart Safety & Emergency Assistance System
**Focus:** Tourist Security
* **Real-time Alerts:** Provides safety notifications based on current location and weather conditions.
* **Emergency SOS:** One-tap connection to tourist police and medical services.
* **Safe Zones:** Visualizes safe travel corridors and hazard warnings for tourists.

---

## 🛠️ Tech Stack

* **Frontend (Mobile):** React Native (Expo)
* **Frontend (Admin):** React.js, Vite
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **AI & ML:** Groq SDK (Llama-3), Genetic Algorithms (Itinerary Optimization)
* **AR & 3D:** React Native Webview, Model Viewer, Three.js
* **Maps:** React Native Maps (Google Maps API)

---

## 🚀 Installation & Setup

To run the project locally, follow these steps for each component.

### 1. Backend Server
```bash
cd backend
npm install
# Configure your .env file with PORT, MONGO_URI, and GROQ_API_KEY
npm start

2. Admin Dashboard
cd admin
npm install
npm run dev

3. Mobile Application

cd mobile-app
npx expo install
# Update the API_URL in app/tourist/place.js and app/place-chat.js to your local IP address
npx expo start

```
Student Name,Student ID,Component

Pathiraja J.W.P.D,IT22340528,AI Personalized Itinerary Generator |

Moragaspitiya M.R.K.A,IT22922052,Community Cultural Experience Marketplace |

Thathsarani K.K.T,IT22319838,Smart Safety & Emergency Assistance System |

De Soysa J.C.,IT22575876,Smart Heritage Guide & Time Travel AR |
