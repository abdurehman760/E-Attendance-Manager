function toggleFields() {
  const roleSelect = document.getElementById('role');
  const staffRoleGroup = document.getElementById('staffRoleGroup');
  const salaryDocFeeRow = document.getElementById('salaryDocFeeRow');
  const salaryLabel = document.querySelector('label[for="salary"]');
  const docFeeLabel = document.querySelector('label[for="docFee"]');
  const salaryInput = document.getElementById('salary');
  const docFeeInput = document.getElementById('docFee');
  const dayOfRestGroup = document.getElementById('dayOfRestGroup');

  if (roleSelect.value === 'staff') {
    staffRoleGroup.style.display = 'block';
    salaryDocFeeRow.style.display = 'block';
    // Show and make required the Salary field for Staff role
    salaryInput.style.display = 'block';
    salaryInput.setAttribute('required', 'required');
    // Show the Salary label
    salaryLabel.style.display = 'block';

    // Hide and remove required attribute from Doctor Fee field
    docFeeInput.style.display = 'none';
    docFeeInput.removeAttribute('required');
    // Hide the Doctor Fee label
    docFeeLabel.style.display = 'none';

    // Show the Day of Rest field for Staff role
    dayOfRestGroup.style.display = 'block';
  } else if (roleSelect.value === 'doctor') {
    staffRoleGroup.style.display = 'none';
    salaryDocFeeRow.style.display = 'block';
    // Show and make required the Doctor Fee field for Doctor role
    docFeeInput.style.display = 'block';
    docFeeInput.setAttribute('required', 'required');
    // Show the Doctor Fee label
    docFeeLabel.style.display = 'block';

    // Hide and remove required attribute from Salary field
    salaryInput.style.display = 'none';
    salaryInput.removeAttribute('required');
    // Hide the Salary label
    salaryLabel.style.display = 'none';

    // Hide the Day of Rest field for Doctor role
    dayOfRestGroup.style.display = 'none';
  } else {
    // Hide both fields if role is neither staff nor doctor
    staffRoleGroup.style.display = 'none';
    salaryDocFeeRow.style.display = 'none';

    // Hide the Salary label
    salaryLabel.style.display = 'none';

    // Hide the Doctor Fee label
    docFeeLabel.style.display = 'none';

    // Remove required attribute from both fields
    salaryInput.removeAttribute('required');
    docFeeInput.removeAttribute('required');

    // Hide the Day of Rest field if role is neither staff nor doctor
    dayOfRestGroup.style.display = 'none';
  }
}



// Function to open the modal for adding a new staff member
function openModal() {
  const modal = document.getElementById('staffModal');
  modal.style.display = 'block';
  document.getElementById('modal-title').textContent = 'Add Staff';
  document.getElementById('btnSave').setAttribute('data-action', 'add');
  toggleFields(); // Update field visibility based on role
}

// Function to close the modal
function closeModal() {
  const modal = document.getElementById('staffModal');
  modal.style.display = 'none';
  document.getElementById('staffForm').reset();
}

// Function to save staff information
// Function to save staff information
function saveStaff(event) {
  event.preventDefault();

  const form = document.getElementById('staffForm');
  const formData = new FormData(form);

  const staffData = {};
  for (let [key, value] of formData.entries()) {
    if (key === 'docFee') {
      staffData['doc_fee'] = value; // Ensure proper field name for doc_fee
    } else if (key === 'dayOfRest') {
      staffData['rest_day'] = value; // Add rest_day field to staffData
    } else {
      staffData[key] = value;
    }
  }

  const action = document.getElementById('btnSave').getAttribute('data-action');

  let url = '/api/staff';
  let method = 'POST';
  if (action === 'edit') {
    const staffId = form.getAttribute('data-id');
    url += `/${staffId}`;
    method = 'PUT';
  }

  // Additional check for "doctor" role to ensure docFee is sent
  if (staffData.role === 'doctor') {
    staffData.doc_fee = staffData.doc_fee; // Ensure proper field name
    delete staffData.salary; // Remove salary field for doctor
  }

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(staffData)
  })
    .then(response => response.json())
    .then(data => {
      console.log('Staff saved:', data);
      closeModal();
      fetchStaffList(); // Refresh staff list after saving
    })
    .catch(error => {
      console.error('Error saving staff:', error);
    });
}
function editStaff(staffId) {
  fetch(`/api/staff/${staffId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch staff details');
      }
      return response.json();
    })
    .then(data => {
      const form = document.getElementById('staffForm');
      form.setAttribute('data-id', staffId);
      document.getElementById('modal-title').textContent = 'Edit Staff';

      // Populate form fields with fetched data
      form.elements['name'].value = data.name;
      form.elements['email'].value = data.email;
      form.elements['role'].value = data.role;
      form.elements['staffRole'].value = data.staff_category || ''; // Update staff role dropdown
      form.elements['age'].value = data.age;
      form.elements['specialization'].value = data.specialization;
      form.elements['salary'].value = data.salary || '';
      form.elements['contact'].value = data.contact || '';
      form.elements['docFee'].value = data.doc_fee || '';
      form.elements['address'].value = data.address || '';
      
      // Set the "Day of Rest" value
      if (data.rest_day) {
        form.elements['dayOfRest'].value = data.rest_day;
      }

      document.getElementById('btnSave').setAttribute('data-action', 'edit');
      document.getElementById('staffModal').style.display = 'block';
      toggleFields(); // Update field visibility based on role
    })
    .catch(error => {
      console.error('Error fetching staff:', error);
    });
}


// Function to delete staff member
function deleteStaff(staffId) {
  if (confirm('Are you sure you want to delete this staff member?')) {
    fetch(`/api/staff/${staffId}`, {
      method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
      console.log('Staff deleted:', data);
      fetchStaffList(); // Refresh staff list after deleting
    })
    .catch(error => {
      console.error('Error deleting staff:', error);
    });
  }
}

// Function to create HTML elements for a staff member
function createStaffItem(staff) {
  const staffItem = document.createElement('div');
  staffItem.classList.add('card');

  const terminationLabel = document.createElement('div');
  terminationLabel.classList.add('termination-label');
  if (staff.terminated === 1) {
    terminationLabel.textContent = 'Terminated';
  } else {
    terminationLabel.style.display = 'none';
  }

  const staffLabel = document.createElement('div');
  staffLabel.classList.add('card-label');

  // Capitalize the first letter and replace underscores with spaces
  const category = staff.staff_category.replace(/_/g, ' ');
  const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);

  // Check staff_category and set background color accordingly
  switch (staff.staff_category) {
    case 'staff':
      staffLabel.classList.add('staff-background');
      break;
    case 'nurse':
      staffLabel.classList.add('nurse-background');
      break;
    case 'receptionist':
      staffLabel.classList.add('counter-background'); // Changed to 'receptionist'
      break;
    case 'lab_technician':
      staffLabel.classList.add('lab-background');
      break;
    case 'others':
      staffLabel.classList.add('others-background');
      break;
    default:
      staffLabel.classList.add('default-background');
  }

  staffLabel.textContent = formattedCategory;

  const staffInfo = document.createElement('div');
  staffInfo.classList.add('card-info');

  const staffName = document.createElement('p');
  staffName.classList.add('card-name');
  staffName.textContent = `Name: ${staff.name}`;

  const staffContact = document.createElement('p');
  staffContact.classList.add('card-contact');
  staffContact.textContent = `Contact: ${staff.contact}`;

  const staffSpecialization = document.createElement('p');
  staffSpecialization.classList.add('card-specialization');
  staffSpecialization.textContent = `Specialization: ${staff.specialization}`;

  const staffActions = document.createElement('div');
  staffActions.classList.add('card-actions');

  const editButton = document.createElement('button');
  editButton.classList.add('btn-edit');
  editButton.textContent = 'Edit';
  editButton.onclick = () => editStaff(staff.id);

  const viewButton = document.createElement('button');
  viewButton.classList.add('btn-view');
  viewButton.textContent = 'View';
  viewButton.onclick = () => viewStaff(staff);

  const terminateButton = document.createElement('button');
  terminateButton.classList.add('btn-terminate');
  if (staff.terminated === 1) {
    terminateButton.textContent = 'Rehire';
    terminateButton.onclick = () => rehireStaff(staff.id);
  } else {
    terminateButton.textContent = 'Terminate';
    terminateButton.onclick = () => openTerminateModal(staff.id);
  }

  const deleteButton = document.createElement('button');
  deleteButton.classList.add('btn-delete');
  deleteButton.textContent = 'Delete';
  deleteButton.onclick = () => deleteStaff(staff.id);

  staffActions.appendChild(editButton);
  staffActions.appendChild(viewButton);
  staffActions.appendChild(terminateButton);
  staffActions.appendChild(deleteButton);

  staffInfo.appendChild(staffName);
  staffInfo.appendChild(staffContact);
  staffInfo.appendChild(staffSpecialization);

  staffItem.appendChild(terminationLabel); // Add termination label first
  staffItem.appendChild(staffLabel);
  staffItem.appendChild(staffInfo);
  staffItem.appendChild(staffActions);

  return staffItem;
}



// Function to create HTML elements for a doctor
function createDoctorItem(doctor) {
  const doctorItem = document.createElement('div');
  doctorItem.classList.add('card');

  const terminationLabel = document.createElement('div');
  terminationLabel.classList.add('termination-label');
  if (doctor.terminated === 1) {
    terminationLabel.textContent = 'Terminated';
  } else {
    terminationLabel.style.display = 'none';
  }

  const doctorLabel = document.createElement('div');
  doctorLabel.classList.add('card-label', 'doctor-label');
  doctorLabel.textContent = 'Doctor';

  const doctorInfo = document.createElement('div');
  doctorInfo.classList.add('card-info');

  const doctorName = document.createElement('p');
  doctorName.classList.add('card-name');
  doctorName.textContent = `Name: ${doctor.name}`;

  const doctorContact = document.createElement('p');
  doctorContact.classList.add('card-contact');
  doctorContact.textContent = `Contact: ${doctor.contact}`;

  const doctorSpecialization = document.createElement('p');
  doctorSpecialization.classList.add('card-specialization');
  doctorSpecialization.textContent = `Specialization: ${doctor.specialization}`;

  const doctorActions = document.createElement('div');
  doctorActions.classList.add('card-actions');

  const editButton = document.createElement('button');
  editButton.classList.add('btn-edit');
  editButton.textContent = 'Edit';
  editButton.onclick = () => editStaff(doctor.id);

  const viewButton = document.createElement('button');
  viewButton.classList.add('btn-view');
  viewButton.textContent = 'View';
  viewButton.onclick = () => viewStaff(doctor);

  const terminateButton = document.createElement('button');
  terminateButton.classList.add('btn-terminate');
  if (doctor.terminated === 1) {
    terminateButton.textContent = 'Rehire';
    terminateButton.onclick = () => rehireStaff(doctor.id);
  } else {
    terminateButton.textContent = 'Terminate';
    terminateButton.onclick = () => openTerminateModal(doctor.id);
  }

  const deleteButton = document.createElement('button');
  deleteButton.classList.add('btn-delete');
  deleteButton.textContent = 'Delete';
  deleteButton.onclick = () => deleteStaff(doctor.id);

  doctorActions.appendChild(editButton);
  doctorActions.appendChild(viewButton);
  doctorActions.appendChild(terminateButton);
  doctorActions.appendChild(deleteButton);

  doctorInfo.appendChild(doctorName);
  doctorInfo.appendChild(doctorContact);
  doctorInfo.appendChild(doctorSpecialization);

  doctorItem.appendChild(terminationLabel); // Add termination label first
  doctorItem.appendChild(doctorLabel);
  doctorItem.appendChild(doctorInfo);
  doctorItem.appendChild(doctorActions);

  return doctorItem;
}





// Function to open the modal for viewing staff details
function viewStaff(staff) {
  const viewModal = document.getElementById('viewStaffModal');
  viewModal.style.display = 'block';
  document.getElementById('viewModalTitle').textContent = 'View Staff Details';

  const viewStaffDetails = document.getElementById('viewStaffDetails');
  viewStaffDetails.innerHTML = ''; // Clear previous details

  const detailsList = document.createElement('ul');
  detailsList.classList.add('staff-details-list');

  // Function to capitalize the first letter of each word and replace underscores with spaces
  function capitalizeAndFormat(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, firstLetter => firstLetter.toUpperCase());
  }

// Function to add detail as list item if value exists
function addDetailToList(key, value) {
  if (value !== null && value !== '') {
    const formattedKey = capitalizeAndFormat(key);
    const listItem = document.createElement('li');

    // Create a class name based on the index of the list item
    const index = detailsList.children.length + 1;

    if (key === 'Doc Fee' && staff.role === 'doctor') {
      listItem.innerHTML = `<strong>${formattedKey}:</strong> <span class="value_${index}">Rs. ${value}.00 </span>`;
    } else if (key === 'Salary' && staff.role === 'staff') {
      listItem.innerHTML = `<strong>${formattedKey}:</strong> <span class="value_9">Rs. ${value}.00 </span>`;
    } else {
      listItem.innerHTML = `<strong>${formattedKey}:</strong> <span class="value_${index}">${value}</span>`;
    }

    detailsList.appendChild(listItem);

    // Apply special styling for 'Termination' and 'Entry'
    if (key === 'Termination') {
      listItem.innerHTML = `<strong>${formattedKey}:</strong> <span style="color: red;">${value}</span>`;
    }
    if (key === 'Entry') {
      listItem.innerHTML = `<strong>${formattedKey}:</strong> <span style="color: green;">${value}</span>`;
    }

    // Add reason for termination if it exists
    if (key === 'Reason') {
      listItem.innerHTML = `<strong>${formattedKey}:</strong> <span style="color: red;">${value}</span>`;
    }
  }
}

// Inside your viewStaff function
// Add details as list items
addDetailToList('Name', staff.name);
addDetailToList('Gender', staff.gender);
addDetailToList('Age', staff.age);
addDetailToList('Email', staff.email);
addDetailToList('Contact', staff.contact);
addDetailToList('Address', staff.address);
addDetailToList('Role', staff.role);
addDetailToList('Specialization', staff.specialization);

// Conditionally add salary or doc fee based on role
if (staff.role === 'doctor') {
  addDetailToList('Doc Fee', staff.doc_fee);
} else if (staff.role === 'staff') {
  addDetailToList('Duty', staff.staff_category);
  addDetailToList('Salary', staff.salary);
}
addDetailToList('Entry', staff.date_of_entry);

// Show termination date if not null
if (staff.termination_date !== null) {
  addDetailToList('Termination', staff.termination_date);
}

// Show termination reason if staff member is terminated
if (staff.terminated === 1 && staff.termination_reason !== null) {
  addDetailToList('Reason', staff.termination_reason);
}

viewStaffDetails.appendChild(detailsList);

// Close modal if clicked outside modal-content
viewModal.addEventListener('click', function(event) {
  if (event.target === viewModal) {
    closeViewModal();
  }
});
}

// Function to close the view staff modal
function closeViewModal() {
  const viewModal = document.getElementById('viewStaffModal');
  viewModal.style.display = 'none';
}

// Event listener for form submission
document.getElementById('staffForm').addEventListener('submit', saveStaff);

// Event listener for role selection change
document.getElementById('role').addEventListener('change', toggleFields);

// Function to open Terminate Modal
function openTerminateModal(staffId) {
  const modal = document.getElementById('terminateModal');
  const terminateForm = document.getElementById('terminateForm');
  const otherReasonInput = document.getElementById('otherReasonInput');

  // Set the staffId to the modal for later use
  modal.setAttribute('data-staff-id', staffId);

  // Clear previous input
  terminateForm.reset();
  otherReasonInput.style.display = 'none';

  // Open the modal
  modal.style.display = 'block';
}
// Function to close the terminate modal
function closeTerminateModal() {
  const terminateModal = document.getElementById('terminateModal');
  terminateModal.style.display = 'none';
}
// Function to terminate staff member
function terminateStaff() {
  const terminationReasonSelect = document.getElementById('terminationReason');
  const otherReasonInput = document.getElementById('otherReasonInput');
  const staffId = document.getElementById('terminateModal').getAttribute('data-staff-id');

  // Ask for confirmation before termination
  if (confirm('Are you sure you want to terminate this staff member?')) {
    let terminationReason = terminationReasonSelect.value;
    if (terminationReason === 'other') {
      terminationReason = otherReasonInput.value.trim();
    }

    const data = {
      terminationReason: terminationReason
    };

    fetch(`/api/staff/${staffId}/terminate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(result => {
        console.log('Termination result:', result);
        closeTerminateModal(); // Close the modal after termination
        fetchStaffList(); // Refresh staff list after termination
      })
      .catch(error => {
        console.error('Error terminating staff:', error);
      });
  }
}
// Function to rehire a staff member
function rehireStaff(staffId) {
  // Ask for confirmation before rehiring
  if (confirm('Are you sure you want to rehire this staff member?')) {
    fetch(`/api/staff/${staffId}/rehire`, {
      method: 'POST',
    })
      .then(response => response.json())
      .then(result => {
        console.log('Staff rehired:', result);
        fetchStaffList(); // Refresh staff list after rehiring
      })
      .catch(error => {
        console.error('Error rehiring staff:', error);
      });
  }
}

// Function to toggle display of other reason input field
function toggleOtherInput() {
  const selectElement = document.getElementById('terminationReason');
  const otherReasonInput = document.getElementById('otherReasonInput');

  if (selectElement.value === 'other') {
    otherReasonInput.style.display = 'block';
  } else {
    otherReasonInput.style.display = 'none';
  }
}


// Function to fetch and display staff list
function fetchStaffList() {
  fetch('/api/staff')
    .then(response => response.json())
    .then(data => {
      const staffList = data.staffList;
      const doctorList = data.doctorList;

      const staffSection = document.getElementById('staffSection');
      const doctorSection = document.getElementById('doctorSection');
      const staffCountElement = document.getElementById('staffCount');
      const doctorCountElement = document.getElementById('doctorCount');

      // Clear previous lists
      staffSection.querySelector('.card-list').innerHTML = '';
      doctorSection.querySelector('.card-list').innerHTML = '';

      // Check if doctorList is empty, null, or zero
      if (!doctorList || doctorList.length === 0) {
        doctorSection.querySelector('.card-list').innerHTML = '<p>No doctors available</p>';
        doctorCountElement.textContent = '0'; // Set count to zero
      } else {
        // Create HTML elements for doctors
        doctorList.forEach(doctor => {
          const doctorItem = createDoctorItem(doctor);
          doctorSection.querySelector('.card-list').appendChild(doctorItem);
        });

        // Update the total doctor count
        let totalDoctorCount = doctorList.length;
        animateCount(doctorCountElement, totalDoctorCount, 100); // Duration in milliseconds
      }

      // Check if staffList is empty, null, or zero
      if (!staffList || staffList.length === 0) {
        staffSection.querySelector('.card-list').innerHTML = '<p>No staff available</p>';
        staffCountElement.textContent = '0'; // Set count to zero
      } else {
        // Create HTML elements for staff members
        staffList.forEach(staff => {
          const staffItem = createStaffItem(staff);
          staffSection.querySelector('.card-list').appendChild(staffItem);
        });

        // Update the total staff count
        let totalStaffCount = staffList.length;
        animateCount(staffCountElement, totalStaffCount, 135); // Duration in milliseconds
      }
    })
    .catch(error => {
      console.error('Error fetching staff list:', error);
    });
}

// Function to animate counting from 0 to a target number
function animateCount(element, target, duration) {
  let start = 0;
  let increment = target / duration;
  let current = start;
  let interval = setInterval(() => {
    current += increment;
    element.textContent = Math.floor(current);
    if (current >= target) {
      clearInterval(interval);
      element.textContent = target;
    }
  }, 10);
}


// Call fetchStaffList on page load to display initial staff list
fetchStaffList();

// Event listener for form submission
document.getElementById('staffForm').addEventListener('submit', saveStaff);

// Event listener for role selection change
document.getElementById('role').addEventListener('change', toggleFields);

