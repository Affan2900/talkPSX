from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from ragas.testset import TestsetGenerator

# Instantiate LLM (deepseek-r1:1.5b for generation)
ollama_llm = ChatOllama(model="deepseek-r1:1.5b", base_url="http://localhost:11434")
generator_llm = LangchainLLMWrapper(ollama_llm)

# Instantiate Embeddings (nomic-embed-text)
ollama_embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url="http://localhost:11434")
generator_embeddings = LangchainEmbeddingsWrapper(ollama_embeddings)

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

# Save to CSV for evaluation
df.to_csv("synthetic_testset.csv", index=False)
print("Dataset saved to synthetic_testset.csv")
