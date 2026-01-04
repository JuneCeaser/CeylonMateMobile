require("dotenv").config();
const mongoose = require("mongoose");
const { HfInference } = require("@huggingface/inference");

const hf = new HfInference(process.env.HF_TOKEN);

/** * SCHEMA UPDATE:
 * Note that all-mpnet-base-v2 produces 768-dimensional vectors.
 */
const CulturalSchema = new mongoose.Schema({
    text: String,
    category: String,
    embedding: Array 
});

const CulturalKnowledge = mongoose.model("cultural_knowledge", CulturalSchema, "cultural_knowledge");

/**
 * Generates high-accuracy embeddings using the MPNET model.
 */
async function getEmbedding(text) {
    try {
        const output = await hf.featureExtraction({
            model: "sentence-transformers/all-mpnet-base-v2", 
            inputs: text,
        });
        return output; 
    } catch (error) {
        console.error("HF Error:", error.message);
        return null;
    }
}

async function ingest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📡 Connected to MongoDB Atlas...");
        
        await CulturalKnowledge.deleteMany({}); 
        console.log("🧹 Cleaned old cultural records.");

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
            },
            {
                category: "Handicraft",
                text: "Traditional Clay Pottery in Molagoda Village: Located 9km north of Pinnawala in Kegalle District, Molagoda is one of Sri Lanka's oldest pottery villages where families have engaged in manual clay pottery since the Rajakari feudal system during the king's period. Guidance: Join half-day or full-day workshops to learn clay preparation, hand-molding techniques, wheel-throwing, and observe traditional wood-fired kilns. Artisans create cooking pots, oil lamps, terracotta figures, roof tiles, and ceremonial urns. Ethics: Respect the ancestral knowledge being shared, pay artisans fairly for genuine handmade products, and handle unfired pottery carefully as it represents hours of skilled labor."
            },
            {
                category: "Fishing",
                text: "Traditional Stilt Fishing (Ritipanna): An iconic age-old fishing method unique to Sri Lanka's southern coast in Hikkaduwa, Koggala, Ahangama, Welipenna, Kathaluwa, and Mirissa. Fishermen balance on a crossbar (petta) tied to vertical poles planted in shallow waters to catch spotted herring and mackerel. Started during World War II due to food and boat shortages. Guidance: Visit during early morning or sunset for spectacular silhouettes. Some authentic fishermen offer hands-on experiences where tourists can try balancing on stilts under supervision. Ethics: Many young fishermen now pose only for tourist photos—seek genuine working fishermen and pay fairly for their time. Do not pressure them to perform dangerous acts. Respect that this is a dying tradition with few practitioners remaining."
            },
            {
                category: "Dancing",
                text: "Yakun Natima (Devil Dance Ritual): An ancient healing ritual performed to exorcise evil spirits, cure illnesses, and protect communities in southern villages, especially Ambalangoda. Features performers in vivid costumes and elaborate masks representing specific demons (yakka), accompanied by rhythmic yak bera drumming and chanting. Rooted in Buddhist, Hindu, and indigenous beliefs. The edura (exorcist/shaman) wears masks to embody demons and create healing catharsis. Guidance: Seek authentic ceremonies in remote southern villages through local guides rather than staged tourist performances. Observe the ritual with deep respect as it holds spiritual significance. Best experienced at night with torchlight and smoky resin atmosphere. Ethics: This is a sacred healing ceremony, not entertainment. Do not mock, laugh, or imitate movements. Photography of pilgrims in prayer should be avoided or done with explicit permission. Allow the community to control what is shared, as some rituals are spiritually sensitive."
            },
            {
                category: "Agriculture",
                text: "Authentic Spice Garden Experiences: Ceylon spices like cinnamon, cardamom, cloves, nutmeg, pepper, and vanilla have been central to Sri Lanka's heritage for centuries. Matale region is particularly famous for spice cultivation. Guidance: Walk through lush gardens with expert guides who explain cultivation methods, traditional uses in cuisine and Ayurveda, and processing techniques. Watch live demonstrations of spice preparation and sample herbal teas, natural oils, and organic products. Learn to identify authentic spices and their grades. Ethics: Choose carefully vetted spice gardens that support local farmers rather than commercial tourist traps. Avoid gardens that aggressively sell overpriced products. Ask if income reaches actual growers and support smallholder cooperatives when possible."
            },
            {
                category: "Agriculture",
                text: "Ceylon Cinnamon Estate Experience: True Ceylon cinnamon (Cinnamomum verum) is unique to Sri Lanka and prized by chefs worldwide. Guidance: Visit cinnamon estates to see the plants growing, then observe master peelers transforming bark into precision cinnamon quills. Learn about different grades based on quality and thickness. Tourists can try peeling cinnamon themselves under expert guidance. Watch cinnamon oil extraction processes. Finish with cinnamon-infused juice and tea tasting. Ethics: This is skilled labor requiring years of practice—do not undervalue the craft. Pay peelers directly when possible. Many women and entire families work as peelers; ensure your visit respects their work schedules and provides fair compensation."
            },
            {
                category: "Handicraft",
                text: "Traditional Brass and Metal Work: Ancient craft practiced by artisans called Lokuru or Achari (blacksmiths) across Kandy, Matale, Batticaloa, Galle, Colombo, Gampaha, and Hambantota districts. Angulmaduwa (between Hambantota and Matara) is considered the original home of metal artisans. Kandy district has a Housing Estate for Craftsmen (Kala Puraya or Craft City) where descendants of royal mastercraftsmen work. Guidance: Visit workshops to watch artisans cast brass, bronze, copper, and niello into temple bells, Buddha figures, oil lamps, door hinges, locks, betel pounders, arecanut slicers, and ornamental animals (Hansa, Kukul Pahana, Sinha, Naga). The bell-making craft tests quality through the special tone produced. Ethics: These are descendants of royal craftsmen preserving ancient techniques—respect their heritage. Buy directly from artisans rather than middlemen. Authentic casting and bell-making require significant skill; do not bargain aggressively."
            },
            {
                category: "Tradition",
                text: "Village Pola (Weekly Markets): Authentic weekly pop-up bazaars where rural communities gather to trade, bargain, and stock supplies. Markets overflow with fresh spices, handwoven baskets, big fish, farm vegetables, red rice, dried areca nuts, cinnamon, and local produce. Guidance: Visit early morning for the most active atmosphere. Observe traditional barter systems still in practice. Try local snacks and interact with vendors selling heritage seeds and organic produce. Learn about seasonal crops and traditional preservation methods. Ethics: Bargain respectfully without undermining livelihoods. Purchase items you genuinely need rather than treating the market as only a photo opportunity. Ask permission before photographing vendors, especially women. Support small-scale farmers and avoid large commercial resellers."
            },
            {
                category: "Handicraft",
                text: "Traditional Gemstone and Jewelry Making: Sri Lanka's gem trade spans centuries with famous blue sapphires, rubies, and other precious stones. Guidance: Join hands-on workshops with skilled local artisans in Galle or Ahangama regions. Learn to distinguish authentic gems from imitations, understand gem varieties and their values, and follow the jewelry-making process from stone selection to final setting. Create your own piece using traditional techniques with guidance. Some workshops include complimentary handcrafted silver rings. Ethics: Ensure gems are ethically sourced with proper documentation. Be aware of the difference between authentic workshops and commercial tourist traps. Respect the cultural significance behind traditional designs and avoid copying sacred motifs without understanding their meaning."
            },
            {
                category: "Tourism",
                text: "Village Homestay with Cultural Activities: Living with local families in villages near cultural sites like Sigiriya, Dambulla, or Habarana offers immersive experiences. Guidance: Participate in bullock cart rides, help with daily farm chores, join storytelling evenings with elders, play traditional games like Olinda Keliya and carrom, attend village music nights with rabana drums and flutes, and share home-cooked meals made from locally sourced ingredients. Learn oral traditions and folk songs with translation support. Ethics: Agree on all prices beforehand to avoid misunderstandings. Respect family privacy and household rules. Follow local dress codes (modest clothing covering shoulders and knees). Ensure income stays with the host family rather than external agencies. Participate in children's games only when genuinely welcomed, never pressured. Do not publish detailed family information or extensive recordings without explicit consent."
            },
            {
                category: "Religion",
                text: "Hidden Meditation Caves Beyond Dambulla: Ancient Buddhist meditation chambers dating to the 1st century BC, concealed by overgrown banyan roots and rock formations near the Golden Cave Temple. Originally used by Sri Lanka's earliest Buddhist monks for deep practice. Guidance: These sacred caves require local monk guidance and often special permission. Visit during quieter hours and express genuine interest in Buddhist teachings rather than tourism. Experience the raw, unrestored meditation chambers that reveal centuries of spiritual practice. Ethics: These are active spiritual sites, not tourist attractions. Approach with utmost reverence. Do not touch ancient surfaces or disturb meditation areas. Photography may be restricted or prohibited. Donations to temple maintenance are appropriate. Cover shoulders and knees, remove shoes, and maintain silence."
            },
            {
                category: "Religion",
                text: "Forest Monastery Visits (Aranya Senasana): Ancient forest monasteries like Ritigala and Arankele where monks live in complete seclusion following Buddha's original teachings. These sites portray the peaceful, simple lifestyle with minimal possessions and natural surroundings. Guidance: Visit with respectful intention to learn about meditation practice and Buddhist philosophy. Observe the architectural remains of ancient monastic complexes integrated with nature. If welcomed, share a simple meal of steamed rice, jackfruit curry, and forest vegetables with the community. Ethics: These are functioning religious communities seeking solitude—do not disturb meditation practices. Speak softly and follow all monastery rules. Dress extremely modestly. Do not bring inappropriate items (meat, alcohol, revealing clothes). Photography of monks requires permission. Practice mindfulness throughout your visit and consider the humility at the heart of these teachings."
            },
            {
                category: "Handicraft",
                text: "Cane and Bamboo Weaving: Traditional craft using natural cane and bamboo to create furniture, baskets, mats, and household items. Practiced in villages like Wewaldeniya near pottery centers. Guidance: Visit rural workshops to watch artisans split, soak, and weave cane into intricate patterns. Learn about sustainable harvesting from nearby forests and the soaking/drying processes that make cane flexible. Try basic weaving techniques under supervision. Ethics: Support sustainable forestry practices—ask about cane sources. These natural fiber crafts are environmentally friendly; appreciate them as eco-friendly alternatives to plastic. Pay fairly for time-intensive handwoven items."
            }
        ];

        console.log("🔄 Generating embeddings (768-dim) and saving...");

        for (let item of data) {
            const vector = await getEmbedding(item.text);
            
            if (vector && Array.isArray(vector)) {
                await CulturalKnowledge.create({
                    text: item.text,
                    category: item.category,
                    embedding: vector
                });
                console.log(`✅ Saved: ${item.category}`);
            } else {
                console.log(`❌ Failed: ${item.category}`);
            }
        }

        console.log("🚀 Data Ingestion Complete!");
        process.exit();
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

ingest();