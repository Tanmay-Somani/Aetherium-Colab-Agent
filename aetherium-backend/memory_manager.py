# memory_manager.py
import chromadb
from chromadb.utils import embedding_functions

# --- Configuration ---
# Using a high-quality, lightweight model for creating embeddings
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
# This will create a folder named 'aetherium_memory' in your backend directory
# to persistently store the vector database.
client = chromadb.PersistentClient(path="aetherium_memory")

# Using the SentenceTransformer library to create the embeddings
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=EMBEDDING_MODEL
)

# Get or create a collection (like a table in a regular database)
# The embedding_function is automatically used when we add or query data.
collection = client.get_or_create_collection(
    name="book_project",
    embedding_function=sentence_transformer_ef,
)

def add_to_memory(text_chunk: str, chunk_id: str):
    """Adds a chunk of text to the vector database memory."""
    try:
        # ChromaDB automatically converts the text to a vector using the model
        # and stores it. If a document with the same ID exists, it's updated.
        collection.add(
            documents=[text_chunk],
            ids=[chunk_id]
        )
        print(f"Upserted chunk with ID: {chunk_id}")
    except Exception as e:
        print(f"Error adding to memory: {e}")

def retrieve_relevant_context(query: str, n_results: int = 3) -> list:
    """Queries the database to find the most relevant text chunks."""
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        # The actual text is in the 'documents' field of the results
        return results.get('documents', [[]])[0]
    except Exception as e:
        print(f"Error retrieving context: {e}")
        return []