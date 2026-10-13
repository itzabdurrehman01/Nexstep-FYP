import { generateCounselingResponse } from '../src/services/aiCounselorEngine.js';

async function testCounselor() {
  console.log('--- Testing AI Counselor Engine ---');

  // Test 1: Medical / MDCAT question
  console.log('\n[1/3] Test Medical & MDCAT inquiry:');
  const medResponse = generateCounselingResponse('What should I do if my MDCAT score is low? Can I still do BDS or DPT?');
  console.log('Response length:', medResponse.length, 'chars');
  console.log('Snippet:\n', medResponse.slice(0, 300), '...\n');

  // Test 2: Engineering / CS / ECAT question
  console.log('\n[2/3] Test Engineering vs Computing inquiry:');
  const csResponse = generateCounselingResponse('Should I do ICS or FSc Pre-Engineering for software engineering and FAST university?');
  console.log('Response length:', csResponse.length, 'chars');
  console.log('Snippet:\n', csResponse.slice(0, 300), '...\n');

  // Test 3: Urdu inquiry
  console.log('\n[3/3] Test Urdu inquiry:');
  const urduResponse = generateCounselingResponse('مجھے بتائیں کہ ایف ایس سی کے بعد کون سی فیلڈ بہتر ہے اور سکالرشپ کیسے ملے گی؟');
  console.log('Response length:', urduResponse.length, 'chars');
  console.log('Snippet:\n', urduResponse.slice(0, 300), '...\n');

  console.log('--- AI Counselor Engine Tests Finished Successfully ---');
}

testCounselor().catch(console.error);
