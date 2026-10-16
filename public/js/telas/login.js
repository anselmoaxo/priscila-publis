import { api, estado, esc, erroBloco } from '../core.js';

export async function telaLogin() {
  let s;
  try {
    s = await api('auth', { semRedirecionar: true });
    if (s.logado) { estado.usuario = s.usuario; location.hash = '#/inicio'; return; }
  } catch (e) {
    document.getElementById('app').innerHTML = `<main class="login-erro">${erroBloco(e.message)}</main>`;
    return;
  }
  // 'primeiro': first account, no invite. 'convite': new account with invite code. 'login': sign in.
  let modo = s.precisaCadastro ? 'primeiro' : 'login';

  const render = () => {
    const cadastro = modo !== 'login';
    const titulo = modo === 'primeiro' ? 'Crie seu acesso' : modo === 'convite' ? 'Crie sua conta' : 'Que bom te ver';
    const sub = modo === 'primeiro' ? 'É o primeiro acesso. Escolha o e-mail e a senha que você vai usar para entrar.'
      : modo === 'convite' ? 'Use o código de convite que você recebeu e escolha o e-mail e a senha para entrar.'
      : 'Entre para ver suas campanhas e prazos.';
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
          <h1>${titulo}</h1>
          <p class="muted">${sub}</p>
        </div>
        <div id="msg"></div>
        ${modo === 'convite' ? '<div class="campo"><label for="convite">Código de convite</label><input id="convite" autocomplete="off" required></div>' : ''}
        ${cadastro ? '<div class="campo"><label for="nome">Seu nome</label><input id="nome" autocomplete="name" required></div>' : ''}
        <div class="campo"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div>
        <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="${cadastro ? 'new-password' : 'current-password'}" required ${cadastro ? 'placeholder="Pelo menos 8 caracteres"' : ''}></div>
        ${cadastro ? '' : '<label class="check"><input type="checkbox" id="lembrar" checked> Manter conectada neste aparelho</label>'}
        <button class="btn primario grande" type="submit">${cadastro ? 'Criar acesso' : 'Entrar'}</button>
        ${s.cadastroAberto && modo !== 'primeiro' ? `<button type="button" class="btn texto" id="trocar-modo">${modo === 'login' ? 'Tenho um convite: criar conta' : 'Já tenho conta: entrar'}</button>` : ''}
      </form>
    </main>
  </div>`;

    const trocar = document.getElementById('trocar-modo');
    if (trocar) trocar.onclick = () => { modo = modo === 'login' ? 'convite' : 'login'; render(); };

    document.getElementById('form-login').onsubmit = async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type=submit]');
      const msg = document.getElementById('msg');
      const email = document.getElementById('email').value.trim();
      const senha = document.getElementById('senha').value;
      const convite = document.getElementById('convite')?.value.trim();
      if (!email || !senha) { msg.innerHTML = erroBloco('Preencha o e-mail e a senha.'); return; }
      if (modo === 'convite' && !convite) { msg.innerHTML = erroBloco('Informe o código de convite.'); return; }
      btn.disabled = true; msg.innerHTML = '';
      try {
        await api('auth', { method: 'POST', semRedirecionar: true, body: {
          acao: cadastro ? 'cadastro' : 'login', email, senha, convite,
          nome: document.getElementById('nome')?.value, lembrar: document.getElementById('lembrar')?.checked,
        } });
        estado.usuario = null;
        location.hash = '#/inicio';
      } catch (e) {
        msg.innerHTML = erroBloco(e.message);
        btn.disabled = false;
      }
    };
  };
  render();
}

export const nomeSeguro = (u) => esc(u?.nome || '');
