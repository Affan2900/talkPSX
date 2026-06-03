import pandas as pd
import requests
import ast
import time
from ragas.metrics import LLMContextRecall, Faithfulness, FactualCorrectness
from ragas import evaluate
from datasets import Dataset
from langchain_ollama import ChatOllama, OllamaEmbeddings
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper

def get_answer_from_api(question: str) -> str:
    """Hits the local Next.js API to get the RAG generated answer."""
    url = "http://localhost:3000/api/chat/eval-test-session"
    payload = {
        "question": question,
        "chat_history": [],
        "chatId": "eval-test-session"
    }
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data.get("answer", "")
    except requests.exceptions.RequestException as e:
        print(f"Error calling API for question '{question}': {e}")
        return "Error fetching answer"

def main():
    print("Loading synthetic testset...")
    try:
        df = pd.read_csv("synthetic_testset.csv")
    except FileNotFoundError:
        print("Error: synthetic_testset.csv not found. Run synthetic_dataset.py first.")
        return

    # Pandas reads lists in CSV as string representations, so we safely parse them back to lists
    if 'contexts' in df.columns:
        df['contexts'] = df['contexts'].apply(lambda x: ast.literal_eval(x) if isinstance(x, str) else x)

    answers = []
    print(f"Getting answers for {len(df)} questions from local API (http://localhost:3000)...")
    print("Make sure your Next.js server (npm run dev) is running!")
    
    for idx, row in df.iterrows():
        q = row['question']
        print(f"[{idx+1}/{len(df)}] Q: {q}")
        ans = get_answer_from_api(q)
        answers.append(ans)
        time.sleep(1) # Slight pause to not overwhelm the local server

    df['answer'] = answers
    
    # Ragas requires a HuggingFace Dataset
    dataset = Dataset.from_pandas(df)

    print("Initializing evaluation models...")
    ollama_llm = ChatOllama(model="deepseek-r1:1.5b", base_url="http://localhost:11434")
    eval_llm = LangchainLLMWrapper(ollama_llm)

    ollama_embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url="http://localhost:11434")
    eval_embeddings = LangchainEmbeddingsWrapper(ollama_embeddings)

    metrics = [
        LLMContextRecall(),
        Faithfulness(),
        FactualCorrectness()
    ]

    print("Running evaluation...")
    result = evaluate(
        dataset,
        metrics=metrics,
        llm=eval_llm,
        embeddings=eval_embeddings
    )

    print("\n--- Evaluation Results ---")
    print(result)
    
    # Save results
    result_df = result.to_pandas()
    result_df.to_csv("evaluation_results.csv", index=False)
    print("Detailed results saved to evaluation_results.csv")

if __name__ == "__main__":
    main()
