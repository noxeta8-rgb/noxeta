const fs = require('fs');
fetch('http://localhost:3000/api/products?limit=100')
  .then(res => res.json())
  .then(data => {
     console.log('Products returned:', data.products.length);
  })
  .catch(err => console.error(err));
