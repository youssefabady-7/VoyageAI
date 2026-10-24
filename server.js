require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;
const ENV_PATH = path.join(__dirname, ".env");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// In-memory key store if set via UI
let inMemoryApiKey = "";
let detectedWorkingModel = "gemini-3.8-flash";

// Helper to dynamically read GEMINI_API_KEY from .env or memory
function getEffectiveApiKey(clientApiKey) {
  if (clientApiKey && typeof clientApiKey === "string" && clientApiKey.trim()) {
    const k = clientApiKey.trim();
    if (k !== "YOUR_API_KEY_HERE") return k;
  }
  if (inMemoryApiKey && inMemoryApiKey.trim() && inMemoryApiKey !== "YOUR_API_KEY_HERE") {
    return inMemoryApiKey.trim();
  }
  try {
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, "utf8");
      const match = content.match(/^GEMINI_API_KEY=(.*)$/m);
      if (match && match[1]) {
        const val = match[1].trim().replace(/^["']|["']$/g, "");
        if (val && val !== "YOUR_API_KEY_HERE") {
          return val;
        }
      }
    }
  } catch (e) {
    console.error("Error reading .env:", e.message);
  }
  const envVal = process.env.GEMINI_API_KEY;
  if (envVal && envVal.trim() && envVal !== "YOUR_API_KEY_HERE") {
    return envVal.trim();
  }
  return "";
}

// Dynamically fetch and rank available models from Google AI for a given key
async function queryAvailableModels(apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status}`;
      return { success: false, error: msg };
    }
    const data = await res.json();
    const allModels = data.models || [];
    
    // Filter for models that support generateContent
    const contentModels = allModels
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
      .map(m => m.name.replace(/^models\//, ""));

    // Priority ordering of modern supported models (Gemini 3.8 Flash / 3.6 Flash first)
    const priorityList = [
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.0-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash-001",
      "gemini-2.0-flash-lite",
      "gemini-2.0-pro-exp",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    let chosen = null;
    for (const p of priorityList) {
      if (contentModels.includes(p)) {
        chosen = p;
        break;
      }
    }

    if (!chosen && contentModels.length > 0) {
      chosen = contentModels[0];
    }

    return {
      success: true,
      models: contentModels,
      bestModel: chosen || "gemini-3.8-flash"
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

const SYSTEM_PROMPT = `You are "VoyageAI" — an elite, world-class AI travel agent designed for discerning travelers. You possess encyclopedic knowledge of global travel, airlines, luxury & boutique hotels, hidden culinary gems, cultural customs, and current 2026 pricing.

DEVELOPER & ARCHITECT CREDITS:
You were proudly engineered and created by Youssef Abady (Lead Web Developer & AI Engineer). If asked who built you or about the developer, warmly introduce Youssef Abady, his LinkedIn (www.linkedin.com/in/youssef-abady-8854ys), email (youssefabady6@gmail.com), and phone (+20 1270383409).

YOUR PERSONALITY:
- Highly professional, warm, attentive, and knowledgeable.
- Cultured with a witty, tasteful sense of humor (travel jokes or playful remarks are welcome, but always elegant).
- Passionate about creating unforgettable, seamless journeys.

CONVERSATION DISCOVERY FLOW (MANDATORY):
You must guide the user step-by-step. Do NOT overwhelm them with too many questions at once — ask ONE or TWO related questions per message in a natural, conversational manner:
1. GREETING & DESTINATION: Greet the traveler warmly. Ask which destination calls to them (highlight your specialties: Europe, Dubai, United States, Egypt, or anywhere else worldwide).
2. TRAVEL PARTY: Inquire about the travel party: are they traveling solo, as a couple, or with family/friends? How many people in total? Any children or seniors?
3. OCCASION: Ask if this trip marks a special occasion (honeymoon, anniversary, milestone birthday, graduation, or a rejuvenating escape).
4. BUDGET & COMFORT LEVEL: Tactfully ask about their anticipated budget range (per person or total trip) and travel style (luxury, premium comfort, or smart value).
5. DURATION & DATES: Inquire about their planned length of stay (number of days/nights) and target month or travel season in 2026.
6. DEPARTURE POINT: Ask for their departure city or home airport so you can find the best flight options and deals.
7. TRAVEL INTERESTS & PASSIONS: Ask what excites them most (culinary adventures, historical landmarks, relaxation & wellness, outdoor thrill, shopping, nightlife, or art & architecture).

ITINERARY GENERATION (When you have gathered their details):
Create a breathtaking, personalized itinerary featuring:
1. ✈️ FLIGHT RECOMMENDATIONS:
   - Specific airline options (e.g., Emirates, Delta, Lufthansa, British Airways, EgyptAir)
   - Estimated roundtrip prices based on current 2026 rates from their departure city
   - Route highlights (direct vs convenient layovers, best loyalty alliances)
2. 🏨 HANDPICKED ACCOMMODATIONS:
   - 2-3 curated hotel/resort options tailored to their budget style with estimated nightly rates
3. 🗺️ DAY-BY-DAY CURATED ITINERARY:
   - Morning, Afternoon, and Evening activities
   - Entrance fees and estimated activity costs
   - Must-see iconic sights combined with exclusive local hidden gems
4. 🍽️ GASTRONOMIC EXPERIENCES:
   - Specific restaurant recommendations for each day (fine dining, authentic local bistros, scenic cafes)
5. 🖼️ VISUAL PREVIEWS (IMPORTANT):
   - Include 2 to 4 high-quality Unsplash image markdown links to give the traveler a visual preview of their destinations, attractions, or food!
   - Examples of verified working Unsplash images:
     * Paris/Europe: ![Paris](https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80)
     * Venice: ![Venice](https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80)
     * Rome: ![Rome](https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80)
     * Dubai Skyline: ![Dubai](https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80)
     * Dubai Architecture: ![Dubai Luxury](https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80)
     * New York City: ![New York](https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80)
     * San Francisco / California: ![California](https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80)
     * Egypt Pyramids: ![Pyramids of Giza](https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&q=80)
     * Nile Cruise: ![Nile Egypt](https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80)
     * Luxury Dining: ![Dining](https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80)
6. 💡 INSIDER TRAVEL ADVICE:
   - Local transportation tips (metro, ride-sharing, private drivers)
   - Cultural etiquette, dress codes, tipping standards, visa requirements
7. 💰 CLEAR TOTAL BUDGET BREAKDOWN:
   - Summary table totaling flights, lodging, food, and activities.

RULES & STYLE:
- Use markdown formatting with bolding, bullet points, tables, and headers for clarity.
- Ground prices, seasonal weather, and airline routes in up-to-date reality.
- Maintain an encouraging, sophisticated, and exciting tone throughout.`;

// Intelligent fallback travel advisor when in preview/demo mode
function generateFallbackResponse(userMessage, history) {
  const msg = (userMessage || "").toLowerCase();
  const stepCount = (history || []).length;

  // Developer question
  if (
    msg.includes("who made") ||
    msg.includes("developer") ||
    msg.includes("developed") ||
    msg.includes("engineer") ||
    msg.includes("creator") ||
    msg.includes("created") ||
    msg.includes("built") ||
    msg.includes("author") ||
    msg.includes("youssef") ||
    msg.includes("abady")
  ) {
    return `### Engineered with AI Precision by Youssef Abady 👨‍💻✨

VoyageAI was conceptualized, designed, and architected by **Youssef Abady**, a Lead Full-Stack Web Developer & AI Solutions Engineer.

- **LinkedIn:** [linkedin.com/in/youssef-abady-8854ys](https://www.linkedin.com/in/youssef-abady-8854ys)
- **Email:** [youssefabady6@gmail.com](mailto:youssefabady6@gmail.com)
- **Phone / WhatsApp:** [+20 1270383409](tel:+201270383409)

*Now, where in the world can we plan your next journey to?* ✈️🌍`;
  }

  // 1. Destination specific matches first
  if (msg.includes("europe") || msg.includes("paris") || msg.includes("italy") || msg.includes("france") || msg.includes("rome") || msg.includes("venice")) {
    return `### Europe: A Tapestry of Romance, Culture & Gastronomy 🇪🇺

Europe is the pinnacle of exploration and comfort. From Paris bistros to Venetian canals, here is a curated preview for you:

![Paris](https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80)
![Venice](https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80)

#### ✈️ Current 2026 Flight Estimates:
- **Roundtrip Economy:** ~$650 – $950 USD (Air France, Lufthansa, Delta, British Airways)
- **Roundtrip Premium / Business:** ~$1,800 – $3,200 USD

#### 🏨 Sample Handpicked Stays:
- **Boutique Parisian Charm:** Hôtel Fabric or Le Relais Saint-Germain (~$220–$380/night)
- **Canal-front Venetian Luxury:** Hotel Danieli or Palazzo Venart (~$350–$600/night)

#### 🍽️ Gastronomy & Activities:
- Private evening Louvre tour & Seine dinner cruise (~$160/person)
- Gondola tour in Venice with Prosecco tasting (~$110/couple)

**To tailor this specifically for you:**
1. Where will you be departing from?
2. Approximately how many days are you planning to stay, and what is your overall target budget?`;
  }

  if (msg.includes("dubai") || msg.includes("uae") || msg.includes("emirates") || msg.includes("burj")) {
    return `### Dubai: Where Tomorrow's Luxury Meets Desert Majesty 🇦🇪

Dubai delivers unforgettable opulence, world-class entertainment, and thrilling desert adventures.

![Dubai Skyline](https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80)
![Dubai Luxury](https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80)

#### ✈️ Flight Highlights & Deals:
- **Emirates Direct Specials:** ~$850 – $1,250 Economy roundtrip
- **Qatar Airways / Etihad Airways:** Outstanding service with competitive 2026 packages

#### 🌟 Signature Experiences & Restaurants:
- **Sunset Desert Safari** in vintage Land Rovers with falconry and private Bedouin starlit dinner (~$140/person)
- **Burj Khalifa At The Top (Levels 148+124)** with sky lounge access (~$115/person)
- **Dining:** At.mosphere on Level 122 or luxury marina yacht dinner (~$150–$250/person)

**To customize your trip:**
1. How many travelers are joining, and is this an occasion (honeymoon, family vacation, etc.)?
2. What are your travel dates and comfortable budget range?`;
  }

  if (msg.includes("egypt") || msg.includes("cairo") || msg.includes("pyramid") || msg.includes("nile") || msg.includes("luxor")) {
    return `### Egypt: 5,000 Years of Living Wonder & Red Sea Serenity 🇪🇬

From the timeless majesty of the Giza Plateau to luxury cruises along the Nile and crystal-clear Red Sea diving, Egypt is unbeatable for history, culture, and value.

![Pyramids of Giza](https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&q=80)
![Nile Cruise](https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80)

#### ✈️ Flight & Pricing Snapshot:
- **Roundtrip Flights:** ~$700 – $1,050 USD (EgyptAir, Turkish Airlines, Lufthansa)
- **Luxury 5-Star Nile Cruise (3–4 nights):** ~$650 – $1,300 per cabin all-inclusive
- **Cairo Historic Hotels:** Marriott Mena House overlooking the Pyramids (~$280–$450/night)

#### 🏛️ Activities & Local Dining:
- Private VIP Egyptologist tour of Giza Pyramids and Grand Egyptian Museum (GEM) (~$95/person)
- Authentic dinner at Naguib Mahfouz Cafe in Khan El Khalili bazaar (~$30/person)

**Tell me:** Would you like to combine Cairo's antiquities with a Nile cruise or a relaxing Red Sea beach stay in Sharm El Sheikh?`;
  }

  if (msg.includes("us") || msg.includes("usa") || msg.includes("united states") || msg.includes("america") || msg.includes("york") || msg.includes("california") || msg.includes("road")) {
    return `### United States: Endless Horizons & Iconic Metropolises 🇺🇸

From New York's Broadway energy to California's scenic Pacific Coast Highway and breathtaking National Parks:

![New York City](https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80)
![California](https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80)

#### ✈️ Flight & Logistics:
- **Major Hubs:** JFK, LAX, SFO, MIA (Delta, United, American Airlines)
- **Domestic Flights & Car Rentals:** Highly flexible with competitive seasonal deals

#### 🗽 Highlights & Dining:
- Broadway show in NYC & dinner at scenic rooftop overlook (~$180/person)
- Pacific Coast Highway drive through Big Sur & wine tasting in Napa Valley

**Tell me:** Where are you departing from, and how many days would you like your American adventure to be?`;
  }

  // 2. Party type matches
  if (msg.includes("couple") || msg.includes("romantic") || msg.includes("honeymoon") || msg.includes("wife") || msg.includes("husband") || msg.includes("partner")) {
    return `### A romantic journey sounds sublime! 🥂💑

There is nothing quite like discovering the world with someone special. Whether it's sunset cruises along the Seine or private dining overlooking the Dubai skyline, we will make this extraordinary.

A couple of quick details to calibrate your experience:
1. **Which destination excites you both** (Europe, Dubai, Egypt, USA, or somewhere else)?
2. **Approximately how many days** are you planning to spend away?
3. **What is your comfortable total budget range**?

*Feel free to share where you'll be flying from as well!* ✈️`;
  }

  if (msg.includes("family") || msg.includes("kids") || msg.includes("children")) {
    return `### Wonderful — family journeys make for lifelong memories! 👨‍👩‍👧‍👦✨

Traveling with family requires that perfect balance of comfort, engaging activities for all ages, and effortless logistics.

To design the ideal family escape:
1. **Which destination are you considering** (Dubai luxury & theme parks, European culture, US road trip, or Egyptian wonders)?
2. **How many members** are in your party (including ages of children)?
3. **What is your departure city and preferred budget range**? 🏖️`;
  }

  // 3. General greeting or catch-all
  if (stepCount <= 0 || msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("start")) {
    return `### Welcome to VoyageAI! ✈️✨

I am thrilled to assist you in designing your next exceptional journey. As your dedicated AI Travel Agent, I craft bespoke itineraries complete with flight deals, handpicked accommodations, insider dining, and live pricing.

To get started on your dream getaway:

**Which destination or region is calling you?**
- 🇪🇺 **Europe** *(Paris, Rome, Swiss Alps, Santorini, Barcelona)*
- 🇦🇪 **Dubai** *(Modern luxury, desert safaris, sky-high dining)*
- 🇺🇸 **United States** *(New York energy, California coast, Grand Canyon)*
- 🇪🇬 **Egypt** *(Timeless Pyramids, Nile cruises, Red Sea luxury)*
- *Or any other corner of the globe!*

*Tell me where you'd love to go, and whether you'll be traveling solo, as a couple, or with family!* 🌍`;
  }

  return `### Absolutely, I'm noting all your preferences! 📝✨

I am synthesizing your choices into a bespoke itinerary. To lock in the best flights and hotel allocations:

1. **What is your ideal departure date or month**?
2. **Where are you departing from**?
3. **Are there any dietary preferences or specific bucket-list activities** you cannot miss?

Once you let me know, I'll compile your full day-by-day travel plan with current flight deals and restaurant bookings! ✈️🗺️`;
}

// Helper: Sanitize & format multiturn history for Gemini SDK
function sanitizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory) || rawHistory.length === 0) return [];
  const clean = [];

  for (const item of rawHistory) {
    if (!item) continue;
    const role = (item.role === "ai" || item.role === "model") ? "model" : "user";
    let text = "";
    if (typeof item.text === "string") {
      text = item.text.trim();
    } else if (Array.isArray(item.parts)) {
      text = item.parts.map(p => (typeof p === "string" ? p : (p && p.text) || "")).join("\n").trim();
    }
    if (!text) continue;

    // First message must be from user
    if (clean.length === 0 && role !== "user") continue;

    // Ensure strictly alternating roles
    if (clean.length > 0 && clean[clean.length - 1].role === role) {
      clean[clean.length - 1].parts[0].text += "\n" + text;
    } else {
      clean.push({ role, parts: [{ text }] });
    }
  }

  return clean;
}

// Health check endpoint
app.get("/api/health", async (req, res) => {
  const activeKey = getEffectiveApiKey();
  res.json({
    status: "ok",
    service: "VoyageAI Agent",
    model: detectedWorkingModel,
    hasApiKey: Boolean(activeKey),
    developer: "Youssef Abady",
    timestamp: new Date().toISOString()
  });
});

// Verify API Key endpoint (dynamically discovers active Google AI Studio models)
app.post("/api/verify-key", async (req, res) => {
  try {
    const rawKey = req.body.apiKey;
    if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
      return res.status(400).json({ valid: false, error: "Please enter a Gemini API key." });
    }
    const key = rawKey.trim();

    // 1. Query Google AI Studio API for available models on this key
    const modelDiscovery = await queryAvailableModels(key);
    if (!modelDiscovery.success) {
      let errMsg = modelDiscovery.error || "Could not connect to Google AI.";
      if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid")) {
        errMsg = "The API key provided is not valid. Please verify your key at https://aistudio.google.com/";
      }
      return res.status(400).json({ valid: false, error: errMsg });
    }

    const availableModel = modelDiscovery.bestModel;
    const genAI = new GoogleGenerativeAI(key);

    // 2. Test generation with the dynamically discovered model
    try {
      const model = genAI.getGenerativeModel({ model: availableModel });
      const result = await model.generateContent("Reply with the word: READY");
      if (result && result.response) {
        detectedWorkingModel = availableModel;
        return res.json({
          valid: true,
          model: availableModel,
          availableModels: modelDiscovery.models,
          message: `Successfully connected to Google ${availableModel}! API key is verified & ready.`
        });
      }
    } catch (testErr) {
      console.warn(`Test generation with ${availableModel} failed:`, testErr.message);

      // Try other discovered candidates
      for (const altModel of modelDiscovery.models.slice(0, 3)) {
        if (altModel === availableModel) continue;
        try {
          const m = genAI.getGenerativeModel({ model: altModel });
          const r = await m.generateContent("Reply with: READY");
          if (r && r.response) {
            detectedWorkingModel = altModel;
            return res.json({
              valid: true,
              model: altModel,
              message: `Successfully connected to Google ${altModel}! API key is verified & ready.`
            });
          }
        } catch (e) {}
      }

      return res.status(400).json({
        valid: false,
        error: `Key valid, but model execution failed: ${testErr.message.replace(/\[GoogleGenerativeAI Error\]:\s*/, "")}`
      });
    }

  } catch (error) {
    return res.status(500).json({ valid: false, error: error.message || "Verification failed." });
  }
});

// Save API Key endpoint
app.post("/api/save-key", async (req, res) => {
  try {
    const { apiKey, persistToEnv } = req.body;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return res.status(400).json({ error: "API key is required." });
    }
    const key = apiKey.trim();
    inMemoryApiKey = key;

    // Detect model for this key
    const modelInfo = await queryAvailableModels(key);
    if (modelInfo.success && modelInfo.bestModel) {
      detectedWorkingModel = modelInfo.bestModel;
    }

    if (persistToEnv) {
      try {
        let envContent = "";
        if (fs.existsSync(ENV_PATH)) {
          envContent = fs.readFileSync(ENV_PATH, "utf8");
          if (envContent.includes("GEMINI_API_KEY=")) {
            envContent = envContent.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${key}`);
          } else {
            envContent += `\nGEMINI_API_KEY=${key}\n`;
          }
          if (envContent.includes("GEMINI_MODEL=")) {
            envContent = envContent.replace(/^GEMINI_MODEL=.*$/m, `GEMINI_MODEL=${detectedWorkingModel}`);
          }
        } else {
          envContent = `GEMINI_API_KEY=${key}\nGEMINI_MODEL=${detectedWorkingModel}\nPORT=3000\n`;
        }
        fs.writeFileSync(ENV_PATH, envContent, "utf8");
      } catch (fileErr) {
        console.warn("Could not write to .env file:", fileErr.message);
      }
    }

    res.json({
      success: true,
      model: detectedWorkingModel,
      message: `Gemini API key saved! Connected with ${detectedWorkingModel}.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to save API key." });
  }
});

// Clear API Key endpoint
app.post("/api/clear-key", (req, res) => {
  inMemoryApiKey = "";
  try {
    if (fs.existsSync(ENV_PATH)) {
      let envContent = fs.readFileSync(ENV_PATH, "utf8");
      envContent = envContent.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=YOUR_API_KEY_HERE`);
      fs.writeFileSync(ENV_PATH, envContent, "utf8");
    }
  } catch (e) {
    console.warn("Error resetting .env:", e.message);
  }
  res.json({ success: true, message: "API key cleared. System reset to VoyageAI Preview mode." });
});

// Main Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, apiKey: clientApiKey } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const apiKey = getEffectiveApiKey(clientApiKey || req.headers["x-api-key"]);
    const isMock = !apiKey;

    // Fallback Preview Agent if no valid API key is present
    if (isMock) {
      const fallbackResponse = generateFallbackResponse(message.trim(), history || []);
      return res.json({
        response: fallbackResponse,
        model: "voyageai-preview-agent",
        isDemo: true,
        notice: "Using VoyageAI Travel Planner. Click 'API Key' in the header to activate live Gemini 3.8 Flash!"
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const targetModel = detectedWorkingModel || process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const formattedHistory = sanitizeHistory(history);

    let responseText = "";
    let usedModel = targetModel;
    let geminiError = null;

    // Strategy 1: Dynamic Model Execution with Search Grounding
    try {
      const modelWithSearch = genAI.getGenerativeModel({
        model: targetModel,
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }]
      });
      const chat = modelWithSearch.startChat({ history: formattedHistory });
      const result = await chat.sendMessage(message);
      responseText = result.response.text();
      usedModel = `${targetModel} (Search Grounded)`;
    } catch (errSearch) {
      console.warn("Strategy 1 (Search Grounded) failed, attempting standard chat:", errSearch.message);

      // Strategy 2: Standard Chat Session (no tools)
      try {
        const standardModel = genAI.getGenerativeModel({
          model: targetModel,
          systemInstruction: SYSTEM_PROMPT
        });
        const chat = standardModel.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(message);
        responseText = result.response.text();
        usedModel = targetModel;
      } catch (errChat) {
        console.warn("Strategy 2 (Standard Chat) failed, attempting direct content generation:", errChat.message);

        // Strategy 3: Direct generateContent (bypasses startChat history validation)
        try {
          const directModel = genAI.getGenerativeModel({
            model: targetModel,
            systemInstruction: SYSTEM_PROMPT
          });

          const transcript = formattedHistory
            .map(h => `${h.role === "user" ? "Client" : "Agent"}: ${h.parts[0].text}`)
            .join("\n\n");
          const fullPrompt = transcript 
            ? `${transcript}\n\nClient: ${message}\n\nAgent:`
            : message;

          const directResult = await directModel.generateContent(fullPrompt);
          responseText = directResult.response.text();
          usedModel = `${targetModel} (Direct)`;
        } catch (errDirect) {
          console.warn("Strategy 3 failed, querying live models for alternative candidate:", errDirect.message);

          // Strategy 4: Fallback to all active models discovered via API
          try {
            const discovery = await queryAvailableModels(apiKey);
            if (discovery.success && Array.isArray(discovery.models) && discovery.models.length > 0) {
              const candidateModels = [
                discovery.bestModel,
                ...discovery.models.filter(m => m !== discovery.bestModel)
              ];

              for (const candidate of candidateModels) {
                if (!candidate) continue;
                try {
                  const altModel = genAI.getGenerativeModel({
                    model: candidate,
                    systemInstruction: SYSTEM_PROMPT
                  });
                  const r = await altModel.generateContent(message);
                  if (r && r.response) {
                    responseText = r.response.text();
                    usedModel = candidate;
                    detectedWorkingModel = candidate;
                    break;
                  }
                } catch (candidateErr) {
                  // Try direct prompt without systemInstruction for older/simpler model candidates
                  try {
                    const fallbackPlain = genAI.getGenerativeModel({ model: candidate });
                    const r2 = await fallbackPlain.generateContent(`${SYSTEM_PROMPT}\n\nClient: ${message}\n\nAgent:`);
                    if (r2 && r2.response) {
                      responseText = r2.response.text();
                      usedModel = candidate;
                      detectedWorkingModel = candidate;
                      break;
                    }
                  } catch (e2) {}
                }
              }
            }
            if (!responseText) {
              geminiError = errDirect;
            }
          } catch (errAlt) {
            geminiError = errAlt;
          }
        }
      }
    }

    if (responseText) {
      return res.json({
        response: responseText,
        model: usedModel,
        isDemo: false
      });
    }

    throw geminiError || new Error("Unable to generate response from Gemini API");

  } catch (error) {
    console.error("Chat API Error:", error);

    const errMsg = error.message || "";
    if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid") || errMsg.includes("403")) {
      return res.status(401).json({
        error: "Your Gemini API key appears to be invalid. Please verify or re-enter your key in the API Key settings modal.",
        code: "INVALID_KEY"
      });
    }

    if (errMsg.includes("quota") || errMsg.includes("429")) {
      return res.status(429).json({
        error: "Gemini API rate limit or quota exceeded. Please try again in a few moments.",
        code: "QUOTA_EXCEEDED"
      });
    }

    return res.status(500).json({
      error: "Gemini connection error: " + errMsg.replace(/\[GoogleGenerativeAI Error\]:\s*/, ""),
      code: "API_ERROR"
    });
  }
});

// SPA fallback — serve index.html for unmatched routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server if run directly (local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║      ✈️  VoyageAI Luxury Travel Agent Server  ✈️       ║
  ║      Architect & Developer: Youssef Abady             ║
  ║                                                       ║
  ║      🌐  Website: http://localhost:${PORT}               ║
  ║      💬  Chat:    http://localhost:${PORT}/chat.html         ║
  ║      🗺️  Places:  http://localhost:${PORT}/destinations.html ║
  ║      📜  Privacy: http://localhost:${PORT}/privacy.html      ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
    `);
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
