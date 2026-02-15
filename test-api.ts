async function test() {
  const baseUrl = 'http://localhost:3000';

  // Create User
  console.log('Creating user...');
  const userRes = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: `test${Date.now()}@example.com` }),
  });
  const user = await userRes.json();
  console.log('User created:', user);

  // Create Category
  console.log('Creating category...');
  const catRes = await fetch(`${baseUrl}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Food ${Date.now()}` }),
  });
  const category = await catRes.json();
  console.log('Category created:', category);

  // Create Expense
  console.log('Creating expense...');
  const expRes = await fetch(`${baseUrl}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Lunch',
      amount: 50,
      userId: user.id,
      categoryId: category.id,
    }),
  });
  const expense = await expRes.json();
  console.log('Expense created:', expense);

  // List Expenses
  console.log('Listing expenses...');
  const listRes = await fetch(`${baseUrl}/expenses`);
  const expenses = await listRes.json();
  console.log('Expenses:', JSON.stringify(expenses, null, 2));
}

test().catch(console.error);
