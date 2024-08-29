// Function to toggle leave reason dropdown based on radio button selection
function toggleLeaveReason(staffId) {
  const leaveRadio = document.querySelector(`input[name="attendance-${staffId}"][value="leave"]`);
  const leaveReasonSelect = document.querySelector(`select[name="leave-reason-${staffId}"]`);

  const attendanceRadios = document.querySelectorAll(`input[name="attendance-${staffId}"]:not([value="leave"])`);

  // Event listener for leave radio button
  leaveRadio.addEventListener('change', () => {
    if (leaveRadio.checked) {
      leaveReasonSelect.style.display = 'inline-block';
    } else {
      leaveReasonSelect.style.display = 'none';
    }
  });

  // Event listeners for other attendance options
  attendanceRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      leaveReasonSelect.style.display = 'none';
    });
  });

  // Initially hide the leave reason dropdown
  leaveReasonSelect.style.display = 'none';
}

function fetchStaffList() {
  const selectedDate = document.getElementById('date').value;
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; // Define daysOfWeek array

  // Fetch attendance data for the selected date
  fetch(`/api/attendance/check?date=${selectedDate}`)
    .then(response => response.json())
    .then(data => {
      const attendanceData = data.attendance;

      // Update the day of the week display
      const selectedDayOfWeek = new Date(selectedDate).getDay();
      document.getElementById('day-of-week').textContent = `(${daysOfWeek[selectedDayOfWeek]})`;

      // Display attendance status label
      const attendanceStatusLabel = document.getElementById('attendance-status');
      const resetAttendanceButton = document.getElementById('reset-attendance-button');

      if (attendanceData && attendanceData.length > 0) {
        attendanceStatusLabel.textContent = "Attendance taken for Today";
        attendanceStatusLabel.classList.remove('not-taken');
        attendanceStatusLabel.classList.add('taken');
        resetAttendanceButton.style.display = 'inline-block'; // Show reset attendance button
      } else {
        attendanceStatusLabel.textContent = "Attendance Pending for Today";
        attendanceStatusLabel.classList.remove('taken');
        attendanceStatusLabel.classList.add('not-taken');
        resetAttendanceButton.style.display = 'none'; // Hide reset attendance button
      }

      // Fetch staff list with entry and termination dates
      fetch('/api/staff/stafflist')
        .then(response => response.json())
        .then(data => {
          const staffList = data.staffList;
          const staffTable = document.getElementById('staff-list');

          // Clear previous content
          staffTable.innerHTML = '';

          // Check if there are active staff members
          const hasActiveStaff = staffList.some(staff => {
            const entryDate = new Date(staff.date_of_entry);
            const terminationDate = staff.termination_date ? new Date(staff.termination_date) : null;
            const currentDate = new Date(selectedDate);
            return (!terminationDate || currentDate < terminationDate) && currentDate >= entryDate;
          });

          if (hasActiveStaff) {
            // Populate staff table
            staffList.forEach(staff => {
              const entryDate = new Date(staff.date_of_entry);
              const terminationDate = staff.termination_date ? new Date(staff.termination_date) : null;
              const currentDate = new Date(selectedDate);
              if ((!terminationDate || currentDate < terminationDate) && currentDate >= entryDate) {
                  const row = document.createElement('tr');
                  row.innerHTML = `
                      <td class="staff-id">${staff.id}</td>
                      <td class="staff-name">${staff.name}
                      <button class="view-button" onclick="viewStaffInfo(${staff.id})">
                      <img src="img/info.png" alt="Info Icon"> <!-- Adjust the path as needed -->
                    </button>                    
</td>
                      <td class="attendance-options">
                          
                          <div class="radio-option">
                              <input type="radio" id="present-${staff.id}" name="attendance-${staff.id}" value="present" class="attendance-radio">
                              <label for="present-${staff.id}">Present</label>
                          </div>
                          <div class="radio-option">
                              <input type="radio" id="absent-${staff.id}" name="attendance-${staff.id}" value="absent" class="attendance-radio">
                              <label for="absent-${staff.id}">Absent</label>
                          </div>
                          <div class="radio-option">
                              <input type="radio" id="rest_day-${staff.id}" name="attendance-${staff.id}" value="rest_day" class="attendance-radio">
                              <label for="rest_day-${staff.id}">Rest Day</label>
                          </div>
                          <div class="radio-option">
                              <input type="radio" id="leave-${staff.id}" name="attendance-${staff.id}" value="leave" class="attendance-radio">
                              <label for="leave-${staff.id}">Leave</label>
                              <select name="leave-reason-${staff.id}" class="leave-reason" style="display: none;">
                                  <option value="sick">Sick</option>
                                  <option value="personal">Personal</option>
                                  <option value="vacation">Vacation</option>
                                  <option value="family_emergency">Family Emergency</option>
                                  <option value="other">Other</option>
                              </select>
                          </div>
                      </td>
                  `;
                  staffTable.appendChild(row);
          
                  // Call toggleLeaveReason to set up event listeners
                  toggleLeaveReason(staff.id);
          
                  // Populate attendance data
                  if (attendanceData) {
                      const staffAttendance = attendanceData.find(item => item.staff_id === staff.id);
                      if (staffAttendance) {
                          const radio = document.getElementById(`${staffAttendance.status}-${staff.id}`);
                          radio.checked = true;
                          if (staffAttendance.status === 'leave') {
                              const leaveReasonSelect = document.querySelector(`select[name="leave-reason-${staff.id}"]`);
                              leaveReasonSelect.style.display = 'inline-block';
                              leaveReasonSelect.value = staffAttendance.leave_reason;
                          }
                      } else {
                          // If attendance data not available for the current day, check for rest day
                          const currentDayOfWeek = currentDate.getDay();
                          const restDay = staff.rest_day;
          
                          if (restDay && currentDayOfWeek === daysOfWeek.indexOf(restDay)) {
                              const restDayRadio = document.getElementById(`rest_day-${staff.id}`);
                              restDayRadio.checked = true;
                          } else {
                              const presentRadio = document.getElementById(`present-${staff.id}`);
                              presentRadio.checked = true;
                          }
                      }
                  } else {
                      // If no attendance data available, populate with present option by default
                      const presentRadio = document.getElementById(`present-${staff.id}`);
                      presentRadio.checked = true;
                  }
              }
          });
          

            // Show submit button if there are active staff members
            const submitButton = document.querySelector('.submit-button');
            submitButton.style.display = 'block';
          } else {
            // Show message if no active staff members
            const messageRow = document.createElement('tr');
            messageRow.innerHTML = `
              <td colspan="3" id="no-staff-message">No active staff available.</td>
            `;
            staffTable.appendChild(messageRow);
          }
        })
        .catch(error => console.error('Error fetching staff list:', error));
    })
    .catch(error => console.error('Error checking existing attendance:', error));
}


function viewStaffInfo(staffId) {
  // Make an HTTP GET request to fetch staff details by ID
  fetch(`/api/staffinfo/${staffId}`)
  .then(response => {
      if (!response.ok) {
          throw new Error('Failed to fetch staff details');
      }
      return response.json();
  })
  .then(data => {
      // Display staff details in the modal
      const modal = document.getElementById('viewStaffModal');
      const modalContent = modal.querySelector('.modal-content');
      modalContent.innerHTML = `
          <span class="modal-close" onclick="closeViewModal()">&times;</span>
          <h2 class="modal-title" id="viewModalTitle">Staff Details</h2>
          <div class="view-staff-details">
              <p><strong>ID:</strong> ${data.id}</p>
              <p><strong>Name:</strong> ${data.name}</p>
              <p><strong>Role:</strong> ${data.role}</p>
              <p><strong>Contact:</strong> ${data.contact}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Address:</strong> ${data.address}</p>
              <p><strong>Staff Category:</strong> ${data.staff_category}</p>
              <p><strong>Gender:</strong> ${data.gender}</p>
              <p><strong>Date of Entry:</strong> ${data.date_of_entry}</p>
              <p><strong>Rest Day:</strong> ${data.rest_day}</p>
          </div>
      `;
      modal.style.display = 'block'; // Show the modal
  })
  .catch(error => {
      console.error('Error fetching staff details:', error);
      // Handle error
  });
}

function viewStaffInfo(staffId) {
  // Make an HTTP GET request to fetch staff details by ID
  fetch(`/api/staffinfo/${staffId}`)
  .then(response => {
      if (!response.ok) {
          throw new Error('Failed to fetch staff details');
      }
      return response.json();
  })
  .then(data => {
      // Display staff details in the modal
      const modal = document.getElementById('viewStaffModal');
      const modalContent = modal.querySelector('.view-modal-content');
      modalContent.innerHTML = `
          <span class="view-modal-close" onclick="closeViewModal()">&times;</span>
          <h2 class="view-modal-title" id="viewModalTitle">View Staff Details</h2> 
          <div class="view-staff-details unique-modal"> <!-- Updated class name -->
              <p class="detail"><strong class="key key-id">ID:</strong> <span class="value value-id">${data.id}</span></p>
              <p class="detail"><strong class="key key-name">Name:</strong> <span class="value value-name">${data.name}</span></p>
              <p class="detail"><strong class="key key-role">Role:</strong> <span class="value value-role">${data.role}</span></p>
              <p class="detail"><strong class="key key-contact">Contact:</strong> <span class="value value-contact">${data.contact}</span></p>
              <p class="detail"><strong class="key key-email">Email:</strong> <span class="value value-email">${data.email}</span></p>
              <p class="detail"><strong class="key key-address">Address:</strong> <span class="value value-address">${data.address}</span></p>
              <p class="detail"><strong class="key key-category">Category:</strong> <span class="value value-category">${data.staff_category}</span></p>
              <p class="detail"><strong class="key key-gender">Gender:</strong> <span class="value value-gender">${data.gender}</span></p>
              <p class="detail"><strong class="key key-entry-date">Date of Entry:</strong> <span class="value value-entry-date">${data.date_of_entry}</span></p>
              <p class="detail"><strong class="key key-rest-day">Rest Day:</strong> <span class="value value-rest-day">${data.rest_day}</span></p>
          </div>
      `;
      modal.style.display = 'block'; // Show the modal
  })
  .catch(error => {
      console.error('Error fetching staff details:', error);
      // Handle error
  });
}


// Function to close the view staff modal
function closeViewModal() {
  const viewModal = document.getElementById('viewStaffModal');
  viewModal.style.display = 'none';
}


// Function to submit attendance
function submitAttendance() {
  const staffAttendance = [];
  const selectedDate = document.getElementById('date').value; // Fetch selected date

  // Clear existing messages and remove error class
  const messageContainer = document.getElementById('message');
  messageContainer.textContent = '';
  messageContainer.classList.remove('error');

  // Calculate the day of the week
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDateObj = new Date(selectedDate);
  const dayOfWeek = daysOfWeek[selectedDateObj.getDay()];
  

  // Check if attendance already exists for the selected date
  fetch(`/api/attendance/check?date=${selectedDate}`)
    .then(response => response.json())
    .then(data => {
      const existingAttendance = data.attendance;

      // Iterate over all staff members
      document.querySelectorAll('.attendance-options').forEach(attOption => {
        const staffId = attOption.closest('tr').querySelector('.staff-id').textContent;
        const selectedOption = attOption.querySelector('input[type="radio"]:checked');

        if (selectedOption) {
          const status = selectedOption.value;
          const leaveReasonSelect = attOption.querySelector('select.leave-reason');
          const leaveReason = leaveReasonSelect ? leaveReasonSelect.value : null;

          staffAttendance.push({ staffId, status, leaveReason, dayOfWeek });
        }
      });

      // Send attendance data to the server along with the selected date and day of the week
      fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ staffAttendance, existingAttendance, date: selectedDate }) // Pass selected date
      })
      .then(response => {
        if (response.ok) {
          // Show appropriate message based on whether it's an update or insert
          if (existingAttendance) {
            messageContainer.textContent = "Attendance updated successfully";
          } else {
            messageContainer.textContent = "Attendance submitted successfully";
          }
          // Show the messages container
          messageContainer.style.display = 'block';
          setTimeout(() => {
            messageContainer.textContent = "";
            messageContainer.style.display = 'none';
          }, 3000); // Hide message after 3 seconds

          // Update attendance status label
          const attendanceStatusLabel = document.getElementById('attendance-status');
          attendanceStatusLabel.textContent = "Attendance taken for Today";
          attendanceStatusLabel.classList.remove('not-taken');
          attendanceStatusLabel.classList.add('taken');

          // Show the reset attendance button
          const resetAttendanceButton = document.getElementById('reset-attendance-button');
          resetAttendanceButton.style.display = 'inline-block';
          
       // Fetch missed attendance after the action
       fetchMissedAttendance(); // <- Here we call fetchMissedAttendance() after attendance submission
      } else {
          console.error('Failed to submit attendance data');
          // Show error message
          messageContainer.textContent = 'Error submitting attendance data';
          messageContainer.classList.add('error'); // Apply error class
          messageContainer.style.display = 'block'; // Show the messages container
        }
      })
      .catch(error => {
        console.error('Error submitting attendance data:', error);
        // Show error message
        messageContainer.textContent = 'Error submitting attendance data';
        messageContainer.classList.add('error'); // Apply error class
        messageContainer.style.display = 'block'; // Show the messages container
      });
    })
    .catch(error => {
      console.error('Error checking existing attendance:', error);
      // Show error message
      messageContainer.textContent = 'Error checking existing attendance';
      messageContainer.classList.add('error'); // Apply error class
      messageContainer.style.display = 'block'; // Show the messages container
    });
    
}






window.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('date');
  const dayOfWeekSpan = document.getElementById('day-of-week');

  // Function to update the displayed day of the week
  function updateDayOfWeek() {
    const selectedDate = new Date(dateInput.value);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = daysOfWeek[selectedDate.getDay()];

    dayOfWeekSpan.textContent = ` ${dayOfWeek}`; // Update text content with the day of the week
  }

  // Set the default date input value to the current date
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  dateInput.value = formattedDate;

  // Fetch staff list for the default current date
  fetchStaffList();

  // Set up event listener for date input field to update staff list and day of the week when date changes
  dateInput.addEventListener('change', () => {
    fetchStaffList();
    updateDayOfWeek(); // Update the displayed day of the week
  });

  // Call updateDayOfWeek initially to display the day of the week for the default date
  updateDayOfWeek();
});

// Function to show the modal for resetting attendance
function showResetAttendanceModal() {
  const modal = document.getElementById('reset-attendance-modal');
  modal.style.display = 'block';
}

// Function to hide the modal
function hideResetAttendanceModal() {
  const modal = document.getElementById('reset-attendance-modal');
  modal.style.display = 'none';
}

function resetAttendance() {
  const selectedDate = document.getElementById('date').value; // Get the selected date
  fetch(`/api/attendance/reset?date=${selectedDate}`, {
      method: 'DELETE'
  })
  .then(response => {
      if (response.ok) {
          // Attendance reset successfully
          console.log('Attendance reset successfully');
          // Display success message
          const restMessage = document.getElementById('reset-message');
          restMessage.textContent = 'Attendance reset successfully.';
          restMessage.style.display = 'block'; // Display the reset message
          // Hide the message after 3 seconds
          setTimeout(() => {
              restMessage.textContent = '';
              restMessage.style.display = 'none'; // Hide the reset message
          }, 3000);
          // You may want to refresh the staff list after resetting attendance
          fetchStaffList();
          // Close the modal
          hideResetAttendanceModal();
          // Fetch missed attendance after resetting attendance
          fetchMissedAttendance();
      } else {
          // Error resetting attendance
          console.error('Error resetting attendance');
      }
  })
  .catch(error => console.error('Error resetting attendance:', error));
}



// Function to update the log content with formatted messages and style
// Function to update the log content with formatted messages and style
function updateLog(message) {
  const logContent = document.getElementById('logContent');
  const logItem = document.createElement('div');
  logItem.classList.add('log-item');
  logItem.textContent = message;
  logContent.appendChild(logItem);
}

// Function to get the day of the week
function getDayOfWeek(date) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return daysOfWeek[date.getDay()];
}

// Function to format the logs
function formatLog(date, attendance) {
  const formattedDate = `${date} (${getDayOfWeek(new Date(date))})`;
  let log = `Attendance inserted for ${formattedDate}:`;
  attendance.forEach(entry => {
    log += `\n:Id:${entry.staffId}, status:${entry.status}`;
  });
  return log;
}

// Function to mark everyone present for missed dates
function markEveryonePresent() {
  updateLog('Mark Everyone Present button clicked.');

  // Clear previous logs
  const logContent = document.getElementById('logContent');
  logContent.innerHTML = '';

  // Open the log modal
  document.getElementById('logModal').style.display = 'block';

  // Fetch the new staff list
  fetch('/api/staff/newstafflist')
    .then(response => response.json())
    .then(data => {
      const staffList = data.staffList;

      // Check if the staff list is empty
      if (staffList.length === 0) {
        updateLog('No staff members found. Attendance not marked.');
        return;
      }

      // Fetch the last attendance date
      fetch('/api/attendance/lastdate')
        .then(response => response.json())
        .then(data => {
          if (!data.lastAttendanceDate) {
            updateLog('No last attendance date found. Attendance not marked.');
            return;
          }

          const lastAttendanceDate = new Date(data.lastAttendanceDate); // Last attendance date from the server

          // Get the current date
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0 for accurate comparison

          let attendanceInserted = false;

          // Iterate through the dates starting from the day after the last attendance date up to the day before the current date
          for (let date = new Date(lastAttendanceDate); date < currentDate; date.setDate(date.getDate() + 1)) {
            const formattedDate = date.toISOString().split('T')[0]; // Format the date as YYYY-MM-DD

            // Skip the last attendance date
            if (date.getTime() === lastAttendanceDate.getTime()) {
              continue;
            }

            // Populate the staffAttendance array with data for all staff members
            const staffAttendance = staffList
              .filter(staff => {
                // Filter out staff members who joined after the current date or are terminated before the current date
                const entryDate = new Date(staff.date_of_entry);
                const terminationDate = staff.termination_date ? new Date(staff.termination_date) : null;
                return entryDate <= date && (!terminationDate || terminationDate > date);
              })
              .map(staff => ({
                staffId: staff.id,
                staffName: staff.name,
                status: staff.rest_day === ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()] ? 'rest_day' : 'present', // Check if it's the staff member's rest day
                dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()],
                date: formattedDate
              }));

            if (staffAttendance.length === 0) {
              updateLog(`No attendance inserted for ${formattedDate}. Already available.`);
            } else {
              // Create a table-like format for the attendance log
              let logMessage = `Attendance inserted for ${formattedDate} (${staffAttendance[0].dayOfWeek}):\n`;
              logMessage += 'ID   | name | status |\n';
              staffAttendance.forEach(entry => {
                logMessage += `${entry.staffId}  |   ${entry.staffName} |  ${entry.status} |\n`;
              });
              updateLog(logMessage);
              attendanceInserted = true;
            }

            // Send attendance data to the server
            fetch('/api/attendance', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ staffAttendance, existingAttendance: null, date: formattedDate }) // Pass attendance data
            })
            .then(response => {
              if (response.ok) {
                console.log(`Attendance marked present for ${formattedDate}`);
              } else {
                console.error(`Failed to mark attendance present for ${formattedDate}`);
              }
            })
            .catch(error => {
              console.error(`Error marking attendance present for ${formattedDate}:`, error);
            });
          }

          if (!attendanceInserted) {
            updateLog('Attendance already marked.No attendance inserted for any date.');
          }
           // Fetch missed attendance after marking everyone present for missed dates
           fetchMissedAttendance();
        })
        .catch(error => {
          updateLog('Error retrieving last attendance date: ' + error);
        });
    })
    .catch(error => {
      updateLog('Error fetching staff list: ' + error);
    });
}



// Get the modal element
var modal = document.getElementById('logModal');

// Get the <span> element that closes the modal
var span = document.getElementsByClassName('close')[0];

// When the user clicks the <span> (x), close the modal
span.onclick = function() {
  modal.style.display = 'none';
}
//________________________________________________________________________
// Function to fetch missed attendance dates from the server
function fetchMissedAttendance() {
  fetch('/missed-attendance')
  .then(response => response.text())
  .then(data => {
      // Display the message in the HTML element
      const missedAttendanceMessage = document.getElementById('missedAttendanceMessage');
      missedAttendanceMessage.innerHTML = ''; // Clear previous content

      // Update the class of the notifications icon
      const notificationsIcon = document.getElementById('notificationsIcon');
      if (data.includes('Missed attendance dates')) {
          notificationsIcon.classList.add('red-dot', 'shake'); // Add red dot and shake classes
          notificationsIcon.addEventListener('mouseenter', () => {
              notificationsIcon.classList.remove('shake'); // Pause animation on hover
          });
          notificationsIcon.addEventListener('mouseleave', () => {
              notificationsIcon.classList.add('shake'); // Resume animation on mouse leave
          });

          // Split the data by newline to get each date as a separate item
          const missedDates = data.split('\n').map(date => date.trim()).filter(date => date); // Filter out empty strings

          // Construct the list of missed dates
          const missedDatesList = document.createElement('ul');
          missedDates.forEach(date => {
              const listItem = document.createElement('li');
              listItem.textContent = date;
              missedDatesList.appendChild(listItem);
          });

          // Append the list of missed dates to the message box
          missedAttendanceMessage.appendChild(missedDatesList);
      } else {
          notificationsIcon.classList.remove('red-dot', 'shake'); // Remove red dot and shake classes
          notificationsIcon.removeEventListener('mouseenter', null);
          notificationsIcon.removeEventListener('mouseleave', null);
          missedAttendanceMessage.textContent = 'No missed attendance dates for the current month.';
      }
  })
  .catch(error => {
      console.error('Error:', error);
  });
}

// Call the function when the page loads
window.onload = fetchMissedAttendance;

// Show message box when notifications icon is clicked
document.getElementById('notificationsIcon').addEventListener('click', function() {
  // If no missed dates are available, show a notification
  const missedDatesContent = document.getElementById('missedAttendanceMessage').innerHTML.trim();
  if (!missedDatesContent.includes('Missed attendance dates')) {
      alert('No missed attendance dates available.');
  } else {
      // Show the message box
      document.getElementById('messageBox').style.display = 'block';
  }
});

// Close the message box when the close button is clicked
document.getElementById('messageCloseButton').addEventListener('click', function() {
  // Hide the message box
  document.getElementById('messageBox').style.display = 'none';
});
