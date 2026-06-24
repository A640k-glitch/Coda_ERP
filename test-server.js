const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('ok'));
app.listen(3101, () => {
  console.log('Server running on 3101');
});
