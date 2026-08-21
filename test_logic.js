const expenses = [
  { description: 'Conta de Luz', amount: 100, date: '2023-01-01', tags: ['Recorrente', 'Variável'] },
  { description: 'Conta de Luz', amount: 150, date: '2023-02-01', tags: ['Recorrente', 'Variável'] },
  { description: 'Aluguel', amount: 1000, date: '2023-02-01', tags: ['Recorrente'] },
];

const pastExpenses = expenses;
const virtualExpenses = [];
const physicalExpensesThisMonth = [];
const existsThisMonth = (desc) => physicalExpensesThisMonth.some(e => e.description.toLowerCase() === desc.toLowerCase());

const pastRecurringOrVariable = pastExpenses.filter(exp => exp.tags?.includes('Recorrente') || exp.tags?.includes('Variável'));
const groupsByDesc = new Map();

[...pastRecurringOrVariable].sort((a, b) => a.date.localeCompare(b.date)).forEach(exp => {
  const desc = exp.description.toLowerCase().trim();
  if (!groupsByDesc.has(desc)) {
    groupsByDesc.set(desc, { amounts: [], latestExp: exp });
  }
  groupsByDesc.get(desc).amounts.push(exp.amount);
  groupsByDesc.get(desc).latestExp = exp;
});

for (const [descKey, group] of groupsByDesc.entries()) {
  if (!existsThisMonth(descKey)) {
    const { amounts, latestExp } = group;
    const isVariable = latestExp.tags?.includes('Variável');
    const isRecurring = latestExp.tags?.includes('Recorrente');
    
    let projectedAmount = latestExp.amount;
    if (isVariable) {
      projectedAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    }
    
    virtualExpenses.push({
      ...latestExp,
      id: `virtual-${latestExp.id}`,
      amount: projectedAmount,
      date: `2023-03-01`, // current month prefix
      tags: [...(latestExp.tags || []), 'Projetado'].filter(t => t !== 'Variável' && t !== 'Recorrente')
    });
  }
}

console.log(virtualExpenses);
