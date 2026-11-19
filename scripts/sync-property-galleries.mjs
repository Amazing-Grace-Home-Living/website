import { readFile, writeFile, stat } from 'node:fs/promises';

const properties = [
  { city: 'Tampa', address: '926 E Poinsettia Ave' },
  { city: 'Clearwater', address: '118 S San Remo Ave' },
];

let html = await readFile('dist/listings/index.html', 'utf8');
for (const { city, address } of properties) {
  // The curated manifests are the authoritative photo lists and display order.
  // Do not publish every file from an assets folder: unverified property images
  // may be present there and must not silently reappear during a site build.
  const names = JSON.parse(await readFile(`listings/${city.toLowerCase()}-gallery.json`, 'utf8'));
  if (!Array.isArray(names) || names.length === 0 || new Set(names).size !== names.length) {
    throw new Error(`${city} gallery manifest must contain unique photo filenames`);
  }
  for (const name of names) {
    if (typeof name !== 'string' || name.startsWith('.') || name.includes('/') || name.includes(String.fromCharCode(92)) || !['.jpg', '.jpeg', '.png', '.webp'].some(ext => name.toLowerCase().endsWith(ext))) {
      throw new Error(`Invalid ${city} gallery filename: ${name}`);
    }
    if (!(await stat(`assets/${city}/${name}`)).isFile()) {
      throw new Error(`Missing ${city} gallery image: ${name}`);
    }
  }
  const items = names.map((name, i) => {
    const src = `/assets/${city}/` + encodeURIComponent(name);
    return `<a href="${src}" class="gallery-photo" data-photo="${i}" aria-label="Open ${city} property photo ${i + 1} of ${names.length}"><img src="${src}" alt="${address} property photo ${i + 1}" loading="lazy" decoding="async"><span>${String(i + 1).padStart(2, '0')}</span></a>`;
  }).join('');
  const start = `<!-- ${city.toUpperCase()}_SECTION_START -->`, end = `<!-- ${city.toUpperCase()}_SECTION_END -->`;
  if (!html.includes(start) || !html.includes(end)) throw new Error(`${city} gallery markers missing`);
  const id = city === 'Clearwater' ? ' id="clearwater-gallery"' : '';
  const section = `<section class="gallery-section"${id} data-city="${city}" aria-label="${city} property gallery"><div class="gallery-title"><h3>A look around the property</h3><span>${names.length} photos &#183; Select to enlarge</span></div><p class="photo-note">Property photos may show furnishings. The room is offered unfurnished.</p><div class="gallery">${items}</div></section>`;
  html = html.slice(0, html.indexOf(start) + start.length) + section + html.slice(html.indexOf(end));
  await writeFile(`dist/listings/${city.toLowerCase()}-gallery.json`, JSON.stringify(names, null, 2) + String.fromCharCode(10));
  console.log(`Updated ${city} gallery from curated manifest: ${names.length} photos`);
}
await writeFile('dist/listings/index.html', html);
