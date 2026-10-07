import { api, estado, esc, erroBloco } from '../core.js';

export async function telaLogin() {
  let precisaCadastro = false;
  try {
    const s = await api('auth', { semRedirecionar: true });
    if (s.logado) { estado.usuario = s.usuario; location.hash = '#/inicio'; return; }
    precisaCadastro = s.precisaCadastro;
  } catch (e) {
    document.getElementById('app').innerHTML = `<main class="login-erro">${erroBloco(e.message)}</main>`;
    return;
  }
  document.getElementById('app').innerHTML = `
  <div class="login">
    <section class="login-arte" aria-hidden="true">
      <div class="login-cartaz">
        <div class="trilha" style="--n:6"><span class="cheio"></span><span class="cheio"></span><span class="cheio"></span><span class="atual"></span><span></span><span></span></div>
        <p class="login-frase">Briefing, gravação, aprovação, publicação. Cada campanha no seu ritmo, sem perder nenhum prazo.</p>
      </div>
    </section>
    <main class="login-form-lado">
      <form class="login-card" id="form-login" novalidate>
        <div>
          <p class="login-marca">agenda de publis</p>
          <h1>${precisaCadastro ? 'Crie seu acesso' : 'Que bom te ver'}</h1>
          <p class="muted">${precisaCadastro ? 'É o primeiro acesso. Escolha o e-mail e a senha que você vai usar para entrar.' : 'Entre para ver suas campanhas e prazos.'}</p>
        </div>
        <div id="msg"></div>
        ${precisaCadastro ? '<div class="campo"><label for="nome">Seu nome</label><input id="nome" autocomplete="name" required></div>' : ''}
        <div class="campo"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div>
        <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="${precisaCadastro ? 'new-password' : 'current-password'}" required ${precisaCadastro ? 'placeholder="Pelo menos 8 caracteres"' : ''}></div>
        ${precisaCadastro ? '' : '<label class="check"><input type="checkbox" id="lembrar" checked> Manter conectada neste aparelho</label>'}
        <button class="btn primario grande" type="submit">${precisaCadastro ? 'Criar acesso' : 'Entrar'}</button>
      </form>
    </main>
  </div>`;

  document.getElementById('form-login').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type=submit]');
    const msg = document.getElementById('msg');
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    if (!email || !senha) { msg.innerHTML = erroBloco('Preencha o e-mail e a senha.'); return; }
    btn.disabled = true; msg.innerHTML = '';
    try {
      await api('auth', { method: 'POST', semRedirecionar: true, body: {
        acao: precisaCadastro ? 'cadastro' : 'login', email, senha,
        nome: document.getElementById('nome')?.value, lembrar: document.getElementById('lembrar')?.checked,
      } });
      estado.usuario = null;
      location.hash = '#/inicio';
    } catch (e) {
      msg.innerHTML = erroBloco(e.message);
      btn.disabled = false;
    }
  };
}

export const nomeSeguro = (u) => esc(u?.nome || '');
