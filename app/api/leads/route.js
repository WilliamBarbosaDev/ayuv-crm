import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Função auxiliar para conectar ao SQLite
async function openDb() {
  return open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, name, message } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'O campo "phone" é obrigatório.' },
        { status: 400 }
      );
    }

    const db = await openDb();

    // Busca se já existe um lead com esse telefone
    const existingLead = await db.get('SELECT * FROM leads WHERE phone = ?', phone);
    
    const updated_at = new Date().toISOString();

    if (existingLead) {
      // UPSERT: Atualizar se já existir
      const updatedName = name || existingLead.name;
      const updatedMessage = message || existingLead.last_message;

      await db.run(
        `UPDATE leads 
         SET name = ?, last_message = ?, updated_at = ? 
         WHERE phone = ?`,
        [updatedName, updatedMessage, updated_at, phone]
      );
    } else {
      // UPSERT: Criar se não existir
      const id = uuidv4();
      const status = 'novo_lead';
      const created_at = updated_at;

      await db.run(
        `INSERT INTO leads (id, phone, name, status, last_message, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, phone, name || '', status, message || '', created_at, updated_at]
      );
    }

    // Fecha a conexão após a operação
    await db.close();

    // Retorna o sucesso conforme solicitado
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro na rota /api/leads:', error);
    
    // Tratamento de erro
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
