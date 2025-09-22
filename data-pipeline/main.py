from fetch_data import fetch_data
from transformers import pipeline
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

#Initialize summarization model
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

#Fetch data from API
responses = fetch_data()

descriptions = []

for res in responses:
    data = res
    raw_text = f"""
    Company Symbol: {data['symbol']}
    Market Cap: {data['financialStats']['marketCap']['numeric']}
    Shares: {data['financialStats']['shares']['numeric']}
    Free Float Percent: {data['financialStats']['freeFloatPercent']['numeric']}%
    Business Description: {data['businessDescription']}
    Key People: {', '.join([f"{p['position']}: {p['name']}" for p in data['keyPeople']])}
    """
    
    # Summarize using Hugging Face model
    summary = summarizer(raw_text, max_length=150, min_length=60, do_sample=False)[0]['summary_text']
    descriptions.append(summary)

#Store summaries in a PDF
doc = SimpleDocTemplate("company_profiles.pdf", pagesize=A4)
styles = getSampleStyleSheet()
elements = []

for desc in descriptions:
    elements.append(Paragraph(desc, styles["Normal"]))
    elements.append(Spacer(1, 12))

doc.build(elements)

print("✅ PDF created: company_profiles.pdf")
