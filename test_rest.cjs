require('dotenv').config();
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function run() {
  const res = await fetch(`${URL}/rest/v1/appointments?select=*&limit=1`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}
run();
