import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logando...");
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'ti@ipeclube.com.br',
    password: '*Tec@1010'
  });
  
  if (authError) {
    // Tenta com tecti@ipeclube.com.br
    await supabase.auth.signInWithPassword({
      email: 'tecti@ipeclube.com.br',
      password: '*Tec@1010'
    });
  }

  console.log("Inserindo template (como o frontend faria)...");
  const payload = {
    nome: 'Teste de Erro',
    descricao: null,
    texto: 'Test',
    variaveis: []
  };
  console.log("Payload:", payload);

  const { data, error } = await supabase.from('templates').insert([payload]);
  
  if (error) {
    console.error("ERRO SUPABASE DETECTADO:", error);
  } else {
    console.log("Inserido com sucesso:", data);
  }
}
run();
