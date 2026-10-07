// Formulários rápidos em modal: tarefa/compromisso, marca e material.
import { api, abrirModal, esc, opcoes, TIPOS_TAREFA, TIPOS_MATERIAL, campanhasParaSelect, nomeCampanha, toast, erroBloco, confirmar, limparCache } from './core.js';

async function opcoesCampanhas(atual) {
  let lista = [];
  try { lista = await campanhasParaSelect(); } catch { /* segue sem lista */ }
  return '<option value="">Nenhuma</option>' + lista
    .filter((p) => !['concluido', 'cancelado'].includes(p.status) || String(p.id) === String(atual))
    .map((p) => `<option value="${p.id}"${String(p.id) === String(atual) ? ' selected' : ''}>${esc(nomeCampanha(p))} (${esc(p.marca)})</option>`).join('');
}

function ligarEnvio(m, enviar) {
  const form = m.el.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const msg = form.querySelector('[data-msg]');
    btn.disabled = true; msg.innerHTML = '';
    try { await enviar(new FormData(form)); m.fechar(); }
    catch (err) { msg.innerHTML = erroBloco(err.message); btn.disabled = false; }
  };
}

export async function modalTarefa({ tarefa = null, publi_id = '', prazo = '', tipo = 'outro', aoSalvar } = {}) {
  const t = tarefa || { titulo: '', tipo, prazo, hora: '', prioridade: 'normal', status: 'pendente', publi_id, observacoes: '' };
  const m = abrirModal({
    titulo: tarefa ? 'Editar tarefa' : 'Nova tarefa ou compromisso',
    corpo: `<form novalidate class="form-col">
      <div data-msg></div>
      <div class="campo"><label for="t-tipo">O que é</label>
        <select id="t-tipo" name="tipo">${opcoes(TIPOS_TAREFA, t.tipo)}</select></div>
      <div class="campo"><label for="t-titulo">Título</label>
        <input id="t-titulo" name="titulo" required value="${esc(t.titulo)}" placeholder="Ex.: Gravar vídeo do protetor"></div>
      <div class="grade-2">
        <div class="campo"><label for="t-prazo">Data</label><input id="t-prazo" name="prazo" type="date" value="${esc(t.prazo || '')}"></div>
        <div class="campo"><label for="t-hora">Horário (opcional)</label><input id="t-hora" name="hora" type="time" value="${esc(t.hora || '')}"></div>
      </div>
      <div class="grade-2">
        <div class="campo"><label for="t-prio">Prioridade</label>
          <select id="t-prio" name="prioridade">${opcoes([['baixa', 'Baixa'], ['normal', 'Normal'], ['alta', 'Alta']], t.prioridade)}</select></div>
        <div class="campo"><label for="t-status">Status</label>
          <select id="t-status" name="status">${opcoes([['pendente', 'A fazer'], ['fazendo', 'Fazendo'], ['feita', 'Feita']], t.status)}</select></div>
      </div>
      <div class="campo"><label for="t-camp">Campanha</label><select id="t-camp" name="publi_id">${await opcoesCampanhas(t.publi_id)}</select></div>
      <div class="campo"><label for="t-obs">Observações</label><textarea id="t-obs" name="observacoes" rows="3">${esc(t.observacoes || '')}</textarea></div>
      <div class="acoes-form">
        ${tarefa ? '<button type="button" class="btn perigo" data-excluir>Excluir</button><span class="espaco"></span>' : ''}
        <button type="button" class="btn" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">${tarefa ? 'Salvar tarefa' : 'Adicionar tarefa'}</button>
      </div></form>`,
  });
  const titulo = m.el.querySelector('#t-titulo');
  m.el.querySelector('#t-tipo').onchange = (e) => {
    if (!titulo.value.trim() || titulo.dataset.auto) {
      const label = TIPOS_TAREFA.find((x) => x[0] === e.target.value)?.[1];
      if (label && e.target.value !== 'outro') { titulo.value = label; titulo.dataset.auto = '1'; }
    }
  };
  titulo.oninput = () => { delete titulo.dataset.auto; };
  m.el.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    if (!(await confirmar(`Excluir a tarefa "${t.titulo}"?`, { botao: 'Excluir', perigo: true }))) return;
    await api('tarefas?id=' + tarefa.id, { method: 'DELETE' });
    m.fechar(); toast('Tarefa excluída.'); aoSalvar?.();
  });
  ligarEnvio(m, async (fd) => {
    const body = Object.fromEntries(fd);
    await api(tarefa ? 'tarefas?id=' + tarefa.id : 'tarefas', { method: tarefa ? 'PUT' : 'POST', body });
    toast(tarefa ? 'Tarefa salva.' : 'Tarefa adicionada.');
    aoSalvar?.();
  });
}

export function modalMarca({ marca = null, aoSalvar } = {}) {
  const b = marca || { nome: '', tipo: 'marca', contato_nome: '', email: '', telefone: '', instagram: '', site: '', observacoes: '', mostrar_portfolio: false };
  const m = abrirModal({
    titulo: marca ? 'Editar marca ou contato' : 'Nova marca ou contato',
    corpo: `<form novalidate class="form-col">
      <div data-msg></div>
      <div class="grade-2">
        <div class="campo"><label for="m-nome">Nome da marca ou empresa</label><input id="m-nome" name="nome" required value="${esc(b.nome)}"></div>
        <div class="campo"><label for="m-tipo">Tipo</label><select id="m-tipo" name="tipo">${opcoes([['marca', 'Marca'], ['agencia', 'Agência']], b.tipo)}</select></div>
      </div>
      <div class="campo"><label for="m-contato">Pessoa de contato</label><input id="m-contato" name="contato_nome" value="${esc(b.contato_nome || '')}" autocomplete="off"></div>
      <div class="grade-2">
        <div class="campo"><label for="m-email">E-mail</label><input id="m-email" name="email" type="email" value="${esc(b.email || '')}" autocomplete="off"></div>
        <div class="campo"><label for="m-tel">Telefone ou WhatsApp</label><input id="m-tel" name="telefone" inputmode="tel" value="${esc(b.telefone || '')}" autocomplete="off"></div>
      </div>
      <div class="grade-2">
        <div class="campo"><label for="m-insta">Instagram</label><input id="m-insta" name="instagram" placeholder="@marca" value="${b.instagram ? '@' + esc(b.instagram) : ''}"></div>
        <div class="campo"><label for="m-site">Site</label><input id="m-site" name="site" inputmode="url" placeholder="marca.com.br" value="${esc(b.site || '')}"></div>
      </div>
      <div class="campo"><label for="m-obs">Observações e histórico do relacionamento</label>
        <textarea id="m-obs" name="observacoes" rows="4" placeholder="Como chegou o contato, preferências, combinados…">${esc(b.observacoes || '')}</textarea></div>
      <label class="check"><input type="checkbox" name="mostrar_portfolio" ${b.mostrar_portfolio ? 'checked' : ''}> Mostrar o nome desta marca no meu portfólio público</label>
      <div class="acoes-form"><button type="button" class="btn" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">${marca ? 'Salvar marca' : 'Adicionar marca'}</button></div></form>`,
  });
  ligarEnvio(m, async (fd) => {
    const body = Object.fromEntries(fd);
    body.mostrar_portfolio = fd.has('mostrar_portfolio');
    const r = await api(marca ? 'marcas?id=' + marca.id : 'marcas', { method: marca ? 'PUT' : 'POST', body });
    limparCache();
    toast(marca ? 'Marca salva.' : 'Marca adicionada.');
    aoSalvar?.(r.id);
  });
}

export async function modalMaterial({ material = null, publi_id = '', aoSalvar } = {}) {
  const x = material || { titulo: '', url: '', tipo: 'referencia', publi_id };
  const m = abrirModal({
    titulo: material ? 'Editar material' : 'Novo material',
    corpo: `<form novalidate class="form-col">
      <div data-msg></div>
      <p class="muted" style="margin:0">Guarde o link de onde o arquivo está: Google Drive, Dropbox, Canva, WeTransfer ou similar.</p>
      <div class="campo"><label for="x-titulo">Nome</label><input id="x-titulo" name="titulo" required value="${esc(x.titulo)}" placeholder="Ex.: Roteiro aprovado"></div>
      <div class="campo"><label for="x-url">Link</label><input id="x-url" name="url" inputmode="url" required value="${esc(x.url)}" placeholder="https://"></div>
      <div class="grade-2">
        <div class="campo"><label for="x-tipo">Tipo</label><select id="x-tipo" name="tipo">${opcoes(TIPOS_MATERIAL, x.tipo)}</select></div>
        <div class="campo"><label for="x-camp">Campanha</label><select id="x-camp" name="publi_id">${await opcoesCampanhas(x.publi_id)}</select></div>
      </div>
      <div class="acoes-form"><button type="button" class="btn" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">${material ? 'Salvar material' : 'Adicionar material'}</button></div></form>`,
  });
  ligarEnvio(m, async (fd) => {
    await api(material ? 'materiais?id=' + material.id : 'materiais', { method: material ? 'PUT' : 'POST', body: Object.fromEntries(fd) });
    toast(material ? 'Material salvo.' : 'Material adicionado.');
    aoSalvar?.();
  });
}
