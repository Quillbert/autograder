const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('storage.db', (err) => {
	if(err) {
		console.error(err);
		return;
	}
	console.log("connected to db");
});

db.run(`CREATE TABLE IF NOT EXISTS problems(
		name TEXT NOT NULL UNIQUE,
		Prob01_attempts INTEGER NOT NULL DEFAULT 0,
		Prob01_status INTEGER NOT NULL DEFAULT 0);`);

db.close();
