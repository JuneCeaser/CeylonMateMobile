// backend/scripts/ingestData.js
require("dotenv").config();
const mongoose = require("mongoose");
const { HfInference } = require("@huggingface/inference"); // Import official HF library

// Initialize the Hugging Face Inference instance with your API token
const hf = new HfInference(process.env.HF_TOKEN);

/**
 * Cultural Schema: Defines how cultural facts and their vector representations
 * are stored in MongoDB Atlas for Vector Search.
 */
const CulturalSchema = new mongoose.Schema({
    text: String,
    category: String,
    embedding: Array // Stores the 384-dimensional vector
});

// Create the Model: linking to the 'cultural_knowledge' collection
const CulturalKnowledge = mongoose.model("cultural_knowledge", CulturalSchema, "cultural_knowledge");

/**
 * getEmbedding: Converts plain text into a numerical vector (Embedding).
 * Uses the official HF library to handle the Feature Extraction pipeline.
 */
async function getEmbedding(text) {
    try {
        // featureExtraction automatically selects the correct API endpoint
        const output = await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: text,
        });

        // The library returns a numerical array (the vector)
        return output; 
    } catch (error) {
        console.error("Hugging Face Library Error:", error.message);
        return null;
    }
}

/**
 * ingest: Main function to connect to DB, generate vectors, and save data.
 */
async function ingest() {
    try {
        // 1. Establish connection to MongoDB Atlas
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📡 Connected to MongoDB Atlas...");
        
        // 2. Clear old data to prevent duplicates during testing
        await CulturalKnowledge.deleteMany({}); 
        console.log("🧹 Cleaned old cultural records.");

        // 3. Cultural dataset to be vectorized and stored
        const data = [
            {
                category: "Farming",
                text: "Village Rice Farming: Rice cultivation has been central to Sri Lankan civilization for over 2,000 years, supported by ancient tank (wewa) irrigation systems. Guidance: Tourists can join half-day experiences walking in paddy fields, learning planting/harvesting, and tasting village meals. Wear suitable clothes for mud and sun protection. Ethics: Ask permission before entering private fields, do not waste water or food, and respect the farmers' schedules."
            },
            {
                category: "Cooking",
                text: "Home-Style Cooking Classes: Sri Lankan cuisine is a rich blend of Sinhalese, Tamil, Arab, Malay, and colonial influences. Guidance: Classes in real village homes include market visits to buy fresh spices and vegetables. Learn to make curries, pol sambol, and hoppers. Ethics: Wash hands before eating, use only the right hand for eating with fingers, and ensure income stays with the local family hosting you."
            },
            {
                category: "Dancing",
                text: "Kandyan Dance & Drumming: This sacred art (Udarata Natum) evolved from temple rituals. The Ves dance is linked to the Temple of the Tooth. Guidance: View demonstrations by certified local troupes and take beginner lessons in basic steps and 'geta beraya' rhythms. Ethics: Treat Ves costumes and temple items as sacred; do not touch them without permission. Pay dancers directly to ensure they benefit."
            },
            {
                category: "Handicraft",
                text: "Low-Country Mask Dance (Kolam, Sanni, Raksha): Traditional southern dances used for healing and folk theater. Guidance: Combine a mask museum visit with a village performance. Each character has a specific story. Ethics: Some healing rituals are spiritually sensitive; do not mock or imitate them without guidance. Respect community control over how much is shared."
            },
            {
                category: "Handicraft",
                text: "Wooden Mask Carving: A hereditary craft in Ambalangoda using local 'Kaduru' wood. Guidance: Join half-day workshops to watch artisans carve and paint. You can try painting a small piece. Ethics: Do not haggle excessively on prices as this is a master craft. Ensure wood is legally and sustainably sourced."
            },
            {
                category: "Handicraft",
                text: "Batik & Handloom Workshops: Batik is an art of waxing and dyeing, while handloom weaving is a village economy staple. Guidance: Design your own small batik piece or try weaving at a village center. Ethics: Avoid copying sacred temple motifs without consent. Pay weavers fairly and support small local businesses."
            },
            {
                category: "Handicraft",
                text: "Dumbara Mat Weaving: A UNESCO recognized intangible heritage from Kandy's Dumbara Valley. Guidance: Visit weaving houses to see natural fiber dyeing and intricate pattern making. Ethics: Respect elders who hold the pattern knowledge; ask before filming their work process."
            },
            {
                category: "Handicraft",
                text: "Laaksha Lacquerwork: A traditional art used to decorate ceremonial items like sesath and bangles. Guidance: Watch live demonstrations of hand-spun heat methods and try finishing a small box or bangle. Ethics: Do not buy synthetic substitutes; support genuine artisans using traditional resin."
            },
            {
                category: "Dancing",
                text: "Rūkada Nātya (String Puppetry): Traditional string puppetry used for moral lessons through folk stories. Guidance: Attend evening shows in village halls; try simple movements backstage after the performance. Ethics: Maintain the integrity of the stories; do not expect the narrator to change core messages for humor."
            },
            {
                category: "Tradition",
                text: "Sinhala & Tamil New Year Games (Avurudu Kreeda): Celebrated in April marking the harvest. Includes games like pot-breaking and tug-of-war. Guidance: Learn customs like lighting the hearth and respectful greetings (Bulath Hurulla). Ethics: Treat the rituals with dignity, not just as photo opportunities. Follow the community's lead during ceremonies."
            },
            {
                category: "Tradition",
                text: "Vesak Lantern & Pandol Making: Celebrates Buddha's birth and enlightenment in May. Guidance: Join workshops to build bamboo and paper lanterns. Visit pandols displaying Jataka stories. Ethics: Dress modestly (shoulders/knees covered), avoid alcohol near religious sites, and respect the devotional nature of the event."
            },
            {
                category: "Religion",
                text: "Temple Etiquette & Pilgrimage Walks: Sri Lanka coexists with Buddhist, Hindu, Muslim, and Christian traditions. Guidance: Learn the meanings of stupas and kovils. Before entry, remove shoes and hats. Ethics: Cover shoulders and knees. Never pose with your back to a Buddha statue, do not touch sacred objects, and keep conversations quiet."
            },
            {
                category: "Religion",
                text: "Kataragama & Fire-Walking: A multi-religious festival featuring deep devotion and vows. Guidance: Observe the fire-walking and kavadi dances from a respectful distance. Ethics: Observation only—tourists should not participate in dangerous acts like fire-walking. Avoid intrusive photography of pilgrims in deep prayer."
            },
            {
                category: "Health",
                text: "Ayurveda & Traditional Healing: An ancient medical system using herbs and lifestyle balance. Guidance: Walk through herbal gardens and receive simple treatments like head oil massages at certified village clinics. Ethics: Be clear about medical versus spa treatments. Respect the confidentiality of health discussions."
            },
            {
                category: "Livelihood",
                text: "Toddy Tapping & Kithul Treacle: Rural livelihoods based on palm sap collection. Guidance: See safe demonstrations of sap collection and its conversion to jaggery or treacle. Ethics: Do not pressure tappers into risky climbs for photos. Respect local religious views if you are tasting fermented toddy."
            },
            {
                category: "Livelihood",
                text: "Lagoon & Traditional Fishing: Using 'oru' boats and traditional nets in places like Negombo. Guidance: Visit morning fish markets and try traditional net casting. End with a seafood meal at a local home. Ethics: Follow local fishing regulations and do not photograph workers without asking permission first."
            },
            {
                category: "History",
                text: "Hill Country Tea Heritage: Plantation culture with Tamil estate communities. Guidance: Walk through smallholder tea fields and participate in picking demonstrations. Ethics: Avoid 'poverty tourism' by engaging with dignity. Ensure your fees go directly to worker families or local cooperatives."
            },
            {
                category: "Tourism",
                text: "Village Homestays: Living with local families to share meals and daily chores. Guidance: Participate in storytelling evenings and local music nights. Ethics: Agree on prices beforehand and respect the privacy of the family. Follow house rules and local dress codes."
            },
            {
                category: "Tradition",
                text: "Traditional Games: Village life includes folk games like Olinda Keliya (board games) and carrom. Guidance: Let village elders teach you the rules and the history of these social games. Ethics: Avoid gambling and ensure that children's participation is purely voluntary and for fun."
            },
            {
                category: "Arts",
                text: "Folklore & Village Music: Oral traditions and folk songs accompanied by rabana or flutes. Guidance: Join evening storytelling circles with elders. Use translation support to understand the moral themes. Ethics: Pay storytellers fairly as cultural bearers and avoid publishing full recordings online without consent."
            },
            {
                category: "History",
                text: "Temple Paintings & Cave Art: Murals in places like Dambulla showing religious and daily life history. Guidance: Guided visits focus on ancient symbolism and conservation. Ethics: No flash photography inside as it damages ancient pigments. Do not touch or lean against painted walls."
            }
        ];

        console.log("🔄 Generating embeddings and saving to Database...");

        for (let item of data) {
            const vector = await getEmbedding(item.text);
            
            // Ensure the vector is valid before saving to MongoDB
            if (vector && Array.isArray(vector)) {
                await CulturalKnowledge.create({
                    text: item.text,
                    category: item.category,
                    embedding: vector
                });
                console.log(`✅ Successfully saved: ${item.category}`);
            } else {
                console.log(`❌ Failed to process: ${item.category}`);
            }
        }

        console.log("🚀 Data Ingestion Process Complete!");
        process.exit();
    } catch (err) {
        console.error("❌ Process Error:", err);
        process.exit(1);
    }
}

// Start the process
ingest();