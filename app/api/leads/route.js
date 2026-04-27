import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Verifica se as variáveis de ambiente estão definidas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Inicializa o cliente do Supabase fora do handler para reaproveitar a instância
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(request) {
  try {
    // Verifica se o Supabase foi configurado corretamente
    if (!supabase) {
      console.error('Erro de configuração: Variáveis do Supabase ausentes.');
      return NextResponse.json(
        { success: false, error: 'Configuração do servidor incompleta.' },
        { status: 500 }
      );
    }

    // 3. Recebe o JSON da requisição
    const body = await request.json();
    const { phone, name, message } = body;

    // Log para debug
    console.log('[API Leads] Dados recebidos do n8n:', body);

    // Validação simples dos dados recebidos
    if (!phone) {
      console.log('[API Leads] Erro: Telefone não fornecido.');
      return NextResponse.json(
        { success: false, error: 'O campo "phone" é obrigatório.' },
        { status: 400 }
      );
    }

    // 5. Prepara os dados para inserção/atualização
    const leadData = {
      phone: phone,
      name: name || '',
      last_message: message || '',
      status: 'novo_lead',
      // Adiciona updated_at para manter o registro atualizado caso já exista
      updated_at: new Date().toISOString()
    };

    // Extra: Se o lead já existir pelo telefone, atualizar ao invés de criar
    // O uso de upsert com onConflict='phone' resolve isso (exige que a coluna phone seja UNIQUE na tabela leads)
    const { data, error } = await supabase
      .from('leads')
      .upsert(leadData, { onConflict: 'phone' })
      .select();

    if (error) {
      console.error('[API Leads] Erro ao inserir/atualizar no Supabase:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 } // 7. Tratar erros e retornar status 500
      );
    }

    console.log('[API Leads] Lead salvo com sucesso:', data);

    // 6. Retorna a resposta conforme esperado
    return NextResponse.json(
      { success: true, data: data },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API Leads] Erro interno na API:', error);
    // 7. Retorna 500 em caso de erro na execução do código
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
