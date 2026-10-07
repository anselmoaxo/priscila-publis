import { api, esc, icone, avatar } from '../core.js';

export async function telaPortfolioPublico() {
  const app = document.getElementById('app');
  document.body.classList.add('pagina-publica');
  app.innerHTML = '<div class="carregando" role="status"><span class="spinner" aria-hidden="true"></span>Carregando…</div>';
  let p;
  try { p = await api('portfolio', { semRedirecionar: true }); }
  catch (e) {
    app.innerHTML = `<main class="port-indisponivel"><h1>Portfólio indisponível</h1><p>${esc(e.message)}</p></main>`;
    return;
  }
  document.title = `${p.nome || 'Portfólio'}: portfólio`;
  const zap = p.whatsapp ? p.whatsapp.replace(/\D/g, '').replace(/^55/, '') : '';
  const assunto = encodeURIComponent('Proposta de parceria');

  app.innerHTML = `<main class="port">
    <header class="port-topo">
      <div class="port-foto">${avatar(p, 168)}</div>
      <div class="port-intro">
        ${p.titulo ? `<p class="port-titulo">${esc(p.titulo)}${p.cidade ? `, ${esc(p.cidade)}` : ''}</p>` : ''}
        <h1>${esc(p.nome || '')}</h1>
        ${p.bio ? `<p class="port-bio">${esc(p.bio)}</p>` : ''}
        <div class="port-redes">
          ${p.instagram ? `<a href="https://instagram.com/${encodeURIComponent(p.instagram)}" target="_blank" rel="noopener noreferrer">${icone('instagram', 18)}@${esc(p.instagram)}</a>` : ''}
          ${p.tiktok ? `<a href="https://www.tiktok.com/@${encodeURIComponent(p.tiktok)}" target="_blank" rel="noopener noreferrer">${icone('megafone', 18)}TikTok @${esc(p.tiktok)}</a>` : ''}
        </div>
        ${p.contato_email || zap ? `<div class="port-cta">
          ${p.contato_email ? `<a class="btn primario grande" href="mailto:${esc(p.contato_email)}?subject=${assunto}">${icone('email', 18)}Solicitar parceria</a>` : ''}
          ${zap ? `<a class="btn grande" href="https://wa.me/55${esc(zap)}" target="_blank" rel="noopener noreferrer">${icone('telefone', 18)}WhatsApp</a>` : ''}</div>` : ''}
      </div>
    </header>

    ${p.nichos.length || p.plataformas.length ? `<section class="port-sec port-tags">
      ${p.nichos.length ? `<div><h2>Nichos</h2><ul>${p.nichos.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
      ${p.plataformas.length ? `<div><h2>Onde eu publico</h2><ul>${p.plataformas.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    </section>` : ''}

    ${p.metricas.length ? `<section class="port-sec"><h2>Em números</h2>
      <dl class="port-metricas">${p.metricas.map((m) => `<div><dd>${esc(m.valor)}</dd><dt>${esc(m.rotulo)}</dt></div>`).join('')}</dl></section>` : ''}

    ${p.trabalhos.length ? `<section class="port-sec"><h2>Trabalhos selecionados</h2>
      <ul class="port-trabalhos">${p.trabalhos.map((t) => `<li>${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">` : '<div>'}
        <b>${esc(t.titulo)}</b>${t.marca ? `<span>${esc(t.marca)}</span>` : ''}${t.url ? `${icone('avancar', 18)}</a>` : '</div>'}</li>`).join('')}</ul></section>` : ''}

    ${p.marcas.length ? `<section class="port-sec"><h2>Marcas com quem já trabalhei</h2>
      <ul class="port-marcas">${p.marcas.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></section>` : ''}

    <footer class="port-rodape">${p.contato_email ? `Para parcerias: <a href="mailto:${esc(p.contato_email)}?subject=${assunto}">${esc(p.contato_email)}</a>` : ''}</footer>
  </main>`;
}
