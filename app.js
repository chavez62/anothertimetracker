let punchInTime = null;
let timerInterval = null;
let categories = {};
let lastRecordedMonth = new Date().getMonth();

// Utility function to format date in Pacific Time Zone
function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    }).format(date);
}

// Update the status display
function updateStatus(message) {
    const statusElement = document.getElementById("taskStatus");
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Start the real-time timer
function startTimer() {
    const liveTimer = document.getElementById("liveTimer");
    if (!liveTimer) return;

    timerInterval = setInterval(() => {
        if (!punchInTime) return;
        const now = new Date();
        const elapsedTime = new Date(now - punchInTime);
        const hours = String(elapsedTime.getUTCHours()).padStart(2, "0");
        const minutes = String(elapsedTime.getUTCMinutes()).padStart(2, "0");
        const seconds = String(elapsedTime.getUTCSeconds()).padStart(2, "0");
        liveTimer.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
}

// Stop the timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const liveTimer = document.getElementById("liveTimer");
    if (liveTimer) {
        liveTimer.textContent = "00:00:00";
    }
}

// Check for active timer on page load
window.addEventListener("DOMContentLoaded", async () => {
    checkAndResetMonthlyTotals(); // Reset monthly totals on page load

    try {
        const response = await fetch("/active");
        if (!response.ok) throw new Error("Failed to fetch active timer.");
        const activeTask = await response.json();
        if (activeTask && activeTask.punchIn) {
            punchInTime = new Date(activeTask.punchIn);
            updateStatus(`Working on: ${activeTask.description || "Active Task"}`);
            startTimer();
        }
    } catch (error) {
        console.error("Error fetching active timer:", error);
    }

    loadLogs(); // Load logs on page load
});

// Punch In Event
document.getElementById("punchIn").addEventListener("click", async () => {
    if (punchInTime) {
        alert("You are already punched in. Please punch out first.");
        return;
    }

    const descriptionElement = document.getElementById("taskDescription");
    const categoryElement = document.getElementById("taskCategory");

    if (!descriptionElement || !categoryElement) {
        alert("Missing task description or category input fields.");
        return;
    }

    const description = descriptionElement.value.trim();
    const category = categoryElement.value.trim();

    if (!description) {
        alert("Please enter a task description.");
        return;
    }

    if (!categories[category]) {
        categories[category] = { totalTime: 0, logs: [] };
    }

    punchInTime = new Date();
    updateStatus(`Working on: ${description}`);
    startTimer();

    try {
        const response = await fetch("/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                description,
                category,
                punchIn: punchInTime.toISOString(),
            }),
        });

        if (!response.ok) throw new Error("Failed to punch in.");

        alert(`Punched in at ${formatDate(punchInTime)}`);
    } catch (error) {
        alert(`Error: ${error.message}`);
        punchInTime = null;
        stopTimer();
        updateStatus("No task running.");
    }
});

// Punch Out Event
document.getElementById("punchOut").addEventListener("click", async () => {
    if (!punchInTime) {
        alert("Please punch in first!");
        return;
    }

    const punchOutTime = new Date();
    const duration = Math.round((punchOutTime - punchInTime) / 1000 / 60); // Convert to minutes

    const descriptionElement = document.getElementById("taskDescription");
    const categoryElement = document.getElementById("taskCategory");

    if (!descriptionElement || !categoryElement) {
        alert("Missing task description or category input fields.");
        return;
    }

    const description = descriptionElement.value.trim();
    const category = categoryElement.value.trim();

    stopTimer();
    updateStatus("No task running.");

    categories[category].totalTime += duration;
    categories[category].logs.push({
        description,
        punchIn: punchInTime.toISOString(),
        punchOut: punchOutTime.toISOString(),
        duration,
    });

    try {
        const response = await fetch("/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                punchOut: punchOutTime.toISOString(),
                duration,
                category,
            }),
        });

        if (!response.ok) throw new Error("Failed to punch out.");

        alert(`Punched out at ${formatDate(punchOutTime)}`);
        punchInTime = null;
        loadLogs();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

// Reset monthly totals if the month has changed
function checkAndResetMonthlyTotals() {
    const currentMonth = new Date().getMonth();
    if (currentMonth !== lastRecordedMonth) {
        categories = {}; // Reset all categories
        lastRecordedMonth = currentMonth; // Update last recorded month
    }
}

// Load logs and display them in the table
async function loadLogs() {
    try {
        const response = await fetch("/logs");
        if (!response.ok) throw new Error("Failed to fetch logs.");

        const logs = await response.json();
        const tableBody = document.getElementById("logTable").querySelector("tbody");
        if (!tableBody) return;

        tableBody.innerHTML = ""; // Clear the table

        logs.forEach((log) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${log.category || "No Category"}</td>
                <td>${log.description || "No Description"}</td>
                <td>${log.punchIn ? formatDate(new Date(log.punchIn)) : "N/A"}</td>
                <td>${log.punchOut ? formatDate(new Date(log.punchOut)) : "N/A"}</td>
                <td>${log.duration || 0} min</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        alert(`Error loading logs: ${error.message}`);
    }
}

// Display total time for a category
function displayCategoryTotal(category) {
    const categoryData = categories[category];
    if (categoryData) {
        console.log(`Category "${category}" total time: ${categoryData.totalTime} minutes`);
    } else {
        console.log(`No data for category "${category}"`);
    }
}
