import streamlit as st
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import openai

# Set up OpenAI API key
openai.api_key = "NOT-INCLUDING-HERE-SECURITY-PURPOSE"

# Title and Instructions
st.title("Document-based Question Answering App")
st.write("Upload a document, then ask a question to get an AI-generated answer based on the document content.")

# File Upload using Streamlit
uploaded_file = st.file_uploader("Upload a text file", type=["txt"])
if uploaded_file is not None:
    document = uploaded_file.read().decode("utf-8")
    st.success("Document loaded successfully!")

# Chunking Function with Overlap
def chunk_text_with_overlap(text, max_length=500, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_length, len(text))
        chunks.append(text[start:end])
        start += max_length - overlap
    return chunks

# Generate Embeddings
if uploaded_file is not None:
    chunks = chunk_text_with_overlap(document)
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = embedding_model.encode(chunks, convert_to_tensor=True)

    # Initialize FAISS Index
    embedding_dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(embedding_dim)
    index.add(np.array([embedding.cpu().numpy() for embedding in embeddings]))
    st.write(f"Document split into {len(chunks)} chunks with overlap.")

# Default System Prompt
DEFAULT_SYSTEM_PROMPT = """
You are a helpful, respectful, and honest assistant. Always answer as helpfully as possible, while being safe. Your answers should not include any harmful, unethical, racist, sexist, toxic, dangerous, or illegal content. Please ensure that your responses are socially unbiased and positive in nature.

If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.
""".strip()

SYSTEM_PROMPT = "Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know; don't try to make up an answer."

# Function to Generate Prompt
def generate_prompt(context: str, question: str, system_prompt: str = DEFAULT_SYSTEM_PROMPT) -> str:
    return f"""
[INST] <>
{system_prompt}
<>

{SYSTEM_PROMPT}

{context}

Question : {question} [/INST] <>""".strip()

# Function to Generate Answers using OpenAI API
def generate_answer(question, index, chunks, embedding_model, top_k=5, max_context_length=500):
    question_embedding = embedding_model.encode([question])
    distances, indices = index.search(np.array(question_embedding), top_k)
    context = " ".join([chunks[i] for i in indices[0]])[:max_context_length]
    st.write(f"Context: {context[:200]}...")  # Display part of the context
    
    # Generate the formatted prompt using the new template
    prompt = generate_prompt(context=context, question=question)
    
    # Use OpenAI API to generate the answer
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",  # Use "gpt-4" if available
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
        temperature=0.7
    )
    answer = response.choices[0].message.content.strip()
    return answer

# User Input for Questions
if uploaded_file is not None:
    question = st.text_input("Ask a question:")
    if st.button("Generate Answer"):
        if question:
            answer = generate_answer(question, index, chunks, embedding_model)
            st.write(f"**Answer:** {answer}")
        else:
            st.warning("Please enter a question.")
