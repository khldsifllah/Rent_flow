const https = require('https');

https.get('https://emctgspoeczblgxznszm.supabase.co/auth/v1/health', (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
}).on('error', (e) => {
  console.error(e);
});
