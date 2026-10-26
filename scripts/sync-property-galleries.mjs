import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
const properties = [
  { city: 'Clearwater', address: '118 S San Remo Ave' },
  { city: 'Tampa', address: '926 E Poinsettia Ave' },
];
let html = await readFile('listings/index.html', 'utf8');
html = html.replace('<p class="photo-note">Clearwater photos have not been added yet.</p>', '');
if (!html.includes('<!-- CLEARWATER_SECTION_START -->')) {
  html = html.replace('</aside></div></article>', '</aside></div><!-- CLEARWATER_SECTION_START --><!-- CLEARWATER_SECTION_END --></article>');
  html = html.replace(/<section class="gallery-section" aria-label="Tampa property gallery">[\s\S]*?<\/section>/, '<!-- TAMPA_SECTION_START --><!-- TAMPA_SECTION_END -->');
}
for (const { city, address } of properties) {
  const candidates = (await readdir(`assets/${city}`)).filter(name => /\.(jpe?g|png|webp)$/i.test(name));
  const names = (await Promise.all(candidates.map(async name => (await stat(`assets/${city}/${name}`)).isFile() ? name : null))).filter(Boolean).sort();
  const items = names.map((name, i) => {
    const src = `/assets/${city}/` + encodeURIComponent(name);
    return `<a href="${src}" class="gallery-photo" data-photo="${i}" aria-label="Open ${city} property photo ${i + 1} of ${names.length}"><img src="${src}" alt="${address} property photo ${i + 1}" loading="lazy" decoding="async"><span>${String(i + 1).padStart(2, '0')}</span></a>`;
  }).join('');
  const start = `<!-- ${city.toUpperCase()}_SECTION_START -->`, end = `<!-- ${city.toUpperCase()}_SECTION_END -->`;
  if (!html.includes(start) || !html.includes(end)) throw new Error(`${city} gallery markers missing`);
  const section = `<section class="gallery-section" data-city="${city}" aria-label="${city} property gallery"><div class="gallery-title"><h3>A look around the property</h3><span>${names.length} photos &#183; Select to enlarge</span></div><p class="photo-note">Property photos may show furnishings. The room is offered unfurnished.</p><div class="gallery">${items}</div></section>`;
  html = html.slice(0, html.indexOf(start) + start.length) + section + html.slice(html.indexOf(end));
  await writeFile(`listings/${city.toLowerCase()}-gallery.json`, JSON.stringify(names, null, 2) + '\n');
  console.log(`Updated ${city} gallery: ${names.length} photos`);
}
await writeFile('listings/index.html', html);
