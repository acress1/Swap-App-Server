const express = require('express');
const cors = require('cors');
const knex = require('knex');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'test',
    database: 'swap-app',
  },
});

// Routes
// From InlineForm.js to DB

app.post('/formData', (req, res) => {
  const formData = req.body;

  const requiredFields = ['Name', 'Email', 'Date', 'Outbound', 'Inbound'];
  const missingFields = requiredFields.filter(field => !formData[field]);

  if(missingFields.length > 0) {
    return res.status(400).json({error: 'Incomplete form data', missingFields})
  }

  db('Swaps')
    .insert({...formData, Sent: new Date()})
    .returning('*')
    .then(insertedData => res.status(200).json({ message: 'Form received and stored successfully', data: insertedData }))
    .then(data => console.log(data))
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }))
});

// From DB to DayBox.js

app.get('/formData/:date', (req, res) => {
  const date = req.params.date;

  db('Swaps')
    .select()
    .where('Date', date)
    .then(data => {
      const formatedData = data.map(entry => ({
        ...entry,
        Date: new Date(entry.Date).toLocaleDateString(), // Format Date before sending it
        Sent: new Date(entry.Sent).toLocaleString() // Format Sent before sending it
      }));
      res.status(200).json({ data: formatedData });
    })
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});