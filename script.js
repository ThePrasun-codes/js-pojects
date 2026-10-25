let records = [];
let editId = null;
let userChoseCategory = false;
const STORAGE_KEY = "trackerRecords";

const addForm = document.getElementById("addForm");
const nameInput = document.getElementById("nameInput");
const personInput = document.getElementById("personInput");
const categoryInput = document.getElementById("categoryInput");
const typeInput = document.getElementById("typeInput");
const statusInput = document.getElementById("statusInput");
const nameError = document.getElementById("nameError");
const personError = document.getElementById("personError");

const searchInput = document.getElementById("searchInput");
const sortInput = document.getElementById("sortInput");
const clearBtn = document.getElementById("clearBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");

const tableBody = document.getElementById("tableBody");
const recordTable = document.getElementById("recordTable");
const cardList = document.getElementById("cardList");
const emptyBox = document.getElementById("emptyBox");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");
const resultText = document.getElementById("resultText");

const editOverlay = document.getElementById("editOverlay");
const editName = document.getElementById("editName");
const editPerson = document.getElementById("editPerson");
const editCategory = document.getElementById("editCategory");
const editType = document.getElementById("editType");
const editStatus = document.getElementById("editStatus");
const editNameError = document.getElementById("editNameError");
const editPersonError = document.getElementById("editPersonError");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const messageBox = document.getElementById("message");

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (Array.isArray(data)) {
        records = data;
      }
    }
  } catch (error) {
    records = [];
    showMessage("Could not read saved data. Starting empty.", true);
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    showMessage("Could not save data in browser storage.", true);
  }
}

function makeId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function safeText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showMessage(text, isError) {
  messageBox.textContent = text;
  messageBox.className = isError ? "error-message" : "";
  setTimeout(function () {
    messageBox.className = "hidden";
  }, 3000);
}

function getAmount(text) {
  let cleaned = text.split("₹").join("");
  cleaned = cleaned.split(",").join("");
  cleaned = cleaned.trim();

  if (cleaned === "" || isNaN(cleaned)) {
    return null;
  }

  const number = Number(cleaned);
  if (number <= 0 || !isFinite(number)) {
    return null;
  }

  return number;
}

function formatMoney(number) {
  return "₹" + number.toLocaleString("en-IN");
}

function cleanText(text) {
  return text.trim().split(/\s+/).join(" ");
}

function checkInputs(nameValue, personValue, category, nameErrorBox, personErrorBox) {
  let name = cleanText(nameValue);
  const person = cleanText(personValue);
  let ok = true;

  nameErrorBox.textContent = "";
  personErrorBox.textContent = "";

  if (name === "") {
    nameErrorBox.textContent = "Please enter an item name or amount.";
    ok = false;
  } else if (category === "money") {
    const amount = getAmount(name);
    if (amount === null) {
      nameErrorBox.textContent = "Enter a valid amount like ₹500.";
      ok = false;
    } else {
      name = formatMoney(amount);
    }
  } else if (getAmount(name) !== null) {
    nameErrorBox.textContent = "This looks like an amount. Change Category to Money.";
    ok = false;
  }

  if (person === "") {
    personErrorBox.textContent = "Please enter the person name.";
    ok = false;
  }

  return { ok: ok, name: name, person: person };
}

function getFilter(groupName) {
  return document.querySelector('input[name="' + groupName + '"]:checked').value;
}

function getVisibleRecords() {
  const category = getFilter("category");
  const type = getFilter("type");
  const status = getFilter("status");
  const search = searchInput.value.trim().toLowerCase();

  const searchClean = search.split("₹").join("").split(",").join("");

  const result = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    if (category !== "all" && r.category !== category) continue;
    if (type !== "all" && r.type !== type) continue;
    if (status !== "all" && r.status !== status) continue;

    if (search !== "") {
      const name = r.name.toLowerCase();
      const person = r.person.toLowerCase();
      const nameClean = name.split("₹").join("").split(",").join("");

      const found =
        name.includes(search) ||
        person.includes(search) ||
        (searchClean !== "" && nameClean.includes(searchClean));

      if (!found) continue;
    }

    result.push(r);
  }

  const sortBy = sortInput.value;
  if (sortBy === "newest") {
    result.sort(function (a, b) { return b.id - a.id; });
  } else if (sortBy === "oldest") {
    result.sort(function (a, b) { return a.id - b.id; });
  } else if (sortBy === "az") {
    result.sort(function (a, b) { return a.name.localeCompare(b.name); });
  } else if (sortBy === "za") {
    result.sort(function (a, b) { return b.name.localeCompare(a.name); });
  }

  return result;
}

function makeBadge(value) {
  const labels = {
    item: "Item", money: "Money",
    lent: "Lent", borrowed: "Borrowed",
    pending: "Pending", returned: "Returned / Paid"
  };

  return '<span class="badge ' + value + '">' + labels[value] + "</span>";
}

function makeButtons(r) {
  let statusText = "Mark returned";
  if (r.status === "returned") {
    statusText = "Reopen";
  } else if (r.category === "money") {
    statusText = "Mark paid";
  }

  return (
    '<button class="btn small-btn gray-btn" onclick="toggleStatus(' + r.id + ')">' + statusText + "</button>" +
    '<button class="btn small-btn blue-btn" onclick="openEdit(' + r.id + ')">Edit</button>' +
    '<button class="btn small-btn red-btn" onclick="deleteRecord(' + r.id + ')">Delete</button>'
  );
}

function updateSummary() {
  let pending = 0;
  let items = 0;

  for (let i = 0; i < records.length; i++) {
    if (records[i].status === "pending") pending++;
    if (records[i].category === "item") items++;
  }

  document.getElementById("totalCount").textContent = records.length;
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("returnedCount").textContent = records.length - pending;
  document.getElementById("itemCount").textContent = items;
}

function render() {
  updateSummary();
  deleteAllBtn.disabled = records.length === 0;

  const list = getVisibleRecords();
  let tableHtml = "";
  let cardHtml = "";

  for (let i = 0; i < list.length; i++) {
    const r = list[i];

    tableHtml +=
      "<tr>" +
      "<td><b>" + safeText(r.name) + "</b></td>" +
      "<td>" + safeText(r.person) + "</td>" +
      "<td>" + makeBadge(r.category) + "</td>" +
      "<td>" + makeBadge(r.type) + "</td>" +
      "<td>" + makeBadge(r.status) + "</td>" +
      "<td>" + makeButtons(r) + "</td>" +
      "</tr>";

    cardHtml +=
      '<div class="record-card">' +
      "<h3>" + safeText(r.name) + "</h3>" +
      "<p>" + (r.type === "lent" ? "Lent to " : "Borrowed from ") + "<b>" + safeText(r.person) + "</b></p>" +
      "<p>" + makeBadge(r.category) + " " + makeBadge(r.type) + " " + makeBadge(r.status) + "</p>" +
      makeButtons(r) +
      "</div>";
  }

  tableBody.innerHTML = tableHtml;
  cardList.innerHTML = cardHtml;

  if (records.length === 0) {
    resultText.textContent = "No records yet";
  } else {
    resultText.textContent = "Showing " + list.length + " of " + records.length + " records";
  }

  if (list.length === 0) {
    recordTable.style.display = "none";
    cardList.style.display = "none";
    emptyBox.style.display = "block";

    if (records.length === 0) {
      emptyTitle.textContent = "No records yet";
      emptyText.textContent = "Add your first record using the form.";
    } else {
      emptyTitle.textContent = "No records match";
      emptyText.textContent = "Try a different search or click Clear Filters.";
    }
  } else {
    recordTable.style.display = "";
    cardList.style.display = "";
    emptyBox.style.display = "none";
  }
}

function addRecord(event) {
  event.preventDefault();

  const category = categoryInput.value;
  const check = checkInputs(nameInput.value, personInput.value, category, nameError, personError);

  if (!check.ok) {
    showMessage("Please fix the errors.", true);
    return;
  }

  const newRecord = {
    id: makeId(),
    name: check.name,
    person: check.person,
    category: category,
    type: typeInput.value,
    status: statusInput.value
  };

  records.push(newRecord);
  saveRecords();

  addForm.reset();
  userChoseCategory = false;
  render();
  showMessage("Record added!", false);
}

function autoDetectCategory() {
  if (userChoseCategory) return;

  const text = nameInput.value.trim();
  if (text === "") return;

  if (getAmount(text) !== null) {
    categoryInput.value = "money";
  } else {
    categoryInput.value = "item";
  }
}

function findRecord(id) {
  for (let i = 0; i < records.length; i++) {
    if (records[i].id === id) {
      return records[i];
    }
  }

  return null;
}

function toggleStatus(id) {
  const r = findRecord(id);
  if (r === null) return;

  if (r.status === "pending") {
    r.status = "returned";
    showMessage(r.category === "money" ? "Marked as paid." : "Marked as returned.", false);
  } else {
    r.status = "pending";
    showMessage("Moved back to pending.", false);
  }

  saveRecords();
  render();
}

function openEdit(id) {
  const r = findRecord(id);
  if (r === null) return;

  editId = id;
  editName.value = r.name;
  editPerson.value = r.person;
  editCategory.value = r.category;
  editType.value = r.type;
  editStatus.value = r.status;
  editNameError.textContent = "";
  editPersonError.textContent = "";

  editOverlay.className = "";
}

function closeEdit() {
  editOverlay.className = "hidden";
  editId = null;
}

function saveEdit() {
  const r = findRecord(editId);
  if (r === null) {
    closeEdit();
    return;
  }

  const check = checkInputs(editName.value, editPerson.value, editCategory.value, editNameError, editPersonError);
  if (!check.ok) return;

  r.name = check.name;
  r.person = check.person;
  r.category = editCategory.value;
  r.type = editType.value;
  r.status = editStatus.value;

  saveRecords();
  closeEdit();
  render();
  showMessage("Changes saved!", false);
}

function deleteRecord(id) {
  const r = findRecord(id);
  if (r === null) return;

  const sure = confirm("Delete " + r.name + " (" + r.person + ")? This cannot be undone.");
  if (!sure) return;

  const newList = [];
  for (let i = 0; i < records.length; i++) {
    if (records[i].id !== id) {
      newList.push(records[i]);
    }
  }

  records = newList;

  saveRecords();
  render();
  showMessage("Record deleted.", false);
}

function deleteAll() {
  if (records.length === 0) return;

  const sure = confirm("Delete ALL " + records.length + " records? This cannot be undone.");
  if (!sure) return;

  records = [];
  saveRecords();
  render();
  showMessage("All records deleted.", false);
}

function clearFilters() {
  document.querySelector('input[name="category"][value="all"]').checked = true;
  document.querySelector('input[name="type"][value="all"]').checked = true;
  document.querySelector('input[name="status"][value="all"]').checked = true;
  searchInput.value = "";
  render();
}

addForm.addEventListener("submit", addRecord);
nameInput.addEventListener("input", autoDetectCategory);
categoryInput.addEventListener("change", function () {
  userChoseCategory = true;
});

const radios = document.querySelectorAll('.filters input[type="radio"]');
for (let i = 0; i < radios.length; i++) {
  radios[i].addEventListener("change", render);
}

searchInput.addEventListener("input", render);
sortInput.addEventListener("change", render);
clearBtn.addEventListener("click", clearFilters);
deleteAllBtn.addEventListener("click", deleteAll);

saveEditBtn.addEventListener("click", saveEdit);
cancelEditBtn.addEventListener("click", closeEdit);

loadRecords();
render();