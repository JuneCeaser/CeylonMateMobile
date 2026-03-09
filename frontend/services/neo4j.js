import neo4j from 'neo4j-driver';

// ─── Connection ───────────────────────────────────────────────────────────────
const NEO4J_URI      = 'neo4j+s://3aacb775.databases.neo4j.io';
const NEO4J_USERNAME = 'neo4j';
const NEO4J_PASSWORD = '1GvNbxhWlPVjScsjth6l6Mel6KpqNrqYA_XOKUZjCUU';

let _driver = null;

export function getDriver() {
    if (!_driver) {
        _driver = neo4j.driver(
            NEO4J_URI,
            neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
            {
                maxConnectionLifetime: 3 * 60 * 60 * 1000,
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 2 * 60 * 1000,
                disableLosslessIntegers: true,
            }
        );
    }
    return _driver;
}

export async function closeDriver() {
    if (_driver) {
        await _driver.close();
        _driver = null;
    }
}

// ─── Generic query runner ─────────────────────────────────────────────────────
export async function runQuery(cypher, params = {}) {
    const driver  = getDriver();
    const session = driver.session({ database: 'neo4j' });
    try {
        const result = await session.run(cypher, params);
        return result.records;
    } finally {
        await session.close();
    }
}

// ─── Seed: populate the DB with Sri Lanka heritage data ──────────────────────
// Each statement runs in its own session to avoid Aura free-tier limitations.
export async function seedDatabase() {

    // Helper: run a single Cypher statement in a fresh session
    const run = async (cypher, params = {}) => {
        const driver  = getDriver();
        const session = driver.session({ database: 'neo4j' });
        try {
            await session.run(cypher, params);
        } finally {
            await session.close();
        }
    };

    try {
        // ── 1. Clear existing data ──────────────────────────────────────────
        await run('MATCH (n) DETACH DELETE n');

        // ── 2. Eras ─────────────────────────────────────────────────────────
        await run("CREATE (:Era {name: 'Ancient Period',  startYear: -300, endYear: 1200, description: 'Era of early Sinhalese kingdoms and hydraulic civilizations'})");
        await run("CREATE (:Era {name: 'Medieval Period', startYear: 1200, endYear: 1500, description: 'Period of Polonnaruwa and Dambadeniya kingdoms'})");
        await run("CREATE (:Era {name: 'Kandyan Period',  startYear: 1500, endYear: 1815, description: 'Last independent kingdom of Sri Lanka'})");

        // ── 3. Dynasties ────────────────────────────────────────────────────
        await run("CREATE (:Dynasty {name: 'Vijayan Dynasty',      foundedYear: -543,              description: 'Legendary founding dynasty of Sri Lanka'})");
        await run("CREATE (:Dynasty {name: 'Anuradhapura Kingdom', foundedYear: -380, endYear: 1017, description: 'First established kingdom, center of Theravada Buddhism'})");
        await run("CREATE (:Dynasty {name: 'Polonnaruwa Kingdom',  foundedYear: 1017, endYear: 1310, description: 'Second major kingdom, known for irrigation and architecture'})");
        await run("CREATE (:Dynasty {name: 'Kandyan Kingdom',      foundedYear: 1469, endYear: 1815, description: 'Last sovereign kingdom, known for Tooth Relic'})");

        // ── 4. Kings ────────────────────────────────────────────────────────
        await run("CREATE (:King {name: 'Devanampiya Tissa',  reignStart: -247, reignEnd: -207, description: 'First Buddhist king of Sri Lanka, contemporary of Ashoka'})");
        await run("CREATE (:King {name: 'Dutugamunu',         reignStart: -161, reignEnd: -137, description: 'Unified Sri Lanka and built the Ruwanwelisaya stupa'})");
        await run("CREATE (:King {name: 'Parakramabahu I',    reignStart: 1153, reignEnd: 1186, description: 'Greatest Polonnaruwa king, master of irrigation'})");
        await run("CREATE (:King {name: 'Nissanka Malla',     reignStart: 1187, reignEnd: 1196, description: 'Polonnaruwa king, prolific builder of religious monuments'})");
        await run("CREATE (:King {name: 'Kirti Sri Rajasinha',reignStart: 1747, reignEnd: 1782, description: 'Kandyan king who restored Buddhist practices'})");

        // ── 5. Temples ──────────────────────────────────────────────────────
        await run("CREATE (:Temple {name: 'Temple of the Tooth Relic', location: 'Kandy',        latitude: 7.2936, longitude: 80.6413, builtYear: 1595, description: 'Sacred Buddhist temple housing the relic of the tooth of the Buddha. UNESCO World Heritage Site.', significance: 'Highest Buddhist shrine in Sri Lanka',   visitorsPerYear: 3000000})");
        await run("CREATE (:Temple {name: 'Isurumuniya Vihara',        location: 'Anuradhapura', latitude: 8.3468, longitude: 80.3977, builtYear: -247, description: 'Ancient rock temple with famous sculptures carved into rock face.',                                   significance: 'One of the oldest temples in Sri Lanka', visitorsPerYear: 500000})");
        await run("CREATE (:Temple {name: 'Lankatilaka Image House',   location: 'Polonnaruwa',  latitude: 7.9388, longitude: 80.7481, builtYear: 1187, description: 'Magnificent brick shrine with 18m high walls and seated Buddha image.',                              significance: 'Finest example of Polonnaruwa architecture', visitorsPerYear: 400000})");

        // ── 6. Stupas (no apostrophes in property values) ───────────────────
        await run("CREATE (:Stupa {name: 'Ruwanwelisaya',  location: 'Anuradhapura', latitude: 8.3502, longitude: 80.3973, builtYear: -140, diameter: 91,  height: 103, description: 'One of the worlds largest stupas, built by King Dutugamunu. A masterpiece of ancient engineering.', significance: 'Most venerated stupa in Sri Lanka', visitorsPerYear: 2000000})");
        await run("CREATE (:Stupa {name: 'Jetavanaramaya', location: 'Anuradhapura', latitude: 8.3573, longitude: 80.4003, builtYear:  273, diameter: 112, height: 122, description: 'Once the third tallest structure in the ancient world. Built with 93 million fired bricks.',         significance: 'Largest stupa in Sri Lanka',        visitorsPerYear: 1500000})");
        await run("CREATE (:Stupa {name: 'Thuparamaya',    location: 'Anuradhapura', latitude: 8.3558, longitude: 80.3969, builtYear: -247, diameter: 19,  height:  21, description: 'First stupa built in Sri Lanka, enshrining the collarbone relic of the Buddha.',                  significance: 'First stupa in Sri Lanka',          visitorsPerYear: 800000})");

        // ── 7. Palaces ──────────────────────────────────────────────────────
        await run("CREATE (:Palace {name: 'Sigiriya Rock Fortress', location: 'Sigiriya',    latitude: 7.9571, longitude: 80.7603, builtYear:  477, description: 'Ancient rock fortress and palace built by King Kashyapa. UNESCO World Heritage Site. Features frescoes, mirror wall, and water gardens.', significance: 'Eighth Wonder of the Ancient World',   visitorsPerYear: 800000})");
        await run("CREATE (:Palace {name: 'Parakramabahu Palace',   location: 'Polonnaruwa', latitude: 7.9395, longitude: 80.7441, builtYear: 1153, description: 'Seven-storied royal palace with 1000 rooms, built by Parakramabahu I.',                                                          significance: 'Largest ancient palace in Sri Lanka', visitorsPerYear: 600000})");
        await run("CREATE (:Palace {name: 'Kandyan Royal Palace',   location: 'Kandy',       latitude: 7.2953, longitude: 80.6384, builtYear: 1590, description: 'Royal palace of the last Kandyan kings, adjacent to the Temple of the Tooth.',                                                    significance: 'Last royal palace of Sri Lanka',      visitorsPerYear: 700000})");

        // ── 8. Reservoirs ───────────────────────────────────────────────────
        await run("CREATE (:Reservoir {name: 'Minneriya Tank',    location: 'Minneriya',   latitude: 8.0376, longitude: 80.8989, builtYear:  276, area: 4670, description: 'Ancient reservoir built by King Mahasena, still functioning today. Hosts the famous elephant gathering.', significance: 'Engineering marvel of ancient Sri Lanka',  visitorsPerYear: 500000})");
        await run("CREATE (:Reservoir {name: 'Parakrama Samudra', location: 'Polonnaruwa', latitude: 7.9407, longitude: 80.7280, builtYear: 1153, area: 2539, description: 'Massive reservoir built by Parakramabahu I. His famous decree: not a drop of water must flow to the sea.', significance: 'Largest medieval reservoir in Sri Lanka', visitorsPerYear: 400000})");

        // ── 9. Heritage Sites ───────────────────────────────────────────────
        await run("CREATE (:HeritageSite {name: 'Sacred City of Anuradhapura', location: 'Anuradhapura', latitude: 8.3477, longitude: 80.3966, unescoYear: 1982, description: 'Ancient capital for over 1300 years. Contains palaces, monasteries, and the holy Bo Tree.', type: 'UNESCO World Heritage Site'})");
        await run("CREATE (:HeritageSite {name: 'Ancient City of Polonnaruwa', location: 'Polonnaruwa',  latitude: 7.9395, longitude: 80.7441, unescoYear: 1982, description: 'Second ancient capital with well-preserved medieval ruins and statues.',                      type: 'UNESCO World Heritage Site'})");
        await run("CREATE (:HeritageSite {name: 'Sacred City of Kandy',        location: 'Kandy',        latitude: 7.2906, longitude: 80.6337, unescoYear: 1988, description: 'Last capital of the ancient kings and center of Buddhist culture.',                            type: 'UNESCO World Heritage Site'})");
        await run("CREATE (:HeritageSite {name: 'Sigiriya Ancient City',       location: 'Sigiriya',     latitude: 7.9571, longitude: 80.7603, unescoYear: 1982, description: 'Ancient city built around the spectacular rock fortress.',                                     type: 'UNESCO World Heritage Site'})");

        // ── 10. Relationships: Kings → Dynasties ────────────────────────────
        await run("MATCH (a:King {name:'Devanampiya Tissa'}), (b:Dynasty {name:'Anuradhapura Kingdom'}) CREATE (a)-[:RULED_UNDER]->(b)");
        await run("MATCH (a:King {name:'Dutugamunu'}),        (b:Dynasty {name:'Anuradhapura Kingdom'}) CREATE (a)-[:RULED_UNDER]->(b)");
        await run("MATCH (a:King {name:'Parakramabahu I'}),   (b:Dynasty {name:'Polonnaruwa Kingdom'})  CREATE (a)-[:RULED_UNDER]->(b)");
        await run("MATCH (a:King {name:'Nissanka Malla'}),    (b:Dynasty {name:'Polonnaruwa Kingdom'})  CREATE (a)-[:RULED_UNDER]->(b)");
        await run("MATCH (a:King {name:'Kirti Sri Rajasinha'}),(b:Dynasty {name:'Kandyan Kingdom'})     CREATE (a)-[:RULED_UNDER]->(b)");

        // ── 11. Relationships: Kings built/renovated structures ─────────────
        await run("MATCH (a:King {name:'Dutugamunu'}),          (b:Stupa    {name:'Ruwanwelisaya'})             CREATE (a)-[:BUILT]->(b)");
        await run("MATCH (a:King {name:'Devanampiya Tissa'}),   (b:Stupa    {name:'Thuparamaya'})               CREATE (a)-[:BUILT]->(b)");
        await run("MATCH (a:King {name:'Devanampiya Tissa'}),   (b:Temple   {name:'Isurumuniya Vihara'})        CREATE (a)-[:BUILT]->(b)");
        await run("MATCH (a:King {name:'Parakramabahu I'}),     (b:Palace   {name:'Parakramabahu Palace'})      CREATE (a)-[:BUILT]->(b)");
        await run("MATCH (a:King {name:'Parakramabahu I'}),     (b:Reservoir{name:'Parakrama Samudra'})         CREATE (a)-[:BUILT]->(b)");
        await run("MATCH (a:King {name:'Parakramabahu I'}),     (b:Temple   {name:'Lankatilaka Image House'})   CREATE (a)-[:BUILT]->(b)");
        await run("MATCH (a:King {name:'Nissanka Malla'}),      (b:Temple   {name:'Lankatilaka Image House'})   CREATE (a)-[:BUILT]->(b)");
        await run("MATCH (a:King {name:'Kirti Sri Rajasinha'}), (b:Temple   {name:'Temple of the Tooth Relic'}) CREATE (a)-[:RENOVATED]->(b)");

        // ── 12. Relationships: Structures → Heritage Sites ───────────────────
        await run("MATCH (a:Stupa     {name:'Ruwanwelisaya'}),          (b:HeritageSite {name:'Sacred City of Anuradhapura'}) CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Stupa     {name:'Jetavanaramaya'}),         (b:HeritageSite {name:'Sacred City of Anuradhapura'}) CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Stupa     {name:'Thuparamaya'}),            (b:HeritageSite {name:'Sacred City of Anuradhapura'}) CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Temple    {name:'Isurumuniya Vihara'}),     (b:HeritageSite {name:'Sacred City of Anuradhapura'}) CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Reservoir {name:'Minneriya Tank'}),         (b:HeritageSite {name:'Sacred City of Anuradhapura'}) CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Temple    {name:'Lankatilaka Image House'}), (b:HeritageSite {name:'Ancient City of Polonnaruwa'}) CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Palace    {name:'Parakramabahu Palace'}),   (b:HeritageSite {name:'Ancient City of Polonnaruwa'}) CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Reservoir {name:'Parakrama Samudra'}),      (b:HeritageSite {name:'Ancient City of Polonnaruwa'}) CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Temple    {name:'Temple of the Tooth Relic'}),(b:HeritageSite {name:'Sacred City of Kandy'})      CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Palace    {name:'Kandyan Royal Palace'}),   (b:HeritageSite {name:'Sacred City of Kandy'})        CREATE (a)-[:LOCATED_IN]->(b)");
        await run("MATCH (a:Palace    {name:'Sigiriya Rock Fortress'}), (b:HeritageSite {name:'Sigiriya Ancient City'})       CREATE (a)-[:LOCATED_IN]->(b)");

        // ── 13. Relationships: Dynasties → Eras ─────────────────────────────
        await run("MATCH (a:Dynasty {name:'Anuradhapura Kingdom'}),(b:Era {name:'Ancient Period'})  CREATE (a)-[:EXISTED_IN]->(b)");
        await run("MATCH (a:Dynasty {name:'Polonnaruwa Kingdom'}), (b:Era {name:'Medieval Period'}) CREATE (a)-[:EXISTED_IN]->(b)");
        await run("MATCH (a:Dynasty {name:'Kandyan Kingdom'}),     (b:Era {name:'Kandyan Period'})  CREATE (a)-[:EXISTED_IN]->(b)");

        // ── 14. Relationships: Cultural influence ────────────────────────────
        await run("MATCH (a:HeritageSite {name:'Sacred City of Anuradhapura'}),(b:HeritageSite {name:'Ancient City of Polonnaruwa'}) CREATE (a)-[:INFLUENCED]->(b)");
        await run("MATCH (a:HeritageSite {name:'Ancient City of Polonnaruwa'}),(b:HeritageSite {name:'Sacred City of Kandy'})        CREATE (a)-[:INFLUENCED]->(b)");

        // ── 15. Relationships: Architectural influence ───────────────────────
        await run("MATCH (a:Stupa {name:'Ruwanwelisaya'}),(b:Stupa {name:'Jetavanaramaya'}) CREATE (a)-[:ARCHITECTURAL_INFLUENCE_ON]->(b)");
        await run("MATCH (a:Stupa {name:'Thuparamaya'}),  (b:Stupa {name:'Ruwanwelisaya'})  CREATE (a)-[:ARCHITECTURAL_INFLUENCE_ON]->(b)");

        // ── 16. Relationships: Spiritual connections ─────────────────────────
        await run("MATCH (a:Temple {name:'Temple of the Tooth Relic'}),(b:Palace {name:'Kandyan Royal Palace'}) CREATE (a)-[:CONNECTED_TO]->(b)");
        await run("MATCH (a:Stupa  {name:'Ruwanwelisaya'}),            (b:Stupa  {name:'Thuparamaya'})          CREATE (a)-[:CONNECTED_TO]->(b)");
        await run("MATCH (a:Temple {name:'Isurumuniya Vihara'}),       (b:Stupa  {name:'Ruwanwelisaya'})        CREATE (a)-[:CONNECTED_TO]->(b)");

        return { success: true };

    } catch (e) {
        console.error('Seed error:', e);
        return { success: false, error: e.message };
    }
}

// ─── Query: All heritage sites summary ───────────────────────────────────────
export async function getAllHeritageSites() {
    const records = await runQuery(`
        MATCH (s:HeritageSite)
        OPTIONAL MATCH (s)<-[:LOCATED_IN]-(structure)
        RETURN s, count(structure) AS structureCount
        ORDER BY s.unescoYear
    `);
    return records.map(r => ({
        ...r.get('s').properties,
        structureCount: r.get('structureCount'),
        nodeType: 'HeritageSite',
    }));
}

// ─── Query: All nodes for explore screen ─────────────────────────────────────
export async function getAllNodes() {
    const records = await runQuery(`
        MATCH (n)
        WHERE NOT n:Era
        RETURN n, labels(n) AS nodeLabels
        ORDER BY labels(n)[0], n.name
    `);
    return records.map(r => ({
        ...r.get('n').properties,
        nodeType: r.get('nodeLabels')[0],
    }));
}

// ─── Query: Node detail + all relationships ───────────────────────────────────
export async function getNodeWithRelationships(nodeName) {
    const records = await runQuery(`
        MATCH (n {name: $name})
        OPTIONAL MATCH (n)-[r]->(other)
        OPTIONAL MATCH (incoming)-[r2]->(n)
        RETURN n, labels(n) AS nodeLabels,
               collect(DISTINCT {rel: type(r), target: other.name, targetType: labels(other)[0], direction: 'outgoing'}) AS outgoing,
               collect(DISTINCT {rel: type(r2), source: incoming.name, sourceType: labels(incoming)[0], direction: 'incoming'}) AS incoming
    `, { name: nodeName });

    if (records.length === 0) return null;
    const r = records[0];
    return {
        ...r.get('n').properties,
        nodeType: r.get('nodeLabels')[0],
        outgoing: r.get('outgoing').filter(o => o.target !== null),
        incoming: r.get('incoming').filter(i => i.source !== null),
    };
}

// ─── Query: Search nodes ──────────────────────────────────────────────────────
export async function searchNodes(searchText) {
    const records = await runQuery(`
        MATCH (n)
        WHERE toLower(n.name) CONTAINS toLower($text)
           OR toLower(coalesce(n.description,'')) CONTAINS toLower($text)
           OR toLower(coalesce(n.location,'')) CONTAINS toLower($text)
        RETURN n, labels(n) AS nodeLabels
        LIMIT 20
    `, { text: searchText });
    return records.map(r => ({
        ...r.get('n').properties,
        nodeType: r.get('nodeLabels')[0],
    }));
}

// ─── Query: Path between two nodes ───────────────────────────────────────────
export async function getShortestPath(fromName, toName) {
    const records = await runQuery(`
        MATCH (a {name: $from}), (b {name: $to}),
              path = shortestPath((a)-[*..6]-(b))
        RETURN path, [node IN nodes(path) | {name: node.name, type: labels(node)[0]}] AS nodeList,
               [rel  IN relationships(path) | type(rel)] AS relTypes
        LIMIT 1
    `, { from: fromName, to: toName });

    if (records.length === 0) return null;
    const r = records[0];
    return {
        nodes:    r.get('nodeList'),
        relTypes: r.get('relTypes'),
    };
}

// ─── Query: Contextual narrative for a site ───────────────────────────────────
export async function getSiteNarrative(siteName) {
    const records = await runQuery(`
        MATCH (s:HeritageSite {name: $name})
        OPTIONAL MATCH (s)<-[:LOCATED_IN]-(structure)
        OPTIONAL MATCH (king)-[:BUILT|RENOVATED]->(structure)
        OPTIONAL MATCH (king)-[:RULED_UNDER]->(dynasty)-[:EXISTED_IN]->(era)
        OPTIONAL MATCH (s)-[:INFLUENCED]->(influenced:HeritageSite)
        OPTIONAL MATCH (influencedBy:HeritageSite)-[:INFLUENCED]->(s)
        RETURN s,
               collect(DISTINCT structure.name) AS structures,
               collect(DISTINCT king.name)      AS kings,
               collect(DISTINCT dynasty.name)   AS dynasties,
               collect(DISTINCT era.name)       AS eras,
               collect(DISTINCT influenced.name) AS influencedSites,
               collect(DISTINCT influencedBy.name) AS influencedBySites
    `, { name: siteName });

    if (records.length === 0) return null;
    const r = records[0];
    return {
        site:              r.get('s').properties,
        structures:        r.get('structures').filter(Boolean),
        kings:             r.get('kings').filter(Boolean),
        dynasties:         r.get('dynasties').filter(Boolean),
        eras:              r.get('eras').filter(Boolean),
        influencedSites:   r.get('influencedSites').filter(Boolean),
        influencedBySites: r.get('influencedBySites').filter(Boolean),
    };
}

// ─── Query: Stats for home screen ────────────────────────────────────────────
export async function getGraphStats() {
    const records = await runQuery(`
        MATCH (n) WITH labels(n)[0] AS label, count(n) AS cnt
        RETURN collect({label: label, count: cnt}) AS stats
    `);
    if (records.length === 0) return [];
    return records[0].get('stats');
}