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
// Check Days with Data

app.get('/daysWithData', (req, res) => {
  db('Swaps')
    .distinct('Date')
    .then(dates => {
      const formattedDates = dates.map(entry => new Date(entry.Date).toLocaleDateString());
      res.status(200).json({ daysWithData: formattedDates });
    })
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});

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
        Date: new Date(entry.Date).toLocaleDateString(),
        Sent: new Date(entry.Sent).toLocaleString() 
      }));
      res.status(200).json({ data: formatedData });
    })
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});

// From DB to QuickViewBox.js

app.get('/allFormData', (req, res) => {
  db('Swaps')
    .select('Date', 'Outbound', 'Inbound', 'Position', 'Email', 'Early', 'Late', 'LTA', 'DO', 'Sent', 'Note')
    .orderBy('Sent', 'desc')
    .then(data => {
      const formatedData = data.map(entry => ({
        ...entry,
        Date: new Date(entry.Date).toLocaleDateString(),
        Sent: new Date(entry.Sent).toLocaleString()
      }));
      res.status(200).json({ data: formatedData });
    })
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});

// Auto-deletion of outdated rows

// app.delete('/deleteOutdatedRows', (req, res) => {
//   const currentDate = new Date();
//   db('Swaps')
//     .where('Date', '<', currentDate)
//     .del()
//     .then(() => res.status(200).json({ message: 'Outdated rows deleted successfully' }))
//     .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
// });

// const runAutoDelete = () => {
//   const currentTime = new Date();
//   const autoDeleteTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() + 1, 0, 0, 0, 0);
//   const timeUntilAutoDelete = autoDeleteTime - currentTime;

//   setTimeout(() => {
//     fetch('http://localhost:3001/deleteOutdatedRows', { method: 'DELETE' })
//     .then(response => {
//       if (!response.ok) {
//         throw new Error('Failed to delete outdated rows')
//       }
//       return response.json()})
//     .then(data => console.log(data))
//     .catch(error => console.error(error));
//     runAutoDelete();
//   }, timeUntilAutoDelete);
// };

// runAutoDelete();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});