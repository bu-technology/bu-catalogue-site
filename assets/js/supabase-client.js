const SUPABASE_URL = "https://dmxpltiomvluuooojayh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteHBsdGlvbXZsdXVvb29qYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDQ2MzgsImV4cCI6MjEwMjYyMDYzOH0.t8zKwbbO05VhAaJFuRZBTMmkrHffZWgOwLWtkznnTFY";

function buHeaders(){
  return { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY };
}

async function fetchAllDrinks(){
  const res = await fetch(SUPABASE_URL + '/rest/v1/drinks?select=id,name,description,image_url,bean,type,tasting_notes&order=created_at.asc', { headers: buHeaders() });
  if(!res.ok) throw new Error('Could not load drinks (' + res.status + ')');
  return res.json();
}

async function fetchCatalogue(id){
  const res = await fetch(SUPABASE_URL + '/rest/v1/catalogues?id=eq.' + encodeURIComponent(id) + '&select=id,name,description,client_logo_url,drink_ids', { headers: buHeaders() });
  if(!res.ok) throw new Error('Could not load catalogue (' + res.status + ')');
  const rows = await res.json();
  return rows[0] || null;
}

async function fetchDrinksByIds(ids){
  if(!ids || ids.length === 0) return [];
  const list = ids.map(id => '"' + id + '"').join(',');
  const res = await fetch(SUPABASE_URL + '/rest/v1/drinks?id=in.(' + list + ')&select=id,name,description,image_url,bean,type,tasting_notes', { headers: buHeaders() });
  if(!res.ok) throw new Error('Could not load drinks (' + res.status + ')');
  const rows = await res.json();
  const byId = {};
  rows.forEach(r => byId[r.id] = r);
  return ids.map(id => byId[id]).filter(Boolean);
}
