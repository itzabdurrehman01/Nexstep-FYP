import dotenv from 'dotenv';

dotenv.config();
if (!process.env.CLERK_TELEMETRY_DISABLED) {
  process.env.CLERK_TELEMETRY_DISABLED = '1';
}
