const fs = require('fs');

const PRODUCTS = [
  { id: 1, name: 'Cannibal Corpse Skull Tee', category: 'Oversized Tees' }
];

const backendProducts = [
  { _id: '69bc268ebe72659c68e1380c', name: 'CC Front Embroidered Tee', category: 'Oversized Tees', images: [{url: 'https://res.cloudinary.com/dbkdcsvlr/image/upload/v1774016490/noxeta/products/69bc268ebe72659c68e1380c/1774016486950-880876.jpg'}] },
  { _id: '69bc268ebe72659c68e13808', name: 'Golden Deity Pants', category: 'Track Pants', images: [] }
];

const localProducts = PRODUCTS;

const findFallbackMatch = (product) => PRODUCTS.find(item => item.id === product.id) || {};
const findMatch = (list, product) => list.find(item => String(item._mongoId) === String(product._id) || String(item.id) === String(product.id)) || null;

const normalizeProduct = (product, fallback, index) => {
  return { ...fallback, ...product, id: product.id || product._id || `product-${index}` };
};

const normalized = backendProducts.map((product, index) => {
  const localMatch = findMatch(localProducts, product);
  const staticMatch = findFallbackMatch(product);
  return normalizeProduct(product, localMatch || staticMatch, index);
});

const merged = [...normalized];

localProducts.forEach(product => {
  if (!findMatch(merged, product)) {
    merged.push(product);
  }
});

console.log('Merged Length:', merged.length);
console.log('Merged[0]:', merged[0]);

