from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_ollama import ChatOllama
from langchain_community.document_loaders import PyPDFLoader
from ragas.testset import TestsetGenerator
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Instantiate LLM (Qwen for generation)
ollama_llm = ChatOllama(model="deepseek-r1:1.5b", base_url="http://localhost:11434")
generator_llm = LangchainLLMWrapper(ollama_llm)

# Load HuggingFace sentence-transformer model
hf_embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
# Instantiate Embeddings (nomic-embed-text for embeddings)
generator_embeddings = LangchainEmbeddingsWrapper(hf_embeddings)

# Load the Documents
loader = PyPDFLoader("../src/documents/Updated_Dividend_Stock_Scores.pdf")
docs = loader.load()



# Generate the Testset with proper configuration
generator = TestsetGenerator(
    llm=generator_llm, 
    embedding_model=generator_embeddings
)

# Try with smaller testset first
dataset = generator.generate_with_langchain_docs(
    docs, 
    testset_size=1,
    with_debugging_logs=True
)

# print("Showing docs content:\n")
# for i, doc in enumerate(docs):
#     print(f"Doc {i} preview:", doc.page_content[:])

# Generate the Testset
# generator = TestsetGenerator(llm=generator_llm, embedding_model=generator_embeddings)
# dataset = generator.generate_with_langchain_docs(docs, testset_size=1,  with_debugging_logs=True)

#Validating dataset before Transformation
print("Generated test cases:", len(dataset.test_cases))
for case in dataset.test_cases[:2]:
    print(case)

# Convert to Pandas DataFrame and Analyze
df = dataset.to_pandas()
print(df.head())
