// Roteador (rotas por hash) e carregamento da sessão.
import { api, estado, esc, erroBloco } from './core.js';
import { telaLogin } from './telas/login.js';
import { telaInicio } from './telas/inicio.js';
import { telaCalendario } from './telas/calendario.js';
import { telaCampanhas } from './telas/campanhas.js';
import { telaCampanhaForm } from './telas/campanha-form.js';
import { telaCampanhaDetalhe } from './telas/campanha-detalhe.js';
import { telaTarefas } from './telas/tarefas.js';
import { telaMarcas, telaMarca } from './telas/marcas.js';
import { telaMateriais } from './telas/materiais.js';
import { telaRelatorios, telaReceber } from './telas/relatorios.js';
import { telaPerfil, telaPortfolioConfig, telaSenha } from './telas/configuracoes.js';
import { telaPortfolioPublico } from './telas/portfolio.js';

const ROTAS = [
  [/^\/inicio$/, () => telaInicio()],
  [/^\/calendario$/, (m, q) => telaCalendario(q)],
  [/^\/campanhas$/, () => telaCampanhas()],
  [/^\/campanhas\/nova$/, () => telaCampanhaForm(null)],
  [/^\/campanhas\/(\d+)\/editar$/, (m) => telaCampanhaForm(+m[1])],
  [/^\/campanhas\/(\d+)$/, (m) => telaCampanhaDetalhe(+m[1])],
  [/^\/tarefas$/, () => telaTarefas()],
  [/^\/marcas$/, () => telaMarcas()],
  [/^\/marcas\/(\d+)$/, (m) => telaMarca(+m[1])],
  [/^\/materiais$/, () => telaMateriais()],
  [/^\/relatorios$/, () => telaRelatorios()],
  [/^\/relatorios\/receber$/, () => telaReceber()],
  [/^\/configuracoes$/, () => telaPerfil()],
  [/^\/configuracoes\/portfolio$/, () => telaPortfolioConfig()],
  [/^\/configuracoes\/senha$/, () => telaSenha()],
];
// Endereços antigos continuam funcionando.
const APELIDOS = { '/painel': '/inicio', '/publis': '/campanhas', '/publis/nova': '/campanhas/nova', '/financeiro': '/relatorios/receber', '/conta': '/configuracoes' };

async function rotear() {
  if (location.pathname.replace(/\/$/, '') === '/portfolio') return telaPortfolioPublico();
  let [caminho, busca = ''] = location.hash.replace(/^#/, '').split('?');
  caminho = caminho || '/inicio';
  const antigo = caminho.match(/^\/publis\/(\d+)(\/editar)?$/);
  if (APELIDOS[caminho] || antigo) {
    location.replace('#' + (APELIDOS[caminho] || `/campanhas/${antigo[1]}${antigo[2] || ''}`));
    return;
  }
  if (caminho === '/login') return telaLogin();
  if (!estado.usuario) {
    try {
      const s = await api('auth', { semRedirecionar: true });
      if (!s.logado) { location.hash = '#/login'; return; }
      estado.usuario = s.usuario;
    } catch (e) { document.getElementById('app').innerHTML = `<main class="login-erro">${erroBloco(e.message)}</main>`; return; }
  }
  const params = Object.fromEntries(new URLSearchParams(busca));
  for (const [re, fn] of ROTAS) {
    const m = caminho.match(re);
    if (m) {
      try { await fn(m, params); }
      catch (e) {
        const main = document.getElementById('conteudo');
        if (main) main.innerHTML = erroBloco(e.message) + '<p><a class="btn" href="#/inicio">Voltar para a visão geral</a></p>';
      }
      document.getElementById('conteudo')?.focus({ preventScroll: true });
      return;
    }
  }
  location.replace('#/inicio');
}

window.addEventListener('hashchange', rotear);
rotear();
export { esc };
