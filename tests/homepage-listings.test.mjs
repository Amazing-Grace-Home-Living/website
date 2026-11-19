import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const listings = readFileSync(new URL('../listings/index.html', import.meta.url), 'utf8');

test('hero visual is in its own grid column and never repeats property photographs', () => {
  const hero = homepage.match(/<section class="hero">([\\s\\S]*?)<\\/section>/)?.[1];
  assert.ok(hero, 'homepage hero exists');
  assert.match(hero, /<\\/div><\\/div><a class="hero-visual hero-visual-brand"/, 'hero content closes before distinct brand visual');
  assert.match(hero, /Explore Tampa and Clearwater room listings/);
  assert.doesNotMatch(hero, /<img\\b/, 'hero should not repeat a photo already used in a property listing');
  const allImages = [...homepage.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(allImages.length, new Set(allImages).size, 'homepage must not reuse photo assets');
  assert.match(homepage, /\\/assets\\/Tampa\\/IMG_5972\\.jpg/, 'featured Tampa image remains');
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
