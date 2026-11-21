import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const listings = readFileSync(new URL('../listings/index.html', import.meta.url), 'utf8');

test('single-column hero has a clear room-listings call to action without duplicate photographs', () => {
  const hero = homepage.split('<section class="hero">')[1]?.split('</section>')[0];
  assert.ok(hero, 'homepage hero exists');
  assert.match(hero, /class="hero-content"/);
  assert.match(hero, /Room to live\./);
  assert.match(hero, /Explore our Tampa and Clearwater properties/);
  assert.match(hero, /href="\/listings\/"/, 'hero directs visitors to room listings');
  assert.doesNotMatch(hero, /<img\s|class="hero-visual/, 'no duplicate photos or removed promotional tile in hero');
  const styles = readFileSync(new URL('../src/home.css', import.meta.url), 'utf8');
  assert.match(styles, /\.hero\{grid-template-columns:minmax\(0,1fr\);text-align:center\}/, 'hero layout is centered without empty second column');
  const allImages = [...homepage.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(allImages.length, new Set(allImages).size, 'homepage must not reuse photo assets');
  assert.ok(homepage.includes('/assets/Tampa/IMG_5972.jpg'), 'featured Tampa image remains');
});

test('Clearwater uses kitchen as lead and excludes unverified exterior everywhere', () => {
  assert.doesNotMatch(homepage + listings, /COYV1031\.JPG/);
  const featured = homepage.match(/<section class="featured" id="clearwater-featured"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(featured);
  const featuredImages = [...featured.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(featuredImages, [
    '/assets/Clearwater/Kitchen.jpg',
    '/assets/Clearwater/Room.jpg',
    '/assets/Clearwater/bathroom.jpg',
  ]);
  const gallery = listings.match(/<!-- CLEARWATER_SECTION_START -->([\s\S]*?)<!-- CLEARWATER_SECTION_END -->/)?.[1];
  assert.ok(gallery);
  assert.match(gallery, /3 photos/);
  const galleryImages = [...gallery.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(galleryImages, featuredImages);
  assert.deepEqual([...gallery.matchAll(/data-photo="(\d+)"/g)].map(match => Number(match[1])), [0, 1, 2]);
});

test('build reads curated Clearwater gallery rather than including every asset', () => {
  const manifest = JSON.parse(readFileSync(new URL('../listings/clearwater-gallery.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest, ['Kitchen.jpg', 'Room.jpg', 'bathroom.jpg']);
  const generator = readFileSync(new URL('../scripts/sync-property-galleries.mjs', import.meta.url), 'utf8');
  assert.match(generator, /readFile\(`listings\/\$\{city\.toLowerCase\(\)\}-gallery\.json`/);
  assert.match(generator, /clearwater-gallery/);
});


test('both homes are presented as booked with no live application CTA', () => {
  const tampaHome = homepage.match(/<section class="featured" aria-labelledby="featured-title">([\s\S]*?)<\/section>/)?.[1];
  const clearwaterHome = homepage.match(/<section class="featured" id="clearwater-featured"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  const tampaListing = listings.match(/<article class="listing" id="tampa">([\s\S]*?)<!-- TAMPA_SECTION_START -->/)?.[1];
  const clearwaterListing = listings.match(/<article class="listing" id="clearwater">([\s\S]*?)<!-- CLEARWATER_SECTION_START -->/)?.[1];
  assert.ok(tampaHome && clearwaterHome && tampaListing && clearwaterListing);
  assert.match(homepage, /Both residences are fully booked/);
  assert.match(tampaHome, /Fully booked for the next three months/);
  assert.match(tampaListing, /Booked for the next three months/);
  assert.match(clearwaterHome, /Currently fully booked/);
  assert.match(clearwaterListing, /Currently fully booked/);
  assert.match(clearwaterListing, /Reopening date not announced/);
  assert.doesNotMatch(listings, /ApplyNow\.aspx|Apply for Tampa/);
  assert.doesNotMatch(homepage, /View all property photos &amp; apply/);
  assert.match(listings, /previously advertised rate/);
  assert.match(homepage, /Status updated November 21, 2026/);
});
