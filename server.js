const express = require('express');
const cors = require('cors');
const knex = require('knex');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

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
  
  const processMultiShift = () => {
    const promises = formDataArray.map(processShift);
  
    Promise.all(promises)
      .then(results => res.status(200).json(results))
      .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
  };
  
  processMultiShift();
});

// From DB to Front

app.get('/dbData', (req, res) => {
  const currentDate = new Date();

  db('Swaps')
    .select('Date', 'Outbound', 'Inbound', 'Position', 'Email', 'Early', 'Late', 'LTA', 'DO', 'Sent', 'Note')
    .distinctOn(['Date', 'Inbound', 'Outbound', 'Email'])
    .where('Date', '>', currentDate)
    .orderBy( [{ column: 'Date', order: 'asc' }] )
    .then(data => {
      const formatedData = 
      data.map(entry => (
        {...entry,
          Date: new Date(entry.Date).toLocaleDateString('fr-FR'),
          Sent: new Date(entry.Sent).toLocaleString('fr-FR', { hour12: false})
        }
      ));
      res.status(200).json({ data: formatedData });
    })
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});