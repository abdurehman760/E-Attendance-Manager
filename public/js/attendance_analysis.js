// Function to toggle between yearly and monthly view
function toggleView() {
    const yearlyView = document.getElementById('yearly-view');
    const monthlyView = document.getElementById('monthly-view');
    const yearlyToggle = document.getElementById('yearly-toggle');
    const printButton = document.getElementById('printReportAndAnalysisButton');
    const printYearlyButton = document.getElementById('printYearlyReportButton'); // New button for printing yearly report
    const monthlyPieChartContainer = document.getElementById('monthlyPieChartContainer');
    const yearlyPieChartContainer = document.getElementById('yearlyPieChartContainer');

    if (yearlyToggle.checked) {
        yearlyView.style.display = 'block';
        monthlyView.style.display = 'none';
        printButton.style.display = 'none'; // Hide the button in yearly view
        printYearlyButton.style.display = 'block'; // Show the button in yearly view
        monthlyPieChartContainer.style.display = 'none'; // Hide monthly chart container
        yearlyPieChartContainer.style.display = 'block'; // Show yearly chart container
    } else {
        yearlyView.style.display = 'none';
        monthlyView.style.display = 'block';
        printButton.style.display = 'block'; // Show the button in monthly view
        printYearlyButton.style.display = 'none'; // Hide the button in monthly view
        monthlyPieChartContainer.style.display = 'block'; // Show monthly chart container
        yearlyPieChartContainer.style.display = 'none'; // Hide yearly chart container
    }
}

// Initialize view on page load
document.addEventListener('DOMContentLoaded', () => {
    toggleView(); // Hide yearly view by default
});

//__________________________________monthly attendance summary_________________________________________

// Array to map month numbers to month names
const monthNames = ["January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"];


// Get the current date
const currentDate = new Date();

// Get the year and month of the current date
const year = currentDate.getFullYear();
let month = currentDate.getMonth() + 1; // Months are 0-indexed, so add 1

// Format the month as a two-digit string if needed (e.g., '04' for April)
if (month < 10) {
  month = '0' + month;
}

// Set the value of the month selector input to the current year and month
document.getElementById('month-selector').value = `${year}-${month}`;

// Fetch and display attendance analysis data for the current month
fetchAttendanceData();

document.addEventListener('DOMContentLoaded', () => {
    // Add event listener to fetch data when the "Fetch Data" button is clicked
    document.getElementById('fetch-button').addEventListener('click', fetchAttendanceData);
});

function fetchAttendanceData() {
    // Get the selected month from the input field
    const selectedMonth = document.getElementById('month-selector').value;
    
    // Check if the selectedMonth value is valid
    if (!selectedMonth) {
        console.error('Selected Month is undefined or empty');
        return;
    }
    
    // Console log the selected month for debugging
    console.log('Selected Month:', selectedMonth);
    
    // Extract the year and month from the selected value (e.g., "2024-04")
    const [year, month] = selectedMonth.split('-');
    
    // Send an AJAX request to fetch attendance data for the selected month and year
    fetch(`/api/attendance-analysis?year=${year}&month=${month}`)
        .then(response => response.json())
        .then(data => {
            // Display the attendance analysis data on the page
            displayAttendanceAnalysis(data, selectedMonth);
        })
        .catch(error => {
            console.error('Error fetching attendance analysis data:', error);
            // Display error message on the page
            const attendanceAnalysisDiv = document.getElementById('attendanceAnalysis');
            attendanceAnalysisDiv.innerHTML = '<p>Error fetching attendance analysis data</p>';
        });
}

// Function to display the attendance analysis data for the selected month and year
// Function to display the attendance analysis data for the selected month and year
function displayAttendanceAnalysis(data, selectedMonth) {
    const attendanceAnalysisDiv = document.getElementById('attendanceAnalysis');

    // Check if selectedMonth is undefined or empty
    if (!selectedMonth) {
        console.error('Selected Month is undefined or empty');
        return;
    }

    // Extract the year and month from the selected value
    const [year, month] = selectedMonth.split('-');

    // Filter data for the selected month and year
    const filteredData = data.filter(entry => entry.year === parseInt(year) && entry.month === parseInt(month));

    if (filteredData.length === 0) {
        // Get the month name based on the month number
        const monthName = monthNames[parseInt(month) - 1]; // Month numbers are 1-indexed
    
        // Display a message if no data is available for the selected month and year
        attendanceAnalysisDiv.innerHTML = `<p>No attendance data available for ${monthName} ${year}.</p>`;
        return;
    }

    // Calculate total count of staff
    const totalCountOfStaff = filteredData.length;

    // Create the caption with additional information
    const caption = `
        <caption class="caption">
            Attendance Summary for ${monthNames[parseInt(month) - 1]} ${year}<br>
            <span class="caption-details">Total Staff Count: ${totalCountOfStaff}</span>
            <!-- Add more details here if needed -->
        </caption>
    `;

    // Create the table header
    const tableHeader = `
        <table class="attendance-table">
            ${caption}
            <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Month</th>
                <th>Year</th>
                <th>Present Count</th>
                <th>Absent Count</th>
                <th>Leave Count</th>
                <th>Rest Day Count</th>
                <th>Percentage(Present + Rest-days)</th>
                <th>Action</th>
            </tr>
    `;

    // Get the first staff in the filtered data
    const firstStaff = filteredData[0];

    // Call the function to generate the pie chart for the first staff initially
    generatePieChart(firstStaff.staff_id, year, month);

    // Modify the button creation part in displayAttendanceAnalysis function
    const tableBody = filteredData.map(entry => {
        // Get the month name based on the month number
        const monthName = monthNames[parseInt(entry.month) - 1]; // Month numbers are 1-indexed

        // Calculate the total days (present + rest_day + absent + leave)
        const totalDays = entry.present_count + entry.rest_day_count + entry.absent_count + entry.leave_count;

        // Calculate the percentage considering both "present" and "rest_day" as present
        const presentPercentage = ((entry.present_count + entry.rest_day_count) / totalDays) * 100;

        // Create table row with button to show pie chart
        return `
        <tr>
            <td>${entry.staff_id}</td>
            <td>${entry.staff_name}</td>
            <td>${monthName}</td>
            <td>${entry.year}</td>
            <td>${entry.present_count}</td>
            <td>${entry.absent_count}</td>
            <td>${entry.leave_count}</td>
            <td>${entry.rest_day_count}</td>
            <td>${presentPercentage.toFixed(2)}%  </td>
            <td>
                <button onclick="generateMonthlyReport(${entry.staff_id}, ${year}, ${month})">Generate Report</button>
                <button onclick="showPieChart(${entry.staff_id}, ${year}, ${month})">Show Pie Chart</button>
            </td>
        </tr>
        `;
    }).join('');

    // Create the table
    const table = `${tableHeader}${tableBody}</table>`;

    // Display the table on the page
    attendanceAnalysisDiv.innerHTML = table;
}




// Function to generate monthly report for a staff member
function generateMonthlyReport(staffId, year, month) {
    // Fetch the staff member's name
    fetch(`/api/staff/${staffId}`)
        .then(response => response.json())
        .then(staff => {
            const staffName = staff.name;

            // Make an AJAX request to fetch monthly attendance data for the specified staff member
            fetch(`/api/monthly-staff-attendance/${staffId}/${year}/${month}`)
                .then(response => response.json())
                .then(data => {
                    // Process the fetched data to create the monthly report tables
                    const monthlyReportDiv = document.getElementById('monthlyReport');
                    monthlyReportDiv.innerHTML = ''; // Clear previous content

                    // Calculate total counts and percentages
                    let totalPresent = 0;
                    let totalAbsent = 0;
                    let totalLeave = 0;
                    let totalRestDay = 0;
                    let totalDays = 0;

                    data.forEach(entry => {
                        totalPresent += entry.status === 'present' ? 1 : 0;
                        totalAbsent += entry.status === 'absent' ? 1 : 0;
                        totalLeave += entry.status === 'leave' ? 1 : 0;
                        totalRestDay += entry.status === 'rest_day' ? 1 : 0;
                        totalDays++;
                    });

                    const presentPercentage = ((totalPresent + totalRestDay) / totalDays) * 100;

                    // Create the summary table HTML
                    let summaryTableHTML = `
                        <table class="summary-table">
                            <thead>
                                <tr>
                                    <th>Total Present</th>
                                    <th>Total Absent</th>
                                    <th>Total Leave</th>
                                    <th>Total Rest Day</th>
                                    <th>Total Present Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${totalPresent}</td>
                                    <td>${totalAbsent}</td>
                                    <td>${totalLeave}</td>
                                    <td>${totalRestDay}</td>
                                    <td>${presentPercentage.toFixed(2)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    `;

                    // Append the summary table to the monthly report div
                    monthlyReportDiv.innerHTML += summaryTableHTML;

                    // Create the date-wise status table
                    let tableHTML = `
                        <table class="date-wise-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Status</th>
                                    <th>Leave Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    // Create a table row for each date of the month
                    const startDate = new Date(year, month - 1, 1); // Month is 0-indexed, so subtract 1
                    const endDate = new Date(year, month, 0); // Get the last day of the month
                    for (let date = startDate.getDate(); date <= endDate.getDate(); date++) {
                        const currentDate = new Date(year, month - 1, date);
                        const dayOfMonth = currentDate.getDate();
                        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

                        // Find the entry for the current date in the fetched data
                        const entry = data.find(item => new Date(item.date).getDate() === date);
                        const status = entry ? entry.status : 'N/A';
                        const leaveReason = entry ? entry.leave_reason || 'N/A' : '-';

                        // Create a table row for the current date
                        tableHTML += `
                            <tr>
                                <td>${dayOfMonth}</td>
                                <td>${dayOfWeek}</td>
                                <td>${status}</td>
                                <td>${status === 'leave' ? leaveReason : '-'}</td>
                            </tr>
                        `;
                    }

                    // Close the date-wise status table
                    tableHTML += `
                            </tbody>
                        </table>
                    `;

                    // Append the date-wise status table to the monthly report div
                    monthlyReportDiv.innerHTML += tableHTML;

                    // Set the modal title to display the year, month name, and staff name
                    const modalTitle = document.getElementById('modalTitle');
                    const monthName = getMonthName(month);
                    modalTitle.textContent = `Monthly Attendance Report for ${staffName} - ${monthName} ${year}`;

                    // Open the modal
                    openModal();
                })
                .catch(error => {
                    console.error('Error fetching monthly report data:', error);
                });
        })
        .catch(error => {
            console.error('Error fetching staff data:', error);
        });
}
// Close the modal
function closeModal() {
    const modal = document.getElementById('monthlyReportModal');
    modal.style.display = 'none';
}

// Add event listener to handle clicks on modal content
document.addEventListener('click', function(event) {
    const modalContent = document.querySelector('.modal-content');
    const modal = document.getElementById('monthlyReportModal');

    // Check if the clicked element is not inside the modal content
    if (!modalContent.contains(event.target) && modal.style.display === 'block') {
        closeModal(); // Close the modal
    }
});


// Function to get the name of the month
function getMonthName(month) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
    return monthNames[month - 1];
}
// Open the modal
function openModal() {
    const modal = document.getElementById('monthlyReportModal');
    modal.style.display = 'block';

    // Close the modal when clicking on the close button
    const closeButton = modal.querySelector('.close');
    closeButton.addEventListener('click', closeModal);

    // Add event listeners to the print and download buttons
    const printButton = modal.querySelector('#printButton');
    printButton.addEventListener('click', printMonthlyReport);

    const downloadButton = modal.querySelector('#downloadButton');
    downloadButton.addEventListener('click', downloadMonthlyReport);
}

// Close the modal
function closeModal() {
    const modal = document.getElementById('monthlyReportModal');
    modal.style.display = 'none';
}

// Function to print the monthly report
function printMonthlyReport() {
    const monthlyReportDiv = document.getElementById('print_view');
    const printContents = monthlyReportDiv.innerHTML;
    const originalContents = document.body.innerHTML;

    // Add style for black color to printContents
    const styledContents = '<div style="color: black;">' + printContents + '</div>';

    document.body.innerHTML = styledContents;
    window.print();

    document.body.innerHTML = originalContents;
}

// Function to print the monthly report and attendance analysis
function printMonthlyReportAndAnalysis() {
    const attendanceAnalysis = document.getElementById('attendanceAnalysis').innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = attendanceAnalysis; // Only set the attendanceAnalysis content

    window.print();

    document.body.innerHTML = originalContents;
}




// Function to download the monthly report as a CSV file
function downloadMonthlyReport() {
    const csvContent = document.getElementById('monthlyReport').innerHTML;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
//_____________________________________montly pie chart____________________________________

// Function to show the pie chart
function showPieChart(staffId, year, month) {
    // Clear the previous chart
    clearPieChart();

    // Call the function to generate the pie chart for the selected staff
    generatePieChart(staffId, year, month);
}

// Function to clear the previous pie chart
function clearPieChart() {
    const pieChartContainer = document.querySelector('#pie-chart-container');
    pieChartContainer.innerHTML = ''; // Clear the content of the container
}

// Fetch data and generate pie chart
function generatePieChart(staffId, year, month) {
    fetch(`/api/monthly-attendance/${staffId}/${year}/${month}`)
        .then(response => response.json())
        .then(data => {
            const { presentPercentage, absentPercentage, leavePercentage, restDayPercentage, staff_name } = data;

            // Generate pie chart using ApexCharts
            const options = {
                series: [presentPercentage, absentPercentage, leavePercentage, restDayPercentage],
                labels: ['Present', 'Absent', 'Leave', 'Rest Day'],
                chart: {
                    type: 'pie',
                    
                },
                title: {
                    text: `Monthly Attendance Distribution for  ${staff_name} (ID: ${staffId})`, // Set the title text with staff name
                    align: 'center', // Align the title to the center
                },
                subtitle: {
                    text: `Year: ${year}, Month: ${month}`, // Set the caption text
                    align: 'center', // Align the caption to the center
                },
             
            };

            const chart = new ApexCharts(document.querySelector('#pie-chart-container'), options);

            chart.render();
        })
        .catch(error => {
            console.error('Error fetching monthly attendance data:', error);
        });
}




//__________________________________yearly attendance summary_________________________________________
 //__________________________________yearly attendance summary_________________________________________
 // Get the current year
const currentYear = new Date().getFullYear();

// Reference to the year selector
const yearSelector = document.getElementById('year-selector');

// Populate the year selector with options for the range of years from 2023 to the current year
for (let year = 2023; year <= currentYear; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) {
        option.selected = true; // Select the current year by default
    }
    yearSelector.appendChild(option);
}


 document.addEventListener('DOMContentLoaded', () => {
    // Fetch and display attendance analysis data for the current year
    fetchYearlyAttendanceData();
});

function fetchYearlyAttendanceData() {
    // Get the selected year from the dropdown menu
    const selectedYear = document.getElementById('year-selector').value;
    
    // Send an AJAX request to fetch attendance data for the selected year
    fetch(`/api/attendance-analysis/${selectedYear}`)
        .then(response => response.json())
        .then(data => {
            // Display the yearly attendance analysis data on the page
            displayYearlyAttendanceAnalysis(data, selectedYear);
        })
        .catch(error => {
            console.error('Error fetching yearly attendance analysis data:', error);
            // Display error message on the page
            const yearlyAttendanceAnalysisDiv = document.getElementById('yearlyAttendanceAnalysis');
            yearlyAttendanceAnalysisDiv.innerHTML = '<p>Error fetching yearly attendance analysis data</p>';
        });
}

// Function to display the yearly attendance analysis data
function displayYearlyAttendanceAnalysis(data, year) {
    const yearlyAttendanceAnalysisDiv = document.getElementById('yearlyAttendanceAnalysis');

    // Check if data is empty
    if (!data || data.length === 0) {
        yearlyAttendanceAnalysisDiv.innerHTML = `<p>No attendance data available for the year ${year}.</p>`;
        return;
    }

    // Calculate the total count of staff
    const totalCountOfStaff = data.length;

    // Create the table header
    const tableHeader = `
        <table class="attendance-table">
            <caption class="caption">
                Attendance Summary for ${year}<br>
                <span class="caption-details">Total Staff Count: ${totalCountOfStaff}</span>
                <!-- Add more details here if needed -->
            </caption>
            <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Total Present Count</th>
                <th>Total Absent Count</th>
                <th>Total Leave Count</th>
                <th>Total Rest Day Count</th>
                <th>Year</th>
                <th>Yearly Present Percentage</th>
                <th>Action</th>
            </tr>
    `;

    // Create the table body
    const tableBody = data.map((entry, index) => {
        // Calculate the total days (present + rest_day + absent + leave)
        const totalDays = entry.total_present_count + entry.total_rest_day_count + entry.total_absent_count + entry.total_leave_count;

        // Calculate the yearly present percentage
        const yearlyPresentPercentage = ((entry.total_present_count + entry.total_rest_day_count) / totalDays) * 100;

        // Create table row with a button to generate yearly pie chart
        return `
            <tr>
                <td>${entry.staff_id}</td>
                <td>${entry.staff_name}</td>
                <td>${entry.total_present_count}</td>
                <td>${entry.total_absent_count}</td>
                <td>${entry.total_leave_count}</td>
                <td>${entry.total_rest_day_count}</td>
                <td>${year}</td>
                <td>${yearlyPresentPercentage.toFixed(2)}%</td>
                <td><button onclick="generateYearlyPieChart(${entry.staff_id})">Generate Yearly Pie Chart</button></td>
            </tr>
        `;
    }).join('');

    // Create the table
    const table = `${tableHeader}${tableBody}</table>`;

    // Display the table on the page
    yearlyAttendanceAnalysisDiv.innerHTML = table;

    // Initially show the pie chart for the first staff
    if (data.length > 0) {
        generateYearlyPieChart(data[0].staff_id);
    }
}



// Function to print the yearly attendance analysis
function printYearlyAttendanceAnalysis() {
    const yearlyAttendanceAnalysisDiv = document.getElementById('yearlyAttendanceAnalysis');
    const originalContent = document.body.innerHTML; // Store the original content

    // Set the content to be printed to only the yearlyAttendanceAnalysisDiv
    document.body.innerHTML = yearlyAttendanceAnalysisDiv.innerHTML;

    window.print();

    // Restore the original content after printing
    document.body.innerHTML = originalContent;
}
//_____________________________________yearly pie charts__________________________________________________________
function generateYearlyPieChart(staffId) {
    // Get the selected year from the dropdown menu
    const selectedYearElement = document.getElementById('year-selector');
    if (!selectedYearElement) {
        console.error('Year selector element not found.');
        return;
    }
    const year = selectedYearElement.value;

    // Fetch data from the API
    fetch(`/api/yearly-attendance-summary/${staffId}/${year}`)
        .then(response => response.json())
        .then(data => {
            // Extract data for the chart
            const attendanceData = {
                present: data.total_present_count,
                absent: data.total_absent_count,
                leave: data.total_leave_count,
                restDay: data.total_rest_day_count
            };

            // Generate pie chart with title
            generateYearlyChart(attendanceData, year, data.staff_name);
        })
        .catch(error => console.error('Error fetching yearly attendance summary data:', error));
}


function generateYearlyChart(attendanceData, year, staffName) {
    // Clear the previous chart
    clearYearlyPieChart();

    // Prepare data for the chart
    const options = {
        chart: {
            type: 'pie',
        },
        series: Object.values(attendanceData),
        labels: Object.keys(attendanceData),
        colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560'],
        title: {
            text: `Yearly Attendance Summary for ${staffName} (${year})`, // Title with year and staff name
            align: 'center',
            style: {
                fontSize: '20px',
            },
        },
    };

    // Render the chart
    const chart = new ApexCharts(document.getElementById("yearly-chart"), options);
    chart.render();
}

// Function to clear the previous pie chart
function clearYearlyPieChart() {
    const yearlyPieChartContainer = document.querySelector('#yearly-chart');
    yearlyPieChartContainer.innerHTML = ''; // Clear the content of the container
}
