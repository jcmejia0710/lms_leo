import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ;
const supabaseAnonKey = ;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing auth...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: 'dummy_hash'
  });
  console.log(authError ? "Auth Error: " + authError.message : "Auth OK: " + authData.user.id);

  console.log("Testing perfiles...");
  const { data: perf, error: errPerf } = await supabase.from('perfiles').select('*, roles(nombre)').limit(1);
  console.log(errPerf ? "Perfiles Error: " + errPerf.message + " | Details: " + errPerf.details + " | Hint: " + errPerf.hint : "Perfiles OK");

  console.log("Testing cursos...");
  const { data: cur, error: errCur } = await supabase.from('cursos').select('*, categorias_curso(nombre), perfiles(nombres, apellidos)').limit(1);
  console.log(errCur ? "Cursos Error: " + errCur.message + " | Details: " + errCur.details + " | Hint: " + errCur.hint : "Cursos OK");

  console.log("Testing modulos...");
  const { data: mod, error: errMod } = await supabase.from('modulos').select('*, materiales(*)').limit(1);
  console.log(errMod ? "Modulos Error: " + errMod.message + " | Details: " + errMod.details + " | Hint: " + errMod.hint : "Modulos OK");
}

test();
