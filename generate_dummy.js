const fs = require('fs');

const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Evan", "Fiona", "George", "Hannah", "Ian", "Julia", "Kevin", "Laura", "Mike", "Nina", "Oscar", "Paula", "Quinn", "Rachel", "Sam", "Tina", "Ulysses", "Victoria", "Will", "Xena", "Yusuf", "Zara"];
const lastNames = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson"];
const genders = ["Male", "Female", "Other"];
const domains = ["example.com", "mail.com", "test.org"];
const streets = ["Maple St", "Oak Ave", "Pine Rd", "Cedar Ln", "Elm St", "Washington Blvd", "Lake Rd"];
const cities = ["Springfield", "Metropolis", "Gotham", "Star City", "Central City"];

let usersCsv = "firstName,lastName,gender,joinDate,email,phone,address\n";
for (let i = 1; i <= 50; i++) {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  const gender = genders[Math.floor(Math.random() * genders.length)];
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const date = `2024-${month}-${day}`;
  const email = `${first.toLowerCase()}.${last.toLowerCase()}@${domains[Math.floor(Math.random() * domains.length)]}`;
  const phone = `555-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const address = `${Math.floor(Math.random() * 999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}`;
  
  usersCsv += `"${first}","${last}","${gender}","${date}","${email}","${phone}","${address}"\n`;
}
fs.writeFileSync('dummy_users.csv', usersCsv);

const bookTitles1 = ["The Mystery of", "Journey to", "Secrets of", "The Fall of", "Rise of", "Echoes from", "Visions of", "Shadows over"];
const bookTitles2 = ["the Deep", "Tomorrow", "the Ancients", "the City", "the Horizon", "the Galaxy", "Winter", "the Crown"];
const genres = ["Technology", "Science Fiction", "Fantasy", "Mystery", "History", "Biography", "Self-Help"];
const publishers = ["TechPress", "Penguin", "Harper", "Scribner", "Macmillan"];

let booksCsv = "isbn,title,authors,publisher,publishedYear,genre,totalCopies,availableCopies,location,description\n";
for (let i = 1; i <= 100; i++) {
  const isbn = `978-${Math.floor(Math.random() * 9)}-${Math.floor(Math.random() * 90)}-${Math.floor(Math.random() * 900000)}-${Math.floor(Math.random() * 9)}`;
  const title = `${bookTitles1[Math.floor(Math.random() * bookTitles1.length)]} ${bookTitles2[Math.floor(Math.random() * bookTitles2.length)]}`;
  const author = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  const publisher = publishers[Math.floor(Math.random() * publishers.length)];
  const year = Math.floor(Math.random() * 30) + 1990;
  const genre = genres[Math.floor(Math.random() * genres.length)];
  const total = Math.floor(Math.random() * 10) + 1;
  const available = Math.floor(Math.random() * (total + 1));
  const loc = `Aisle ${Math.floor(Math.random() * 10) + 1}, Shelf ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`; // A-E
  const desc = `A fascinating exploration of ${genre.toLowerCase()} through the lens of ${title.toLowerCase()}.`;

  booksCsv += `"${isbn}","${title}","${author}","${publisher}","${year}","${genre}",${total},${available},"${loc}","${desc}"\n`;
}
fs.writeFileSync('dummy_books.csv', booksCsv);

console.log("Done generating files.");
