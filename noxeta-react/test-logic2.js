fetch('http://localhost:3000/api/products?limit=100')
  .then(r => r.json())
  .then(data => {
    console.log(data);
  })
  .catch(e => console.log(e));
