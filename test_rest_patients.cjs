require('dotenv').config();
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;
async function run() {
  const res = await fetch(`${URL}/rest/v1/patients?select=*&limit=1`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  console.log("Body:", await res.text());
}
run();
