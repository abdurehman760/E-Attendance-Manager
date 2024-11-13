const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Create database connection
const dbPath = path.resolve(__dirname, 'data', 'staff.db');
const db = new sqlite3.Database(dbPath);

// Create staff table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    age INTEGER,
    specialization TEXT,
    salary REAL,
    contact TEXT,
    doc_fee REAL,
    email TEXT,
    address TEXT,
    staff_category TEXT,
    gender TEXT,
    date_of_entry DATE DEFAULT CURRENT_DATE,
    termination_date DATE DEFAULT NULL,
    termination_reason TEXT DEFAULT NULL,
    terminated BOOLEAN DEFAULT false,
    rest_day TEXT -- New column for the rest day
  )
`);
//  attendance table
db.run(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    day_of_week TEXT,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    leave_reason TEXT,
    UNIQUE(staff_id, date), -- Ensure unique attendance entry per staff for a date
    FOREIGN KEY (staff_id) REFERENCES staff (id)
  )
`);

//  attendance_summary table
db.run(`
  CREATE TABLE IF NOT EXISTS attendance_summary (
    id INTEGER PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    present_count INTEGER DEFAULT 0,
    absent_count INTEGER DEFAULT 0,
    leave_count INTEGER DEFAULT 0,
    rest_day_count INTEGER DEFAULT 0,
    UNIQUE(staff_id, year, month), -- Ensure unique entry per staff for a month
    FOREIGN KEY (staff_id) REFERENCES staff (id)
  )
`);



// Middleware for JSON parsing
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));


// ________________________________________________Define routes________________________________//
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get('/manage_staff', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'manage_staff.html'));
});

// Route for the attendance page
app.get('/attendance', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'attendance.html'));
});
// Route for the attendance analysis page
app.get('/attendance_analysis', (req, res) => {
  // Query the attendance table to fetch existing and new data
  db.all(`
    SELECT staff_id, status, date
    FROM attendance
  `, (err, rows) => {
    if (err) {
      console.error('Error querying attendance table:', err);
      return res.status(500).send('Error querying attendance data');
    }

    // Create an object to store attendance summary data for each month
    const attendanceSummaryData = {};

    // Iterate through the fetched data
    rows.forEach(row => {
      // Parse date to get year and month
      const attendanceDate = new Date(row.date);
      const year = attendanceDate.getFullYear();
      const month = attendanceDate.getMonth() + 1; // Months are 0-indexed, so add 1

      // Create a key for the staff, year, and month combination
      const key = `${row.staff_id}_${year}_${month}`;

      // Initialize the attendance summary data if not already present
      if (!attendanceSummaryData[key]) {
        attendanceSummaryData[key] = {
          staff_id: row.staff_id,
          year,
          month,
          present_count: 0,
          absent_count: 0,
          leave_count: 0,
          rest_day_count: 0
        };
      }

      // Update the corresponding attendance summary data based on the status
      switch (row.status) {
        case 'present':
          attendanceSummaryData[key].present_count++;
          break;
        case 'absent':
          attendanceSummaryData[key].absent_count++;
          break;
        case 'leave':
          attendanceSummaryData[key].leave_count++;
          break;
        case 'rest_day':
          attendanceSummaryData[key].rest_day_count++;
          break;
        default:
          break;
      }
    });

    // Insert or update attendance summary for each month
    Object.values(attendanceSummaryData).forEach(summary => {
      db.run(`
        INSERT INTO attendance_summary (staff_id, year, month, present_count, absent_count, leave_count, rest_day_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(staff_id, year, month)
        DO UPDATE SET
          present_count = ?,
          absent_count = ?,
          leave_count = ?,
          rest_day_count = ?
      `, [
        summary.staff_id,
        summary.year,
        summary.month,
        summary.present_count,
        summary.absent_count,
        summary.leave_count,
        summary.rest_day_count,
        summary.present_count,
        summary.absent_count,
        summary.leave_count,
        summary.rest_day_count
      ], (err) => {
        if (err) {
          console.error('Error updating attendance summary:', err);
        } 
      });
    });

    // Send the attendance analysis HTML file to the client
    res.sendFile(path.join(__dirname, 'public', 'html', 'attendance_analysis.html'));
  });
});

//___________________________________Attendance_section____________________________________//


// Get all staff members with role 'staff' under a different path
app.get('/api/staff/stafflist', (req, res) => {
  const currentDate = new Date();
  db.all('SELECT id, name, rest_day, date_of_entry, termination_date FROM staff WHERE role = "staff"', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const filteredStaffList = rows.filter(staff => {
      const entryDate = new Date(staff.date_of_entry);
      if (staff.terminated) {
        const terminationDate = new Date(staff.termination_date);
        return entryDate <= currentDate && currentDate <= terminationDate;
      }
      return entryDate <= currentDate;
    });
    res.json({ staffList: filteredStaffList });
  });
});

// Route for submitting or updating attendance data
app.post('/api/attendance', (req, res) => {
  const { staffAttendance, existingAttendance, date } = req.body; // Fetch selected date from request body

  let successCount = 0; // Counter to track successful updates/inserts

  staffAttendance.forEach(({ staffId, status, leaveReason }) => {
    // Calculate the day of the week
    const selectedDate = new Date(date);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = daysOfWeek[selectedDate.getDay()];

    // Check if attendance record already exists for the staff member and date
    db.get('SELECT * FROM attendance WHERE staff_id = ? AND date = ?', [staffId, date], (err, row) => {
      if (err) {
        console.error('Error checking existing attendance:', err);
      } else if (row) {
        // If attendance record already exists, update it
        db.run(`
          UPDATE attendance
          SET status = ?, leave_reason = ?, day_of_week = ?
          WHERE staff_id = ? AND date = ?
        `, [status, status === 'leave' ? leaveReason : null, dayOfWeek, staffId, date], function(err) {
          if (err) {
            console.error('Error updating attendance:', err);
          } else {
            console.log(`Attendance updated for staff ID ${staffId}`);
            successCount++;
            if (successCount === staffAttendance.length) {
              res.sendStatus(200);
            }
          }
        });
      } else {
        // If attendance record does not exist, insert it
        db.run(`
          INSERT INTO attendance (staff_id, date, status, leave_reason, day_of_week)
          VALUES (?, ?, ?, ?, ?)
        `, [staffId, date, status, status === 'leave' ? leaveReason : null, dayOfWeek], function(err) {
          if (err) {
            console.error('Error inserting attendance:', err);
          } else {
            console.log(`Attendance inserted for staff ID ${staffId}`);
            successCount++;
            if (successCount === staffAttendance.length) {
              res.sendStatus(200);
            }
          }
        });
      }
    });
  });
});

// Route for checking attendance for a specific date
// Route for checking attendance for a specific date
app.get('/api/attendance/check', (req, res) => {
  const { date } = req.query;

  // Query the database to check if attendance exists for the specified date
  db.all('SELECT * FROM attendance WHERE date = ?', [date], (err, rows) => {
    if (err) {
      console.error('Error checking existing attendance:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      // Send the list of attendance records for the date as JSON response
      res.json({ attendance: rows });
    }
  });
});

app.delete('/api/attendance/reset', (req, res) => {
  const { date } = req.query;

  // Delete attendance records for the selected date
  db.run('DELETE FROM attendance WHERE date = ?', [date], (err) => {
      if (err) {
          console.error('Error resetting attendance:', err);
          res.status(500).json({ error: 'Internal Server Error' });
      } else {
          res.sendStatus(200);
      }
  });
});

app.get('/api/attendance/lastdate', (req, res) => {
  db.get('SELECT MAX(date) AS lastAttendanceDate FROM attendance', (err, row) => {
    if (err) {
      console.error('Error retrieving last attendance date:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json({ lastAttendanceDate: row.lastAttendanceDate });
    }
  });
});

// Define route to fetch missed attendance dates
app.get('/missed-attendance', (req, res) => {
  // Query to find missed attendance dates for the current month until the previous day
  const query = `
      WITH DatesList AS (
          SELECT DATE(CURRENT_DATE, 'start of month') AS date
          UNION ALL
          SELECT DATE(date, '+1 day')
          FROM DatesList
          WHERE DATE(date, '+1 day') < DATE(CURRENT_DATE, 'start of day')
      )
      SELECT DatesList.date
      FROM DatesList
      LEFT JOIN attendance ON DatesList.date = DATE(attendance.date)
      WHERE strftime('%Y-%m', DatesList.date) = strftime('%Y-%m', CURRENT_DATE)
        AND attendance.date IS NULL
      ORDER BY DatesList.date
  `;
  
  db.all(query, [], (err, rows) => {
      if (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
          return;
      }

      if (rows.length > 0) {
          // If there are missed attendance dates, send the dates in the response
          const missedDates = rows.map(row => row.date);
          res.send(`Missed attendance dates for the current month: ${missedDates.join(', ')}`);
      } else {
          // If there are no missed attendance dates, send a different message
          res.send('No missed attendance dates for the current month.');
      }
  });
});


// New route to fetch staff list
app.get('/api/staff/newstafflist', (req, res) => {
  const currentDate = new Date();
  db.all('SELECT id, name, rest_day, date_of_entry, termination_date FROM staff WHERE role = "staff"', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const filteredStaffList = rows.filter(staff => {
      // Check if the staff member is not terminated
      if (!staff.terminated || staff.termination_date === null) {
        const entryDate = new Date(staff.date_of_entry);
        return entryDate <= currentDate;
      } else {
        // If terminated, check if the current date is before the termination date
        const terminationDate = new Date(staff.termination_date);
        return terminationDate > currentDate;
      }
    });
    res.json({ staffList: filteredStaffList });
  });
});

// Define a route to fetch staff details by ID
app.get('/api/staffinfo/:id', (req, res) => {
  // Extract the staff ID from the request parameters
  const staffId = req.params.id;

  // Construct the SQL query to fetch staff details by ID
  const sql = `SELECT * FROM staff WHERE id = ?`;

  // Execute the query with the staff ID as a parameter
  db.get(sql, [staffId], (err, row) => {
      if (err) {
          console.error('Error fetching staff details:', err);
          // Send an error response to the client
          res.status(500).send('Internal Server Error');
          return;
      }

      if (!row) {
          console.log('No staff found with ID:', staffId);
          // Send a 404 Not Found response to the client
          res.status(404).send('Staff not found');
          return;
      }

      // Send the staff details as a JSON response
      res.json(row);
  });
});

//__________________________ Route to fetch attendance analysis data
app.get('/api/attendance-analysis', (req, res) => {
  // Query the attendance_summary table to fetch required data
  db.all(`
      SELECT
          staff.id AS staff_id,
          staff.name AS staff_name,
          attendance_summary.present_count,
          attendance_summary.absent_count,
          attendance_summary.leave_count,
          attendance_summary.rest_day_count,
          attendance_summary.month AS month,
          attendance_summary.year AS year
      FROM attendance_summary
      JOIN staff ON attendance_summary.staff_id = staff.id
  `, (err, rows) => {
      if (err) {
          console.error('Error fetching attendance analysis data:', err);
          res.status(500).json({ error: 'Error fetching attendance analysis data' });
          return;
      }

      // Calculate present percentage for each staff member for each month
      const dataWithPercentage = rows.map(row => {
          const totalDays = row.present_count + row.absent_count + row.leave_count + row.rest_day_count;
          const presentPercentage = (row.present_count / totalDays) * 100;
          return { ...row, presentPercentage };
      });

      // Send the data to the client
      res.json(dataWithPercentage);
  });
});


//___________________________________________

app.get('/api/monthly-attendance/:staffId/:year/:month', (req, res) => {
  const { staffId, year, month } = req.params;
  db.get(`
      SELECT
          staff.name AS staff_name,
          attendance_summary.present_count,
          attendance_summary.absent_count,
          attendance_summary.leave_count,
          attendance_summary.rest_day_count
      FROM attendance_summary
      JOIN staff ON attendance_summary.staff_id = staff.id
      WHERE staff.id = ? AND attendance_summary.year = ? AND attendance_summary.month = ?
  `, [staffId, year, month], (err, row) => {
      if (err) {
          console.error('Error fetching monthly attendance data:', err);
          res.status(500).json({ error: 'Error fetching monthly attendance data' });
          return;
      }

      if (!row) {
          res.status(404).json({ error: 'No data found for the specified staff member, year, and month' });
          return;
      }

      const { staff_name, present_count, absent_count, leave_count, rest_day_count } = row;
      const totalDays = present_count + absent_count + leave_count + rest_day_count;
      const presentPercentage = (present_count / totalDays) * 100;
      const absentPercentage = (absent_count / totalDays) * 100;
      const leavePercentage = (leave_count / totalDays) * 100;
      const restDayPercentage = (rest_day_count / totalDays) * 100;

      res.json({ staff_name, presentPercentage, absentPercentage, leavePercentage, restDayPercentage });
  });
});


//______________________________Route to fetch attendance analysis data for a specific year

app.get('/api/attendance-analysis/:year', (req, res) => {
  // Extract the year from the request parameters
  const year = req.params.year;

  // Query the attendance_summary table to fetch data aggregated for the specified year
  db.all(`
    SELECT
      staff.id AS staff_id,
      staff.name AS staff_name,
      SUM(attendance_summary.present_count) AS total_present_count,
      SUM(attendance_summary.absent_count) AS total_absent_count,
      SUM(attendance_summary.leave_count) AS total_leave_count,
      SUM(attendance_summary.rest_day_count) AS total_rest_day_count
    FROM attendance_summary
    JOIN staff ON attendance_summary.staff_id = staff.id
    WHERE attendance_summary.year = ?
    GROUP BY staff_id, staff_name
  `, [year], (err, rows) => {
    if (err) {
      console.error('Error fetching attendance analysis data:', err);
      res.status(500).json({ error: 'Error fetching attendance analysis data' });
      return;
    }

    // Calculate present percentage for each staff member for the entire year
    const dataWithPercentage = rows.map(row => {
      const totalDays = row.total_present_count + row.total_absent_count + row.total_leave_count + row.total_rest_day_count;
      const presentPercentage = (row.total_present_count / totalDays) * 100;
      return { ...row, presentPercentage };
    });

    // Send the data to the client
    res.json(dataWithPercentage);
  });
});
  

// Route to fetch yearly attendance summary data for a specific staff member
app.get('/api/yearly-attendance-summary/:staffId/:year', (req, res) => {
  // Extract the staff ID and year from the request parameters
  const { staffId, year } = req.params;

  // Query the attendance_summary table to fetch data aggregated for the specified staff and year
  db.get(`
    SELECT
      staff.id AS staff_id,
      staff.name AS staff_name,
      attendance_summary.year AS year,
      SUM(attendance_summary.present_count) AS total_present_count,
      SUM(attendance_summary.absent_count) AS total_absent_count,
      SUM(attendance_summary.leave_count) AS total_leave_count,
      SUM(attendance_summary.rest_day_count) AS total_rest_day_count
    FROM attendance_summary
    JOIN staff ON attendance_summary.staff_id = staff.id
    WHERE attendance_summary.staff_id = ? AND attendance_summary.year = ?
    GROUP BY staff_id, staff_name, year
  `, [staffId, year], (err, row) => {
    if (err) {
      console.error('Error fetching yearly attendance summary data:', err);
      res.status(500).json({ error: 'Error fetching yearly attendance summary data' });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'Yearly attendance summary not found for the specified staff and year' });
      return;
    }

    // Send the data to the client
    res.json(row);
  });
});


// an Express route to handle fetching monthly attendance data for a staff member
app.get('/api/monthly-staff-attendance/:staffId/:year/:month', (req, res) => {
  const { staffId, year, month } = req.params;
  const startDate = new Date(year, month - 1, 1); // Month is 0-indexed, so subtract 1
  const endDate = new Date(year, month, 0); // Get the last day of the month

  // Query the database to fetch attendance data for the specified staff member and month
  db.all(`
      SELECT * FROM attendance
      WHERE staff_id = ? AND date BETWEEN ? AND ?
  `, [staffId, startDate.toISOString(), endDate.toISOString()], (err, rows) => {
      if (err) {
          console.error('Error fetching monthly attendance data:', err);
          res.status(500).json({ error: 'Error fetching monthly attendance data' });
      } else {
          res.json(rows);
      }
  });
});

//___________________________________manage_staff_section____________________________________//
// Get all staff members
app.get('/api/staff', (req, res) => {
  db.all('SELECT * FROM staff', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const staffList = rows.filter(row => row.role === 'staff');
    const doctorList = rows.filter(row => row.role === 'doctor');
    res.json({ staffList, doctorList });
  });
});



// Add a new staff member
app.post('/api/staff', (req, res) => {
  const { name, role, age, specialization, salary, contact, doc_fee, email, address, staffRole, gender, rest_day } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }

  let insertQuery = '';
  let params = [];

  if (role === 'staff' || role === 'nurse' || role === 'receptionist' || role === 'lab_technician' || role === 'others') {
    insertQuery = `
      INSERT INTO staff (name, role, age, specialization, salary, contact, doc_fee, email, address, staff_category, gender, rest_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    params = [name, role, age, specialization, salary, contact, doc_fee, email, address, staffRole, gender, rest_day];
  } else if (role === 'doctor') {
    insertQuery = `
      INSERT INTO staff (name, role, age, specialization, doc_fee, contact, email, address, staff_category, gender, rest_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    params = [name, role, age, specialization, doc_fee, contact, email, address, '', gender, rest_day]; // Empty for doctor
  } else {
    // Handle other roles here
    return res.status(400).json({ error: 'Invalid role' });
  }

  db.run(insertQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      id: this.lastID,
      name: name,
      role: role,
      age: age,
      specialization: specialization,
      salary: salary,
      contact: contact,
      doc_fee: doc_fee,
      email: email,
      address: address,
      staff_category: staffRole,
      gender: gender,
      rest_day: rest_day,
      date_of_entry: this.lastID, // Assuming lastID is the entry timestamp
    });
  });
});

// Update a staff member
app.put('/api/staff/:id', (req, res) => {
  const { name, role, age, specialization, salary, contact, doc_fee, email, address, staffRole, gender, rest_day } = req.body;
  const id = req.params.id;

  let updateQuery = '';
  let params = [];

  if (role === 'staff' || role === 'nurse' || role === 'receptionist' || role === 'lab_technician' || role === 'others') {
    updateQuery = `
      UPDATE staff
      SET name = ?, role = ?, age = ?, specialization = ?, salary = ?, contact = ?, doc_fee = ?, email = ?, address = ?, staff_category = ?, gender = ?, rest_day = ?
      WHERE id = ?
    `;
    params = [name, role, age, specialization, salary, contact, doc_fee, email, address, staffRole, gender, rest_day, id];
  } else if (role === 'doctor') {
    updateQuery = `
      UPDATE staff
      SET name = ?, role = ?, age = ?, specialization = ?, doc_fee = ?, contact = ?, email = ?, address = ?, staff_category = ?, gender = ?, rest_day = ?
      WHERE id = ?
    `;
    params = [name, role, age, specialization, doc_fee, contact, email, address, '', gender, rest_day, id]; // Empty for doctor
  } else {
    // Handle other roles here
    return res.status(400).json({ error: 'Invalid role' });
  }

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      id: id,
      name: name,
      role: role,
      age: age,
      specialization: specialization,
      salary: salary,
      contact: contact,
      doc_fee: doc_fee,
      email: email,
      address: address,
      staff_category: staffRole,
      gender: gender,
      rest_day: rest_day,
      date_of_entry: this.lastID, // Assuming lastID is the entry timestamp
    });
  });
});

// Delete a staff member and related attendance records
app.delete('/api/staff/:id', (req, res) => {
  const id = req.params.id;

  db.run('DELETE FROM staff WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Once staff member is deleted, delete their related attendance records
    db.run('DELETE FROM attendance WHERE staff_id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Send response indicating successful deletion
      res.json({ message: 'Staff member and related attendance records deleted', changes: this.changes });
    });
  });
});


// Terminate a staff member
app.post('/api/staff/:id/terminate', (req, res) => {
  const { terminationReason } = req.body;
  const id = req.params.id;

  const updateQuery = `
    UPDATE staff
    SET termination_date = CURRENT_DATE,
        termination_reason = ?,
        terminated = 1 -- Set to true
    WHERE id = ?
  `;

  db.run(updateQuery, [terminationReason, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Staff member terminated', changes: this.changes });
  });
});

// Rehire a staff member
app.post('/api/staff/:id/rehire', (req, res) => {
  const id = req.params.id;

  const updateQuery = `
    UPDATE staff
    SET terminated = 0,
    termination_date = NULL,
    termination_reason = NULL
    WHERE id = ?
  `;

  db.run(updateQuery, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Staff member rehired', changes: this.changes });
  });
});

// Fetch a single staff member by ID
app.get('/api/staff/:id', (req, res) => {
  const staffId = req.params.id;

  db.get('SELECT * FROM staff WHERE id = ?', [staffId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    res.json(row);
  });
});

//__________________________________________ Start the server_______________________________//
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
