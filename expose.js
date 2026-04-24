import localtunnel from 'localtunnel';

(async () => {
  const tunnel = await localtunnel({ port: 3001, subdomain: 'ayuv-crm-api' });

  console.log('✅ URL Pública gerada com sucesso:');
  console.log(tunnel.url);
  console.log('\nEndpoints disponíveis:');
  console.log(`GET  ${tunnel.url}/api/leads`);
  console.log(`POST ${tunnel.url}/api/leads`);
  console.log(`PUT  ${tunnel.url}/api/leads/:id`);
  
  console.log('\n⚠️ IMPORTANTE para o n8n:');
  console.log('Adicione o seguinte Header na sua requisição HTTP do n8n para ignorar o aviso de segurança do localtunnel:');
  console.log('Header Name: Bypass-Tunnel-Reminder');
  console.log('Header Value: true');

  tunnel.on('close', () => {
    console.log('Tunnel closed');
  });
})();
