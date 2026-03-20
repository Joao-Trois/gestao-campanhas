import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { nome, email, password, role } = await req.json()

    // Validação mínima
    if (!email || !password || !nome) {
      throw new Error('Nome, email e senha são obrigatórios')
    }

    // 1. Cria usuário autenticado
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    })

    if (authError) throw authError

    // 2. Atualiza perfil para forçar o papel correspondente (admin ou usuario)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userData.user.id,
        nome: nome,
        email: email,
        role: role || 'usuario',
        ativo: true
      })

    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, message: "Usuário criado com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
