async function testApi() {
  const res = await fetch('https://invoice-system-six.vercel.app/api/notify-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order: { id: "123", total: 100, customerInfo: { name: "Test", email: "test@example.com" } },
      shopProfile: { name: "Test Shop" },
      type: "invoice"
    })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
testApi();
