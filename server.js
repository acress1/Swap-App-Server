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
  let formDataArray = req.body;

  if (!Array.isArray(formDataArray)) {
    formDataArray = [formDataArray];
  }

  const processShift = (shift) => {
    const requiredFields = ['Email', 'Position', 'Date', 'Outbound', 'Inbound'];
    const missingFields = requiredFields.filter(field => !shift[field]);
  
    if (missingFields.length > 0) {
      return Promise.resolve({ error: 'Incomplete form data', missingFields });
    }
  
    return db('Swaps')
      .insert({ ...shift, Sent: new Date() })
      .then(insertedData => {
        return { message: 'Form received and stored successfully', data: insertedData[0] };
      })
      .catch(error => {
        return { error: 'Internal Server Error' };
      });
  };
  
  const processShifts = () => {
    const promises = formDataArray.map(processShift);
  
    Promise.all(promises)
      .then(results => res.status(200).json(results))
      .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
  };
  
  processShifts();
});

// From DB to DayBox.js

app.get('/formData/:date', (req, res) => {
  const date = req.params.date;

  db('Swaps')
    .distinctOn(['Date', 'Inbound', 'Outbound', 'Email'])
    .select()
    .where('Date', date)
    .orderBy([
      { column: 'Date', order: 'desc' },
      { column: 'Inbound', order: 'desc' },
      { column: 'Outbound', order: 'desc' },
      { column: 'Email', order: 'desc' },
      { column: 'Sent', order: 'desc' }
    ])
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