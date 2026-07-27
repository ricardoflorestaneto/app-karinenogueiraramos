const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    if (filePath.includes('supabase.ts')) return; // handled manually
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Update imports
    content = content.replace(/import\s+\{\s*([^}]*)\s*\}\s+from\s+['"](?:\.\/|\.\.\/)lib\/supabase['"]/g, (match, p1) => {
      let imports = p1.split(',').map(s => s.trim());
      imports = imports.map(i => {
        if (i === 'supabase') return 'getSupabase';
        if (i === 'isSupabaseConfigured') return 'getIsSupabaseConfigured';
        return i;
      });
      return match.replace(p1, imports.join(', '));
    });

    // Replace isSupabaseConfigured with getIsSupabaseConfigured()
    content = content.replace(/\bisSupabaseConfigured\b/g, 'getIsSupabaseConfigured()');
    
    // Replace supabase references (but not getSupabase)
    // Careful: supabase.from, supabase.auth, etc.
    content = content.replace(/\bsupabase\b(?!\s*=\s*|\s*:|'|"|`)/g, 'getSupabase()');
    
    // Fix getSupabase()() if any accidental double calls
    content = content.replace(/getSupabase\(\)\(\)/g, 'getSupabase()');
    
    // Fix getting the test connection (has parameter 'supabase') - avoid replacing argument names if they exist.
    // In SettingsView and LoginView, there's no `supabase` parameter. Let's write the file.
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
