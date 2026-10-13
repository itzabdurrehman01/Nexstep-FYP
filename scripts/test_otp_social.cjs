const dotenv = require('dotenv');
dotenv.config();

async function testOtpAndSocial() {
  const PORT = process.env.PORT || 3001;
  const baseUrl = `http://localhost:${PORT}`;

  console.log('Testing OTP and Social Auth on', baseUrl);
  // We will test when the backend server is running, or verify logic directly.
}

testOtpAndSocial();
