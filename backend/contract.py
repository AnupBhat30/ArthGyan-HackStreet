import streamlit as st
import google.generativeai as genai
import os
import PyPDF2 as pdf
from dotenv import load_dotenv
import json
import logging
import re
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta

# --- Logging Config ---
logging.basicConfig(level=logging.INFO)

# --- Environment Variables & API Key Setup ---
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    st.error("Google API Key not found. Please set the GOOGLE_API_KEY environment variable.")
    st.stop()
try:
    genai.configure(api_key=api_key)
except Exception as e:
    st.error(f"Error configuring Google AI: {e}. Check your API key.")
    st.stop()

# --- PDF Text Extraction (Keep as before) ---
def input_pdf_text(uploaded_file):
    try:
        reader = pdf.PdfReader(uploaded_file)
        text = ""
        for page in range(len(reader.pages)):
            page_text = reader.pages[page].extract_text()
            if page_text:
                text += page_text
        if not text:
            logging.warning(f"No text extracted from PDF: {uploaded_file.name}")
            st.warning("Could not extract text from the PDF. It might be image-based or corrupted.")
        return text
    except Exception as e:
        logging.error(f"Error reading PDF file {uploaded_file.name}: {e}")
        st.error(f"Error reading PDF: {e}. Please ensure it's a valid PDF file.")
        return None

# --- JSON Cleaning (Keep as before) ---
def clean_json_array(response):
    def clean_array(match):
        array_str = match.group(0)
        elements = re.split(r',\s*(?=(?:[^"]"[^"]")[^"]$)(?=(?:[^\']+\'[^\']\')[^\']*$)', array_str[1:-1])
        cleaned_elements = []
        for elem in elements:
            elem = elem.strip()
            if elem:
                if not ((elem.startswith('"') and elem.endswith('"')) or \
                        (elem.startswith("'") and elem.endswith("'"))):
                    elem = elem.replace('"', '\\"')
                    cleaned_elements.append(f'"{elem}"')
                else:
                    cleaned_elements.append(elem)
        return f'[{", ".join(cleaned_elements)}]'
    try:
        cleaned_response = re.sub(r'\[(.*?)\]', clean_array, response, flags=re.DOTALL)
        return cleaned_response
    except Exception as e:
        logging.error(f"Error during clean_json_array regex substitution: {e}")
        return response

# --- JSON Validation/Fallback (Updated Fallback Structure) ---
def ensure_valid_json(response):
    try:
        # First attempt: Try to find the main JSON object/array
        match = re.search(r'(\{.*\}|\[.*\])', response, re.DOTALL)
        if match:
            potential_json = match.group(0)
            json.loads(potential_json) # Test parsing
            logging.info("Extracted JSON object/array parsed successfully.")
            return potential_json
        else:
             # If no clear object/array found, try cleaning the whole response
             logging.warning("Could not find clear JSON object/array boundaries. Attempting full response cleaning.")
             raise json.JSONDecodeError("No JSON object/array found", response, 0)

    except json.JSONDecodeError as e1:
        logging.warning(f"Initial JSON parsing/extraction failed: {e1}. Attempting broader cleaning...")
        cleaned = response.strip().replace('```json', '').replace('```', '').strip() # Remove markdown fences
        cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned) # Remove trailing commas before closing brackets/braces

        # Try finding boundaries again after basic cleaning
        first_bracket = cleaned.find('{')
        first_square = cleaned.find('[')
        last_bracket = cleaned.rfind('}')
        last_square = cleaned.rfind(']')

        start, end = -1, -1
        # Prioritize finding a JSON object {}
        if first_bracket != -1 and last_bracket != -1 and first_bracket < last_bracket:
            start, end = first_bracket, last_bracket
        # Fallback to JSON array [] if no object found
        elif first_square != -1 and last_square != -1 and first_square < last_square:
            start, end = first_square, last_square

        if start != -1 and end != -1 :
             cleaned = cleaned[start : end + 1]
             try:
                 json.loads(cleaned)
                 logging.info("Cleaned response substring parsed successfully as JSON.")
                 return cleaned
             except json.JSONDecodeError as e2:
                 logging.error(f"Failed to parse JSON even after cleaning and boundary detection. Error: {e2}")
                 logging.error(f"Original response snippet: {response[:500]}...")
                 logging.error(f"Cleaned response snippet: {cleaned[:500]}...")
                 # Proceed to fallback generation
        else:
             logging.warning("Could not reliably determine JSON object/array boundaries after cleaning.")
             # Proceed to fallback generation

        logging.warning("Generating fallback JSON structure due to unrecoverable parsing failure.")
        # *** UPDATED FALLBACK FOR LOAN ANALYSIS ***
        fallback_data = {
            "Document Type": "Unknown - Parsing Error",
            "Loan Details": {
                "Loan Amount": "Unknown",
                "Interest Rate": "Unknown",
                "APR": "Unknown",
                "Loan Term": "Unknown",
                "Repayment Frequency": "Unknown",
                "Estimated Total Repayment": "Unknown"
            },
            "Key Terms": {"Error": "Unable to extract key terms due to response format error."},
            "Fees": {"Error": "Unable to extract fees due to response format error."},
            "Predatory Clause Analysis": "Unable to detect predatory clauses due to response format error.",
            "Risk Score": "Unknown - Parsing Error",
            "Summary": f"Analysis incomplete. Raw response snippet: {response[:500]}..." if len(response) > 500 else response,
            "Recommendations": "No recommendations available due to response format error.",
            "Repayment Information": {
                "Start Date": "Unknown", "End Date": "Unknown", "First Payment Date": "Unknown", "Number of Payments": "Unknown", "Review Progress": 0
            },
            "Parties": {"Lender": "Unknown", "Borrower": "Unknown"},
            "Term Risk Levels": {} # Keep similar structure for potential risk mapping
        }
        return json.dumps(fallback_data, indent=3)

# --- Gemini API Call (Keep as before) ---
def get_gemini_response(prompt):
    """Sends a prompt to the Gemini API and returns the text response."""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash') # Or 'gemini-1.5-pro' if needed
        response = model.generate_content(prompt)

        if not response.parts:
             logging.warning("Gemini API returned a response with no parts.")
             if response.prompt_feedback and response.prompt_feedback.block_reason:
                 block_reason = response.prompt_feedback.block_reason
                 logging.error(f"Content blocked by API. Reason: {block_reason}")
                 st.error(f"The request was blocked by the AI's safety filters (Reason: {block_reason}). Please check the document content or try again.")
                 return None
             return ""

        # Gemini API response structure might vary slightly. Prioritize '.text' but have fallback.
        full_response_text = ""
        try:
            # Concatenate text from all parts if available
            full_response_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))
        except AttributeError:
             logging.warning("Response parts lack 'text' attribute. Trying direct response.text access.")
             try:
                 full_response_text = response.text
             except AttributeError:
                  logging.error("Could not extract text from Gemini response using common methods.")
                  return "" # Return empty string if text cannot be extracted

        if not full_response_text.strip():
            logging.warning("Gemini API returned an empty or whitespace-only text response.")
            return ""

        return full_response_text

    except Exception as e:
        logging.error(f"Error calling Gemini API: {e}")
        if "API key not valid" in str(e):
            st.error(f"Error communicating with the AI model: Invalid API Key. Please check your GOOGLE_API_KEY.")
        elif "quota" in str(e).lower():
             st.error(f"Error communicating with the AI model: API Quota Exceeded. Please check your usage limits.")
        else:
            st.error(f"Error communicating with the AI model: {e}")
        return None

# --- Translation Function (Keep as before) ---
@st.cache_data # Cache the translation results
def translate_text(text_to_translate, target_language="Hindi"):
    """Translates text using the Gemini API."""
    if not text_to_translate or not isinstance(text_to_translate, str):
        return text_to_translate
    if target_language == "English":
        return text_to_translate

    logging.info(f"Requesting translation to {target_language} for: {text_to_translate[:50]}...")
    translate_prompt = f"""Translate the following English text into {target_language}.
Provide ONLY the translated text, without any introductory phrases like "Here is the translation:" or explanations.

English Text:
"{text_to_translate}"

{target_language} Translation:"""
    translated_text = get_gemini_response(translate_prompt)
    if translated_text:
        logging.info(f"Translation successful: {translated_text[:50]}...")
        return translated_text.strip().strip('"')
    else:
        logging.warning(f"Translation to {target_language} failed for: {text_to_translate[:50]}...")
        st.warning(f"Could not translate text segment to {target_language}. Displaying original English.", icon="⚠")
        return text_to_translate

# --- *** MODIFIED ANALYSIS PROMPT FOR FINANCIAL/LOAN DOCUMENTS *** ---
input_prompt = """
Act as a sharp financial analyst reviewing a financial document, likely a loan agreement, personal loan, mortgage, or similar credit document. Your goal is to help a borrower understand the key terms and potential risks in simple, clear language.

Analyze the uploaded document text provided below and extract the following information. Pay close attention to identifying potentially predatory or unfavorable terms.

Document Text: {document_text}

The response structure MUST be a valid JSON object following this schema exactly:
{{
   "Document Type": "Identify the type of document (e.g., Personal Loan Agreement, Mortgage Contract, Credit Card Agreement, Auto Loan). If unsure, state 'General Financial Document'.",
   "Loan Details": {{
      "Loan Amount": "Principal amount borrowed (e.g., '$10,000', '£5,000', 'Not specified'). Extract if clearly stated.",
      "Interest Rate": "State the interest rate, including whether it's fixed or variable (e.g., '5.5% Fixed', 'Prime + 2% Variable', 'Not specified').",
      "APR": "Annual Percentage Rate, if explicitly mentioned (e.g., '6.1% APR', 'Not specified'). This is crucial.",
      "Loan Term": "Duration of the loan (e.g., '5 years', '36 months', 'Not specified').",
      "Repayment Frequency": "How often payments are due (e.g., 'Monthly', 'Bi-weekly', 'Not specified').",
      "Estimated Payment": "The estimated periodic payment amount, if stated (e.g., '$250 per month', 'Not specified')."
   }},
   "Key Terms": {{
      "Term Name 1": "Simple explanation focusing on borrower impact (e.g., 'Default Clause: Explains what happens if you miss payments, including potential penalties or asset seizure.').",
      "Term Name 2": "Simple explanation (e.g., 'Prepayment Penalty: A fee charged if you pay off the loan early. Check if this applies.')",
      "Collateral": "Describe any assets pledged as security for the loan (e.g., 'Property at 123 Main St', 'Vehicle VIN XXX', 'None specified')."
      // Add other significant terms found, like Grace Period, Acceleration Clause, Covenants etc.
   }},
   "Fees": {{
      "Fee Name 1": "Description or amount (e.g., 'Origination Fee: 1% of loan amount', 'Late Fee: $50 after 15 days past due')",
      "Fee Name 2": "Description or amount"
      // List all identifiable fees like application fees, processing fees, NSF fees, etc. If none, state "No specific fees identified.".
   }},
   "Predatory Clause Analysis": "Analyze for predatory terms. Focus on: excessively high APR/interest rates compared to market standards, large balloon payments, significant prepayment penalties, hidden fees, negative amortization, insurance packing, aggressive default/collection terms, or clauses making it hard to refinance. Explain the risks clearly in one paragraph. If none detected, state 'No major predatory clauses detected based on this analysis.'.",
   "Risk Score": "Assign ONE overall risk level for the borrower: Low, Medium, or High. Follow with a brief (1 sentence) justification focusing on loan terms. e.g., 'High - Contains a variable rate with no cap and significant prepayment penalties.' or 'Low - Standard fixed-rate loan with clear terms and reasonable fees.'",
   "Summary": "Provide a concise (2-3 sentence) summary of the core obligation: what the borrower receives and what they must repay.",
   "Recommendations": "List 2-3 practical pieces of advice for the borrower. Focus on points to clarify with the lender, potential negotiation areas (e.g., asking about fee waivers, rate locks), or specific warnings about risky terms. Use bullet points or numbered list format within the string.",
   "Repayment Information": {{
       "Start Date": "Loan disbursement or start date (YYYY-MM-DD if possible, otherwise 'Not specified').",
       "End Date": "Loan maturity or final payment date (YYYY-MM-DD if possible, 'Not specified').",
       "First Payment Date": "Date the first repayment installment is due (YYYY-MM-DD if possible, 'Not specified').",
       "Number of Payments": "Total number of payments if calculable/stated (e.g., 60, 'Not specified').",
       "Review Progress": 100 // Default to 100 assuming full analysis requested
   }},
   "Parties": {{
        "Lender": "Name of the lending institution or individual, if identifiable.",
        "Borrower": "Name of the borrowing individual or entity, if identifiable."
   }},
   "Term Risk Levels": {{
       // Assign risk (Low/Medium/High/N/A) to common loan aspects if identifiable
       "Interest Rate Risk": "Low/Medium/High/N/A (Consider fixed vs variable, rate level)",
       "Fee Risk": "Low/Medium/High/N/A (Consider number and size of fees)",
       "Repayment Risk": "Low/Medium/High/N/A (Consider payment size relative to term, balloon payments)",
       "Default Risk": "Low/Medium/High/N/A (Consider harshness of default clauses)",
       "Prepayment Risk": "Low/Medium/High/N/A (Consider presence and size of penalty)"
   }}
}}
Ensure all string values within the JSON are properly escaped if they contain quotes. Output ONLY the JSON object, nothing before or after it. Make sure the output is a single, complete, valid JSON.
"""


# --- VISUALIZATION FUNCTIONS (Adapted for Loan Data) ---

# Generate key term distribution chart (Adapted from Clause Chart)
def generate_term_chart(key_terms, term_risk_levels):
    if not key_terms or not isinstance(key_terms, dict):
        logging.warning("Term chart skipped: Invalid key_terms data.")
        return None
    terms = {k: v for k, v in key_terms.items() if k != "Error" and k!= "Note"}
    if not terms:
         logging.warning("Term chart skipped: No valid terms found.")
         return None
    try:
        df = pd.DataFrame({
            'Term': list(terms.keys()),
            'Explanation Length': [len(str(value)) for value in terms.values()] # Use explanation length as proxy for complexity/importance
        })
        risk_map = {'Low': 1, 'Medium': 2, 'High': 3, 'N/A': 0, 'Unknown': 0}
        default_risk = 'Unknown'

        # Map generic Term Risk Levels to specific Key Terms if possible (simplistic mapping)
        # This might need refinement based on how AI populates Term Risk Levels vs Key Terms
        if term_risk_levels and isinstance(term_risk_levels, dict):
            # Attempt basic fuzzy matching or direct key match if possible
            df['Risk'] = default_risk
            df['Risk_Value'] = 0
            for i, term_name in enumerate(df['Term']):
                matched = False
                for risk_key, risk_value in term_risk_levels.items():
                    # Simple substring matching (can be improved)
                    if term_name.lower() in risk_key.lower() or risk_key.lower() in term_name.lower():
                        df.loc[i, 'Risk'] = risk_value
                        df.loc[i, 'Risk_Value'] = risk_map.get(str(risk_value), 0)
                        matched = True
                        break # Take first match
                if not matched: # Fallback if no risk level mapping found
                     df.loc[i, 'Risk'] = default_risk
                     df.loc[i, 'Risk_Value'] = 0

        else:
            df['Risk'] = default_risk
            df['Risk_Value'] = 0

        df['Risk_Color'] = df['Risk'].map({'Low': 'green', 'Medium': 'orange', 'High': 'red', 'N/A': 'grey', 'Unknown': 'grey'})
        df = df.sort_values('Risk_Value', ascending=False)

        fig = px.pie(df, values='Explanation Length', names='Term',
                    title='Key Term Distribution', # Updated title
                    color='Risk', color_discrete_map={'Low': '#50fa7b', 'Medium': '#ffb86c', 'High': '#ff5555', 'N/A': '#6272a4', 'Unknown': '#6272a4'},
                    hover_data=['Risk'])
        fig.update_traces(textposition='inside', textinfo='percent+label', marker_line_color='rgba(0,0,0,0.2)', marker_line_width=1)
        fig.update_layout(
            legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color="white"), margin=dict(t=50, b=50, l=20, r=20),
        )
        return fig
    except Exception as e:
        logging.error(f"Error generating term chart: {e}")
        return None

# Generate term risk analysis chart (Adapted from Risk Chart)
def generate_term_risk_chart(term_risk_levels):
    if not term_risk_levels or not isinstance(term_risk_levels, dict):
        logging.warning("Term risk chart skipped: Invalid term_risk_levels data.")
        return None
    risk_map = {'Low': 1, 'Medium': 2, 'High': 3, 'N/A': 0, 'Unknown': 0}
    terms = list(term_risk_levels.keys())
    risks = list(term_risk_levels.values())
    risk_values = [risk_map.get(str(r), 0) for r in risks]
    if not terms:
        logging.warning("Term risk chart skipped: No terms found in risk levels.")
        return None
    try:
        df = pd.DataFrame({'Term Aspect': terms, 'Risk': risks, 'Risk_Value': risk_values})
        df_plot = df[df['Risk'] != 'N/A'].sort_values('Risk_Value', ascending=True) # Exclude N/A for clarity
        if df_plot.empty:
             logging.warning("Term risk chart skipped: Only N/A risks found.")
             return None
        color_map = {'Low': '#50fa7b', 'Medium': '#ffb86c', 'High': '#ff5555', 'Unknown': '#6272a4'}
        df_plot['Color'] = df_plot['Risk'].map(color_map)
        fig = px.bar(df_plot, y='Term Aspect', x='Risk_Value', color='Risk',
                     color_discrete_map=color_map,
                     title='Loan Aspect Risk Assessment', # Updated title
                     labels={'Risk_Value': 'Assessed Risk Level', 'Term Aspect': ''},
                     height=max(250, len(df_plot) * 40),
                     orientation='h')
        fig.update_layout(
            xaxis=dict(tickmode='array', tickvals=[1, 2, 3], ticktext=['Low', 'Medium', 'High'], range=[0, 3.5]),
            yaxis=dict(automargin=True), paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color="white"), margin=dict(l=20, r=20, t=40, b=20), legend_title_text='Risk Level'
        )
        return fig
    except Exception as e:
        logging.error(f"Error generating term risk chart: {e}")
        return None

# Generate loan timeline (Adapted from Contract Timeline)
def generate_loan_timeline(repayment_info):
    if not repayment_info or not isinstance(repayment_info, dict):
         logging.warning("Timeline generation skipped: Invalid repayment_info.")
         return None, 0
    start_date_str = repayment_info.get('Start Date', 'Unknown')
    end_date_str = repayment_info.get('End Date', 'Unknown')
    first_payment_str = repayment_info.get('First Payment Date', 'Unknown')

    def parse_date(date_str):
        if not date_str or date_str in ['Unknown', 'Not specified', 'Ongoing']: return None
        # Add more flexible date parsing if needed
        for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d-%b-%Y', '%B %d, %Y', '%Y/%m/%d', '%m-%d-%Y'):
            try: return datetime.strptime(date_str, fmt)
            except ValueError: pass
        logging.warning(f"Could not parse date string: {date_str}")
        return None

    start_date, end_date = parse_date(start_date_str), parse_date(end_date_str)
    first_payment_date = parse_date(first_payment_str)
    current_date = datetime.now()

    has_start, has_end = start_date is not None, end_date is not None
    timeline_data = []
    duration_desc = "Duration Unknown"

    # Primary Task: Loan Period
    if has_start and has_end and start_date < end_date:
        timeline_data.append(dict(Task="Loan Term", Start=start_date, Finish=end_date, Resource="Term"))
        duration_days = (end_date - start_date).days
        duration_desc = f"{duration_days} days"
    elif has_start: # Ongoing or end date unknown
        # Estimate an end date for visualization purposes if ongoing, e.g., today + 1 year
        est_end = max(current_date, start_date) + timedelta(days=365)
        timeline_data.append(dict(Task="Loan Term (Ongoing/End Unknown)", Start=start_date, Finish=est_end, Resource="Ongoing"))
        duration_desc = f"{(current_date - start_date).days}+ days (Ongoing or End Unknown)"
    elif has_end: # Start date unknown
         # Estimate a start date for visualization, e.g., end_date - 1 year (guess)
         est_start = end_date - timedelta(days=365)
         timeline_data.append(dict(Task="Loan Term (Start Unknown)", Start=est_start, Finish=end_date, Resource="Term"))
         duration_desc = f"Ends {end_date_str}"
    else:
        # No start or end date - maybe show just first payment?
        if first_payment_date:
             timeline_data.append(dict(Task="First Payment Due", Start=first_payment_date - timedelta(days=1), Finish=first_payment_date + timedelta(days=1), Resource="Marker"))
             duration_desc = f"First Payment {first_payment_str}"
        else: # No dates at all
             logging.warning("Timeline generation skipped: Insufficient date info.")
             return None, 0 # No figure, 0 progress

    # Add marker for first payment if available and distinct
    if first_payment_date and (not has_start or first_payment_date != start_date):
         timeline_data.append(dict(Task="First Payment", Start=first_payment_date, Finish=first_payment_date + timedelta(days=1), Resource="Marker"))


    # Calculate Progress
    progress = 0
    if has_start and has_end and start_date < end_date:
        total_duration = (end_date - start_date).days
        if total_duration > 0:
            elapsed_duration = (current_date - start_date).days
            progress = min(100, max(0, (elapsed_duration / total_duration * 100)))
    elif has_start and current_date > start_date: # Ongoing started in the past
        # Progress for ongoing could be interpreted differently (e.g., payments made / total?)
        # Simple time-based progress might not be meaningful. Let's default to 0 or 100? Or base on review?
        progress = repayment_info.get("Review Progress", 100) # Use Review Progress if available
    elif has_end and current_date > end_date: # Loan already ended
        progress = 100
    else: # Loan hasn't started or only end date known in future
        progress = 0


    if not timeline_data: # Should be caught earlier, but double check
        logging.warning("Timeline generation skipped: No tasks created.")
        return None, 0

    try:
        df = pd.DataFrame(timeline_data)
        fig = px.timeline(df, x_start="Start", x_end="Finish", y="Task", color="Resource",
                         title=f"Loan Timeline ({duration_desc})", # Updated title
                         color_discrete_map={"Term": "#bd93f9", "Ongoing": "#ffb86c", "Marker": "#ff79c6"})

        # Add Today marker
        fig.add_vline(x=current_date, line_width=2, line_dash="dash", line_color="#50fa7b",
                      annotation_text="Today", annotation_position="top right", annotation_font_color="#50fa7b")

        fig.update_layout(
            yaxis_title=None, yaxis_visible=False, xaxis_title="Date",
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color="white"), margin=dict(l=20, r=20, t=50, b=20),
            height=150 + len(df)*25, # Adjust height based on number of tasks
            legend_title_text="Timeline Element"
        )
        fig.update_yaxes(autorange="reversed")
        return fig, progress
    except Exception as e:
        logging.error(f"Error generating loan timeline: {e}")
        return None, 0

# Removed generate_obligations_chart and generate_relationship_network as they are less relevant/replaced


# --- CSS Styling (Keep as before, including Metric Card Fix) ---
# No changes needed in CSS for this adaptation, the classes are generic enough.
st.write("""
    <style>
    /* Global styling */
    body { color: #f8f8f2; }
    .main > div { background: #282a36; }
    .stApp { background-color: #282a36; color: #f8f8f2; }
    .stMarkdown, .stTextInput > div > div > input, .stTextArea > div > div > textarea, .stSelectbox > div > div, .stFileUploader > div > div > span, .stButton > button, .stExpander > div > summary, [data-testid="stRadioButton"] label span {
        color: #f8f8f2 !important; /* Ensure radio button labels are also white */
    }
    /* Radio button styling adjustments */
    [data-testid="stRadioButton"] label {
        display: flex; align-items: center; padding: 5px 10px; margin: 2px;
        background-color: #44475a; border-radius: 6px; border: 1px solid transparent;
        transition: background-color 0.3s ease, border-color 0.3s ease;
    }
    [data-testid="stRadioButton"] label:has(input:checked) {
         background-color: #6272a4; border-color: #bd93f9; font-weight: bold;
     }
     [data-testid="stRadioButton"] label span { padding-left: 8px; }

    .stButton > button {
        background-color: #50fa7b; color: #282a36 !important; border: none; border-radius: 8px;
        padding: 10px 20px; font-weight: bold; transition: background-color 0.3s ease;
    }
    .stButton > button:hover { background-color: #8be9fd; }
    [data-testid="stFileUploader"] label {
        background-color: rgba(248, 248, 242, 0.1); border: 2px dashed #6272a4;
        border-radius: 8px; padding: 2rem; text-align: center;
    }
    [data-testid="stFileUploader"] label span { color: #f8f8f2 !important; }
    .gradient-header {
        padding: 2rem; text-align: center; background: linear-gradient(135deg, #44475a, #6272a4);
        border-radius: 15px; margin-bottom: 2rem; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    /* Adjusted Header */
    .gradient-header h1 { font-size: 2.6rem; font-weight: 800; color: #50fa7b !important; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5); }
    .gradient-header p { font-size: 1.1rem; max-width: 800px; margin: 10px auto 0 auto; color: #f8f8f2 !important; opacity: 0.9; }
    .glass-card {
        background: rgba(68, 71, 90, 0.6); border-radius: 15px; padding: 25px;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(248, 248, 242, 0.1); margin-bottom: 20px;
    }
    .warning-panel {
        background: rgba(255, 85, 85, 0.2); border-left: 8px solid #ff5555; border-radius: 10px;
        padding: 20px; margin-bottom: 20px; color: #f8f8f2 !important;
    }
     .warning-panel strong { color: #ff5555 !important; }
    h2, h3 { color: #8be9fd !important; border-bottom: 2px solid #44475a; padding-bottom: 5px; margin-top: 25px; }
    .section-header { font-size: 1.6rem !important; font-weight: bold !important; color: #8be9fd !important; margin-bottom: 15px; text-align: left; }
     .detail-item, .suggestion-item { /* Renamed from suggestion-item for consistency, but CSS remains */
        margin-bottom: 15px; padding: 15px; background: rgba(68, 71, 90, 0.8);
        border-radius: 8px; border-left: 5px solid #bd93f9;
    }
    .detail-item strong, .suggestion-item strong {
        font-size: 1.1rem; font-weight: 700; color: #bd93f9 !important; display: block; margin-bottom: 5px;
    }
    .doc-type {
        background: rgba(189, 147, 249, 0.2); color: #f8f8f2 !important; padding: 1rem 1.5rem;
        border-radius: 10px; text-align: center; font-size: 1.6rem; font-weight: 700;
        margin-bottom: 20px; border: 1px solid #bd93f9;
    }
    .stAlert { border-radius: 8px; border: none; color: #f8f8f2 !important; }
    [data-testid="stAlert"] > div { color: #f8f8f2 !important; }
    .stSuccess { background-color: rgba(80, 250, 123, 0.3) !important; }
    .stError { background-color: rgba(255, 85, 85, 0.3) !important; }
    .stWarning { background-color: rgba(255, 184, 108, 0.3) !important; }
    .stInfo { background-color: rgba(139, 233, 253, 0.3) !important; }
    .stTabs [data-baseweb="tab-list"] { gap: 10px; background-color: transparent !important; border-bottom: 2px solid #44475a; padding-bottom: 0; }
    .stTabs [data-baseweb="tab"] { border-radius: 8px 8px 0 0; color: #bd93f9; background-color: #44475a; padding: 10px 20px; border: none; margin-bottom: -2px; transition: background-color 0.3s ease, color 0.3s ease; }
    .stTabs [data-baseweb="tab--selected"] { color: #f8f8f2 !important; background-color: #6272a4 !important; font-weight: bold; }
    .stTabs [aria-selected="true"] { color: #f8f8f2 !important; background-color: #6272a4 !important; }
    .stTabs [data-baseweb="tab-highlight"] { background-color: transparent !important; }
    [data-testid="stVerticalBlock"] > [style*="flex-direction: column;"] > [data-testid="stVerticalBlock"] {
        background-color: rgba(68, 71, 90, 0.3); padding: 20px; border-radius: 0 0 10px 10px;
        border: 1px solid #44475a; border-top: none;
    }

    /* --- MODIFIED METRIC CARD STYLES (Keep as before) --- */
    .metric-card {
        background: rgba(68, 71, 90, 0.8); border-radius: 10px; padding: 20px; margin-bottom: 15px;
        border: 1px solid rgba(248, 248, 242, 0.1); text-align: center; min-height: 110px;
        display: flex; flex-direction: column; justify-content: center;
    }
    .metric-card .label { font-size: 0.95rem; color: #8be9fd; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-card .value { font-size: 1.9rem; font-weight: bold; color: #50fa7b !important; line-height: 1.2; word-wrap: break-word; /* Help wrap long values like rates */ }
    .metric-card .secondary { font-size: 0.9rem; color: #f8f8f2 !important; opacity: 0.8; margin-top: 8px; line-height: 1.3; min-height: 2.6em; display: flex; align-items: center; justify-content: center; }
    .metric-card .value.risk-low { color: #50fa7b !important; }
    .metric-card .value.risk-medium { color: #ffb86c !important; }
    .metric-card .value.risk-high { color: #ff5555 !important; }
    .metric-card .value.risk-unknown { color: #8be9fd !important; }
     .metric-card .progress-container { width: 80%; margin: 8px auto 8px auto; background-color: #44475a; border-radius: 5px; padding: 3px; height: 18px; box-sizing: border-box; }
    .metric-card .progress-bar { height: 100%; border-radius: 3px; text-align: center; color: #282a36 !important; font-weight: bold; font-size: 0.8em; line-height: 12px; background-color: #bd93f9; transition: width 0.5s ease-in-out; display: flex; align-items: center; justify-content: center; }
     .metric-card .progress-bar.progress-complete { background-color: #50fa7b; }
    /* --- END MODIFIED METRIC CARD STYLES --- */

    .styled-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.95em; border-radius: 8px; overflow: hidden; box-shadow: 0 0 20px rgba(0, 0, 0, 0.25); }
    .styled-table thead tr { background-color: #44475a; color: #f8f8f2; text-align: left; font-weight: bold; }
    .styled-table th, .styled-table td { padding: 12px 15px; color: #f8f8f2; }
    .styled-table tbody tr { border-bottom: 1px solid #44475a; background-color: rgba(68, 71, 90, 0.5); }
    .styled-table tbody tr:nth-of-type(even) { background-color: rgba(68, 71, 90, 0.7); }
    .styled-table tbody tr:last-of-type { border-bottom: 2px solid #bd93f9; }
    .styled-table tbody tr:hover { background-color: rgba(98, 114, 164, 0.7); }
    .risk-low { color: #50fa7b !important; font-weight: bold; }
    .risk-medium { color: #ffb86c !important; font-weight: bold; }
    .risk-high { color: #ff5555 !important; font-weight: bold; }
    .risk-unknown, .risk-n/a { color: #6272a4 !important; opacity: 0.8; }
    .stExpander { border: 1px solid #44475a !important; border-radius: 8px !important; margin-bottom: 10px !important; background-color: rgba(68, 71, 90, 0.4); }
    .stExpander summary { font-size: 1.1rem !important; font-weight: bold !important; color: #ffb86c !important; padding: 10px 15px !important; border-radius: 8px 8px 0 0; }
     .stExpander summary:hover { background-color: rgba(98, 114, 164, 0.5); }
    .stExpander div[role="region"] { background-color: transparent; padding: 15px; border-top: 1px solid #44475a; }
    .chart-container { background: rgba(68, 71, 90, 0.4); border-radius: 10px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(248, 248, 242, 0.1); }
    .plotly-graph-div { background: transparent !important; }
    </style>
""", unsafe_allow_html=True)


# --- STREAMLIT APP LAYOUT (Updated Text) ---

# App title and description
st.write('<div class="gradient-header"><h1>Financial Document Analyzer</h1><p>Upload your loan agreement or other financial document (PDF). I\'ll analyze key terms, interest rates, fees, flag potential predatory clauses, and provide insights.</p></div>', unsafe_allow_html=True)

# File uploader
uploaded_file = st.file_uploader("Upload Your Financial Document (PDF)", type="pdf", help="Supports text-based PDF files like loan agreements, mortgages, etc.")

# Submit button
submit = st.button("Analyze Document ✨") # Updated button text

# State management initialization (Keep as before)
if 'analysis_complete' not in st.session_state:
    st.session_state.analysis_complete = False
if 'response_data' not in st.session_state:
    st.session_state.response_data = {}
if 'contract_text' not in st.session_state: # Keep name generic, though it holds document text
    st.session_state.contract_text = ""
if 'selected_language' not in st.session_state:
    st.session_state.selected_language = 'English'


# Processing Logic (Keep structure, uses new prompt)
if submit and uploaded_file is not None:
    with st.spinner("Reading and analyzing your document... This might take a moment..."):
        try:
            st.session_state.analysis_complete = False
            st.session_state.response_data = {}
            st.session_state.contract_text = ""

            text = input_pdf_text(uploaded_file)
            st.session_state.contract_text = text

            if text:
                max_chars = 30000
                prompt_text = text[:max_chars]
                if len(text) > max_chars:
                    logging.warning(f"Input text truncated to {max_chars} characters for API call.")
                    st.warning(f"Note: The document text was long and has been truncated to {max_chars} characters for analysis.", icon="⚠")

                # *** Uses the NEW input_prompt ***
                prompt = input_prompt.format(document_text=prompt_text)
                logging.info("Sending prompt to Gemini API for financial analysis...")

                raw_response = get_gemini_response(prompt)

                if raw_response is not None:
                    if raw_response == "":
                         logging.error("Received empty string response from Gemini API after successful call.")
                         st.error("The AI model returned an empty response. This might be due to content filters or an issue with the model. Try analyzing a different document.")
                    else:
                        logging.info("Received response from Gemini API. Validating/Parsing JSON...")
                        final_json_string = ensure_valid_json(raw_response)
                        try:
                            response_data = json.loads(final_json_string)
                            st.session_state.response_data = response_data
                            st.session_state.analysis_complete = True
                            logging.info("JSON parsed successfully. Analysis complete.")
                            st.success("Document Analysis Complete!")
                        except json.JSONDecodeError as json_final_err:
                             # This handles the case where even the fallback JSON is somehow invalid (shouldn't happen)
                             # or if ensure_valid_json returned a string that's *still* not parsable after all attempts.
                             st.session_state.analysis_complete = False
                             st.session_state.response_data = {}
                             logging.error(f"FATAL: Could not parse the final JSON string even after cleaning/fallback: {json_final_err}")
                             logging.error(f"Final JSON string attempted: {final_json_string[:1000]}...")
                             st.error(f"A critical error occurred processing the AI's response structure. Analysis could not be completed.")
                else:
                    # Error messages handled within get_gemini_response
                    if not st.session_state.get('api_error_shown'):
                         st.error("Failed to get a response from the AI model. Please check API key, quota, and network connection.")
                         st.session_state['api_error_shown'] = True
            else:
                st.error("Could not process the PDF. Ensure it contains selectable text.")

        except Exception as e:
            st.session_state.analysis_complete = False
            st.session_state.response_data = {}
            logging.error(f"An unexpected error occurred during analysis: {str(e)}", exc_info=True)
            st.error(f"An unexpected error occurred: {str(e)}")
            st.error("Please check the PDF file or try again. If the problem persists, the AI service might be unavailable.")

        if 'api_error_shown' in st.session_state:
            del st.session_state['api_error_shown']


elif submit and uploaded_file is None:
    st.warning("Please upload a document (PDF) first.")

# --- Display Results if Analysis is Complete (Updated Data Extraction and Layout) ---
if st.session_state.analysis_complete and st.session_state.response_data:
    response_data = st.session_state.response_data

    # --- Language Selection (Keep as before) ---
    st.markdown("---")
    st.session_state.selected_language = st.radio(
        "Select Language for Textual Analysis:",
        ('English', 'Hindi'),
        key='language_selector',
        horizontal=True,
    )
    st.caption("Note: Charts and table headers will remain in English.")
    st.markdown("---")

    # --- Extract data using NEW JSON keys, with safe defaults ---
    doc_type = response_data.get("Document Type", "Financial Document")
    loan_details = response_data.get("Loan Details", {})
    key_terms_en = response_data.get("Key Terms", {}) # Original English
    fees_en = response_data.get("Fees", {}) # Original English
    predatory_analysis_en = response_data.get("Predatory Clause Analysis", "Not specified.")
    risk_score = response_data.get("Risk Score", "Unknown")
    summary_en = response_data.get("Summary", "No summary provided.")
    recommendations_en = response_data.get("Recommendations", "No recommendations provided.")
    repayment_info = response_data.get("Repayment Information", {})
    parties = response_data.get("Parties", {})
    term_risk_levels = response_data.get("Term Risk Levels", {})

    # --- Basic validation/cleaning ---
    if not isinstance(loan_details, dict): loan_details = {}
    if not isinstance(key_terms_en, dict): key_terms_en = {"Error": "Key Terms data invalid."}
    if not isinstance(fees_en, dict): fees_en = {"Error": "Fees data invalid."}
    if not isinstance(repayment_info, dict): repayment_info = {}
    if not isinstance(parties, dict): parties = {}
    if not isinstance(term_risk_levels, dict): term_risk_levels = {}

    # --- Translate necessary text fields based on selection ---
    current_lang = st.session_state.selected_language
    summary_display = translate_text(summary_en, current_lang)
    predatory_analysis_display = translate_text(predatory_analysis_en, current_lang)
    recommendations_display = translate_text(recommendations_en, current_lang)

    # Translate key term explanations and fee descriptions
    key_terms_display = {}
    if isinstance(key_terms_en, dict):
        for term_name, explanation_en in key_terms_en.items():
             key_terms_display[term_name] = translate_text(str(explanation_en), current_lang) if term_name != "Error" else explanation_en
    else:
         key_terms_display = key_terms_en

    fees_display = {}
    if isinstance(fees_en, dict):
         for fee_name, description_en in fees_en.items():
              fees_display[fee_name] = translate_text(str(description_en), current_lang) if fee_name != "Error" else description_en
    else:
        fees_display = fees_en


    # --- *** UPDATED TABS *** ---
    tab_dashboard, tab_risk, tab_terms, tab_details, tab_compare = st.tabs([
        "📊 Dashboard", "🔍 Risk Analysis", "📝 Key Terms & Fees", "📅 Details & Parties", "🔄 Compare" # Renamed tabs
    ])

    # --- DASHBOARD TAB (Updated Metrics) ---
    with tab_dashboard:
        st.markdown("## Loan Overview")

        st.markdown(f"<div class='doc-type'>{doc_type}</div>", unsafe_allow_html=True)

        with st.container():
            st.markdown('<div class="glass-card"><h3>Summary</h3></div>', unsafe_allow_html=True)
            st.markdown(f"> {summary_display}") # Translated summary

        st.markdown("### Key Loan Metrics")
        col1, col2, col3 = st.columns(3)

        # Metric Card 1: Loan Amount
        with col1:
            loan_amount = loan_details.get("Loan Amount", "Unknown")
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">LOAN AMOUNT</div>
                <div class="value">{loan_amount}</div>
                <div class="secondary">Principal Borrowed</div>
            </div>
            """, unsafe_allow_html=True)

        # Metric Card 2: Interest Rate / APR
        with col2:
            interest_rate = loan_details.get("Interest Rate", "Unknown")
            apr = loan_details.get("APR", None) # Check if APR exists
            display_rate = apr if apr and apr != "Not specified" else interest_rate # Prioritize APR if available
            secondary_text = "APR" if apr and apr != "Not specified" else "Interest Rate"
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">INTEREST / APR</div>
                <div class="value" style="font-size: { '1.5rem' if len(str(display_rate)) > 15 else '1.9rem' };">{display_rate}</div>
                <div class="secondary">{secondary_text} ({loan_details.get("Loan Term", "N/A Term")})</div>
            </div>
            """, unsafe_allow_html=True)

        # Metric Card 3: Overall Risk
        with col3:
            risk_level_raw = str(risk_score).split('-')[0].split()[0].strip().lower()
            risk_color_class = f"risk-{risk_level_raw}" if risk_level_raw in ["low", "medium", "high"] else "risk-unknown"
            risk_display_text = risk_score if risk_score != "Unknown - Parsing Error" else "Error"
            risk_level_display = risk_display_text.split('-')[0].strip()
            risk_justification = ' '.join(risk_display_text.split('-')[1:]).strip() if '-' in risk_display_text else ''
            risk_justification_display = translate_text(risk_justification, current_lang) # Translate justification
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">OVERALL RISK</div>
                <div class="value {risk_color_class}">{risk_level_display}</div>
                <div class="secondary">{risk_justification_display if risk_justification_display else ' '}</div>
            </div>
            """, unsafe_allow_html=True)


        st.markdown("### Loan Timeline")
        with st.container():
            # Use repayment_info for timeline
            timeline_fig, progress = generate_loan_timeline(repayment_info)
            if timeline_fig: st.plotly_chart(timeline_fig, use_container_width=True)
            else: st.info("Not enough date information available to generate a timeline.")

        st.markdown("### ⚠ Potential Predatory Clauses / Red Flags")
        # Use translated predatory analysis
        base_predatory_text = predatory_analysis_display
        # Check English original for negative condition
        if predatory_analysis_en and "No major predatory clauses detected" not in predatory_analysis_en and "Unable to detect" not in predatory_analysis_en and "Error" not in predatory_analysis_en:
            warning_title = translate_text("Warning:", current_lang)
            st.markdown(f"<div class='warning-panel'><strong>{warning_title}</strong> {base_predatory_text}</div>", unsafe_allow_html=True)
        elif "Unable to detect" in base_predatory_text or "Error" in base_predatory_text or "डेटा पार्स करने में त्रुटि" in base_predatory_text: # Crude Hindi check
             st.warning(base_predatory_text)
        else:
            success_msg = translate_text("✅ No major predatory clauses detected based on this analysis.", current_lang)
            st.success(success_msg)


    # --- RISK ANALYSIS TAB (Adapted for Loan Terms) ---
    with tab_risk:
        st.markdown("## Risk & Recommendations") # Updated title

        st.markdown("### Loan Aspect Risk Levels")
        with st.container():
            # Use term_risk_levels data
            risk_chart = generate_term_risk_chart(term_risk_levels)
            if risk_chart: st.plotly_chart(risk_chart, use_container_width=True)
            elif "Error" in str(term_risk_levels): st.warning("Risk levels could not be determined due to a parsing error.")
            else: st.info("No specific risk levels for loan aspects were provided.")

        st.markdown("### Key Term Overview")
        with st.container():
            # Use key_terms_en for chart generation consistency, map risks using term_risk_levels
            term_dist_chart = generate_term_chart(key_terms_en, term_risk_levels)
            if term_dist_chart: st.plotly_chart(term_dist_chart, use_container_width=True)
            elif "Error" in str(key_terms_en): st.warning("Term distribution chart could not be generated due to a parsing error.")
            else: st.info("No key terms were identified for the distribution chart.")

        st.markdown("### 💡 Recommendations for Borrower")
        # Use translated recommendations
        base_recommendations_text = recommendations_display
        if base_recommendations_text and "No recommendations" not in base_recommendations_text and "Error" not in base_recommendations_text and "कोई सिफ़ारिशें नहीं" not in base_recommendations_text:
             # Attempt splitting into list items (may need refinement based on AI output format)
            rec_items = re.split(r'\n\s*[-•–*]|\n\d+\.\s', '\n' + base_recommendations_text)
            rec_items = [s.strip() for s in rec_items if s.strip()]
            if not rec_items or len(rec_items) <= 1 and '\n' not in base_recommendations_text: # Fallback split by newline
                rec_items = [s.strip() for s in base_recommendations_text.split('\n') if s.strip()]

            rec_label = translate_text("Recommendation", current_lang)
            recs_title = translate_text("Recommendations:", current_lang)

            if rec_items:
                for i, item in enumerate(rec_items):
                     # Use 'suggestion-item' class for styling consistency
                     st.markdown(f'<div class="suggestion-item"><strong>{rec_label} {i+1}:</strong><br>{item}</div>', unsafe_allow_html=True)
            else: # Fallback if splitting fails
                 st.markdown(f'<div class="suggestion-item"><strong>{recs_title}</strong><br>{base_recommendations_text}</div>', unsafe_allow_html=True)
        else:
            st.info(base_recommendations_text) # Show "No recommendations..." message


    # --- KEY TERMS & FEES TAB ---
    with tab_terms:
        st.markdown("## Detailed Terms & Fees")

        st.markdown("### Key Terms Explained")
        if isinstance(key_terms_display, dict) and "Error" not in key_terms_display:
            search_term = st.text_input("🔍 Search terms (searches English term names)", key="term_search")

            # Filter based on English keys (key_terms_en) but display translated values (key_terms_display)
            filtered_terms_en_keys = key_terms_en
            if search_term:
                search_lower = search_term.lower()
                filtered_terms_en_keys = {k: v for k, v in key_terms_en.items()
                                            if search_lower in k.lower() or search_lower in str(v).lower()}

            if not filtered_terms_en_keys and search_term:
                 st.warning(f"No terms found matching '{search_term}'.")
            elif not filtered_terms_en_keys:
                 st.info("No key terms were identified in the analysis.")

            expander_term_label = translate_text("Term:", current_lang)
            expander_explanation_label = translate_text("Explanation:", current_lang)

            # Display terms using filtered English keys, get translated explanation
            for key_en, _ in filtered_terms_en_keys.items():
                value_display = key_terms_display.get(key_en, "Translation not available")

                with st.expander(f"{expander_term_label} {key_en}", expanded=False):
                     st.markdown(f"**{expander_explanation_label}**")
                     st.markdown(str(value_display)) # Display potentially translated explanation

        elif isinstance(key_terms_display, dict) and "Error" in key_terms_display :
             st.warning(key_terms_display["Error"])
        else:
            st.warning("Could not display key terms due to an unexpected data format.")
            # st.json(key_terms_display) # Optional: show raw data for debugging

        st.markdown("---")
        st.markdown("### Identified Fees")
        if isinstance(fees_display, dict) and "Error" not in fees_display:
            if fees_en.get("No specific fees identified."): # Check original English for negative case
                 st.info(fees_display.get("No specific fees identified.", "No specific fees identified.")) # Display translated version if available
            elif not fees_display:
                 st.info("No specific fees were listed in the analysis.")
            else:
                # Display fees in a simple list or table format
                st.markdown('<table class="styled-table"><thead><tr><th>Fee Name</th><th>Description / Amount</th></tr></thead><tbody>', unsafe_allow_html=True)
                for fee_name, fee_desc_display in fees_display.items():
                     st.markdown(f"<tr><td>{fee_name}</td><td>{fee_desc_display}</td></tr>", unsafe_allow_html=True)
                st.markdown("</tbody></table>", unsafe_allow_html=True)

        elif isinstance(fees_display, dict) and "Error" in fees_display:
            st.warning(fees_display["Error"])
        else:
            st.warning("Could not display fees due to an unexpected data format.")
            # st.json(fees_display) # Optional: show raw data for debugging


    # --- DETAILS & PARTIES TAB ---
    with tab_details:
        st.markdown("## Loan & Repayment Details")

        # Display Loan Details in a more structured way
        st.markdown("### Core Loan Details")
        if loan_details:
            # Use detail-item class for styling
            st.markdown(f'<div class="detail-item"><strong>Loan Amount:</strong> {loan_details.get("Loan Amount", "Not Specified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>Interest Rate:</strong> {loan_details.get("Interest Rate", "Not Specified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>APR:</strong> {loan_details.get("APR", "Not Specified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>Loan Term:</strong> {loan_details.get("Loan Term", "Not Specified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>Repayment Frequency:</strong> {loan_details.get("Repayment Frequency", "Not Specified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>Estimated Payment:</strong> {loan_details.get("Estimated Payment", "Not Specified")}</div>', unsafe_allow_html=True)
        else:
             st.info("Core loan details were not extracted.")

        st.markdown("### Repayment Schedule Info")
        if repayment_info:
            st.markdown(f'<div class="detail-item"><strong>Loan Start Date:</strong> {repayment_info.get("Start Date", "Not Specified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>First Payment Due:</strong> {repayment_info.get("First Payment Date", "Not Specified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>Loan End Date:</strong> {repayment_info.get("End Date", "Not Specified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>Number of Payments:</strong> {repayment_info.get("Number of Payments", "Not Specified")}</div>', unsafe_allow_html=True)
        else:
             st.info("Repayment date information was not extracted.")

        st.markdown("---")
        st.markdown("### Parties Involved")
        if parties:
            st.markdown(f'<div class="detail-item"><strong>Lender:</strong> {parties.get("Lender", "Not Identified")}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="detail-item"><strong>Borrower:</strong> {parties.get("Borrower", "Not Identified")}</div>', unsafe_allow_html=True)
        elif "Error" in str(parties):
            st.warning("Could not identify parties due to data error.")
        else:
            st.info("Lender or Borrower names were not identified in the document.")


    # --- COMPARISON TAB (Keep as placeholder) ---
    with tab_compare:
        st.markdown("## Document Comparison")
        st.info("ℹ Feature under development: Upload a second document here to compare key terms, rates, and risks against the first document.")
        comparison_file = st.file_uploader("Upload Second Document for Comparison", type="pdf", key="comparison_uploader", help="Upload another document (PDF).")
        if comparison_file:
            st.warning("🚧 Comparison analysis is not yet implemented.")


    # Add a footer
    st.markdown("---")
    st.markdown("<div style='text-align: center; opacity: 0.7; font-size: 0.9em;'>Financial Document Analyzer | Powered by Google Gemini | © 2024</div>", unsafe_allow_html=True)