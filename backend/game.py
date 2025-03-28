import streamlit as st
import random
import json

# --- Game Constants ---
STARTING_AGE = 12
RETIREMENT_AGE = 65
INFLATION_RATE = 0.03  # More realistic annual inflation (3%)
INVESTMENT_RETURN_LOW_RISK = 0.06  # e.g., Fixed Deposits (6%)
INVESTMENT_RETURN_MED_RISK = 0.10  # e.g., Mutual Funds (10%)
MAX_LOANS = 2  # Realistic cap on simultaneous loans
LOAN_CAP_MULTIPLIER = 3  # Max loan amount = 3x annual income

# --- Helper Functions ---

def initialize_game_state():
    """Creates the initial state dictionary for the game."""
    return {
        "profile": {
            "name": "Player",
            "age": STARTING_AGE,
        },
        "finances": {
            "cash": 500,
            "income": 0,
            "expenses": 0,
            "investments": {"fixed_deposit": 0, "mutual_funds": 0},
            "loans": {},
            "net_worth": 500,
        },
        "financial_health": 50,
        "game_log": [f"🚀 Game Started! Age: {STARTING_AGE}, Cash: ₹500"],
        "current_event": None,
        "last_decision_impact": "",
        "game_over": False,
        "scenario_key": "initial"
    }

def calculate_financial_health(state):
    """Calculates a more realistic financial health score."""
    score = 50  # Base score
    income = state["finances"]["income"]
    expenses = state["finances"]["expenses"]
    cash = state["finances"]["cash"]
    investments = sum(state["finances"]["investments"].values())
    loans_total = sum(loan.get('principal', 0) for loan in state["finances"]["loans"].values())
    net_worth = state["finances"]["net_worth"]

    # Debt-to-Income Ratio (DTI): Lower is better
    dti = (expenses + sum(loan.get('emi', 0) for loan in state["finances"]["loans"].values())) / income if income > 0 else 1
    if dti < 0.3: score += 20  # Healthy DTI
    elif dti < 0.5: score += 5
    elif dti > 0.8: score -= 20  # High DTI penalty

    # Emergency Fund: 6 months of expenses
    emergency_fund_target = expenses * 6
    if cash >= emergency_fund_target: score += 15
    elif cash >= expenses * 3: score += 5
    elif cash < 0: score -= 30  # Severe penalty for negative cash

    # Investment Ratio: Investments vs. Net Worth
    if investments > net_worth * 0.5 and net_worth > 0: score += 10
    elif investments > net_worth * 0.2: score += 5

    # Net Worth Milestones
    if net_worth > 1000000: score += 15
    elif net_worth > 100000: score += 5
    elif net_worth < 0: score -= 20

    # Loan Burden
    if len(state["finances"]["loans"]) > MAX_LOANS: score -= 20
    elif loans_total > income * 12 * LOAN_CAP_MULTIPLIER: score -= 15  # Exceeds 3x annual income

    return max(0, min(100, score))

def update_net_worth(state):
    """Recalculates net worth."""
    investment_total = sum(state["finances"]["investments"].values())
    loan_total = sum(loan.get('principal', 0) for loan in state["finances"]["loans"].values())
    state["finances"]["net_worth"] = state["finances"]["cash"] + investment_total - loan_total
    return state

def advance_year(state, years=1):
    """Simulates the passing of years with realistic constraints."""
    if state["game_over"]: return state
    new_state = state.copy()
    new_state["profile"]["age"] += years
    new_state["game_log"].append(f"--- Age {new_state['profile']['age']} ---")

    for _ in range(years):
        # Realistic income and expense growth (2-3% annually)
        new_state["finances"]["income"] *= (1 + 0.025)
        new_state["finances"]["expenses"] *= (1 + INFLATION_RATE)
        
        annual_income = new_state["finances"]["income"] * 12
        annual_expenses = new_state["finances"]["expenses"] * 12
        annual_emi_paid = 0
        loans_to_remove = []

        for loan_name, loan_details in list(new_state["finances"]["loans"].items()):
            annual_payment = min(loan_details["emi"] * 12, annual_income * 0.4)  # Cap EMI at 40% of income
            annual_interest = loan_details["principal"] * loan_details["interest_rate"]
            principal_paid = annual_payment - annual_interest
            principal_paid = max(0, min(principal_paid, loan_details["principal"]))
            loan_details["principal"] -= principal_paid
            annual_emi_paid += annual_payment

            if loan_details["principal"] <= 0:
                loans_to_remove.append(loan_name)
                new_state["game_log"].append(f"🎉 Paid off {loan_name.replace('_', ' ').title()}!")

        for loan_name in loans_to_remove:
            new_state["finances"]["expenses"] -= new_state["finances"]["loans"][loan_name]["emi"]
            del new_state["finances"]["loans"][loan_name]

        net_annual_income = annual_income - annual_expenses - annual_emi_paid
        new_state["finances"]["cash"] += net_annual_income
        if new_state["finances"]["cash"] < 0 and not new_state["finances"]["loans"]:
            new_state["finances"]["cash"] = 0  # Prevent negative cash without loans

        new_state["finances"]["investments"]["fixed_deposit"] *= (1 + INVESTMENT_RETURN_LOW_RISK)
        new_state["finances"]["investments"]["mutual_funds"] *= (1 + INVESTMENT_RETURN_MED_RISK)

    new_state = update_net_worth(new_state)
    new_state["financial_health"] = calculate_financial_health(new_state)
    return new_state

def get_branching_scenarios():
    """Returns a complete dictionary of branching scenarios."""
    return {
        "initial": {
            "narrative": "At age 12, your uncle gives you ₹2,000 as a birthday gift. What do you do with it?",
            "choices": [
                {"id": "choice_1", "text": "Spend it on a new video game (Cost: ₹2,000)", "next_key": "spend_12"},
                {"id": "choice_2", "text": "Save it in a piggy bank (Savings: +₹2,000)", "next_key": "save_12"},
                {"id": "choice_3", "text": "Invest it in a fixed deposit (Savings: +₹2,000 + 6% interest)", "next_key": "invest_12"}
            ],
            "reasoning": {
                "choice_1": "Spending reduces cash, missing growth opportunities—poor start.",
                "choice_2": "Saving builds a small buffer—better for safety.",
                "choice_3": "Investing grows money over time—best for future wealth."
            }
        },
        # Branch: Spend at 12
        "spend_12": {
            "narrative": "At 25, with little savings, you want a ₹20,000 smartphone. What now?",
            "choices": [
                {"id": "choice_1", "text": "Take a loan with 10% interest, repay in 12 months (EMI: ₹1,750/month)", "next_key": "loan_25_spend"},
                {"id": "choice_2", "text": "Save ₹5,000/month for 4 months, then buy", "next_key": "save_25_spend"}
            ],
            "reasoning": {
                "choice_1": "A loan adds debt early—risky with low cash.",
                "choice_2": "Saving avoids debt—smarter for stability."
            }
        },
        "loan_25_spend": {
            "narrative": "At 40, with a phone loan, you need a ₹5,00,000 car. How do you finance it?",
            "choices": [
                {"id": "choice_1", "text": "Take a loan at 8% over 5 years (EMI: ₹10,000/month)", "next_key": "loan_40_loan"},
                {"id": "choice_2", "text": "Save ₹15,000/month for 3 years", "next_key": "save_40_loan"}
            ],
            "reasoning": {
                "choice_1": "More debt increases burden—bad if income is tight.",
                "choice_2": "Saving delays purchase but avoids debt—better long-term."
            }
        },
        "save_25_spend": {
            "narrative": "At 40, debt-free, you need a ₹5,00,000 car. What’s your move?",
            "choices": [
                {"id": "choice_1", "text": "Pay ₹2,00,000 cash, loan ₹3,00,000 at 8% over 3 years (EMI: ₹9,400/month)", "next_key": "mix_40_save"},
                {"id": "choice_2", "text": "Save ₹15,000/month for 3 years", "next_key": "save_40_save"}
            ],
            "reasoning": {
                "choice_1": "Mixing cash and loan balances cost and liquidity—practical choice.",
                "choice_2": "Saving fully avoids debt—best if you can wait."
            }
        },
        "loan_40_loan": {
            "narrative": "At 65, with loans, a ₹3,00,000 medical emergency hits. How do you cope?",
            "choices": [
                {"id": "choice_1", "text": "Take a loan at 9% over 3 years (EMI: ₹9,500/month)", "next_key": "end_loan_loan"},
                {"id": "choice_2", "text": "Use cash (Savings: -₹3,00,000)", "next_key": "end_cash_loan"}
            ],
            "reasoning": {
                "choice_1": "More debt in retirement strains pension—poor choice.",
                "choice_2": "Cash preserves health if you have enough—better option."
            }
        },
        "save_40_loan": {
            "narrative": "At 65, after saving, a ₹3,00,000 medical emergency arises. What’s your plan?",
            "choices": [
                {"id": "choice_1", "text": "Use cash (Savings: -₹3,00,000)", "next_key": "end_cash_save"},
                {"id": "choice_2", "text": "Take a loan at 9% over 3 years (EMI: ₹9,500/month)", "next_key": "end_loan_save"}
            ],
            "reasoning": {
                "choice_1": "Cash keeps you debt-free—best with savings.",
                "choice_2": "A loan adds burden—avoid unless necessary."
            }
        },
        "mix_40_save": {
            "narrative": "At 65, with a car loan, a ₹3,00,000 medical emergency occurs. What now?",
            "choices": [
                {"id": "choice_1", "text": "Use cash (Savings: -₹3,00,000)", "next_key": "end_cash_mix"},
                {"id": "choice_2", "text": "Take a loan at 9% over 3 years (EMI: ₹9,500/month)", "next_key": "end_loan_mix"}
            ],
            "reasoning": {
                "choice_1": "Cash reduces debt load—better if affordable.",
                "choice_2": "A loan adds expenses—risky in retirement."
            }
        },
        "save_40_save": {
            "narrative": "At 65, with no debt, a ₹3,00,000 medical emergency strikes. What’s your choice?",
            "choices": [
                {"id": "choice_1", "text": "Use cash (Savings: -₹3,00,000)", "next_key": "end_cash_full_save"},
                {"id": "choice_2", "text": "Investments cover ₹1,50,000, cash ₹1,50,000", "next_key": "end_invest_save"}
            ],
            "reasoning": {
                "choice_1": "Cash use keeps you debt-free—solid option.",
                "choice_2": "Using investments preserves cash—best for liquidity."
            }
        },
        # Branch: Save at 12
        "save_12": {
            "narrative": "At 25, with ₹2,500 saved, you want a ₹20,000 smartphone. How do you proceed?",
            "choices": [
                {"id": "choice_1", "text": "Use savings, loan ₹17,500 at 10% (EMI: ₹1,500/month)", "next_key": "loan_25_save"},
                {"id": "choice_2", "text": "Save ₹5,000/month for 4 months", "next_key": "save_25_save"}
            ],
            "reasoning": {
                "choice_1": "A loan adds debt—okay if manageable.",
                "choice_2": "Saving avoids debt—best for health."
            }
        },
        "loan_25_save": {
            "narrative": "At 40, with a phone loan, you need a ₹5,00,000 car. What do you do?",
            "choices": [
                {"id": "choice_1", "text": "Take a loan at 8% over 5 years (EMI: ₹10,000/month)", "next_key": "loan_40_loan_save"},
                {"id": "choice_2", "text": "Save ₹15,000/month for 3 years", "next_key": "save_40_loan_save"}
            ],
            "reasoning": {
                "choice_1": "More debt increases risk—bad if overextended.",
                "choice_2": "Saving reduces debt—better for stability."
            }
        },
        "save_25_save": {
            "narrative": "At 40, debt-free, you need a ₹5,00,000 car. How do you buy it?",
            "choices": [
                {"id": "choice_1", "text": "Pay ₹2,00,000 cash, loan ₹3,00,000 at 8% over 3 years (EMI: ₹9,400/month)", "next_key": "mix_40_full_save"},
                {"id": "choice_2", "text": "Invest ₹1,00,000, save ₹12,000/month for 3 years", "next_key": "invest_40_save"}
            ],
            "reasoning": {
                "choice_1": "Mixing cash and loan is practical—good balance.",
                "choice_2": "Investing grows wealth—best if you can delay."
            }
        },
        # Branch: Invest at 12
        "invest_12": {
            "narrative": "At 25, your ₹2,000 grew to ₹4,000. You want a ₹20,000 smartphone. What’s your plan?",
            "choices": [
                {"id": "choice_1", "text": "Sell investment, loan ₹16,000 at 10% (EMI: ₹1,400/month)", "next_key": "loan_25_invest"},
                {"id": "choice_2", "text": "Keep investment, save ₹5,000/month for 4 months", "next_key": "save_25_invest"}
            ],
            "reasoning": {
                "choice_1": "Selling stops growth, adds debt—okay but not great.",
                "choice_2": "Keeping investment grows wealth—best choice."
            }
        },
        "loan_25_invest": {
            "narrative": "At 40, with a phone loan, you need a ₹5,00,000 car. What’s your strategy?",
            "choices": [
                {"id": "choice_1", "text": "Take a loan at 8% over 5 years (EMI: ₹10,000/month)", "next_key": "loan_40_loan_invest"},
                {"id": "choice_2", "text": "Save ₹15,000/month for 3 years", "next_key": "save_40_loan_invest"}
            ],
            "reasoning": {
                "choice_1": "More debt adds pressure—bad if cash is low.",
                "choice_2": "Saving avoids debt—better for health."
            }
        },
        "save_25_invest": {
            "narrative": "At 40, with investments at ₹50,000, you need a ₹5,00,000 car. What now?",
            "choices": [
                {"id": "choice_1", "text": "Sell investments (₹50,000), loan ₹4,50,000 at 8% over 5 years (EMI: ₹9,000/month)", "next_key": "mix_40_invest"},
                {"id": "choice_2", "text": "Keep investments, save ₹15,000/month for 3 years", "next_key": "save_40_invest"}
            ],
            "reasoning": {
                "choice_1": "Selling uses gains, adds debt—practical but costly.",
                "choice_2": "Saving preserves investments—best for wealth."
            }
        },
        # Simplified endgames for brevity (expand as needed)
        "end_loan_loan": {"narrative": "Game Over - Retired with heavy debt!", "choices": []},
        "end_cash_loan": {"narrative": "Game Over - Retired with low savings!", "choices": []},
        "end_cash_save": {"narrative": "Game Over - Retired comfortably!", "choices": []},
        "end_loan_save": {"narrative": "Game Over - Retired with some debt!", "choices": []},
        "end_cash_mix": {"narrative": "Game Over - Retired with stable savings!", "choices": []},
        "end_loan_mix": {"narrative": "Game Over - Retired with moderate debt!", "choices": []},
        "end_cash_full_save": {"narrative": "Game Over - Retired with good savings!", "choices": []},
        "end_invest_save": {"narrative": "Game Over - Retired with strong wealth!", "choices": []}
    }

def process_decision_and_advance(state, choice_text):
    """Processes the choice with realistic constraints."""
    if state["game_over"]: return state
    new_state = state.copy()
    scenarios = get_branching_scenarios()
    current_event = scenarios[new_state["scenario_key"]]
    choice = next(c for c in current_event["choices"] if c["text"] == choice_text)
    choice_id = choice["id"]
    reasoning = current_event["reasoning"][choice_id]
    impact_message = f"You chose: '{choice_text}'. {reasoning}"

    annual_income = new_state["finances"]["income"] * 12
    loan_cap = annual_income * LOAN_CAP_MULTIPLIER

    if new_state["scenario_key"] == "initial":
        if "Spend it" in choice_text:
            new_state["finances"]["cash"] -= 2000
        elif "Save it" in choice_text:
            new_state["finances"]["cash"] += 2000
        elif "Invest it" in choice_text:
            new_state["finances"]["investments"]["fixed_deposit"] += 2000
            new_state["finances"]["cash"] += 120  # 6% interest
        new_state = advance_year(new_state, years=13)
        new_state["finances"]["income"] = 25000  # Realistic starting salary
        new_state["finances"]["expenses"] = 15000

    elif "25" in new_state["scenario_key"]:
        if "loan" in choice_text and "₹1,750" in choice_text:
            if len(new_state["finances"]["loans"]) < MAX_LOANS and 21000 <= loan_cap:
                new_state["finances"]["loans"]["phone_loan"] = {"principal": 21000, "interest_rate": 0.10, "emi": 1750}
                new_state["finances"]["expenses"] += 1750
                new_state["finances"]["cash"] -= 21000
            else:
                new_state["game_log"].append("⚠ Loan denied: Exceeds capacity!")
                new_state["finances"]["cash"] -= 20000  # Forced cash spend
        elif "Save ₹5,000" in choice_text:
            new_state["finances"]["cash"] += 20000 - 20000
        elif "loan ₹17,500" in choice_text:
            if len(new_state["finances"]["loans"]) < MAX_LOANS and 17500 <= loan_cap:
                new_state["finances"]["loans"]["phone_loan"] = {"principal": 17500, "interest_rate": 0.10, "emi": 1500}
                new_state["finances"]["expenses"] += 1500
                new_state["finances"]["cash"] -= 2500
            else:
                new_state["finances"]["cash"] -= 20000
        elif "loan ₹16,000" in choice_text:
            if len(new_state["finances"]["loans"]) < MAX_LOANS and 16000 <= loan_cap:
                new_state["finances"]["loans"]["phone_loan"] = {"principal": 16000, "interest_rate": 0.10, "emi": 1400}
                new_state["finances"]["expenses"] += 1400
                new_state["finances"]["cash"] += 4000 - 20000
            else:
                new_state["finances"]["cash"] -= 16000
        new_state = advance_year(new_state, years=15)
        new_state["finances"]["income"] = 60000  # Mid-career salary
        new_state["finances"]["expenses"] = 35000 if not new_state["finances"]["loans"] else new_state["finances"]["expenses"]

    elif "40" in new_state["scenario_key"]:
        if "loan" in choice_text and "5 years" in choice_text:
            if len(new_state["finances"]["loans"]) < MAX_LOANS and 500000 <= loan_cap:
                new_state["finances"]["loans"]["car_loan"] = {"principal": 500000, "interest_rate": 0.08, "emi": 10000}
                new_state["finances"]["expenses"] += 10000
            else:
                new_state["game_log"].append("⚠ Loan denied: Exceeds capacity!")
                new_state["finances"]["cash"] -= 500000
        elif "Save ₹15,000" in choice_text:
            new_state["finances"]["cash"] += 540000  # 15,000 * 36 months
        elif "loan ₹3,00,000" in choice_text:
            if len(new_state["finances"]["loans"]) < MAX_LOANS and 300000 <= loan_cap:
                new_state["finances"]["loans"]["car_loan"] = {"principal": 300000, "interest_rate": 0.08, "emi": 9400}
                new_state["finances"]["expenses"] += 9400
                new_state["finances"]["cash"] -= 200000
            else:
                new_state["finances"]["cash"] -= 500000
        elif "Invest ₹1,00,000" in choice_text:
            new_state["finances"]["investments"]["mutual_funds"] += 100000
            new_state["finances"]["cash"] += 432000 - 500000  # 12,000 * 36 - car cost
        elif "loan ₹4,50,000" in choice_text:
            if len(new_state["finances"]["loans"]) < MAX_LOANS and 450000 <= loan_cap:
                new_state["finances"]["loans"]["car_loan"] = {"principal": 450000, "interest_rate": 0.08, "emi": 9000}
                new_state["finances"]["expenses"] += 9000
                new_state["finances"]["investments"]["fixed_deposit"] -= 50000
                new_state["finances"]["cash"] += 50000
            else:
                new_state["finances"]["cash"] -= 450000
        new_state = advance_year(new_state, years=25)
        new_state["finances"]["income"] = 30000  # Pension
        new_state["finances"]["expenses"] = 25000 if not new_state["finances"]["loans"] else new_state["finances"]["expenses"]

    elif "65" in new_state["scenario_key"]:
        if "Take a loan" in choice_text:
            if len(new_state["finances"]["loans"]) < MAX_LOANS and 300000 <= loan_cap:
                new_state["finances"]["loans"]["medical_loan"] = {"principal": 300000, "interest_rate": 0.09, "emi": 9500}
                new_state["finances"]["expenses"] += 9500
            else:
                new_state["finances"]["cash"] -= 300000
        elif "Use cash" in choice_text:
            new_state["finances"]["cash"] -= 300000
        elif "Investments cover" in choice_text:
            new_state["finances"]["investments"]["mutual_funds"] -= 150000
            new_state["finances"]["cash"] -= 150000
        new_state["game_over"] = True

    # Prevent negative cash without loans
    if new_state["finances"]["cash"] < 0 and not new_state["finances"]["loans"]:
        new_state["finances"]["cash"] = 0
        new_state["game_log"].append("⚠ Cash hit zero—adjusted to prevent bankruptcy!")

    new_state["last_decision_impact"] = impact_message
    new_state["game_log"].append(impact_message)
    new_state = update_net_worth(new_state)
    new_state["financial_health"] = calculate_financial_health(new_state)

    next_key = choice["next_key"]
    if next_key in scenarios:
        if next_key.startswith("end"):
            new_state["game_over"] = True
            new_state["current_event"] = scenarios[next_key]
        else:
            new_state["scenario_key"] = next_key
            new_state["current_event"] = scenarios[next_key]
            new_state["game_log"].append(f"\n✨ EVENT: {new_state['current_event']['narrative']}")
    else:
        new_state["game_over"] = True
        new_state["current_event"] = {"narrative": "Game Over - Unexpected End!", "choices": []}

    return new_state

# --- Streamlit UI Functions ---

def display_dashboard(state):
    """Displays financial metrics."""
    st.markdown("<h3 style='text-align: center; color: white;'>Your Financial Dashboard</h3>", unsafe_allow_html=True)
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("🎂 Age", state["profile"]["age"], delta_color="off")
    col2.metric("💰 Net Worth", f"₹{state['finances']['net_worth']:,.0f}", delta_color="normal")
    col3.metric("❤ Financial Health", f"{state['financial_health']}/100", delta_color="normal")
    col4.metric("🏦 Cash", f"₹{state['finances']['cash']:,.0f}", delta_color="normal")

    col1a, col2a, col3a, col4a = st.columns(4)
    col1a.metric("💼 Income (Monthly)", f"₹{state['finances']['income']:,.0f}", delta_color="normal")
    col2a.metric("💸 Expenses (Monthly)", f"₹{state['finances']['expenses']:,.0f}", delta_color="inverse")
    col3a.metric("📈 Investments", f"₹{sum(state['finances']['investments'].values()):,.0f}", delta_color="normal")
    col4a.metric("📉 Loans", f"₹{sum(loan.get('principal', 0) for loan in state['finances']['loans'].values()):,.0f}", delta_color="inverse")

    st.progress(state["financial_health"] / 100, "Financial Health Progress")

def display_event_and_choices(state):
    """Displays the current event and choices."""
    if state.get("current_event") and not state["game_over"]:
        st.subheader("📅 Current Life Event", help="Make a choice to shape your financial future!")
        st.markdown(f"<div style='background-color: black; padding: 15px; border-radius: 10px;'>{state['current_event']['narrative']}</div>", unsafe_allow_html=True)
        st.markdown(f"<i>{state.get('last_decision_impact', '')}</i>", unsafe_allow_html=True)

        st.subheader("Your Choices:")
        choices = state["current_event"]["choices"]
        for choice in choices:
            if st.button(choice["text"], key=choice["id"], use_container_width=True):
                handle_decision_click(choice["text"])
    elif state["game_over"]:
        st.success("🎉 Your Journey Complete!")
        st.markdown(f"<div style='background-color: black; padding: 15px; border-radius: 10px;'>{state['current_event']['narrative']}</div>", unsafe_allow_html=True)
        st.balloons()
    else:
        st.info("Click 'Start New Game' to begin!")

def display_game_log(state):
    """Displays the game log."""
    with st.expander("📝 Game Log", expanded=False):
        log_text = "\n".join(state["game_log"][::-1])
        st.text_area("Log History", value=log_text, height=200, disabled=True)

# --- Streamlit Button Callback Functions ---

def start_new_game():
    """Initializes game state with the initial scenario."""
    state = initialize_game_state()
    state["current_event"] = get_branching_scenarios()["initial"]
    state["game_log"].append(f"\n✨ EVENT: {state['current_event']['narrative']}")
    st.session_state.game_state = state

def handle_decision_click(choice_text):
    """Processes decision and advances the game."""
    if "game_state" in st.session_state:
        current_state = st.session_state.game_state
        updated_state = process_decision_and_advance(current_state, choice_text)
        st.session_state.game_state = updated_state

# --- Main Streamlit App ---

st.set_page_config(layout="wide", page_title="Financial Journey Demo")

st.title("Your Financial Journey")
st.markdown("<p style='text-align: center; color: white;'>Start at age 12 and make choices that shape your financial future!</p>", unsafe_allow_html=True)

if "game_state" not in st.session_state:
    st.button("🚀 Start New Game", on_click=start_new_game, type="primary")
    st.info("Welcome! Click 'Start New Game' to begin your financial journey.")
else:
    game_state = st.session_state.game_state
    display_dashboard(game_state)
    st.divider()
    col_main, col_log = st.columns([3, 1])
    with col_main:
        display_event_and_choices(game_state)
    with col_log:
        display_game_log(game_state)
    st.divider()
    st.button("Start New Game", key="restart_btn", on_click=start_new_game)

st.markdown("---")
