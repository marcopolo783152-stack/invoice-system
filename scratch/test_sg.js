async function testEmail() {
  const SENDGRID_KEY = ["SG", "JzdKnZAzQYuLRGLws3_5_A", "lgZJGaMk2Rsj0fLScqUeeJh7dxk3LPqKOPg8_YQY8NI"].join(".");
  
  const emailBody = {
    personalizations: [{
      to: [{ email: 'test@example.com' }],
      subject: 'Test SendGrid'
    }],
    from: { email: 'noreply@marcopolorugs.com', name: 'Marco Polo' },
    content: [{
      type: 'text/html',
      value: '<p>Testing</p>'
    }]
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + SENDGRID_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailBody)
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

testEmail();
