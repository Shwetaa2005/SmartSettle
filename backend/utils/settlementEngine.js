/**
 * SmartSettle Greedy Graph Minimization Engine
 * 
 * Takes a trip object containing participants and itemized expenses,
 * calculates net balances, and runs a greedy two-pointer matching loop
 * to condense group debt down to a maximum of N-1 transactions.
 * 
 * @param {Array} participants - List of participant objects [{ name, upiId }]
 * @param {Array} expenses - List of expense objects [{ amount, paidBy, splitAmong }]
 * @returns {Array} List of optimized transactions [{ from, to, amount, toUpiId }]
 */
export const calculateMinSettlements = (participants, expenses) => {
  // Map to hold net balances: { "Amit": 600, "Sneha": -600 }
  const balanceMap = {};

  // Initializing balance for every participant to 0
  participants.forEach((p) => {
    balanceMap[p.name] = 0;
  });

  // Helper map for fast lookup of UPI IDs
  const upiMap = {};
  participants.forEach((p) => {
    upiMap[p.name] = p.upiId || null;
  });

  //Computes Net Balances across all itemized expenses
  expenses.forEach((expense) => {
    const { amount, paidBy, splitAmong } = expense;

    if (!splitAmong || splitAmong.length === 0) return;

    // Calculate individual share for specific item
    const perPersonShare = Math.round((amount / splitAmong.length) * 100) / 100;

    // The person who paid gets a POSITIVE credit for the full amount
    balanceMap[paidBy] = (balanceMap[paidBy] || 0) + amount;

    // Everyone included in the split gets a NEGATIVE debit for their share
    splitAmong.forEach((person) => {
      balanceMap[person] = (balanceMap[person] || 0) - perPersonShare;
    });
  });

  // Separating participants into Debtors and Creditors 
  const debtors = [];
  const creditors = [];

  Object.keys(balanceMap).forEach((person) => {
  
    const netBalance = Math.round(balanceMap[person] * 100) / 100;

    if (netBalance < -0.01) {
      debtors.push({ name: person, amount: Math.abs(netBalance) });
    } else if (netBalance > 0.01) {
      creditors.push({ name: person, amount: netBalance });
    }
  });

  // Sort Debtors and Creditors in DESCENDING order of absolute value
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  // Greedy Two-Pointer Settlement Loop
  let dIndex = 0; // Debtor pointer
  let cIndex = 0; // Creditor pointer

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    // Finds the minimum of what debtor owes and what creditor is owed
    const settledAmount = Math.min(debtor.amount, creditor.amount);

    // Rounds the  amount to 2 decimal places
    const roundedAmount = Math.round(settledAmount * 100) / 100;

    if (roundedAmount > 0) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: roundedAmount,
        toUpiId: upiMap[creditor.name], 
      });
    }

    // Deduct settled amount from both balances
    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    // If debtor paid off all debt then move to next debtor
    if (Math.abs(debtor.amount) < 0.01) {
      dIndex++;
    }

    // If creditor received all money owed thenmove to next creditor
    if (Math.abs(creditor.amount) < 0.01) {
      cIndex++;
    }
  }

  return transactions;
};