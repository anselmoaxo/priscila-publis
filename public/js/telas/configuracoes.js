import { api, casca, estado, esc, icone, avatar, cabecalho, carregando, erroBloco, toast, PLATAFORMAS } from '../core.js';

function abas(ativa) {
  return `<div class="segmentado abas" role="tablist" aria-label="Configurações">
    <a role="tab" href="#/configuracoes" aria-selected="${ativa === 'perfil'}">Perfil</a>
    <a role="tab" href="#/configuracoes/portfolio" aria-selected="${ativa === 'portfolio'}">Portfólio público</a>
    <a role="tab" href="#/configuracoes/senha" aria-selected="${ativa === 'senha'}">Senha</a></div>`;
}

function redimensionarFoto(arquivo, lado = 400) {
  return new Promise((ok, falha) => {
    if (!arquivo.type.startsWith('image/')) return falha(new Error('Escolha um arquivo de imagem (JPG ou PNG).'));
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const m = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = Math.min(lado, m);
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não deu para abrir essa imagem. Tente um JPG ou PNG.')); };
    img.src = url;
  });
}

export function telaPerfil() {
  const main = casca('configuracoes');
  const u = estado.usuario || {};
  let foto = u.foto || null;
  main.innerHTML = cabecalho({ titulo: 'Configurações' }) + abas('perfil') + `
  <form id="form-perfil" class="bloco form-col largura-form" novalidate>
    <div class="perfil-topo">
      <div id="foto-preview">${avatar({ ...u, foto }, 112)}</div>
      <div class="pilha">
        <div><b class="perfil-nome" id="nome-preview">${esc(u.nome || 'Seu nome')}</b><span class="muted">${esc(u.email)}</span></div>
        <div class="linha-botoes">
          <label class="btn pequeno" for="foto-arquivo">${foto ? 'Trocar foto' : 'Adicionar foto'}</label>
          <input id="foto-arquivo" type="file" accept="image/*" class="sr">
          <button type="button" class="btn pequeno perigo${foto ? '' : ' hidden'}" id="foto-remover">Remover foto</button>
        </div>
        <small class="muted">A foto é cortada em quadrado. Ela também aparece no seu portfólio, se ele estiver publicado.</small>
      </div>
    </div>
    <div id="msg-perfil"></div>
    <div class="grade">
      <div class="campo"><label for="p-nome">Nome</label><input id="p-nome" autocomplete="name" value="${esc(u.nome)}"></div>
      <div class="campo"><label for="p-email">E-mail de acesso</label><input id="p-email" type="email" autocomplete="email" value="${esc(u.email)}"></div>
      <div class="campo"><label for="p-insta">Instagram</label><input id="p-insta" placeholder="@seuperfil" value="${u.instagram ? '@' + esc(u.instagram) : ''}"></div>
      <div class="campo"><label for="p-tiktok">TikTok</label><input id="p-tiktok" placeholder="@seuperfil" value="${u.tiktok ? '@' + esc(u.tiktok) : ''}"></div>
      <div class="campo"><label for="p-whats">WhatsApp</label><input id="p-whats" inputmode="tel" placeholder="(11) 99999-0000" value="${esc(u.whatsapp)}"></div>
    </div>
    <div class="acoes-form"><button type="submit" class="btn primario">Salvar perfil</button></div>
  </form>`;

  const msgP = main.querySelector('#msg-perfil');
  const atualizar = () => {
    main.querySelector('#foto-preview').innerHTML = avatar({ nome: main.querySelector('#p-nome').value || u.email, foto }, 112);
    main.querySelector('#foto-remover').classList.toggle('hidden', !foto);
    main.querySelector('label[for=foto-arquivo]').textContent = foto ? 'Trocar foto' : 'Adicionar foto';
  };
  main.querySelector('#p-nome').oninput = (e) => { main.querySelector('#nome-preview').textContent = e.target.value || 'Seu nome'; if (!foto) atualizar(); };
  main.querySelector('#foto-arquivo').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { foto = await redimensionarFoto(f); atualizar(); msgP.innerHTML = '<div class="ok" role="status">Foto pronta. Toque em "Salvar perfil" para guardar.</div>'; }
    catch (err) { msgP.innerHTML = erroBloco(err.message); }
  };
  main.querySelector('#foto-remover').onclick = () => { foto = null; atualizar(); msgP.innerHTML = ''; };
  main.querySelector('#form-perfil').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const r = await api('auth', { method: 'POST', body: {
        acao: 'perfil', foto,
        nome: main.querySelector('#p-nome').value, email: main.querySelector('#p-email').value,
        instagram: main.querySelector('#p-insta').value, tiktok: main.querySelector('#p-tiktok').value, whatsapp: main.querySelector('#p-whats').value,
      } });
      estado.usuario = r.usuario;
      toast('Perfil salvo.');
      telaPerfil();
    } catch (err) { msgP.innerHTML = erroBloco(err.message); btn.disabled = false; }
  };
}

export async function telaPortfolioConfig() {
  const main = casca('configuracoes');
  main.innerHTML = cabecalho({ titulo: 'Configurações' }) + abas('portfolio') + carregando();
  let d;
  try { d = await api('portfolio?editar=1'); } catch (e) { main.innerHTML = cabecalho({ titulo: 'Configurações' }) + abas('portfolio') + erroBloco(e.message); return; }
  const p = d.portfolio || {};
  const st = { metricas: [...(p.metricas || [])], trabalhos: [...(p.trabalhos || [])] };
  const link = location.origin + '/portfolio';

  main.innerHTML = cabecalho({ titulo: 'Configurações' }) + abas('portfolio') + `
  <form id="form-port" class="form-col largura-form" novalidate>
    <section class="bloco">
      <label class="interruptor"><input type="checkbox" id="publicado" ${d.publicado ? 'checked' : ''}><span class="int-trilho" aria-hidden="true"></span>
        <span><b>Portfólio publicado</b><small>Quando ligado, qualquer pessoa com o link vê a página.</small></span></label>
      <div class="link-publico">
        <code>${esc(link)}</code>
        <button type="button" class="btn pequeno" data-copiar>Copiar link</button>
        <a class="btn pequeno" href="/portfolio" target="_blank" rel="noopener">${icone('olho', 16)}Ver página</a>
      </div>
      <div class="aviso-privado">${icone('olho', 18)}<p>Só aparece o que você preencher abaixo, mais sua foto, nome e redes. <b>Nunca aparecem</b> valores, briefings, notas privadas, contatos das marcas ou dados das campanhas.</p></div>
    </section>

    <section class="bloco">
      <h2>Apresentação</h2>
      <div class="grade">
        <div class="campo"><label for="titulo">Como você se apresenta</label><input id="titulo" value="${esc(p.titulo || '')}" placeholder="Ex.: Criadora de conteúdo UGC" maxlength="120"></div>
        <div class="campo"><label for="cidade">Cidade</label><input id="cidade" value="${esc(p.cidade || '')}" maxlength="80"></div>
      </div>
      <div class="campo"><label for="bio">Sobre você</label><textarea id="bio" rows="4" maxlength="1200" placeholder="Fale do seu jeito de criar e do público que te acompanha.">${esc(d.bio)}</textarea></div>
      <div class="campo"><label for="nichos">Nichos e categorias</label><input id="nichos" value="${esc(d.nichos)}" placeholder="beleza, casa, lifestyle (separe por vírgula)"></div>
      <fieldset class="campo"><legend>Plataformas</legend><div class="checks">${PLATAFORMAS.map((x) => `<label class="check"><input type="checkbox" name="plat" value="${x}" ${(p.plataformas || []).includes(x) ? 'checked' : ''}> ${x}</label>`).join('')}</div></fieldset>
    </section>

    <section class="bloco">
      <div class="bloco-topo"><h2>Métricas</h2><span class="muted">você mesma informa e atualiza</span></div>
      <div id="metricas" class="pilha"></div>
      <button type="button" class="btn tracejado" id="add-met">${icone('novo', 18)}Adicionar métrica</button>
    </section>

    <section class="bloco">
      <div class="bloco-topo"><h2>Trabalhos selecionados</h2><span class="muted">links para posts ou vídeos</span></div>
      <div id="trabalhos" class="pilha"></div>
      <button type="button" class="btn tracejado" id="add-trab">${icone('novo', 18)}Adicionar trabalho</button>
    </section>

    <section class="bloco">
      <h2>Marcas atendidas</h2>
      ${d.marcas.length ? `<div class="checks">${d.marcas.map((m) => `<label class="check"><input type="checkbox" name="marca" value="${m.id}" ${m.mostrar_portfolio ? 'checked' : ''}> ${esc(m.nome)}</label>`).join('')}</div>
        <p class="muted pequeno">Marque só as marcas que autorizaram aparecer.</p>` : '<p class="muted">Suas marcas aparecem aqui depois que você cadastrar campanhas.</p>'}
    </section>

    <section class="bloco">
      <h2>Contato para parcerias</h2>
      <div class="campo"><label for="contato_email">E-mail público</label><input id="contato_email" type="email" value="${esc(p.contato_email || '')}" placeholder="contato@seudominio.com"></div>
      <label class="check"><input type="checkbox" id="mostrar_whatsapp" ${p.mostrar_whatsapp ? 'checked' : ''}> Mostrar meu WhatsApp${estado.usuario?.whatsapp ? ` (${esc(estado.usuario.whatsapp)})` : ' (cadastre no Perfil)'}</label>
      <label class="check"><input type="checkbox" id="mostrar_redes" ${p.mostrar_redes !== false ? 'checked' : ''}> Mostrar links do Instagram e TikTok</label>
    </section>

    <div id="msg"></div>
    <div class="acoes-form fixas"><button type="submit" class="btn primario">Salvar portfólio</button></div>
  </form>`;

  const $ = (s) => main.querySelector(s);
  const rMet = () => {
    $('#metricas').innerHTML = st.metricas.map((m, i) => `<div class="linha-link" data-mi="${i}">
      <div class="campo"><label for="mv-${i}">Número</label><input id="mv-${i}" data-mk="valor" value="${esc(m.valor)}" placeholder="Ex.: 25 mil"></div>
      <div class="campo"><label for="mr-${i}">O que é</label><input id="mr-${i}" data-mk="rotulo" value="${esc(m.rotulo)}" placeholder="Ex.: seguidores no Instagram"></div>
      <button type="button" class="icone-btn remover" data-rm-met="${i}" aria-label="Remover métrica">${icone('lixo', 18)}</button></div>`).join('') || '<p class="muted">Nenhuma métrica. Ex.: seguidores, média de visualizações, taxa de engajamento.</p>';
  };
  const rTrab = () => {
    $('#trabalhos').innerHTML = st.trabalhos.map((t, i) => `<div class="linha-trabalho" data-ti="${i}">
      <div class="campo"><label for="tt-${i}">Título</label><input id="tt-${i}" data-tk="titulo" value="${esc(t.titulo)}" placeholder="Ex.: Review de protetor solar"></div>
      <div class="campo"><label for="tm-${i}">Marca</label><input id="tm-${i}" data-tk="marca" value="${esc(t.marca || '')}"></div>
      <div class="campo"><label for="tu-${i}">Link</label><input id="tu-${i}" data-tk="url" inputmode="url" value="${esc(t.url || '')}" placeholder="https://"></div>
      <button type="button" class="icone-btn remover" data-rm-trab="${i}" aria-label="Remover trabalho">${icone('lixo', 18)}</button></div>`).join('') || '<p class="muted">Nenhum trabalho selecionado ainda.</p>';
  };
  rMet(); rTrab();
  $('#add-met').onclick = () => { st.metricas.push({ valor: '', rotulo: '' }); rMet(); $(`#mv-${st.metricas.length - 1}`).focus(); };
  $('#add-trab').onclick = () => { st.trabalhos.push({ titulo: '', marca: '', url: '' }); rTrab(); $(`#tt-${st.trabalhos.length - 1}`).focus(); };
  $('#metricas').addEventListener('input', (e) => { const k = e.target.dataset.mk, r = e.target.closest('[data-mi]'); if (k && r) st.metricas[+r.dataset.mi][k] = e.target.value; });
  $('#metricas').addEventListener('click', (e) => { const b = e.target.closest('[data-rm-met]'); if (b) { st.metricas.splice(+b.dataset.rmMet, 1); rMet(); } });
  $('#trabalhos').addEventListener('input', (e) => { const k = e.target.dataset.tk, r = e.target.closest('[data-ti]'); if (k && r) st.trabalhos[+r.dataset.ti][k] = e.target.value; });
  $('#trabalhos').addEventListener('click', (e) => { const b = e.target.closest('[data-rm-trab]'); if (b) { st.trabalhos.splice(+b.dataset.rmTrab, 1); rTrab(); } });
  $('[data-copiar]').onclick = async () => {
    try { await navigator.clipboard.writeText(link); toast('Link copiado.'); } catch { toast('Não deu para copiar. Selecione o link e copie.', 'erro'); }
  };
  $('#form-port').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await api('portfolio', { method: 'PUT', body: {
        publicado: $('#publicado').checked, bio: $('#bio').value, nichos: $('#nichos').value,
        marcas: [...main.querySelectorAll('input[name=marca]:checked')].map((c) => c.value),
        portfolio: {
          titulo: $('#titulo').value, cidade: $('#cidade').value,
          plataformas: [...main.querySelectorAll('input[name=plat]:checked')].map((c) => c.value),
          metricas: st.metricas, trabalhos: st.trabalhos,
          contato_email: $('#contato_email').value, mostrar_whatsapp: $('#mostrar_whatsapp').checked, mostrar_redes: $('#mostrar_redes').checked,
        },
      } });
      toast($('#publicado').checked ? 'Portfólio salvo e publicado.' : 'Portfólio salvo. Ele está fora do ar.');
      btn.disabled = false;
    } catch (err) { $('#msg').innerHTML = erroBloco(err.message); btn.disabled = false; }
  };
}

export function telaSenha() {
  const main = casca('configuracoes');
  main.innerHTML = cabecalho({ titulo: 'Configurações' }) + abas('senha') + `
  <form id="form-senha" class="bloco form-col largura-estreita" novalidate>
    <h2>Alterar senha</h2>
    <div id="msg"></div>
    <div class="campo"><label for="atual">Senha atual</label><input id="atual" type="password" autocomplete="current-password"></div>
    <div class="campo"><label for="nova">Nova senha</label><input id="nova" type="password" autocomplete="new-password" placeholder="Pelo menos 8 caracteres"></div>
    <div class="acoes-form"><button type="submit" class="btn primario">Salvar nova senha</button></div>
  </form>`;
  main.querySelector('#form-senha').onsubmit = async (ev) => {
    ev.preventDefault();
    const msg = main.querySelector('#msg');
    try {
      await api('auth', { method: 'POST', body: { acao: 'senha', atual: main.querySelector('#atual').value, nova: main.querySelector('#nova').value } });
      msg.innerHTML = '<div class="ok" role="status">Senha alterada.</div>';
      ev.target.reset();
    } catch (e) { msg.innerHTML = erroBloco(e.message); }
  };
}
