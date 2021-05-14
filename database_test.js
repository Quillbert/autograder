const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('storage.db', (err) => {
	if(err) {
		console.error(err);
		return;
	}
	console.log("connected to db");
});

db.close();
