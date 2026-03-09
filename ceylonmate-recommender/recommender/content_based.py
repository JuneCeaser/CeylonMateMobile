from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def recommend_by_text(db, interests):
    """
    Smarter content-based recommendation using TF-IDF text similarity
    """

    if not interests:
        return []

    # Get all experiences
    experiences = list(
        db["experiences"].find({}, {"title": 1, "category": 1, "description": 1})
    )

    if not experiences:
        return []

    # Build text for each experience
    experience_texts = []
    for exp in experiences:
        text = f"{exp.get('title', '')} {exp.get('category', '')} {exp.get('description', '')}"
        experience_texts.append(text)

    # Build user profile text
    user_text = " ".join(interests)

    # TF-IDF vectorization
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(experience_texts + [user_text])

    # Last vector is the user
    user_vector = tfidf_matrix[-1]
    experience_vectors = tfidf_matrix[:-1]

    similarities = cosine_similarity(user_vector, experience_vectors).flatten()

    # Attach similarity score
    scored_results = []
    for i, exp in enumerate(experiences):
        exp["_id"] = str(exp["_id"])
        exp["score"] = float(similarities[i])
        scored_results.append(exp)

    # Sort highest score first
    scored_results.sort(key=lambda x: x["score"], reverse=True)

    return scored_results[:10]